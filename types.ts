
export interface DashboardStat {
  label: string;
  value: number;
  type: 'money-in' | 'money-out' | 'neutral';
  period?: string;
  color: 'green' | 'red' | 'blue' | 'purple';
}

export interface CashFlowData {
  day: string;
  moneyIn: number;
  moneyOut: number;
}

export interface NavItem {
  icon: any;
  label: string;
  id: string;
  subItems?: { id: string; label: string }[];
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  type?: 'manual' | 'system_stock' | 'system_due' | 'party_due' | 'party_deadline';
  priority?: 'high' | 'medium' | 'low';
  amount?: number;
}

// User & Permissions
export type UserRole = 'ADMIN' | 'SALESMAN' | 'ACCOUNTANT' | 'DATA_ENTRY' | 'SUPER_ADMIN';
export type ActionLevel = 'view' | 'edit' | 'delete';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions: string[]; // Format: 'moduleId:action' (e.g., 'inventory:edit')
  createdAt: string;
}

// Cash Drawer Types
export type Denomination = 1000 | 500 | 100 | 50 | 20 | 10 | 5 | 2 | 1;

export interface CashNoteCount {
  denomination: Denomination;
  count: number;
}

export interface CashDrawer {
  notes: CashNoteCount[];
  lastUpdated: string;
}

// Subscription Types
export interface SubscriptionInfo {
  licenseKey: string;
  activatedAt: string; 
  expiresAt: string;   
  status: 'active' | 'expired' | 'trial';
  deviceId?: string;   
}

export interface IssuedLicense {
  id: string;
  clientName: string;
  contactNumber: string;
  deviceId: string;
  licenseKey: string;
  issuedAt: string;
  expiresAt: string;
}

// Data Models
export interface Company {
  id: string;
  name: string;
  dbName: string; 
  created: string;
}

export interface BusinessProfile {
  name: string;
  address: string;
  pan: string;
  phone: string;
  email?: string;
  logoUrl?: string;
}

export interface DatabaseConfig {
  mode: 'local' | 'mysql' | 'sqlite';
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  filepath?: string;
}

export interface CloudConfig {
  enabled: boolean; 
  autoBackup: boolean; 
  backupSchedules: string[]; 
  backupPathType?: 'default' | 'custom'; 
  backupLocationName?: string; 
  lastBackup?: string; 
  googleClientId: string;
  
  // Legacy fields
  backupTime?: string; 
  autoLocalBackup?: boolean;
  lastLocalBackup?: string;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'Cash' | 'Bank' | 'Mobile Wallet' | 'Other';
  balance: number;
  isDefault?: boolean;
  bankName?: string;
  accountNumber?: string;
}

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  phone?: string;
  address?: string;
  balance: number; 
  dueDate?: string; 
}

export interface Product {
  id: string;
  name: string;
  type?: 'goods' | 'service'; 
  category?: string;
  stock: number;
  minStockLevel?: number; 
  purchasePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  unit: string;
  secondaryUnit?: string;
  conversionRatio?: number; 
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string; 
  rate: number;
  discount?: number; 
  amount: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'QUOTATION' | 'PURCHASE_ORDER' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'EXPENSE' | 'STOCK_ADJUSTMENT' | 'TRANSFER' | 'BALANCE_ADJUSTMENT';
  partyId: string;
  partyName: string;
  items: TransactionItem[];
  subTotal?: number;
  discount?: number;
  tax?: number;
  extraCharges?: number;
  totalAmount: number;
  notes?: string;
  category?: string;
  paymentMode?: string; 
  accountId?: string; 
  transferAccountId?: string; 
  cashBreakdown?: {
      received: CashNoteCount[];
      returned: CashNoteCount[];
  };
}

export interface ServiceJob {
  id: string;
  ticketNumber: string;
  date: string; 
  customerId?: string; 
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deviceModel: string;
  deviceImei?: string; 
  devicePassword?: string; 
  problemDescription: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
  estimatedDelivery?: string;
  estimatedCost: number;
  advanceAmount: number;
  technicianNotes?: string;
  usedParts: TransactionItem[];
  laborCharge: number;
  finalAmount: number; 
}

export interface WarrantyItem {
  id: string;
  productId: string;
  productName: string;
  serialNumber: string;
  problemDescription: string;
}

export interface WarrantyCase {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  items: WarrantyItem[];
  dateReceived: string; 
  vendorId?: string;
  vendorName?: string;
  dateSentToVendor?: string;
  dateReceivedFromVendor?: string;
  dateReturnedToCustomer?: string;
  status: 'RECEIVED' | 'SENT' | 'VENDOR_RETURNED' | 'CLOSED' | 'CANCELLED';
  notes?: string;
}
