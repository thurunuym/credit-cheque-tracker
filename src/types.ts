export type ChequeStatus = 'PENDING' | 'BANKED' | 'REJECTED';

export interface Cheque {
  id: string; // Will map to _id from MongoDB or id from fallback DB
  shop?: string;
  bank: string;
  chequeNumber: string;
  amount: number;
  receivedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: ChequeStatus;
  remarks?: string;
  createdAt: string; // ISO String
}

export interface CreditInvoice {
  id: string;
  shop?: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  totalAmount: number;
  remarks?: string;
  createdAt: string; // ISO String
  // Computed fields (not stored, but useful in UI/API response)
  payments?: CreditPayment[];
  balance?: number;
}

export type PaymentMethod = 'cash' | 'cheque' | 'banked';

export interface CreditPayment {
  id: string;
  invoiceId: string;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  amount: number;
  remarks?: string;
  createdAt: string; // ISO String
}
