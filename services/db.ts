
import { openDB, IDBPDatabase } from 'idb';
import { 
  Company, BusinessProfile, DatabaseConfig, CloudConfig, 
  Account, Party, Product, Transaction, Reminder, ServiceJob, TransactionItem, CashDrawer, CashNoteCount, Denomination, WarrantyCase, SubscriptionInfo, User, IssuedLicense
} from '../types';

interface CompanyData {
  profile: BusinessProfile;
  dbConfig: DatabaseConfig;
  cloudConfig: CloudConfig;
  accounts: Account[];
  parties: Party[];
  products: Product[];
  transactions: Transaction[];
  reminders: Reminder[];
  serviceJobs: ServiceJob[];
  warrantyCases: WarrantyCase[];
  replenishmentDraft?: any[];
  cashDrawer: CashDrawer;
  users: User[];
}

const DB_NAME = 'aapro_enterprise_v2';
const COMPANIES_STORE = 'companies';
const DATA_STORE = 'company_data';
const GLOBAL_CONFIG_STORE = 'global_config';

const DEFAULT_CASH_DRAWER: CashDrawer = {
  notes: [
    { denomination: 1000, count: 0 },
    { denomination: 500, count: 0 },
    { denomination: 100, count: 0 },
    { denomination: 50, count: 0 },
    { denomination: 20, count: 0 },
    { denomination: 10, count: 0 },
    { denomination: 5, count: 0 },
    { denomination: 2, count: 0 },
    { denomination: 1, count: 0 }
  ],
  lastUpdated: new Date().toISOString()
};

const getInitialCompanyData = (name: string = 'My Business'): CompanyData => ({
  profile: { name, address: '', pan: '', phone: '' },
  dbConfig: { mode: 'local' },
  cloudConfig: { 
    enabled: true, 
    autoBackup: true, 
    backupSchedules: ['09:00', '13:00', '18:00', '21:00'],
    googleClientId: '476453033908-4utdf52i85jssocqgghjpcpturfkkeu4.apps.googleusercontent.com' 
  },
  accounts: [
    { id: '1', name: 'Cash In Hand', type: 'Cash', balance: 0, isDefault: true }
  ],
  parties: [],
  products: [],
  transactions: [],
  reminders: [],
  serviceJobs: [],
  warrantyCases: [],
  replenishmentDraft: [],
  cashDrawer: JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER)),
  users: []
});

export class DatabaseService {
  private activeCompanyId: string | null = null;
  private cache: CompanyData = getInitialCompanyData();
  private db: IDBPDatabase | null = null;
  private globalSubInfo: SubscriptionInfo | undefined = undefined;

