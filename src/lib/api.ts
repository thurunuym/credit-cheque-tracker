import { Cheque, CreditInvoice, CreditPayment } from '../types';

export async function fetchDbStatus(): Promise<{ isMongo: boolean }> {
  const res = await fetch('/api/db-status');
  if (!res.ok) throw new Error('Failed to fetch DB status');
  return res.json();
}

export async function fetchCheques(): Promise<Cheque[]> {
  const res = await fetch('/api/cheques');
  if (!res.ok) throw new Error('Failed to fetch cheques');
  return res.json();
}

export async function addCheque(cheque: Omit<Cheque, 'id' | 'createdAt'>): Promise<Cheque> {
  const res = await fetch('/api/cheques', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cheque),
  });
  if (!res.ok) throw new Error('Failed to add cheque');
  return res.json();
}

export async function updateCheque(id: string, updates: Partial<Cheque>): Promise<Cheque> {
  const res = await fetch(`/api/cheques/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update cheque');
  return res.json();
}

export async function deleteCheque(id: string): Promise<boolean> {
  const res = await fetch(`/api/cheques/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete cheque');
  const data = await res.json();
  return data.success;
}

export async function fetchCredits(): Promise<CreditInvoice[]> {
  const res = await fetch('/api/credits');
  if (!res.ok) throw new Error('Failed to fetch credit invoices');
  return res.json();
}

export async function addCreditInvoice(invoice: Omit<CreditInvoice, 'id' | 'createdAt'>): Promise<CreditInvoice> {
  const res = await fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error('Failed to add credit invoice');
  return res.json();
}

export async function deleteCreditInvoice(id: string): Promise<boolean> {
  const res = await fetch(`/api/credits/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete credit invoice');
  const data = await res.json();
  return data.success;
}

export async function addCreditPayment(
  invoiceId: string,
  payment: Omit<CreditPayment, 'id' | 'invoiceId' | 'createdAt'>
): Promise<CreditPayment> {
  const res = await fetch(`/api/credits/${invoiceId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  if (!res.ok) throw new Error('Failed to record payment');
  return res.json();
}

export async function deleteCreditPayment(paymentId: string): Promise<boolean> {
  const res = await fetch(`/api/payments/${paymentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete payment');
  const data = await res.json();
  return data.success;
}

export async function fetchShops(): Promise<string[]> {
  const res = await fetch('/api/shops');
  if (!res.ok) throw new Error('Failed to fetch shops');
  return res.json();
}

// Helper: Format amount in LKR with thousands separators
export function formatLKR(amount: number): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

// Helper: Format ISO date string to YYYY-MM-DD
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get friendly date string (e.g. "Jul 18, 2026")
export function formatFriendlyDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Helper: Calculate credit invoice outstanding balance
export function calculateBalance(invoice: CreditInvoice): number {
  if (invoice.balance !== undefined) return invoice.balance;
  const paymentsSum = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  return Math.max(0, invoice.totalAmount - paymentsSum);
}
