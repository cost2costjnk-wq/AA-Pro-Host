
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

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions: string[]; // Granular module access
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
  activatedAt: string; // ISO Date
  expiresAt: string;   // ISO Date
  status: 'active' | 'expired' | 'trial';
  deviceId?: string;   // Bound device identifier
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
  dbName: string; // The IndexedDB name for this company
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
  enabled: boolean; // Google Drive Enabled
  autoBackup: boolean; // Master Auto Backup Toggle
  backupSchedules: string[]; // Array of times e.g. ["10:00", "14:00", "18:00"]
  backupPathType?: 'default' | 'custom'; // 'default' = Downloads folder, 'custom' = Selected Directory
  backupLocationName?: string; // Display name of the selected folder
  lastBackup?: string; // Last successful backup time
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
  balance: number; // Positive = Receivable, Negative = Payable
  dueDate?: string; // Date when payment is expected
}

export interface Product {
  id: string;
  name: string;
  type?: 'goods' | 'service'; // Added to distinguish between stockable goods and services
  category?: string;
  stock: number;
  minStockLevel?: number; // Reorder threshold
  purchasePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  unit: string;
  // Multi-Unit Support
  secondaryUnit?: string;
  conversionRatio?: number; // How many Secondary units in 1 Primary unit? (e.g. 1 Dozen = 12 Pcs, Ratio = 12)
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string; // The unit used for this specific transaction line
  rate: number;
  discount?: number; // Discount amount
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
  paymentMode?: string; // Kept for display/legacy
  accountId?: string; // Link to specific Account
  transferAccountId?: string; // For transfers: ID of the destination account
  cashBreakdown?: {
      received: CashNoteCount[];
      returned: CashNoteCount[];
  };
}

export interface ServiceJob {
  id: string;
  ticketNumber: string;
  date: string; // Intake Date
  customerId?: string; // Optional link to Party
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  
  // Device Info
  deviceModel: string;
  deviceImei?: string; // Serial or IMEI
  devicePassword?: string; // Pattern or PIN
  problemDescription: string;
  
  // Status
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
  estimatedDelivery?: string;
  
  // Financials
  estimatedCost: number;
  advanceAmount: number;
  
  // Resolution / Billing
  technicianNotes?: string;
  usedParts: TransactionItem[];
  laborCharge: number;
  finalAmount: number; // (Parts + Labor) - Advance
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
  dateReceived: string; // From Customer
  
  vendorId?: string;
  vendorName?: string;
  dateSentToVendor?: string;
  dateReceivedFromVendor?: string;
  dateReturnedToCustomer?: string;
  
  status: 'RECEIVED' | 'SENT' | 'VENDOR_RETURNED' | 'CLOSED' | 'CANCELLED';
  notes?: string;
}
