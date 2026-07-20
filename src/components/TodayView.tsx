import React, { useState } from 'react';
import { Landmark, Receipt, Sparkles, Send, Coins, CreditCard, LandmarkIcon, Check, ChevronDown, ChevronUp, Search } from 'lucide-react';
import ShopAutocomplete from './ShopAutocomplete';
import { Cheque, CreditInvoice, PaymentMethod } from '../types';
import { formatLKR, formatFriendlyDate, calculateBalance } from '../lib/api';

interface TodayViewProps {
  invoices: CreditInvoice[];
  shops: string[];
  onAddCheque: (cheque: any) => Promise<any>;
  onAddCreditInvoice: (invoice: any) => Promise<any>;
  onRecordPayment: (invoiceId: string, payment: any) => Promise<any>;
}

export default function TodayView({
  invoices,
  shops,
  onAddCheque,
  onAddCreditInvoice,
  onRecordPayment
}: TodayViewProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Cheque form states
  const [chequeForm, setChequeForm] = useState({
    shop: '',
    bank: '',
    chequeNumber: '',
    amount: '',
    receivedDate: todayStr,
    dueDate: todayStr,
    remarks: '',
    status: 'PENDING' as const
  });
  const [isSubmittingCheque, setIsSubmittingCheque] = useState(false);
  const [chequeSuccess, setChequeSuccess] = useState(false);

  // Credit Invoice form states
  const [invoiceForm, setInvoiceForm] = useState({
    shop: '',
    invoiceNumber: '',
    invoiceDate: todayStr,
    totalAmount: '',
    remarks: ''
  });
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  // Expanded payment forms states: map of invoiceId -> payment data or null
  const [activePaymentInvoiceId, setActivePaymentInvoiceId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash' as PaymentMethod,
    paymentDate: todayStr,
    remarks: ''
  });
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Search input for outstanding collections
  const [collectionSearchTerm, setCollectionSearchTerm] = useState('');

  // Filter out credit invoices that are outstanding from previous dates (before today)
  const outstandingInvoices = invoices.filter(inv => {
    const isBeforeToday = inv.invoiceDate < todayStr;
    const balance = calculateBalance(inv);
    return isBeforeToday && balance > 0;
  });

  const filteredOutstandingInvoices = outstandingInvoices.filter(inv => {
    const matchesSearch =
      (inv.shop && inv.shop.toLowerCase().includes(collectionSearchTerm.toLowerCase())) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(collectionSearchTerm.toLowerCase())) ||
      collectionSearchTerm === '';
    return matchesSearch;
  });

  const handleChequeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeForm.bank || !chequeForm.chequeNumber || !chequeForm.amount) return;
    setIsSubmittingCheque(true);
    try {
      await onAddCheque({
        ...chequeForm,
        amount: Number(chequeForm.amount)
      });
      setChequeSuccess(true);
      setChequeForm({
        shop: '',
        bank: '',
        chequeNumber: '',
        amount: '',
        receivedDate: todayStr,
        dueDate: todayStr,
        remarks: '',
        status: 'PENDING'
      });
      setTimeout(() => setChequeSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding cheque:', err);
    } finally {
      setIsSubmittingCheque(false);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.invoiceNumber || !invoiceForm.totalAmount) return;
    setIsSubmittingInvoice(true);
    try {
      await onAddCreditInvoice({
        ...invoiceForm,
        totalAmount: Number(invoiceForm.totalAmount)
      });
      setInvoiceSuccess(true);
      setInvoiceForm({
        shop: '',
        invoiceNumber: '',
        invoiceDate: todayStr,
        totalAmount: '',
        remarks: ''
      });
      setTimeout(() => setInvoiceSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding credit invoice:', err);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleOpenPaymentForm = (invoice: CreditInvoice) => {
    const balance = calculateBalance(invoice);
    setActivePaymentInvoiceId(invoice.id);
    setPaymentForm({
      amount: String(balance),
      paymentMethod: 'cash',
      paymentDate: todayStr,
      remarks: ''
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent, invoiceId: string) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    setIsRecordingPayment(true);
    try {
      await onRecordPayment(invoiceId, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        remarks: paymentForm.remarks
      });
      setActivePaymentInvoiceId(null);
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">



      {/* Grid containing Quick-add forms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ADD CHEQUE PANEL */}
        <div id="quick-add-cheque-card" className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Receive Cheque</h2>
              <p className="text-xs text-gray-500">Log a newly received customer cheque</p>
            </div>
          </div>

          <form onSubmit={handleChequeSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Shop / Customer</label>
                <ShopAutocomplete
                  value={chequeForm.shop}
                  onChange={val => setChequeForm(prev => ({ ...prev, shop: val }))}
                  placeholder="Type or select shop..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Bank <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Bank"
                  value={chequeForm.bank}
                  onChange={e => setChequeForm(prev => ({ ...prev, bank: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Cheque Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 450123"
                  value={chequeForm.chequeNumber}
                  onChange={e => setChequeForm(prev => ({ ...prev, chequeNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Amount (LKR) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={chequeForm.amount}
                  onChange={e => setChequeForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Received Date</label>
                <input
                  type="date"
                  required
                  value={chequeForm.receivedDate}
                  onChange={e => setChequeForm(prev => ({ ...prev, receivedDate: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Due Date (Bankable Date)</label>
                <input
                  type="date"
                  required
                  value={chequeForm.dueDate}
                  onChange={e => setChequeForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Remarks (Optional)</label>
              <textarea
                rows={1}
                placeholder="Any special terms or notes..."
                value={chequeForm.remarks}
                onChange={e => setChequeForm(prev => ({ ...prev, remarks: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">

              <button
                id="btn-add-cheque-submit"
                type="submit"
                disabled={isSubmittingCheque}
                className="flex items-center space-x-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {chequeSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Added Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{isSubmittingCheque ? 'Saving...' : 'Add Cheque'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ADD CREDIT INVOICE PANEL */}
        <div id="quick-add-invoice-card" className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Record Credit Invoice</h2>
              <p className="text-xs text-gray-500">Record a new credit sale bill</p>
            </div>
          </div>

          <form onSubmit={handleInvoiceSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Shop / Customer</label>
                <ShopAutocomplete
                  value={invoiceForm.shop}
                  onChange={val => setInvoiceForm(prev => ({ ...prev, shop: val }))}
                  placeholder="Type or select shop..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Invoice Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-1042"
                  value={invoiceForm.invoiceNumber}
                  onChange={e => setInvoiceForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">Invoice Date</label>
                <input
                  type="date"
                  required
                  value={invoiceForm.invoiceDate}
                  onChange={e => setInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">Total Amount (LKR) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={invoiceForm.totalAmount}
                  onChange={e => setInvoiceForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">Remarks (Optional)</label>
              <textarea
                rows={2}
                placeholder="Product description or credit terms..."
                value={invoiceForm.remarks}
                onChange={e => setInvoiceForm(prev => ({ ...prev, remarks: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-2xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">

              <button
                id="btn-add-invoice-submit"
                type="submit"
                disabled={isSubmittingInvoice}
                className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {invoiceSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Added Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{isSubmittingInvoice ? 'Saving...' : 'Add Invoice'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* TODAY'S CREDIT COLLECTIONS */}
      <div id="today-credit-collection-section" className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-4 gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 flex items-center">
              <Sparkles className="h-4 w-4 mr-1.5 text-teal-600" />
              Credit Collections Today
            </h2>

          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search shop or invoice no..."
                value={collectionSearchTerm}
                onChange={e => setCollectionSearchTerm(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 w-full rounded-lg border border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <span className="inline-flex items-center justify-center rounded-md bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/10 font-mono self-start sm:self-auto">
              {filteredOutstandingInvoices.length} Bills Available
            </span>
          </div>
        </div>

        {outstandingInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Coins className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-medium text-gray-900">All caught up!</h3>
            <p className="mt-1 text-xs text-gray-500">No outstanding invoices from prior days require collection.</p>
          </div>
        ) : filteredOutstandingInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="mt-3 text-sm font-medium text-gray-900">No matching collections</h3>
            <p className="mt-1 text-xs text-gray-500">No bills match your search criteria. Try a different search term.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {filteredOutstandingInvoices.map(invoice => {
              const balance = calculateBalance(invoice);
              const isExpanded = activePaymentInvoiceId === invoice.id;

              return (
                <div
                  key={invoice.id}
                  id={`collection-item-${invoice.id}`}
                  className={`rounded-lg border transition-all ${isExpanded
                    ? 'border-teal-500 bg-teal-20/10 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                >
                  {/* Top Row / Card Header */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {invoice.shop || 'Unknown Shop'}
                        </span>
                        <span className="font-mono text-2xs text-gray-400">
                          {invoice.invoiceNumber}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-2xs text-gray-500">
                        <span>Invoice Date: <b>{formatFriendlyDate(invoice.invoiceDate)}</b></span>
                        <span className="text-gray-300">•</span>
                        <span>Total: <b>{formatLKR(invoice.totalAmount)}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <p className="text-2xs text-gray-400">Outstanding Balance</p>
                        <p className="text-sm font-bold text-red-600 font-mono">
                          {formatLKR(balance)}
                        </p>
                      </div>

                      <button
                        id={`btn-collect-payment-${invoice.id}`}
                        onClick={() => {
                          if (isExpanded) {
                            setActivePaymentInvoiceId(null);
                          } else {
                            handleOpenPaymentForm(invoice);
                          }
                        }}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs border transition-colors cursor-pointer ${isExpanded
                          ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          : 'bg-teal-600 text-white border-transparent hover:bg-teal-700'
                          }`}
                      >
                        <span>{isExpanded ? 'Cancel' : 'Collect'}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Payment Form (Direct Action Row) */}
                  {isExpanded && (
                    <div className="border-t border-teal-100 bg-white p-4 rounded-b-lg">
                      <form onSubmit={e => handlePaymentSubmit(e, invoice.id)} className="space-y-4">
                        <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                          Record Collection Payment
                        </h4>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          {/* Payment Method - Custom Large Selectable Tabs */}
                          <div>
                            <label className="block text-2xs font-medium text-gray-600 mb-1">
                              Payment Method
                            </label>
                            <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
                              <button
                                type="button"
                                onClick={() => setPaymentForm(p => ({ ...p, paymentMethod: 'cash' }))}
                                className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${paymentForm.paymentMethod === 'cash'
                                  ? 'bg-white text-teal-900 shadow-3xs border border-teal-500 font-semibold'
                                  : 'border border-transparent text-gray-500 hover:text-gray-900'
                                  }`}
                              >
                                <Coins className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                Cash
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentForm(p => ({ ...p, paymentMethod: 'cheque' }))}
                                className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${paymentForm.paymentMethod === 'cheque'
                                  ? 'bg-white text-teal-900 shadow-3xs border border-teal-500 font-semibold'
                                  : 'border border-transparent text-gray-500 hover:text-gray-900'
                                  }`}
                              >
                                <CreditCard className="h-3.5 w-3.5 mr-1 text-teal-500" />
                                Cheque
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentForm(p => ({ ...p, paymentMethod: 'banked' }))}
                                className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${paymentForm.paymentMethod === 'banked'
                                  ? 'bg-white text-teal-900 shadow-3xs border border-teal-500 font-semibold'
                                  : 'border border-transparent text-gray-500 hover:text-gray-900'
                                  }`}
                              >
                                <LandmarkIcon className="h-3.5 w-3.5 mr-1 text-blue-500" />
                                Banked
                              </button>
                            </div>
                          </div>

                          {/* Collection Amount */}
                          <div>
                            <label className="block text-2xs font-medium text-gray-600 mb-1">
                              Amount Collected (LKR)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              placeholder="0.00"
                              value={paymentForm.amount}
                              onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                              className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold text-gray-800"
                            />
                          </div>

                          {/* Collection Date */}
                          <div>
                            <label className="block text-2xs font-medium text-gray-600 mb-1">
                              Date Collected
                            </label>
                            <input
                              type="date"
                              required
                              value={paymentForm.paymentDate}
                              onChange={e => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                              className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
                          <div className="md:col-span-9">
                            <label className="block text-2xs font-medium text-gray-600 mb-1">
                              Payment Remarks (Optional)
                            </label>
                            <input
                              type="text"
                              value={paymentForm.remarks}
                              onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                              className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            />
                          </div>

                          <div className="md:col-span-3 flex justify-end">
                            <button
                              id={`btn-submit-collection-payment-${invoice.id}`}
                              type="submit"
                              disabled={isRecordingPayment}
                              className="w-full flex items-center justify-center space-x-1 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                              <span>{isRecordingPayment ? 'Recording...' : 'Confirm Receipt'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Instant balance calculator display */}
                        {Number(paymentForm.amount) > 0 && (
                          <div className="rounded-md bg-gray-50 p-2.5 text-2xs flex justify-between font-mono text-gray-600 border border-gray-100">
                            <span>Outstanding: <b>{formatLKR(balance)}</b></span>
                            <span className="text-gray-400">-</span>
                            <span>Payment: <b>{formatLKR(Number(paymentForm.amount))}</b></span>
                            <span className="text-gray-400">=</span>
                            <span>Remaining Balance: <b className={balance - Number(paymentForm.amount) <= 0 ? 'text-green-600 font-bold' : 'text-teal-700 font-bold'}>{formatLKR(Math.max(0, balance - Number(paymentForm.amount)))}</b></span>
                          </div>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
