
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

// Use a function to get default data to ensure fresh object references for every company/restore
const getInitialCompanyData = (name: string = 'My Business'): CompanyData => ({
  profile: { name, address: '', pan: '', phone: '' },
  dbConfig: { mode: 'local' },
  cloudConfig: { 
    enabled: true, 
    autoBackup: true, 
    backupTime: '16:00',
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
  replenishmentDraft: [],
  cashDrawer: JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER))
});

export class DatabaseService {
  private activeCompanyId: string | null = null;
  private cache: CompanyData = getInitialCompanyData();
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
    
    localStorage.setItem(newCompany.dbName, JSON.stringify(getInitialCompanyData(name)));
    
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
    this.cache = getInitialCompanyData();
    window.dispatchEvent(new Event('db-logout'));
  }

  private loadData(dbName: string) {
    const stored = localStorage.getItem(dbName);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Create a fresh default object to merge into
      const defaults = getInitialCompanyData();
      
      this.cache = {
          ...defaults,
          ...parsed,
          profile: { ...defaults.profile, ...(parsed.profile || {}) },
          cloudConfig: { 
            ...defaults.cloudConfig, 
            ...(parsed.cloudConfig || {}),
            googleClientId: '476453033908-4utdf52i85jssocqgghjpcpturfkkeu4.apps.googleusercontent.com'
          },
          // Explicitly merge cashDrawer to handle legacy or incomplete backups
          cashDrawer: {
            ...defaults.cashDrawer,
            ...(parsed.cashDrawer || {}),
            notes: (parsed.cashDrawer?.notes && Array.isArray(parsed.cashDrawer.notes)) 
                   ? parsed.cashDrawer.notes 
                   : defaults.cashDrawer.notes
          }
      };
    } else {
      this.cache = getInitialCompanyData();
    }
  }

  private persist() {
    if (!this.activeCompanyId) return;
    const company = this.companies.find(c => c.id === this.activeCompanyId);
    if (company) {
      localStorage.setItem(company.dbName, JSON.stringify(this.cache));
      window.dispatchEvent(new Event('db-updated'));
      window.dispatchEvent(new Event('db-content-changed')); // Triggers auto-cloud-push
    }
  }

  getBusinessProfile() { return this.cache.profile; }
  updateBusinessProfile(p: BusinessProfile) { this.cache.profile = p; this.persist(); }
  getCloudConfig() { return this.cache.cloudConfig; }
  updateCloudConfig(c: CloudConfig) { this.cache.cloudConfig = c; this.persist(); }
  getDatabaseConfig() { return this.cache.dbConfig; }
  
  getCashDrawer(): CashDrawer { 
    return this.cache.cashDrawer || JSON.parse(JSON.stringify(DEFAULT_CASH_DRAWER)); 
  }
  updateCashDrawer(drawer: CashDrawer) { this.cache.cashDrawer = drawer; this.persist(); }

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
  async bulkAddParties(parties: Party[]) {
    this.cache.parties.push(...parties);
    this.persist();
  }

  getProducts() { return this.cache.products; }
  addProduct(p: Product) { this.cache.products.push(p); this.persist(); }
  updateProduct(p: Product) {
    const idx = this.cache.products.findIndex(item => item.id === p.id);
    if (idx !== -1) { this.cache.products[idx] = p; this.persist(); }
  }
  deleteProduct(id: string) { this.cache.products = this.cache.products.filter(p => p.id !== id); this.persist(); }
  async bulkAddProducts(products: Product[]) {
    this.cache.products.push(...products);
    this.persist();
  }

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
     // 1. Party Balance
     if (t.partyId) {
        const party = this.cache.parties.find(p => p.id === t.partyId);
        if (party) {
            let amt = 0;
            switch (t.type) {
                case 'SALE': amt = t.totalAmount; break;
                case 'PURCHASE': amt = -t.totalAmount; break;
                case 'PAYMENT_IN': amt = -t.totalAmount; break;
                case 'PAYMENT_OUT': amt = t.totalAmount; break;
            }
            party.balance += (amt * factor);
        }
     }
     // 2. Inventory
     t.items?.forEach(item => {
        const p = this.cache.products.find(prod => prod.id === item.productId);
        if (p && p.type !== 'service') {
            if (t.type === 'SALE') p.stock -= (item.quantity * factor);
            else if (t.type === 'PURCHASE') p.stock += (item.quantity * factor);
        }
     });
     // 3. Accounts
     if (t.accountId) {
        const acc = this.cache.accounts.find(a => a.id === t.accountId);
        if (acc) {
            let amt = (['SALE', 'PAYMENT_IN'].includes(t.type)) ? t.totalAmount : -t.totalAmount;
            acc.balance += (amt * factor);
        }
     }
     // 4. Cash Drawer
     if (t.cashBreakdown && t.paymentMode === 'Cash') {
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
         this.cache.cashDrawer = drawer;
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
  deleteServiceJob(id: string) { this.cache.serviceJobs = this.cache.serviceJobs.filter(j => j.id !== id); this.persist(); }

  getBackupData() {
    return { 
      ...this.cache, 
      backupVersion: '2.6', 
      timestamp: new Date().toISOString(),
      appId: 'AA_PRO_ENTERPRISE'
    };
  }

  async restoreData(data: any) {
     if (!data || typeof data !== 'object') return { success: false, message: 'Invalid data format' };
     
     const defaults = getInitialCompanyData();
     
     // Merge incoming data with defaults to ensure all keys like cashDrawer exist
     this.cache = {
         ...defaults,
         ...data,
         profile: { ...defaults.profile, ...(data.profile || {}) },
         cloudConfig: { ...defaults.cloudConfig, ...(data.cloudConfig || {}) },
         cashDrawer: {
            ...defaults.cashDrawer,
            ...(data.cashDrawer || {}),
            notes: (data.cashDrawer?.notes && Array.isArray(data.cashDrawer.notes)) 
                   ? data.cashDrawer.notes 
                   : defaults.cashDrawer.notes
         }
     };

     this.persist();
     return { success: true };
  }

  async listTables() { return ['transactions', 'parties', 'products', 'accounts', 'serviceJobs', 'reminders']; }
  async getTableData(table: string) { return (this.cache as any)[table] || []; }
  getReplenishmentDraft() { return this.cache.replenishmentDraft || []; }
  updateReplenishmentDraft(d: any[]) { this.cache.replenishmentDraft = d; this.persist(); }
  clearReplenishmentDraft() { this.cache.replenishmentDraft = []; this.persist(); }
}

export const db = new DatabaseService();
