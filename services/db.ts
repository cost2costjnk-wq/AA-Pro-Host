
import { openDB, IDBPDatabase } from 'idb';
import { 
  BusinessProfile, Account, Party, Product, Transaction, Reminder, ServiceJob, Category, CashDrawer, Company, CloudConfig, WarrantyCase, User, IssuedLicense
} from '../types';

const DB_NAME = 'aapro_enterprise_v2';
const COMPANIES_STORE = 'companies';
const DATA_STORE = 'company_data';

export class DatabaseService {
  private db: IDBPDatabase | null = null;
  private activeCompanyId: string = 'main';
  private profile: BusinessProfile | null = null;
  private isLoaded = false;
  private cloudConfig: CloudConfig = { 
    enabled: false, 
    autoBackup: false, 
    backupSchedules: [], 
    googleClientId: '',
    compressionEnabled: true
  };

  private async getDb(): Promise<IDBPDatabase> {
    if (this.db) return this.db;
    this.db = await openDB(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(COMPANIES_STORE)) {
          db.createObjectStore(COMPANIES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE);
        }
        if (!db.objectStoreNames.contains('global_config')) {
          db.createObjectStore('global_config');
        }
      },
    });
    return this.db;
  }

  async init(id: string = 'main') {
    this.activeCompanyId = id;
    await this.refreshLocalCaches();
    this.isLoaded = true;
  }

  getActiveCompanyId() { return this.activeCompanyId; }

  async refreshLocalCaches() {
    const db = await this.getDb();
    const data = await db.get(DATA_STORE, this.activeCompanyId) || {};
    
    (window as any)._prod_cache = data.products || [];
    (window as any)._party_cache = data.parties || [];
    (window as any)._acc_cache = data.accounts || [];
    (window as any)._cat_cache = data.categories || [];
    (window as any)._users_cache = data.users || [];
    
    const allTxns = data.transactions || [];
    const MAX_MEMORY_TXNS = 5000;
    (window as any)._tx_cache = allTxns.length > MAX_MEMORY_TXNS ? allTxns.slice(-MAX_MEMORY_TXNS) : allTxns;

    (window as any)._jobs_cache = data.serviceJobs || [];
    (window as any)._reminders_cache = data.reminders || [];
    (window as any)._warranty_cache = data.warrantyCases || [];
    (window as any)._cash_drawer = data.cashDrawer || { 
      notes: [1000, 500, 100, 50, 20, 10, 5, 2, 1].map(d => ({ denomination: d as any, count: 0 })), 
      lastUpdated: new Date().toISOString() 
    };
    this.profile = data.profile || { name: 'AA Pro Business', address: '', pan: '', phone: '' };
    if (data.cloudConfig) this.cloudConfig = data.cloudConfig;
    window.dispatchEvent(new Event('db-updated'));
  }

  private async saveToDb() {
    const db = await this.getDb();
    const data = {
      profile: this.profile,
      products: this.getProducts(),
      parties: this.getParties(),
      transactions: this.getTransactions(),
      accounts: this.getAccounts(),
      serviceJobs: this.getServiceJobs(),
      reminders: this.getAllReminders(),
      categories: this.getCategories(),
      warrantyCases: this.getWarrantyCases(),
      users: this.getUsers(),
      cashDrawer: this.getCashDrawer(),
      cloudConfig: this.cloudConfig
    };
    await db.put(DATA_STORE, data, this.activeCompanyId);
    window.dispatchEvent(new Event('db-updated'));
  }

  getBusinessProfile(): BusinessProfile {
    return this.profile || { name: 'AA Pro Business', address: '', pan: '', phone: '' };
  }
  
  async updateBusinessProfile(p: BusinessProfile) {
    this.profile = p;
    const db = await this.getDb();
    const reg = await db.get(COMPANIES_STORE, this.activeCompanyId);
    if (reg) { reg.name = p.name; await db.put(COMPANIES_STORE, reg); }
    await this.saveToDb();
  }

  getTransactions(): Transaction[] { return (window as any)._tx_cache || []; }

  async addTransaction(t: Transaction) {
    const txs = this.getTransactions();
    txs.push(t);
    await this.applyImpact(t, 1);
    await this.saveToDb();
  }

  async updateTransaction(id: string, t: Transaction) {
    const txs = this.getTransactions();
    const idx = txs.findIndex(tx => tx.id === id);
    if (idx > -1) {
      await this.applyImpact(txs[idx], -1);
      txs[idx] = t;
      await this.applyImpact(t, 1);
      await this.saveToDb();
    }
  }

  async deleteTransaction(id: string) {
    const txs = this.getTransactions();
    const idx = txs.findIndex(tx => tx.id === id);
    if (idx > -1) {
      await this.applyImpact(txs[idx], -1);
      txs.splice(idx, 1);
      await this.saveToDb();
    }
  }

  private async applyImpact(t: Transaction, factor: number) {
     // 1. Ledger Impact
     if (t.partyId) {
        const parties = this.getParties();
        const party = parties.find(p => p.id === t.partyId);
        if (party) {
            let amt = 0;
            switch (t.type) {
                case 'SALE': case 'PURCHASE_RETURN': case 'PAYMENT_OUT': case 'BALANCE_ADJUSTMENT': amt = t.totalAmount; break;
                case 'PURCHASE': case 'PAYMENT_IN': case 'SALE_RETURN': amt = -t.totalAmount; break;
            }
            party.balance += (amt * factor);
        }
     }
     // 2. Inventory Impact
     for (const item of (t.items || [])) {
        const product = this.getProducts().find(p => p.id === item.productId);
        if (product && product.type !== 'service') {
            if (t.type === 'SALE' || t.type === 'PURCHASE_RETURN') product.stock -= (item.quantity * factor);
            else if (t.type === 'PURCHASE' || t.type === 'SALE_RETURN') product.stock += (item.quantity * factor);
        }
     }
     // 3. Bank/Cash Balance Impact
     if (t.accountId) {
         const accs = this.getAccounts();
         const acc = accs.find(a => a.id === t.accountId);
         if (acc) {
             let isMoneyIn = ['SALE', 'PAYMENT_IN', 'PURCHASE_RETURN'].includes(t.type);
             if (['PURCHASE', 'PAYMENT_OUT', 'SALE_RETURN', 'EXPENSE'].includes(t.type)) isMoneyIn = false;
             if (t.type === 'BALANCE_ADJUSTMENT') isMoneyIn = t.totalAmount >= 0;
             acc.balance += (isMoneyIn ? (Math.abs(t.totalAmount) * factor) : (-Math.abs(t.totalAmount) * factor));
         }
     }

     // 4. PHYSICAL CASH DRAWER SYNC (Note Breakdown)
     if (t.cashBreakdown) {
         const drawer = this.getCashDrawer();
         // Process Received Notes (Into Drawer)
         t.cashBreakdown.received.forEach(noteCount => {
             if (noteCount.count > 0) {
                 const drawerNote = drawer.notes.find(n => n.denomination === noteCount.denomination);
                 if (drawerNote) drawerNote.count += (noteCount.count * factor);
             }
         });
         // Process Returned Notes (Change Given Out)
         t.cashBreakdown.returned.forEach(noteCount => {
             if (noteCount.count > 0) {
                 const drawerNote = drawer.notes.find(n => n.denomination === noteCount.denomination);
                 if (drawerNote) drawerNote.count -= (noteCount.count * factor);
             }
         });
         drawer.lastUpdated = new Date().toISOString();
         (window as any)._cash_drawer = { ...drawer };
     }
  }

  getParties(): Party[] { return (window as any)._party_cache || []; }
  async addParty(p: Party) { this.getParties().push(p); await this.saveToDb(); }
  async updateParty(p: Party) {
    const list = this.getParties();
    const idx = list.findIndex(item => item.id === p.id);
    if (idx > -1) list[idx] = p;
    await this.saveToDb();
  }
  async bulkAddParties(parties: Party[]) {
    const current = this.getParties();
    (window as any)._party_cache = [...current, ...parties];
    await this.saveToDb();
  }

  getProducts(): Product[] { return (window as any)._prod_cache || []; }
  async addProduct(p: Product) { this.getProducts().push(p); await this.saveToDb(); }
  async updateProduct(p: Product) {
    const list = this.getProducts();
    const idx = list.findIndex(item => item.id === p.id);
    if (idx > -1) list[idx] = p;
    await this.saveToDb();
  }
  async deleteProduct(id: string) {
    const list = this.getProducts();
    (window as any)._prod_cache = list.filter(p => p.id !== id);
    await this.saveToDb();
  }
  async bulkAddProducts(products: Product[]) {
    const current = this.getProducts();
    (window as any)._prod_cache = [...current, ...products];
    await this.saveToDb();
  }

  getAccounts(): Account[] { 
    const list = (window as any)._acc_cache || [];
    if (list.length === 0) return [{ id: '1', name: 'Cash Account', type: 'Cash', balance: 0, isDefault: true }];
    return list;
  }
  async addAccount(a: Account) { this.getAccounts().push(a); await this.saveToDb(); }
  async updateAccount(a: Account) {
    const list = this.getAccounts();
    const idx = list.findIndex(item => item.id === a.id);
    if (idx > -1) list[idx] = a;
    await this.saveToDb();
  }
  async deleteAccount(id: string) {
    if (id === '1') return false;
    const list = this.getAccounts();
    (window as any)._acc_cache = list.filter(a => a.id !== id);
    await this.saveToDb();
    return true;
  }

  getServiceJobs(): ServiceJob[] { return (window as any)._jobs_cache || []; }
  async addServiceJob(j: ServiceJob) { this.getServiceJobs().push(j); await this.saveToDb(); }
  async updateServiceJob(j: ServiceJob) {
    const list = this.getServiceJobs();
    const idx = list.findIndex(item => item.id === j.id);
    if (idx > -1) list[idx] = j;
    await this.saveToDb();
  }
  async deleteServiceJob(id: string) {
    const list = this.getServiceJobs();
    (window as any)._jobs_cache = list.filter(j => j.id !== id);
    await this.saveToDb();
  }

  getWarrantyCases(): WarrantyCase[] { return (window as any)._warranty_cache || []; }
  async addWarrantyCase(wc: WarrantyCase) { this.getWarrantyCases().push(wc); await this.saveToDb(); }
  async updateWarrantyCase(wc: WarrantyCase) {
    const list = this.getWarrantyCases();
    const idx = list.findIndex(item => item.id === wc.id);
    if (idx > -1) list[idx] = wc;
    await this.saveToDb();
  }
  async deleteWarrantyCase(id: string) {
    const list = this.getWarrantyCases();
    (window as any)._warranty_cache = list.filter(w => w.id !== id);
    await this.saveToDb();
  }

  getCategories(): Category[] { return (window as any)._cat_cache || []; }
  async addCategory(c: Category) { this.getCategories().push(c); await this.saveToDb(); }
  async updateCategory(c: Category) {
    const list = this.getCategories();
    const idx = list.findIndex(item => item.id === c.id);
    if (idx > -1) list[idx] = c;
    await this.saveToDb();
  }
  async deleteCategory(id: string) {
    const list = this.getCategories();
    (window as any)._cat_cache = list.filter(c => c.id !== id);
    await this.saveToDb();
  }

  getAllReminders(): Reminder[] { return (window as any)._reminders_cache || []; }
  async addManualReminder(r: Reminder) { this.getAllReminders().push(r); await this.saveToDb(); }
  async deleteManualReminder(id: string) {
    const list = this.getAllReminders();
    (window as any)._reminders_cache = list.filter(r => r.id !== id);
    await this.saveToDb();
  }

  getCashDrawer(): CashDrawer { 
    return (window as any)._cash_drawer || { 
      notes: [1000, 500, 100, 50, 20, 10, 5, 2, 1].map(d => ({ denomination: d as any, count: 0 })), 
      lastUpdated: new Date().toISOString() 
    }; 
  }
  async updateCashDrawer(d: CashDrawer) { (window as any)._cash_drawer = d; await this.saveToDb(); }

  getUsers(): User[] { return (window as any)._users_cache || []; }
  async addUser(u: User) { this.getUsers().push(u); await this.saveToDb(); }
  async updateUser(u: User) {
    const list = this.getUsers();
    const idx = list.findIndex(item => item.id === u.id);
    if (idx > -1) list[idx] = u;
    await this.saveToDb();
  }
  async deleteUser(id: string) {
    const list = this.getUsers();
    (window as any)._users_cache = list.filter(u => u.id !== id);
    await this.saveToDb();
  }

  async getCompanies(): Promise<Company[]> { 
    const db = await this.getDb();
    return await db.getAll(COMPANIES_STORE); 
  }

  async createCompany(name: string): Promise<Company> {
    const db = await this.getDb();
    const id = Date.now().toString();
    const company = { id, name, created: new Date().toISOString(), dbName: `db_${id}` };
    await db.put(COMPANIES_STORE, company);
    return company;
  }

  async switchCompany(id: string): Promise<void> {
    this.activeCompanyId = id;
    await this.refreshLocalCaches();
  }

  async getGlobalIssuedLicenses(): Promise<IssuedLicense[]> {
    const db = await this.getDb();
    return await db.get('global_config', 'issued_licenses') || [];
  }

  async addGlobalIssuedLicense(lic: IssuedLicense) {
    const licenses = await this.getGlobalIssuedLicenses();
    licenses.push(lic);
    const db = await this.getDb();
    await db.put('global_config', licenses, 'issued_licenses');
  }

  async deleteGlobalIssuedLicense(id: string) {
    const licenses = await this.getGlobalIssuedLicenses();
    const updated = licenses.filter(l => l.id !== id);
    const db = await this.getDb();
    await db.put('global_config', updated, 'issued_licenses');
  }

  getCloudConfig(): CloudConfig { return this.cloudConfig; }
  async updateCloudConfig(c: CloudConfig) { this.cloudConfig = c; await this.saveToDb(); }

  async restoreData(json: any, asNewCompany?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const db = await this.getDb();
      const dataToRestore = {
        profile: json.profile || {},
        products: json.products || [],
        parties: json.parties || [],
        transactions: json.transactions || [],
        accounts: json.accounts || [],
        serviceJobs: json.serviceJobs || [],
        reminders: json.reminders || [],
        categories: json.categories || [],
        warrantyCases: json.warrantyCases || [],
        users: json.users || [],
        cashDrawer: json.cashDrawer || null,
        cloudConfig: json.cloudConfig || this.cloudConfig
      };
      let targetId = this.activeCompanyId;
      if (asNewCompany) {
          const next = await this.createCompany(asNewCompany);
          targetId = next.id;
          dataToRestore.profile.name = asNewCompany;
      }
      await db.put(DATA_STORE, dataToRestore, targetId);
      if (asNewCompany) localStorage.setItem('active_company_id', targetId);
      await this.refreshLocalCaches();
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  getBackupData(): any {
    return {
      profile: this.getBusinessProfile(),
      products: this.getProducts(),
      parties: this.getParties(),
      transactions: this.getTransactions(),
      accounts: this.getAccounts(),
      serviceJobs: this.getServiceJobs(),
      reminders: this.getAllReminders(),
      categories: this.getCategories(),
      warrantyCases: this.getWarrantyCases(),
      users: this.getUsers(),
      cashDrawer: this.getCashDrawer(),
      cloudConfig: this.getCloudConfig(),
      timestamp: new Date().toISOString()
    };
  }

  async listTables(): Promise<string[]> {
    return ['products', 'parties', 'transactions', 'accounts', 'serviceJobs', 'warrantyCases', 'categories', 'reminders', 'users'];
  }

  async getTableData(tableName: string): Promise<any[]> {
    const db = await this.getDb();
    const all = await db.get(DATA_STORE, this.activeCompanyId) || {};
    return all[tableName] || [];
  }
}

export const db = new DatabaseService();
