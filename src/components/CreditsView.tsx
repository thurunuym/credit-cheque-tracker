import React, { useState } from 'react';
import { Receipt, Search, Filter, Calendar, TrendingDown, Clock, AlertTriangle, ChevronRight, X, Trash2, Coins, CreditCard, LandmarkIcon, Check, CalendarDays, Plus } from 'lucide-react';
import { CreditInvoice, CreditPayment, PaymentMethod } from '../types';
import { formatLKR, formatFriendlyDate, calculateBalance } from '../lib/api';

interface CreditsViewProps {
  invoices: CreditInvoice[];
  onAddCreditPayment: (invoiceId: string, payment: any) => Promise<any>;
  onDeleteCreditPayment: (paymentId: string) => Promise<boolean>;
  onDeleteInvoice: (id: string) => Promise<boolean>;
}

export default function CreditsView({
  invoices,
  onAddCreditPayment,
  onDeleteCreditPayment,
  onDeleteInvoice
}: CreditsViewProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date();

  // Calculations for Overdue thresholds
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(today.getDate() - 30);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setDate(today.getDate() - 60);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<CreditInvoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state for recording payment within Detail view
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash' as PaymentMethod,
    paymentDate: todayStr,
    remarks: ''
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Filters logic
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      (inv.shop && inv.shop.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const balance = calculateBalance(inv);
    let status: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
    if (balance === 0) {
      status = 'PAID';
    } else if (balance < inv.totalAmount) {
      status = 'PARTIAL';
    }

    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // OVERALL OUTSTANDING METRICS (Calculated across ALL invoices)
  const totalOutstandingBalance = invoices.reduce((sum, inv) => sum + calculateBalance(inv), 0);

  const outstandingInvoicesList = invoices.filter(inv => calculateBalance(inv) > 0);
  const totalOutstandingCount = outstandingInvoicesList.length;

  const over1MonthOverdueInvoices = outstandingInvoicesList.filter(inv => {
    const invDate = new Date(inv.invoiceDate);
    return invDate <= oneMonthAgo;
  });
  const over1MonthCount = over1MonthOverdueInvoices.length;
  const over1MonthBalance = over1MonthOverdueInvoices.reduce((sum, inv) => sum + calculateBalance(inv), 0);

  const over2MonthsOverdueInvoices = outstandingInvoicesList.filter(inv => {
    const invDate = new Date(inv.invoiceDate);
    return invDate <= twoMonthsAgo;
  });
  const over2MonthsCount = over2MonthsOverdueInvoices.length;
  const over2MonthsBalance = over2MonthsOverdueInvoices.reduce((sum, inv) => sum + calculateBalance(inv), 0);

  // Handle open detail view
  const handleOpenDetail = (invoice: CreditInvoice) => {
    setSelectedInvoice(invoice);
    const balance = calculateBalance(invoice);
    setPaymentForm({
      amount: String(balance),
      paymentMethod: 'cash',
      paymentDate: todayStr,
      remarks: ''
    });
  };

  // Record payment in detail view
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    setIsSavingPayment(true);
    try {
      const added = await onAddCreditPayment(selectedInvoice.id, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        remarks: paymentForm.remarks
      });

      // Update the active selected invoice payments locally to reflect immediately in the UI
      const updatedPayments = [...(selectedInvoice.payments || []), added];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const updatedInvoice: CreditInvoice = {
        ...selectedInvoice,
        payments: updatedPayments,
        balance: selectedInvoice.totalAmount - totalPaid
      };
      setSelectedInvoice(updatedInvoice);

      // Reset payment form
      const newBalance = Math.max(0, updatedInvoice.totalAmount - totalPaid);
      setPaymentForm({
        amount: String(newBalance),
        paymentMethod: 'cash',
        paymentDate: todayStr,
        remarks: ''
      });
    } catch (err) {
      console.error('Error adding payment:', err);
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Delete payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedInvoice) return;
    if (window.confirm('Delete this payment record? This will restore the invoice balance.')) {
      try {
        await onDeleteCreditPayment(paymentId);

        // Remove payment locally
        const updatedPayments = (selectedInvoice.payments || []).filter(p => p.id !== paymentId);
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const updatedInvoice: CreditInvoice = {
          ...selectedInvoice,
          payments: updatedPayments,
          balance: selectedInvoice.totalAmount - totalPaid
        };
        setSelectedInvoice(updatedInvoice);

        // Update payment form default amount
        setPaymentForm(prev => ({
          ...prev,
          amount: String(updatedInvoice.totalAmount - totalPaid)
        }));
      } catch (err) {
        console.error('Error deleting payment:', err);
      }
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      await onDeleteInvoice(selectedInvoice.id);
      setSelectedInvoice(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  // Get color and text for invoice status
  const getInvoiceStatus = (invoice: CreditInvoice) => {
    const balance = calculateBalance(invoice);
    if (balance <= 0) {
      return { label: 'PAID', bg: 'bg-green-50 text-green-700 border-green-200' };
    }
    if (balance < invoice.totalAmount) {
      return { label: 'PARTIAL', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: 'UNPAID', bg: 'bg-red-50 text-red-700 border-red-200' };
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* METRICS HEADER BARS */}
      <div id="credits-summary-header" className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* TOTAL OUTSTANDING */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">Total Outstanding</p>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-black text-red-600">{formatLKR(totalOutstandingBalance)}</p>
          <p className="mt-1 text-2xs text-gray-400">Due across {totalOutstandingCount} unpaid invoices</p>
        </div>

        {/* OVER 1 MONTH OVERDUE */}
        <div className="rounded-xl border border-gray-200 bg-amber-25/30 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold text-amber-800 uppercase tracking-wider">Over 1 Month Overdue</p>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-black text-amber-600">{formatLKR(over1MonthBalance)}</p>
          <p className="mt-1 text-2xs text-amber-700"><b>{over1MonthCount}</b> bills older than 30 days</p>
        </div>

        {/* OVER 2 MONTHS OVERDUE */}
        <div className="rounded-xl border border-gray-200 bg-red-25/30 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold text-red-800 uppercase tracking-wider">Over 2 Months Overdue</p>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-black text-red-600">{formatLKR(over2MonthsBalance)}</p>
          <p className="mt-1 text-2xs text-red-700"><b>{over2MonthsCount}</b> bills older than 60 days</p>
        </div>

      </div>

      {/* FILTER AND LIST BOARD */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">

        {/* Filter Controls Header */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Receipt className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-gray-900">Credit Bill Registry</h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Shop/Invoice Number */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search shop or invoice no"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full sm:w-56 rounded-lg border border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex rounded-lg border border-gray-300 p-0.5 bg-white shadow-3xs">
              {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-3xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${statusFilter === status
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice Grid/List */}
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">No Credit Bills Found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              We couldn't find any credit invoices matching "{searchTerm || statusFilter}". Clear your criteria to start over.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-150">
            {filteredInvoices.map(invoice => {
              const balance = calculateBalance(invoice);
              const status = getInvoiceStatus(invoice);
              const isOverdue1Month = new Date(invoice.invoiceDate) <= oneMonthAgo && balance > 0;
              const isOverdue2Months = new Date(invoice.invoiceDate) <= twoMonthsAgo && balance > 0;

              return (
                <div
                  key={invoice.id}
                  id={`credit-row-${invoice.id}`}
                  onClick={() => handleOpenDetail(invoice)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
                >
                  {/* Shop Details */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {invoice.shop || 'Unknown Shop'}
                      </span>
                      <span className="font-mono text-2xs text-gray-400">
                        {invoice.invoiceNumber}
                      </span>
                      {isOverdue2Months ? (
                        <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-4xs font-bold text-red-700 ring-1 ring-inset ring-red-600/10">
                          OVER 60d
                        </span>
                      ) : isOverdue1Month ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-4xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/10">
                          OVER 30d
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-2xs text-gray-500">
                      <span>Inv Date: <b>{formatFriendlyDate(invoice.invoiceDate)}</b></span>
                      <span className="text-gray-300">•</span>
                      <span>Total: <b>{formatLKR(invoice.totalAmount)}</b></span>
                    </div>
                  </div>

                  {/* Financial Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right sm:mr-2">
                      <p className="text-2xs text-gray-400">Balance Remaining</p>
                      <p className={`font-mono text-sm font-bold ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatLKR(balance)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-3xs font-semibold border ${status.bg}`}>
                        {status.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER / DETAILS SLIDE OUT PANEL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-left border-l border-gray-200">

            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <div>
                <span className="inline-flex items-center rounded-md bg-teal-50 px-1.5 py-0.5 text-4xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/10">
                  CREDIT INVOICE DETAIL
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {selectedInvoice.shop || 'Unknown Shop'}
                </h3>
                <p className="text-3xs text-gray-500 font-mono mt-0.5">#{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Invoice Summary Board */}
              <div className="rounded-xl border border-gray-150 p-4 bg-gray-50/50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-4xs font-bold text-gray-400 uppercase tracking-wider">Invoice Date</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{formatFriendlyDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-4xs font-bold text-gray-400 uppercase tracking-wider">Total Value</p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">{formatLKR(selectedInvoice.totalAmount)}</p>
                </div>
                <div className="col-span-2 border-t border-gray-200 pt-2.5">
                  <p className="text-4xs font-bold text-gray-400 uppercase tracking-wider">Outstanding Balance</p>
                  <p className={`text-base font-mono font-bold mt-0.5 ${calculateBalance(selectedInvoice) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatLKR(calculateBalance(selectedInvoice))}
                  </p>
                </div>
                {selectedInvoice.remarks && (
                  <div className="col-span-2 border-t border-gray-200 pt-2.5">
                    <p className="text-4xs font-bold text-gray-400 uppercase tracking-wider">Bill Remarks</p>
                    <p className="text-3xs text-gray-500 mt-0.5 leading-relaxed">{selectedInvoice.remarks}</p>
                  </div>
                )}
              </div>

              {/* Payment Logs */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2">
                  Collection Receipt Log
                </h4>

                {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) ? (
                  <p className="text-xs text-gray-400 italic py-4">No payment history recorded yet.</p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {selectedInvoice.payments.map((p, idx) => (
                      <div key={p.id} className="rounded-lg border border-gray-150 p-3 bg-white flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold font-mono text-gray-800">{formatLKR(p.amount)}</span>
                            <span className="text-gray-300 font-mono text-3xs">|</span>
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-4xs font-semibold border ${p.paymentMethod === 'cash'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : p.paymentMethod === 'cheque'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                              {p.paymentMethod}
                            </span>
                          </div>
                          <p className="text-4xs text-gray-400">Date: {formatFriendlyDate(p.paymentDate)}</p>
                          {p.remarks && <p className="text-3xs text-gray-500 italic mt-0.5">“{p.remarks}”</p>}
                        </div>

                        <button
                          title="Delete payment record"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-gray-100 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Record New Payment from detail view */}
              {calculateBalance(selectedInvoice) > 0 && (
                <div className="border-t border-gray-200 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    Record New Collection Payment
                  </h4>

                  <form onSubmit={handlePaymentSubmit} className="space-y-3 bg-teal-20/5 p-4 rounded-xl border border-teal-150/40">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-4xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={paymentForm.amount}
                          onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-4xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentForm.paymentDate}
                          onChange={e => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                          className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-4xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Method
                      </label>
                      <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
                        {['cash', 'cheque', 'banked'].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentForm(p => ({ ...p, paymentMethod: method as PaymentMethod }))}
                            className={`flex-1 flex items-center justify-center py-1 rounded-md text-3xs font-medium cursor-pointer ${paymentForm.paymentMethod === method
                              ? 'bg-white text-teal-900 shadow-3xs border border-teal-500 font-semibold'
                              : 'border border-transparent text-gray-500 hover:text-gray-900'
                              }`}
                          >
                            {method === 'cash' ? (
                              <Coins className="h-3 w-3 mr-0.5 text-amber-500" />
                            ) : method === 'cheque' ? (
                              <CreditCard className="h-3 w-3 mr-0.5 text-teal-500" />
                            ) : (
                              <LandmarkIcon className="h-3 w-3 mr-0.5 text-blue-500" />
                            )}
                            <span className="capitalize">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-4xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="Optional receipt notes..."
                        value={paymentForm.remarks}
                        onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingPayment}
                      className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>{isSavingPayment ? 'Recording...' : 'Confirm Payment'}</span>
                    </button>
                  </form>
                </div>
              )}

            </div>

            {/* Drawer Footer - Delete Invoice */}
            <div className="p-4 border-t border-gray-150 flex items-center justify-between bg-gray-50">
              <button
                id="btn-delete-invoice"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-25/35 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Credit Invoice</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl animate-scale-in text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-900">Delete Credit Invoice?</h3>
            <p className="mt-2 text-xs text-gray-500">
              Are you sure you want to delete invoice <b className="font-semibold text-gray-800 font-mono">#{selectedInvoice.invoiceNumber}</b>?
              This will permanently delete the invoice and all of its recorded payment receipts. This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvoice}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 cursor-pointer"
              >
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
