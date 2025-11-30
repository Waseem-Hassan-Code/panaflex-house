export type Role = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
export type InvoiceStatus = "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK" | "CHEQUE" | "ONLINE";
export type EntityType = "CLIENT" | "INVOICE" | "PAYMENT" | "USER";
export type ActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PAYMENT_RECEIVED"
  | "STATUS_CHANGE"
  | "ACTIVATE"
  | "DEACTIVATE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  isSeeded?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string | null;
  updatedById?: string | null;
  createdBy?: User | null;
  updatedBy?: User | null;
}

export interface Client {
  id: string;
  clientId: string; // AUTO_001, CLIENT_002, etc.
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  cnic?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById?: string | null;
  createdBy?: User;
  updatedBy?: User | null;
  invoices?: Invoice[];
  paymentsReceived?: PaymentReceived[];
  totalBalance?: number; // Calculated field
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  sNo: number;
  itemName: string;
  width: number;
  height: number;
  quantity: number;
  sqf: number;
  rate: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client?: Client;
  invoiceDate: Date;
  dueDate?: Date | null;
  itemsSubtotal?: number;
  labourCost?: number;
  subtotal: number;
  previousBalance: number;
  totalAmount: number;
  discount?: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById?: string | null;
  createdBy?: User;
  updatedBy?: User | null;
  items?: InvoiceItem[];
  paymentsReceived?: PaymentReceived[];
  labourCosts?: LabourCost[];
  previousInvoiceId?: string | null;
  previousInvoice?: Invoice | null;
}

export interface LabourCost {
  id: string;
  invoiceId: string;
  description: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentReceived {
  id: string;
  receiptNumber: string;
  clientId: string;
  client?: Client;
  invoiceId: string;
  invoice?: Invoice;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  createdAt: Date;
  createdById: string;
  createdBy?: User;
}

export interface TransactionLog {
  id: string;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  details: Record<string, unknown>;
  userId: string;
  user?: User;
  createdAt: Date;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Dashboard Stats
export interface DashboardStats {
  totalPaymentsToday: number;
  totalPaymentsThisMonth: number;
  totalInvoicesToday: number;
  totalInvoicesThisMonth: number;
  pendingAmount: number;
  activeClients: number;
  recentInvoices: Invoice[];
  recentPayments: PaymentReceived[];
  dailyPayments: { date: string; amount: number }[];
  dailyInvoices: { date: string; count: number; amount: number }[];
}

// Search result type
export interface GlobalSearchResult {
  type: "client" | "invoice" | "payment";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}
