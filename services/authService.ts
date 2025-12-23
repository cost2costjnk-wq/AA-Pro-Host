
import { UserRole, User } from '../types';
import { openDB } from 'idb';

export const SUPER_ADMIN_EMAIL_1 = 'sahakash2017@gmail.com';
export const SUPER_ADMIN_EMAIL_2 = 'cost2costjnk@gmail.com';

const SUPER_ADMIN_PASSWORD_1 = 'pinki@1415';
const SUPER_ADMIN_PASSWORD_2 = 'Akash1415@';

const DB_NAME = 'aapro_enterprise_v2';
const COMPANIES_STORE = 'companies';
const DATA_STORE = 'company_data';
const GLOBAL_CONFIG_STORE = 'global_config';

export const authService = {
  getStoredCredentials() {
    const stored = localStorage.getItem('aapro_creds');
    if (stored) {
      return JSON.parse(stored);
    }
    // Default master credentials
    return { username: SUPER_ADMIN_EMAIL_2, password: SUPER_ADMIN_PASSWORD_2 };
  },

  async login(username: string, password: string): Promise<boolean> {
    const email = username.toLowerCase().trim();

    // 1. Dual-Key Super Admin Check
    // Requirement: Panel can only be accessed by cost2costjnk@gmail.com and sahakash2017@gmail.com
    const isPrimarySuper = email === SUPER_ADMIN_EMAIL_1 && password === SUPER_ADMIN_PASSWORD_1;
    const isSecondarySuper = email === SUPER_ADMIN_EMAIL_2 && password === SUPER_ADMIN_PASSWORD_2;

    if (isPrimarySuper || isSecondarySuper) {
      // Logic for "If both present": In this context, both hardcoded keys are 'present' in the logic.
      // We grant SUPER_ADMIN status only to these two specific accounts.
      localStorage.setItem('aapro_session', 'true');
      localStorage.setItem('aapro_is_super', 'true');
      localStorage.setItem('aapro_user_role', 'SUPER_ADMIN');
      localStorage.setItem('aapro_logged_email', email);
      return true;
    }

    // 2. Company Admin (Master Account) - If it was changed from default
    const adminCreds = this.getStoredCredentials();
    if (email === adminCreds.username.toLowerCase() && password === adminCreds.password) {
      localStorage.setItem('aapro_session', 'true');
      localStorage.setItem('aapro_is_super', 'false');
      localStorage.setItem('aapro_user_role', 'ADMIN');
      localStorage.setItem('aapro_logged_email', email);
      return true;
    }

    // 3. Scan all companies for Staff Login using IndexedDB
    try {
      const db = await openDB(DB_NAME, 2, {
        upgrade(db) {
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

      const companies = await db.getAll(COMPANIES_STORE);
      for (const company of companies) {
        const companyData = await db.get(DATA_STORE, company.id);
        if (companyData) {
          const staff = (companyData.users || []).find((u: User) => u.email.toLowerCase() === email && u.password === password);
          if (staff) {
            localStorage.setItem('aapro_session', 'true');
            localStorage.setItem('aapro_is_super', 'false');
            localStorage.setItem('aapro_user_role', staff.role);
            localStorage.setItem('aapro_logged_user', JSON.stringify(staff));
            localStorage.setItem('aapro_logged_email', email);
            localStorage.setItem('active_company_id', company.id);
            return true;
          }
        }
      }
    } catch (e) {
      console.error("Auth DB scan failed", e);
    }

    return false;
  },

  getUserRole(): UserRole {
    return (localStorage.getItem('aapro_user_role') as UserRole) || 'ADMIN';
  },

  getLoggedUser(): User | null {
    const stored = localStorage.getItem('aapro_logged_user');
    return stored ? JSON.parse(stored) : null;
  },

  isSuperAdmin(): boolean {
    const role = this.getUserRole();
    const email = localStorage.getItem('aapro_logged_email');
    
    // Strict Verification: Role must be SUPER_ADMIN AND email must be one of the two authorized keys
    return role === 'SUPER_ADMIN' && (email === SUPER_ADMIN_EMAIL_1 || email === SUPER_ADMIN_EMAIL_2);
  },

  isAuthenticated(): boolean {
    return localStorage.getItem('aapro_session') === 'true';
  },

  logout() {
    localStorage.removeItem('aapro_session');
    localStorage.removeItem('aapro_is_super');
    localStorage.removeItem('aapro_user_role');
    localStorage.removeItem('aapro_logged_user');
    localStorage.removeItem('aapro_logged_email');
    window.location.reload();
  },

  updateCredentials(newUsername: string, newPassword: string) {
    localStorage.setItem('aapro_creds', JSON.stringify({
      username: newUsername,
      password: newPassword
    }));
  },

  hasPermission(tabId: string): boolean {
    const role = this.getUserRole();
    
    // If the user is a verified Super Admin, they have all permissions
    if (this.isSuperAdmin()) return true;
    
    // Standard Admin role
    if (role === 'ADMIN') return true;

    const user = this.getLoggedUser();
    if (user && user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.includes(tabId);
    }

    const permissions: Record<string, string[]> = {
      SALESMAN: [
        'dashboard', 'parties', 'inventory', 'service-center', 
        'warranty-return', 'pricelist', 'sales-invoices', 
        'sales-payment-in', 'sales-quotations', 'sales-return', 
        'shortcut-keys'
      ],
      ACCOUNTANT: [
        'dashboard', 'reports', 'cash-drawer', 'expense', 
        'manage-accounts', 'parties', 'sales-payment-in', 
        'purchase-payment-out', 'receivable-aging'
      ],
      DATA_ENTRY: [
        'inventory', 'parties', 'pricelist', 'purchase-bills', 
        'purchase-payment-out', 'purchase-auto-order', 
        'purchase-orders', 'purchase-return'
      ]
    };

    return permissions[role]?.includes(tabId) || false;
  }
};
