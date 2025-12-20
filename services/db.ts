
import { 
  Company, BusinessProfile, DatabaseConfig, CloudConfig, 
  Account, Party, Product, Transaction, Reminder, DashboardStat, CashFlowData, ServiceJob, TransactionItem, CashDrawer, CashNoteCount, Denomination 
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
  replenishmentDraft?: any[];
  cashDrawer: CashDrawer;
}

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

const DEFAULT_COMPANY_DATA: CompanyData = {
  profile: { name: 'My Business', address: '', pan: '', phone: '' },
  dbConfig: { mode: 'local' },
  cloudConfig: { 
    enabled: false, 
    autoBackup: false, 
    backupTime: '16:00',
    backupSchedules: ['16:00'],
    googleClientId: '' 
  },
  accounts: [
    { id: '1', name: 'Cash In Hand', type: 'Cash', balance: 0, isDefault: true }
  ],
  parties: [],
  products: [],
  transactions: [],
  reminders: [],
  serviceJobs: [],
  replenishmentDraft: [],
  cashDrawer: JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER))
};

export class DatabaseService {
  private activeCompanyId: string | null = null;
  private cache: CompanyData = JSON.parse(JSON.stringify(DEFAULT_COMPANY_DATA));
  private companies: Company[] = [];

  constructor() {
    this.loadCompanies();
  }

  private loadCompanies() {
    const stored = localStorage.getItem('aapro_companies');
    if (stored) {
      this.companies = JSON.parse(stored);
    } else {
      this.companies = [];
    }
  }

  async getCompanies(): Promise<Company[]> {
    return this.companies;
  }

  async createCompany(name: string): Promise<Company> {
    const newCompany: Company = {
      id: Date.now().toString(),
      name,
      dbName: `aapro_db_${Date.now()}`,
      created: new Date().toISOString()
    };
    this.companies.push(newCompany);
    localStorage.setItem('aapro_companies', JSON.stringify(this.companies));
    
    localStorage.setItem(newCompany.dbName, JSON.stringify({
      ...DEFAULT_COMPANY_DATA,
      profile: { ...DEFAULT_COMPANY_DATA.profile, name }
    }));
    
    return newCompany;
  }

  async switchCompany(id: string) {
    const company = this.companies.find(c => c.id === id);
    if (!company) throw new Error('Company not found');
    
    this.activeCompanyId = id;
    localStorage.setItem('active_company_id', id);
    this.loadData(company.dbName);
    window.dispatchEvent(new Event('db-updated'));
  }

  getActiveCompanyId() {
    return this.activeCompanyId;
  }

  async init(id: string) {
     const company = this.companies.find(c => c.id === id);
     if (company) {
       this.activeCompanyId = id;
       this.loadData(company.dbName);
     }
  }

  logout() {
    this.activeCompanyId = null;
    localStorage.removeItem('active_company_id');
    this.cache = JSON.parse(JSON.stringify(DEFAULT_COMPANY_DATA));
    window.dispatchEvent(new Event('db-logout'));
  }