  async initDb() {
    if (this.db) return this.db;
    this.db = await openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(COMPANIES_STORE)) {
          db.createObjectStore(COMPANIES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE);
        }
        if (!db.objectStoreNames.contains(GLOBAL_CONFIG_STORE)) {
          db.createObjectStore(GLOBAL_CONFIG_STORE);
        }
      },
    });
    return this.db;
  }

  async getCompanies(): Promise<Company[]> {
    const db = await this.initDb();
    return await db.getAll(COMPANIES_STORE);
  }

  async createCompany(name: string): Promise<Company> {
    const db = await this.initDb();
    const newCompany: Company = {
      id: Date.now().toString(),
      name,
      dbName: `aapro_db_${Date.now()}`,
      created: new Date().toISOString()
    };
    await db.put(COMPANIES_STORE, newCompany);
    await db.put(DATA_STORE, getInitialCompanyData(name), newCompany.id);
    return newCompany;
  }

  async switchCompany(id: string) {
    const db = await this.initDb();
    const company = await db.get(COMPANIES_STORE, id);
    if (!company) throw new Error('Company not found');
    
    this.activeCompanyId = id;
    localStorage.setItem('active_company_id', id);
    await this.loadDataIntoCache(id);
    window.dispatchEvent(new Event('db-updated'));
  }

  getActiveCompanyId() {
    return this.activeCompanyId;
  }

  async init(id: string) {
     const db = await this.initDb();
     const company = await db.get(COMPANIES_STORE, id);
     if (company) {
       this.activeCompanyId = id;
       await this.loadDataIntoCache(id);
     }
  }

  logout() {
    this.activeCompanyId = null;
    localStorage.removeItem('active_company_id');
    this.cache = getInitialCompanyData();
    window.dispatchEvent(new Event('db-logout'));
  }

  private async loadDataIntoCache(companyId: string) {
    const db = await this.initDb();
    const stored = await db.get(DATA_STORE, companyId);
    
    // Load Global Subscription Info separately to ensure it persists across company changes
    this.globalSubInfo = await db.get(GLOBAL_CONFIG_STORE, 'subscription_info');

    if (stored) {
      const defaults = getInitialCompanyData();
      this.cache = {
          ...defaults,
          ...stored,
          profile: { ...defaults.profile, ...(stored.profile || {}) },
          cloudConfig: { ...defaults.cloudConfig, ...(stored.cloudConfig || {}) },
          cashDrawer: {
            ...defaults.cashDrawer,
            ...(stored.cashDrawer || {}),
            notes: (stored.cashDrawer?.notes && Array.isArray(stored.cashDrawer.notes)) ? stored.cashDrawer.notes : defaults.cashDrawer.notes
          },
          serviceJobs: stored.serviceJobs || [],
          warrantyCases: stored.warrantyCases || [],
          users: stored.users || []
      };
    } else {
      this.cache = getInitialCompanyData();
    }
  }

  private async persist() {
    if (!this.activeCompanyId) return;
    const db = await this.initDb();
    await db.put(DATA_STORE, this.cache, this.activeCompanyId);
    window.dispatchEvent(new Event('db-updated'));
    window.dispatchEvent(new Event('db-content-changed'));
  }

  // --- Global Admin License Methods ---
  async getGlobalIssuedLicenses(): Promise<IssuedLicense[]> {
    const db = await this.initDb();
    return (await db.get(GLOBAL_CONFIG_STORE, 'issued_licenses')) || [];
  }

  async addGlobalIssuedLicense(license: IssuedLicense) {
    const db = await this.initDb();
    const licenses = (await db.get(GLOBAL_CONFIG_STORE, 'issued_licenses')) || [];
    licenses.push(license);
    await db.put(GLOBAL_CONFIG_STORE, licenses, 'issued_licenses');
  }

  async deleteGlobalIssuedLicense(id: string) {
    const db = await this.initDb();
    const licenses = (await db.get(GLOBAL_CONFIG_STORE, 'issued_licenses')) || [];
    const filtered = licenses.filter((l: IssuedLicense) => l.id !== id);
    await db.put(GLOBAL_CONFIG_STORE, filtered, 'issued_licenses');
  }

  // --- User Management ---
  getUsers() { return this.cache.users || []; }
  addUser(u: User) { this.cache.users.push(u); this.persist(); }
  updateUser(u: User) {
    const idx = this.cache.users.findIndex(user => user.id === u.id);
    if (idx !== -1) { this.cache.users[idx] = u; this.persist(); }
  }
  deleteUser(id: string) {
    this.cache.users = this.cache.users.filter(u => u.id !== id);
    this.persist();
  }

  // --- Financial Year Closing Logic ---
  async closeAndStartNewYear(nextYearName: string) {
    if (!this.activeCompanyId) return { success: false, message: 'No active session' };

    const currentProfile = this.cache.profile;
    const carryParties = [...this.cache.parties];
    const carryProducts = [...this.cache.products];
    const carryAccounts = [...this.cache.accounts];
    const carryCashDrawer = JSON.parse(JSON.stringify(this.cache.cashDrawer));
    const carryUsers = this.cache.users;
    
    const carryServiceJobs = this.cache.serviceJobs.filter(j => !['DELIVERED', 'CANCELLED'].includes(j.status));
    const carryWarrantyCases = this.cache.warrantyCases.filter(w => !['CLOSED', 'CANCELLED'].includes(w.status));

    const newYearCompany = await this.createCompany(`${currentProfile.name} (${nextYearName})`);
    
    const newData: CompanyData = getInitialCompanyData(currentProfile.name);
    newData.profile = { ...currentProfile };
    newData.cloudConfig = { ...this.cache.cloudConfig };
    newData.cashDrawer = carryCashDrawer;
    newData.serviceJobs = carryServiceJobs;
    newData.warrantyCases = carryWarrantyCases;
    newData.users = carryUsers;
    
    const openingTxns: Transaction[] = [];
    const date = new Date().toISOString();

    newData.accounts = carryAccounts.map(acc => ({ ...acc, balance: acc.balance }));
    newData.parties = carryParties.map(p => {
        if (p.balance !== 0) {
            openingTxns.push({
                id: `OP-${p.id}-${Date.now()}`,
                date,
                type: 'BALANCE_ADJUSTMENT',
                partyId: p.id,
                partyName: p.name,
                items: [],
                totalAmount: p.balance,
                notes: 'Financial Year Opening Balance',
                category: 'Opening Balance',
                paymentMode: 'Adjustment'
            });
        }
        return { ...p, balance: 0 }; 
    });
    newData.products = carryProducts.map(p => ({ ...p, stock: p.stock }));

    const db = await this.initDb();
    await db.put(DATA_STORE, newData, newYearCompany.id);
    await this.switchCompany(newYearCompany.id);
    openingTxns.forEach(t => this.addTransaction(t));
    
    return { success: true, companyId: newYearCompany.id };
  }

  getBusinessProfile() { return this.cache.profile; }
  updateBusinessProfile(p: BusinessProfile) { this.cache.profile = p; this.persist(); }
  getCloudConfig() { return this.cache.cloudConfig; }
  updateCloudConfig(c: CloudConfig) { this.cache.cloudConfig = c; this.persist(); }
  getDatabaseConfig() { return this.cache.dbConfig; }
  
  getCashDrawer(): CashDrawer { return this.cache.cashDrawer || JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER)); }
  updateCashDrawer(drawer: CashDrawer) { this.cache.cashDrawer = drawer; this.persist(); }

  // Fixed: Get Subscription info from global config store, not company cache
  getSubscriptionInfo(): SubscriptionInfo | undefined { 
    return this.globalSubInfo; 
  }

  // Fixed: Save Subscription info to global config store
  async updateSubscriptionInfo(s: SubscriptionInfo) { 
    const db = await this.initDb();
    this.globalSubInfo = s;
    await db.put(GLOBAL_CONFIG_STORE, s, 'subscription_info');
    window.dispatchEvent(new Event('db-updated'));
  }

  getAccounts() { return this.cache.accounts; }
  addAccount(a: Account) { this.cache.accounts.push(a); this.persist(); }
  updateAccount(a: Account) { 
    const idx = this.cache.accounts.findIndex(acc => acc.id === a.id);
    if (idx !== -1) { this.cache.accounts[idx] = a; this.persist(); }
  }
  deleteAccount(id: string) {
    if (id === '1') return false;
    this.cache.accounts = this.cache.accounts.filter(a => a.id !== id);
    this.persist();
    return true;
  }

  getParties() { return this.cache.parties; }
  addParty(p: Party) { this.cache.parties.push(p); this.persist(); }
  updateParty(p: Party) {
     const idx = this.cache.parties.findIndex(item => item.id === p.id);
     if (idx !== -1) { this.cache.parties[idx] = p; this.persist(); }
  }
  async bulkAddParties(parties: Party[]) { this.cache.parties.push(...parties); this.persist(); }

  getProducts() { return this.cache.products; }
  addProduct(p: Product) { this.cache.products.push(p); this.persist(); }
  updateProduct(p: Product) {
    const idx = this.cache.products.findIndex(item => item.id === p.id);
    if (idx !== -1) { this.cache.products[idx] = p; this.persist(); }
  }
  deleteProduct(id: string) {
    this.cache.products = this.cache.products.filter(p => p.id !== id);
    this.persist();
  }
  async bulkAddProducts(products: Product[]) { this.cache.products.push(...products); this.persist(); }

  getTransactions() { return this.cache.transactions; }
  addTransaction(t: Transaction) {
    this.cache.transactions.push(t);
    this.applyImpact(t, 1);
    this.persist();
  }
  deleteTransaction(id: string) {
    const t = this.cache.transactions.find(item => item.id === id);
    if (t) { this.applyImpact(t, -1); this.cache.transactions = this.cache.transactions.filter(item => item.id !== id); this.persist(); }
  }
  updateTransaction(id: string, t: Transaction) {
    const oldIdx = this.cache.transactions.findIndex(item => item.id === id);
    if (oldIdx !== -1) {
      const oldT = this.cache.transactions[oldIdx];
      this.applyImpact(oldT, -1);
      this.cache.transactions[oldIdx] = t;
      this.applyImpact(t, 1);
      this.persist();
    }
  }

  private applyImpact(t: Transaction, factor: number) {
     if (t.partyId) {
        const party = this.cache.parties.find(p => p.id === t.partyId);
        if (party) {
            let amt = 0;
            switch (t.type) {
                case 'SALE': amt = t.totalAmount; break;
                case 'PURCHASE': amt = -t.totalAmount; break;
                case 'PAYMENT_IN': amt = -t.totalAmount; break;
                case 'PAYMENT_OUT': amt = t.totalAmount; break;
                case 'BALANCE_ADJUSTMENT': amt = t.totalAmount; break;
                case 'SALE_RETURN': amt = -t.totalAmount; break;
                case 'PURCHASE_RETURN': amt = t.totalAmount; break;
            }
            party.balance += (amt * factor);
        }
     }
     t.items?.forEach(item => {
        const p = this.cache.products.find(prod => prod.id === item.productId);
        if (p && p.type !== 'service') {
            if (t.type === 'SALE' || t.type === 'PURCHASE_RETURN') p.stock -= (item.quantity * factor);
            else if (t.type === 'PURCHASE' || t.type === 'SALE_RETURN') p.stock += (item.quantity * factor);
        }
     });
     if (t.accountId) {
        const acc = this.cache.accounts.find(a => a.id === t.accountId);
        if (acc) {
            let amt = (['SALE', 'PAYMENT_IN', 'PURCHASE_RETURN'].includes(t.type)) ? t.totalAmount : -t.totalAmount;
            if (t.type === 'BALANCE_ADJUSTMENT') amt = t.totalAmount;
            acc.balance += (amt * factor);
        }
     }
  }

  getAllReminders(): Reminder[] { return this.cache.reminders || []; }
  addManualReminder(r: Reminder) { this.cache.reminders.push(r); this.persist(); }
  deleteManualReminder(id: string) { this.cache.reminders = this.cache.reminders.filter(r => r.id !== id); this.persist(); }

  getServiceJobs() { return this.cache.serviceJobs || []; }
  addServiceJob(j: ServiceJob) { this.cache.serviceJobs.push(j); this.persist(); }
  updateServiceJob(j: ServiceJob) {
      const idx = this.cache.serviceJobs.findIndex(job => job.id === j.id);
      if (idx !== -1) { this.cache.serviceJobs[idx] = j; this.persist(); }
  }
  deleteServiceJob(id: string) {
    this.cache.serviceJobs = this.cache.serviceJobs.filter(j => j.id !== id);
    this.persist();
  }

  getWarrantyCases() { return this.cache.warrantyCases || []; }
  addWarrantyCase(c: WarrantyCase) { this.cache.warrantyCases.push(c); this.persist(); }
  updateWarrantyCase(c: WarrantyCase) {
    const idx = this.cache.warrantyCases.findIndex(item => item.id === c.id);
    if (idx !== -1) { this.cache.warrantyCases[idx] = c; this.persist(); }
  }
  deleteWarrantyCase(id: string) {
    this.cache.warrantyCases = this.cache.warrantyCases.filter(c => c.id !== id);
    this.persist();
  }

  getBackupData() {
    return { 
      ...this.cache, 
      backupVersion: '2.7-IDB', 
      timestamp: new Date().toISOString(),
      appId: 'AA_PRO_ENTERPRISE',
      companyId: this.activeCompanyId
    };
  }

  async restoreData(data: any) {
     if (!data || typeof data !== 'object') return { success: false, message: 'Invalid data format' };
     const defaults = getInitialCompanyData();
     
     // Note: We deliberately do NOT overwrite subscriptionInfo from the restored file
     // so that the local machine activation remains primary.
     
     this.cache = {
         ...defaults,
         ...data,
         profile: { ...defaults.profile, ...(data.profile || {}) },
         cloudConfig: { ...defaults.cloudConfig, ...(data.cloudConfig || {}) },
         cashDrawer: {
            ...defaults.cashDrawer,
            ...(data.cashDrawer || {}),
            notes: (data.cashDrawer?.notes && Array.isArray(data.cashDrawer.notes)) ? data.cashDrawer.notes : defaults.cashDrawer.notes
         },
         serviceJobs: data.serviceJobs || [],
         warrantyCases: data.warrantyCases || [],
         users: data.users || []
     };
     await this.persist();
     return { success: true };
  }

  async listTables() { return ['transactions', 'parties', 'products', 'accounts', 'serviceJobs', 'warrantyCases', 'reminders', 'users']; }
  async getTableData(table: string) { return (this.cache as any)[table] || []; }
  getReplenishmentDraft() { return this.cache.replenishmentDraft || []; }
  updateReplenishmentDraft(d: any[]) { this.cache.replenishmentDraft = d; this.persist(); }
  clearReplenishmentDraft() { this.cache.replenishmentDraft = []; this.persist(); }
}

export const db = new DatabaseService();
