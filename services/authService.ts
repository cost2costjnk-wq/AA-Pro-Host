
import { UserRole, User, ActionLevel } from '../types';
import { openDB } from 'idb';

// Super Admin Configuration
export const SUPER_ADMIN_EMAIL_1 = 'sahakash2017@gmail.com';
const SUPER_ADMIN_PASSWORD_1 = 'pinki@1415';

// Default Business Admin
const DEFAULT_ADMIN_EMAIL = 'cost2costjnk@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Akash1415@';

const DB_NAME = 'aapro_enterprise_v2';
const COMPANIES_STORE = 'companies';
const DATA_STORE = 'company_data';
const GLOBAL_CONFIG_STORE = 'global_config';

export const authService = {
  getStoredCredentials() {
    try {
      const stored = localStorage.getItem('aapro_creds');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return { username: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD };
  },

  async login(username: string, password: string): Promise<boolean> {
    const email = username.toLowerCase().trim();
    const pass = password;

    if (email === SUPER_ADMIN_EMAIL_1 && pass === SUPER_ADMIN_PASSWORD_1) {
      localStorage.setItem('aapro_session', 'true');
      localStorage.setItem('aapro_user_role', 'SUPER_ADMIN');
      localStorage.setItem('aapro_logged_email', email);
      localStorage.setItem('aapro_is_super', 'true');
      return true;
    }

    const adminCreds = this.getStoredCredentials();
    if (email === adminCreds.username.toLowerCase() && pass === adminCreds.password) {
      localStorage.setItem('aapro_session', 'true');
      localStorage.setItem('aapro_user_role', 'ADMIN');
      localStorage.setItem('aapro_logged_email', email);
      localStorage.setItem('aapro_is_super', 'false');
      return true;
    }

    try {
      const db = await openDB(DB_NAME, 2);
      const companies = await db.getAll(COMPANIES_STORE);
      
      for (const company of companies) {
        const companyData = await db.get(DATA_STORE, company.id);
        if (companyData && companyData.users) {
          const staff = companyData.users.find((u: User) => 
            u.email.toLowerCase() === email && u.password === pass
          );
          
          if (staff) {
            localStorage.setItem('aapro_session', 'true');
            localStorage.setItem('aapro_user_role', staff.role);
            localStorage.setItem('aapro_logged_user', JSON.stringify(staff));
            localStorage.setItem('aapro_logged_email', email);
            localStorage.setItem('aapro_is_super', 'false');
            localStorage.setItem('active_company_id', company.id);
            return true;
          }
        }
      }
    } catch (e) {}

    return false;
  },

  getUserRole(): UserRole {
    return (localStorage.getItem('aapro_user_role') as UserRole) || 'ADMIN';
  },

  getLoggedUser(): User | null {
    try {
      const stored = localStorage.getItem('aapro_logged_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  },

  isSuperAdmin(): boolean {
    const role = localStorage.getItem('aapro_user_role');
    const email = localStorage.getItem('aapro_logged_email');
    const isSuperFlag = localStorage.getItem('aapro_is_super') === 'true';
    return isSuperFlag && role === 'SUPER_ADMIN' && email === SUPER_ADMIN_EMAIL_1;
  },

  isAuthenticated(): boolean {
    return localStorage.getItem('aapro_session') === 'true';
  },

  logout() {
    const keys = [
        'aapro_session', 'aapro_is_super', 'aapro_user_role', 
        'aapro_logged_user', 'aapro_logged_email'
    ];
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  },

  updateCredentials(newUsername: string, newPassword: string) {
    localStorage.setItem('aapro_creds', JSON.stringify({
      username: newUsername,
      password: newPassword
    }));
  },

  /**
   * Main permission check helper.
   * @param moduleId The module/tab ID (e.g., 'inventory')
   * @param action The requested action ('view', 'edit', 'delete')
   */
  can(moduleId: string, action: ActionLevel = 'view'): boolean {
    if (this.isSuperAdmin()) return true;
    const role = this.getUserRole();
    if (role === 'ADMIN') return true;

    const user = this.getLoggedUser();
    if (!user) return false;

    // Check for explicit "module:action" permission
    if (user.permissions && user.permissions.includes(`${moduleId}:${action}`)) {
      return true;
    }

    // Backwards compatibility for legacy flat arrays or if action isn't specified
    if (action === 'view' && user.permissions?.includes(moduleId)) {
      return true;
    }

    return false;
  },

  // Proxy for App navigation/Sidebar
  hasPermission(tabId: string): boolean {
    return this.can(tabId, 'view');
  }
};