  private loadData(dbName: string) {
    const stored = localStorage.getItem(dbName);
    if (stored) {
      const parsed = JSON.parse(stored);
      this.cache = {
          ...DEFAULT_COMPANY_DATA,
          ...parsed,
          profile: { ...DEFAULT_COMPANY_DATA.profile, ...parsed.profile },
          serviceJobs: Array.isArray(parsed.serviceJobs) ? parsed.serviceJobs : [],
          replenishmentDraft: Array.isArray(parsed.replenishmentDraft) ? parsed.replenishmentDraft : [],
          cashDrawer: parsed.cashDrawer || JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER))
      };
    } else {
      this.cache = JSON.parse(JSON.stringify(DEFAULT_COMPANY_DATA));
    }
  }

  private persist() {
    if (!this.activeCompanyId) return;
    const company = this.companies.find(c => c.id === this.activeCompanyId);
    if (company) {
      localStorage.setItem(company.dbName, JSON.stringify(this.cache));
      window.dispatchEvent(new Event('db-updated'));
    }
  }

  getBusinessProfile() { return this.cache.profile; }
  updateBusinessProfile(p: BusinessProfile) { this.cache.profile = p; this.persist(); }

  getDatabaseConfig() { return this.cache.dbConfig; }
  updateDatabaseConfig(c: DatabaseConfig) { this.cache.dbConfig = c; this.persist(); }
  getCloudConfig() { return this.cache.cloudConfig; }
  updateCloudConfig(c: CloudConfig) { this.cache.cloudConfig = c; this.persist(); }

  // --- Cash Drawer ---
  getCashDrawer(): CashDrawer {
      return this.cache.cashDrawer || JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER));
  }
  updateCashDrawer(drawer: CashDrawer) {
      this.cache.cashDrawer = drawer;
      this.persist();
  }
  updateDrawerFromTransaction(t: Transaction, action: 'add' | 'remove') {
      if (!t.cashBreakdown) return;
      const factor = action === 'add' ? 1 : -1;
      const drawer = this.getCashDrawer();
      t.cashBreakdown.received.forEach(rec => {
          const note = drawer.notes.find(n => n.denomination === rec.denomination);
          if (note) note.count += (rec.count * factor);
      });
      t.cashBreakdown.returned.forEach(ret => {
          const note = drawer.notes.find(n => n.denomination === ret.denomination);
          if (note) note.count -= (ret.count * factor);
      });
      drawer.lastUpdated = new Date().toISOString();
      this.updateCashDrawer(drawer);
  }

  getAccounts() { return this.cache.accounts; }
  addAccount(a: Account) { this.cache.accounts.push(a); this.persist(); }
  updateAccount(a: Account) { 
    const index = this.cache.accounts.findIndex(acc => acc.id === a.id);
    if (index !== -1) {
      this.cache.accounts[index] = a;
      this.persist();
    }
  }
  deleteAccount(id: string): boolean {
    if (id === '1') return false; 
    const hasTransactions = this.cache.transactions.some(t => t.accountId === id || t.transferAccountId === id);
    if (hasTransactions) return false;
    this.cache.accounts = this.cache.accounts.filter(a => a.id !== id);
    this.persist();
    return true;
  }

  getParties() { return this.cache.parties; }
  addParty(p: Party) { this.cache.parties.push(p); this.persist(); }
  updateParty(p: Party) {
     const index = this.cache.parties.findIndex(item => item.id === p.id);
     if (index !== -1) {
       this.cache.parties[index] = p;
       this.persist();
     }
  }
  async bulkAddParties(parties: Party[]) {
    this.cache.parties.push(...parties);
    this.persist();
  }

  getProducts() { return this.cache.products; }
  addProduct(p: Product) { this.cache.products.push(p); this.persist(); }
  updateProduct(p: Product) {
    const index = this.cache.products.findIndex(item => item.id === p.id);
    if (index !== -1) {
      this.cache.products[index] = p;
      this.persist();
    }
  }
  deleteProduct(id: string) {
    this.cache.products = this.cache.products.filter(p => p.id !== id);
    this.persist();
  }
  async bulkAddProducts(products: Product[]) {
    this.cache.products.push(...products);
    this.persist();
  }

  getTransactions() { return this.cache.transactions; }
  addTransaction(t: Transaction) {
    this.cache.transactions.push(t);
    this.updateBalances(t, 'add');
    if (t.cashBreakdown) this.updateDrawerFromTransaction(t, 'add');
    this.persist();
  }
  updateTransaction(id: string, t: Transaction) {
    const oldT = this.cache.transactions.find(item => item.id === id);
    if (oldT) {
      this.updateBalances(oldT, 'remove');
      if (oldT.cashBreakdown) this.updateDrawerFromTransaction(oldT, 'remove');
    }
    const index = this.cache.transactions.findIndex(item => item.id === id);
    if (index !== -1) {
      this.cache.transactions[index] = t;
      this.updateBalances(t, 'add');
      if (t.cashBreakdown) this.updateDrawerFromTransaction(t, 'add');
      this.persist();
    }
  }
  deleteTransaction(id: string) {
    const t = this.cache.transactions.find(item => item.id === id);
    if (t) {
      this.updateBalances(t, 'remove');
      if (t.cashBreakdown) this.updateDrawerFromTransaction(t, 'remove');
      this.cache.transactions = this.cache.transactions.filter(item => item.id !== id);
      this.persist();
    }
  }

  private updateBalances(t: Transaction, action: 'add' | 'remove') {
     const factor = action === 'add' ? 1 : -1;
     if (t.partyId) {
        const party = this.cache.parties.find(p => p.id === t.partyId);
        if (party) {
            let amount = 0;
            switch (t.type) {
                case 'SALE': amount = t.totalAmount; break;
                case 'PURCHASE': amount = -t.totalAmount; break;
                case 'PAYMENT_IN': amount = -t.totalAmount; break;
                case 'PAYMENT_OUT': amount = t.totalAmount; break;
                case 'SALE_RETURN': amount = -t.totalAmount; break;
                case 'PURCHASE_RETURN': amount = t.totalAmount; break;
                case 'BALANCE_ADJUSTMENT': amount = t.totalAmount; break;
            }
            party.balance += (amount * factor);
        }
     }
     if (t.items && t.items.length > 0) {
        t.items.forEach(item => {
           const product = this.cache.products.find(p => p.id === item.productId);
           if (product && product.type !== 'service') {
               if (t.type === 'SALE' || t.type === 'PURCHASE_RETURN') product.stock -= (item.quantity * factor);
               else if (t.type === 'PURCHASE' || t.type === 'SALE_RETURN') product.stock += (item.quantity * factor);
           }
        });
     }
     if (t.accountId) {
        const account = this.cache.accounts.find(a => a.id === t.accountId);
        if (account) {
            let amount = 0;
            if (['SALE', 'PAYMENT_IN', 'PURCHASE_RETURN'].includes(t.type)) amount = t.totalAmount;
            else if (['PURCHASE', 'PAYMENT_OUT', 'SALE_RETURN', 'EXPENSE'].includes(t.type)) amount = -t.totalAmount;
            if (t.type === 'TRANSFER') amount = -t.totalAmount;
            if (t.type === 'BALANCE_ADJUSTMENT') amount = t.totalAmount;
            account.balance += (amount * factor);
        }
     }
     if (t.type === 'TRANSFER' && t.transferAccountId) {
         const destAccount = this.cache.accounts.find(a => a.id === t.transferAccountId);
         if (destAccount) {
             destAccount.balance += (t.totalAmount * factor);
         }
     }
  }

  getServiceJobs() { return this.cache.serviceJobs || []; }
  addServiceJob(job: ServiceJob) { this.cache.serviceJobs.push(job); this.persist(); }
  updateServiceJob(job: ServiceJob) {
    const index = this.cache.serviceJobs.findIndex(j => j.id === job.id);
    if (index !== -1) { this.cache.serviceJobs[index] = job; this.persist(); }
  }
  deleteServiceJob(id: string) { this.cache.serviceJobs = this.cache.serviceJobs.filter(j => j.id !== id); this.persist(); }

  getAllReminders(): Reminder[] {
    const manual = this.cache.reminders;
    const system: Reminder[] = [];
    const now = new Date();

    // 1. Stock Reminders
    this.cache.products.forEach(p => {
      if (p.type !== 'service' && p.stock < (p.minStockLevel || 5)) {
          system.push({ 
              id: `sys_stock_${p.id}`, 
              title: `Low Stock: ${p.name}`, 
              date: now.toISOString(), 
              type: 'system_stock', 
              priority: p.stock <= 0 ? 'high' : 'medium', 
              amount: p.stock 
          });
      }
    });

    // 2. Party Aging Reminders
    this.cache.parties.forEach(p => {
      if (p.balance !== 0) {
        // Find oldest relevant transaction that contributes to this balance
        const partyTxns = this.cache.transactions
            .filter(t => t.partyId === p.id && (p.balance > 0 ? t.type === 'SALE' : t.type === 'PURCHASE'))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (partyTxns.length > 0) {
            const oldestTx = partyTxns[0];
            const diffDays = Math.floor((now.getTime() - new Date(oldestTx.date).getTime()) / (1000 * 60 * 60 * 24));
            
            let ageLabel = "";
            let priority: 'low' | 'medium' | 'high' = 'low';

            if (diffDays >= 120) { ageLabel = "120+ Days (Critical)"; priority = "high"; }
            else if (diffDays >= 90) { ageLabel = "90 Days (Overdue)"; priority = "high"; }
            else if (diffDays >= 60) { ageLabel = "60 Days (Overdue)"; priority = "high"; }
            else if (diffDays >= 30) { ageLabel = "30 Days Overdue"; priority = "medium"; }
            else if (diffDays >= 15) { ageLabel = "15 Days Overdue"; priority = "medium"; }
            else if (diffDays >= 7) { ageLabel = "1 Week Overdue"; priority = "low"; }

            if (ageLabel) {
                system.push({
                    id: `sys_aging_${p.id}`,
                    title: `${p.name}: ${ageLabel}`,
                    date: oldestTx.date,
                    type: 'party_due',
                    priority: priority,
                    amount: Math.abs(p.balance)
                });
            }
        }
      }
    });

    return [...system, ...manual].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  addManualReminder(r: Reminder) {
    this.cache.reminders.push(r);
    this.persist();
  }

  deleteManualReminder(id: string) {
    this.cache.reminders = this.cache.reminders.filter(r => r.id !== id);
    this.persist();
  }

  getBackupData() {
    // Explicitly clone current cache to ensure all properties like cashDrawer are included
    return JSON.parse(JSON.stringify({ 
      ...this.cache, 
      backupVersion: '2.1', 
      companyId: this.activeCompanyId, 
      timestamp: new Date().toISOString(),
      appId: 'AA_PRO_ENTERPRISE'
    }));
  }

  async restoreData(data: any) {
     if (!data || typeof data !== 'object') return { success: false, message: 'Invalid file format' };
     try {
         // Deep merge/validate core properties
         const validated: CompanyData = {
             ...DEFAULT_COMPANY_DATA,
             profile: { ...DEFAULT_COMPANY_DATA.profile, ...(data.profile || {}) },
             accounts: Array.isArray(data.accounts) ? data.accounts : DEFAULT_COMPANY_DATA.accounts,
             parties: Array.isArray(data.parties) ? data.parties : [],
             products: Array.isArray(data.products) ? data.products : [],
             transactions: Array.isArray(data.transactions) ? data.transactions : [],
             reminders: Array.isArray(data.reminders) ? data.reminders : [],
             serviceJobs: Array.isArray(data.serviceJobs) ? data.serviceJobs : [],
             replenishmentDraft: Array.isArray(data.replenishmentDraft) ? data.replenishmentDraft : [],
             // Deep restore cash drawer or fallback to empty template
             cashDrawer: data.cashDrawer ? JSON.parse(JSON.stringify(data.cashDrawer)) : JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER))
         };
         
         this.cache = validated;
         this.persist();
         return { success: true };
     } catch (e: any) {
         return { success: false, message: 'Error during deep restoration: ' + e.message };
     }
  }

  async listTables() { return ['transactions', 'parties', 'products', 'accounts', 'serviceJobs', 'cashDrawer']; }
  async getTableData(table: string) { return (this.cache as any)[table] || []; }

  getReplenishmentDraft() { return this.cache.replenishmentDraft || []; }
  updateReplenishmentDraft(draft: any[]) { this.cache.replenishmentDraft = draft; this.persist(); }
  clearReplenishmentDraft() { this.cache.replenishmentDraft = []; this.persist(); }

  async verifyDataIntegrity() {
      const issues: string[] = [];
      this.cache.parties.forEach(party => {
          let calculatedBalance = 0;
          this.cache.transactions.forEach(t => {
              if (t.partyId === party.id) {
                  let amount = 0;
                  switch (t.type) {
                      case 'SALE': amount = t.totalAmount; break;
                      case 'PURCHASE': amount = -t.totalAmount; break;
                      case 'PAYMENT_IN': amount = -t.totalAmount; break;
                      case 'PAYMENT_OUT': amount = t.totalAmount; break;
                      case 'SALE_RETURN': amount = -t.totalAmount; break;
                      case 'PURCHASE_RETURN': amount = t.totalAmount; break;
                      case 'BALANCE_ADJUSTMENT': amount = t.totalAmount; break;
                  }
                  calculatedBalance += amount;
              }
          });
          if (Math.abs(calculatedBalance - party.balance) > 0.01) {
              issues.push(`Party ${party.name} balance mismatch: System ${party.balance}, Calc ${calculatedBalance}`);
          }
      });
      return {
          partiesOk: issues.length === 0,
          productsOk: true,
          issues
      };
  }

  async reconcileData() {
      this.cache.parties.forEach(party => {
          let calculatedBalance = 0;
          this.cache.transactions.forEach(t => {
              if (t.partyId === party.id) {
                  let amount = 0;
                  switch (t.type) {
                      case 'SALE': amount = t.totalAmount; break;
                      case 'PURCHASE': amount = -t.totalAmount; break;
                      case 'PAYMENT_IN': amount = -t.totalAmount; break;
                      case 'PAYMENT_OUT': amount = t.totalAmount; break;
                      case 'SALE_RETURN': amount = -t.totalAmount; break;
                      case 'PURCHASE_RETURN': amount = t.totalAmount; break;
                      case 'BALANCE_ADJUSTMENT': amount = t.totalAmount; break;
                  }
                  calculatedBalance += amount;
              }
          });
          party.balance = calculatedBalance;
      });
      this.persist();
  }

  async closeFinancialYear(archiveName: string) {
      if (!this.activeCompanyId) return;
      const currentCompany = this.companies.find(c => c.id === this.activeCompanyId);
      if (!currentCompany) return;
      currentCompany.name = archiveName;
      localStorage.setItem('aapro_companies', JSON.stringify(this.companies));
      const newProfile = { ...this.cache.profile };
      const newAccounts = this.cache.accounts.map(a => ({ ...a }));
      const newParties = this.cache.parties.map(p => ({ ...p }));
      const newProducts = this.cache.products.map(p => ({ ...p }));
      const newId = Date.now().toString();
      const newDbName = `aapro_db_${newId}`;
      const newCompany: Company = {
          id: newId,
          name: newProfile.name,
          dbName: newDbName,
          created: new Date().toISOString()
      };
      const newData: CompanyData = {
          ...DEFAULT_COMPANY_DATA,
          profile: newProfile,
          accounts: newAccounts,
          parties: newParties,
          products: newProducts,
          transactions: [],
          serviceJobs: [],
          reminders: [],
          cashDrawer: JSON.parse(JSON.stringify(this.cache.cashDrawer))
      };
      this.companies.push(newCompany);
      localStorage.setItem('aapro_companies', JSON.stringify(this.companies));
      localStorage.setItem(newDbName, JSON.stringify(newData));
      await this.switchCompany(newId);
  }
}

export const db = new DatabaseService();
