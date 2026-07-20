import React, { useState } from 'react';
import { Landmark, Search, Filter, Calendar, Edit, Trash2, Check, AlertTriangle, X, CheckCircle2, ChevronRight, Coins } from 'lucide-react';
import ShopAutocomplete from './ShopAutocomplete';
import BankAutocomplete from './BankAutocomplete';
import { Cheque, ChequeStatus } from '../types';
import { formatLKR, formatFriendlyDate, formatDate } from '../lib/api';

interface ChequesViewProps {
  cheques: Cheque[];
  onUpdateCheque: (id: string, updates: Partial<Cheque>) => Promise<any>;
  onDeleteCheque: (id: string) => Promise<boolean>;
}

export default function ChequesView({ cheques, onUpdateCheque, onDeleteCheque }: ChequesViewProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState(todayStr); // default to today onwards
  const [dateTo, setDateTo] = useState('');

  // Editing Cheque State
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDueModal, setShowDueModal] = useState(false);

  // Quick helper to reset filters to see all cheques
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  // Filter logic
  const filteredCheques = cheques.filter(c => {
    // Search filter (searches shop, cheque number and bank name)
    const matchesSearch =
      (c.shop && c.shop.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.chequeNumber && c.chequeNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.bank && c.bank.toLowerCase().includes(searchTerm.toLowerCase())) ||
      searchTerm === '';

    // Status filter
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    // Date From filter (filter on dueDate)
    const matchesDateFrom = dateFrom === '' || c.dueDate >= dateFrom;

    // Date To filter (filter on dueDate)
    const matchesDateTo = dateTo === '' || c.dueDate <= dateTo;

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // Calculations based on FILTERED cheques
  const totalAmount = filteredCheques.reduce((sum, c) => sum + c.amount, 0);

  const pendingCheques = filteredCheques.filter(c => c.status === 'PENDING');
  const pendingAmount = pendingCheques.reduce((sum, c) => sum + c.amount, 0);

  // Calculations for Today/Tomorrow upcoming cheques (based on ALL cheques)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayChequesList = cheques.filter(c => c.dueDate === todayStr);
  const todayChequesCount = todayChequesList.length;
  const todayChequesAmount = todayChequesList.reduce((sum, c) => sum + c.amount, 0);

  const tomorrowChequesList = cheques.filter(c => c.dueDate === tomorrowStr);
  const tomorrowChequesCount = tomorrowChequesList.length;
  const tomorrowChequesAmount = tomorrowChequesList.reduce((sum, c) => sum + c.amount, 0);

  // Handle Quick Status Switch
  const handleQuickStatusUpdate = async (chequeId: string, nextStatus: ChequeStatus) => {
    try {
      await onUpdateCheque(chequeId, { status: nextStatus });
    } catch (err) {
      console.error('Failed to quick-update status:', err);
    }
  };

  // Handle Delete Click
  const handleDeleteClick = async (chequeId: string) => {
    if (window.confirm('Are you sure you want to delete this cheque record? This action cannot be undone.')) {
      try {
        await onDeleteCheque(chequeId);
      } catch (err) {
        console.error('Failed to delete cheque:', err);
      }
    }
  };

  // Save full edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCheque) return;
    setIsSaving(true);
    try {
      await onUpdateCheque(editingCheque.id, {
        shop: editingCheque.shop,
        bank: editingCheque.bank,
        chequeNumber: editingCheque.chequeNumber,
        amount: Number(editingCheque.amount),
        receivedDate: editingCheque.receivedDate,
        dueDate: editingCheque.dueDate,
        status: editingCheque.status,
        remarks: editingCheque.remarks
      });
      setEditingCheque(null);
    } catch (err) {
      console.error('Failed to update cheque details:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* FILTER BAR PANEL */}
      <div id="cheques-filter-bar" className="rounded-xl border border-gray-200 bg-white p-4 shadow-3xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Filter Cheques</h3>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer self-start md:self-auto"
          >
            Reset Filters (Show All)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Shop Name / Cheque No Search */}
          <div>
            <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Search Cheques
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter Cheque no or Invoice no"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 w-full rounded-lg border border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Cheque Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 w-full rounded-lg border border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="BANKED">Banked Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>

          {/* Due Date From */}
          <div>
            <label className={`block text-2xs font-semibold uppercase tracking-wider mb-1 flex items-center transition-colors ${dateFrom ? 'text-teal-700' : 'text-gray-600'
              }`}>
              <Calendar className={`h-3.5 w-3.5 mr-1 transition-colors ${dateFrom ? 'text-teal-600' : 'text-gray-400'}`} />
              Due From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className={`px-3 py-1.5 w-full rounded-lg border text-xs shadow-2xs focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-all ${dateFrom
                ? 'border-teal-500 bg-teal-50/20 text-teal-900 font-semibold shadow-inner'
                : 'border-gray-300 bg-white text-gray-700'
                }`}
            />
          </div>

          {/* Due Date To */}
          <div>
            <label className={`block text-2xs font-semibold uppercase tracking-wider mb-1 flex items-center transition-colors ${dateTo ? 'text-teal-700' : 'text-gray-600'
              }`}>
              <Calendar className={`h-3.5 w-3.5 mr-1 transition-colors ${dateTo ? 'text-teal-600' : 'text-gray-400'}`} />
              Due To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className={`px-3 py-1.5 w-full rounded-lg border text-xs shadow-2xs focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-all ${dateTo
                ? 'border-teal-500 bg-teal-50/20 text-teal-900 font-semibold shadow-inner'
                : 'border-gray-300 bg-white text-gray-700'
                }`}
            />
          </div>
        </div>
      </div>

      {/* SUMMARY DASHBOARD GRID */}
      <div id="cheques-summary-dashboard" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* TOTAL MATCHING CHEQUES */}
        <div className="rounded-xl border border-gray-200 bg-white p-4.5 shadow-2xs">
          <p style={{ fontSize: '11px' }} className="font-semibold text-gray-500 uppercase tracking-wider">Total Volume ({filteredCheques.length})</p>
          <p className="mt-1 font-mono text-xl font-bold text-gray-900">{formatLKR(totalAmount)}</p>
          <div className="mt-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-400" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* PENDING CHEQUES SUMMARY */}
        <div className="rounded-xl border border-gray-200 bg-amber-25/40 p-4.5 shadow-2xs">
          <div className="flex justify-between items-center">
            <p style={{ fontSize: '11px' }} className="font-semibold text-amber-800 uppercase tracking-wider">Pending ({pendingCheques.length})</p>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-amber-700">{formatLKR(pendingAmount)}</p>
          <div className="mt-2 w-full h-1 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{ width: totalAmount > 0 ? `${(pendingAmount / totalAmount) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>

        {/* TODAY CHEQUES SUMMARY (CLICKABLE) */}
        <div
          onClick={() => setShowDueModal(true)}
          className="rounded-xl border border-gray-200 bg-teal-25/40 p-4.5 shadow-2xs cursor-pointer hover:bg-teal-50/50 hover:shadow-xs transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p style={{ fontSize: '11px' }} className="font-semibold text-teal-800 uppercase tracking-wider group-hover:underline">Due Today</p>
            <p className="mt-1 font-mono text-xl font-bold text-teal-700">{formatLKR(todayChequesAmount)}</p>
            <div style={{ fontSize: '9px' }} className="text-gray-500 font-semibold uppercase tracking-wider">Click to view details</div>
          </div>
          <div className="flex flex-col items-center justify-center bg-teal-100/70 border border-teal-200 rounded-lg px-3 py-1.5 min-w-[3.5rem] shadow-3xs">
            <span className="text-xl font-black text-teal-900 leading-none">{todayChequesCount}</span>
            <span style={{ fontSize: '9px' }} className="font-bold text-teal-700 uppercase tracking-wider mt-0.5">Cheques</span>
          </div>
        </div>

        {/* TOMORROW CHEQUES SUMMARY (CLICKABLE) */}
        <div
          onClick={() => setShowDueModal(true)}
          className="rounded-xl border border-gray-200 bg-sky-25/40 p-4.5 shadow-2xs cursor-pointer hover:bg-sky-50/50 hover:shadow-xs transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <p style={{ fontSize: '11px' }} className="font-semibold text-sky-800 uppercase tracking-wider group-hover:underline">Due Tomorrow</p>
            <p className="mt-1 font-mono text-xl font-bold text-sky-700">{formatLKR(tomorrowChequesAmount)}</p>
            <div style={{ fontSize: '9px' }} className="text-gray-500 font-semibold uppercase tracking-wider">Click to view details</div>
          </div>
          <div className="flex flex-col items-center justify-center bg-sky-100/70 border border-sky-200 rounded-lg px-3 py-1.5 min-w-[3.5rem] shadow-3xs">
            <span className="text-xl font-black text-sky-900 leading-none">{tomorrowChequesCount}</span>
            <span style={{ fontSize: '9px' }} className="font-bold text-sky-700 uppercase tracking-wider mt-0.5">Cheques</span>
          </div>
        </div>

      </div>

      {/* MAIN DATA LIST */}
      <div id="cheques-list-container" className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">

        {filteredCheques.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Landmark className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-medium text-gray-900 font-semibold">No Cheques Found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-md">
              There are no cheques in the selected range matching your search. Try broadening your dates or checking another status.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center rounded-md bg-teal-550/10 px-3.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-550/20 cursor-pointer"
            >
              Show All Cheques
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-2xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Shop</th>
                    <th className="py-3 px-4">Bank</th>
                    <th className="py-3 px-4">Cheque No</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Rec Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Invoice no / Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs text-gray-700">
                  {filteredCheques.map(cheque => (
                    <tr key={cheque.id} className="hover:bg-gray-50/50">

                      {/* Shop Name */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {cheque.shop || <span className="italic text-gray-400">Not added</span>}
                      </td>

                      {/* Bank */}
                      <td className="py-3.5 px-4 font-semibold text-sm text-gray-800">
                        {cheque.bank}
                      </td>

                      {/* Cheque No */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-sm text-gray-600">
                        #{cheque.chequeNumber}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-gray-950">
                        {formatLKR(cheque.amount)}
                      </td>

                      {/* Rec Date */}
                      <td className="py-3.5 px-4 font-mono text-gray-600 font-medium">
                        {formatDate(cheque.receivedDate)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-teal-700">
                        {formatDate(cheque.dueDate)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-3xs font-medium border font-semibold ${cheque.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : cheque.status === 'BANKED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {cheque.status}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-3xs text-gray-500" title={cheque.remarks}>
                        {cheque.remarks || <span className="italic text-gray-300">-</span>}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Quick change buttons based on current state */}
                          {cheque.status === 'PENDING' && (
                            <>
                              <button
                                title="Mark as Banked"
                                onClick={() => handleQuickStatusUpdate(cheque.id, 'BANKED')}
                                className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                title="Mark as Rejected"
                                onClick={() => handleQuickStatusUpdate(cheque.id, 'REJECTED')}
                                className="p-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {cheque.status !== 'PENDING' && (
                            <button
                              title="Reset status to Pending"
                              onClick={() => handleQuickStatusUpdate(cheque.id, 'PENDING')}
                              className="text-3xs font-semibold text-gray-500 hover:text-gray-700 hover:underline px-1.5 py-0.5 border border-gray-200 bg-white rounded-md shadow-3xs cursor-pointer"
                            >
                              Reset
                            </button>
                          )}

                          <div className="w-px h-4 bg-gray-200 mx-1"></div>

                          {/* Primary Edit / Delete */}
                          <button
                            title="Edit Details"
                            onClick={() => setEditingCheque(cheque)}
                            className="p-1 rounded-md text-gray-500 hover:text-teal-600 hover:bg-gray-100 cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Delete Cheque"
                            onClick={() => handleDeleteClick(cheque.id)}
                            className="p-1 rounded-md text-gray-500 hover:text-red-600 hover:bg-gray-100 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block md:hidden divide-y divide-gray-150">
              {filteredCheques.map(cheque => (
                <div key={cheque.id} className="p-4 space-y-3.5 hover:bg-gray-50/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {cheque.shop || <span className="italic text-gray-400">Not added</span>}
                      </h4>
                      <p className="text-2xs text-gray-500 font-medium">{cheque.bank}</p>
                      <p className="text-3xs text-gray-400 font-mono mt-0.5">#{cheque.chequeNumber}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-gray-950">{formatLKR(cheque.amount)}</p>
                      <span className={`mt-1.5 inline-flex items-center rounded-md px-2 py-0.5 text-3xs font-medium border font-semibold ${cheque.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : cheque.status === 'BANKED'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {cheque.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-lg text-3xs text-gray-600 font-mono">
                    <span>Rec: <b>{formatDate(cheque.receivedDate)}</b></span>
                    <span>•</span>
                    <span>Due: <b className="text-teal-700 font-bold">{formatDate(cheque.dueDate)}</b></span>
                  </div>

                  {cheque.remarks && (
                    <p className="text-3xs text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-2">
                      {cheque.remarks}
                    </p>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-1.5">
                      {cheque.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleQuickStatusUpdate(cheque.id, 'BANKED')}
                            className="inline-flex items-center space-x-1 rounded-md bg-green-50 text-green-700 border border-green-200 px-2 py-1 text-3xs font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Bank</span>
                          </button>
                          <button
                            onClick={() => handleQuickStatusUpdate(cheque.id, 'REJECTED')}
                            className="inline-flex items-center space-x-1 rounded-md bg-red-50 text-red-700 border border-red-200 px-2 py-1 text-3xs font-semibold cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleQuickStatusUpdate(cheque.id, 'PENDING')}
                          className="text-3xs text-gray-500 hover:underline cursor-pointer"
                        >
                          Reset to Pending
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingCheque(cheque)}
                        className="inline-flex items-center space-x-1 border border-gray-200 bg-white shadow-3xs p-1.5 rounded-lg text-gray-600 hover:text-teal-600 cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cheque.id)}
                        className="inline-flex items-center space-x-1 border border-gray-200 bg-white shadow-3xs p-1.5 rounded-lg text-gray-600 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* EDIT CHEQUE MODAL */}
      {editingCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <Edit className="h-4 w-4 mr-1.5 text-teal-600" />
                Edit Cheque Details
              </h3>
              <button
                onClick={() => setEditingCheque(null)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Shop / Customer
                  </label>
                  <ShopAutocomplete
                    value={editingCheque.shop || ''}
                    onChange={val => setEditingCheque(prev => prev ? ({ ...prev, shop: val }) : null)}
                    placeholder="Type or select shop..."
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Bank
                  </label>
                  <BankAutocomplete
                    value={editingCheque.bank}
                    onChange={val => setEditingCheque(prev => prev ? ({ ...prev, bank: val }) : null)}
                    required
                    placeholder="e.g. Commercial Bank"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCheque.chequeNumber}
                    onChange={e => setEditingCheque(prev => prev ? ({ ...prev, chequeNumber: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Amount (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingCheque.amount}
                    onChange={e => setEditingCheque(prev => prev ? ({ ...prev, amount: Number(e.target.value) }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formatDate(editingCheque.receivedDate)}
                    onChange={e => setEditingCheque(prev => prev ? ({ ...prev, receivedDate: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formatDate(editingCheque.dueDate)}
                    onChange={e => setEditingCheque(prev => prev ? ({ ...prev, dueDate: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editingCheque.status}
                    onChange={e => setEditingCheque(prev => prev ? ({ ...prev, status: e.target.value as ChequeStatus }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="BANKED">BANKED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={editingCheque.remarks || ''}
                    onChange={e => setEditingCheque(prev => prev ? ({ ...prev, remarks: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setEditingCheque(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-edit-cheque-submit"
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DUE CHEQUES MODAL POPUP */}
      {showDueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center">
                <Landmark className="h-4 w-4 mr-1.5 text-teal-600" />
                Upcoming Due Cheques Overview
              </h3>
              <button
                onClick={() => setShowDueModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto mt-4 py-2 pr-1">

              {/* Due Today Panel */}
              <div className="space-y-4">
                <h4 className="sticky top-0 bg-white pb-2 text-xs font-bold text-teal-800 uppercase tracking-wider border-b border-teal-100 flex justify-between items-center">
                  <span>Due Today ({todayChequesCount})</span>
                  <span className="font-mono text-teal-900 text-xs font-semibold">{formatLKR(todayChequesAmount)}</span>
                </h4>

                {todayChequesList.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No cheques due today.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {todayChequesList.map(c => (
                      <div key={c.id} className="p-3 rounded-lg border border-gray-150 bg-gray-50/50 flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-900 leading-tight">{c.shop || 'Unknown Shop'}</span>
                          <span className="font-bold text-gray-950 font-mono">{formatLKR(c.amount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-3xs text-gray-500 font-mono mt-0.5">
                          <span>Bank: <b>{c.bank}</b> (#{c.chequeNumber})</span>
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.25 text-4xs font-semibold border ${c.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : c.status === 'BANKED'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {c.status}
                          </span>
                        </div>
                        {c.remarks && <p className="text-3xs text-gray-400 italic mt-0.5 border-l-2 border-gray-200 pl-1.5">“{c.remarks}”</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Tomorrow Panel */}
              <div className="space-y-4">
                <h4 className="sticky top-0 bg-white pb-2 text-xs font-bold text-sky-800 uppercase tracking-wider border-b border-sky-100 flex justify-between items-center">
                  <span>Due Tomorrow ({tomorrowChequesCount})</span>
                  <span className="font-mono text-sky-900 text-xs font-semibold">{formatLKR(tomorrowChequesAmount)}</span>
                </h4>

                {tomorrowChequesList.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4">No cheques due tomorrow.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {tomorrowChequesList.map(c => (
                      <div key={c.id} className="p-3 rounded-lg border border-gray-150 bg-gray-50/50 flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-gray-900 leading-tight">{c.shop || 'Unknown Shop'}</span>
                          <span className="font-bold text-gray-950 font-mono">{formatLKR(c.amount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-3xs text-gray-500 font-mono mt-0.5">
                          <span>Bank: <b>{c.bank}</b> (#{c.chequeNumber})</span>
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.25 text-4xs font-semibold border ${c.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : c.status === 'BANKED'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {c.status}
                          </span>
                        </div>
                        {c.remarks && <p className="text-3xs text-gray-400 italic mt-0.5 border-l-2 border-gray-200 pl-1.5">“{c.remarks}”</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="flex justify-end pt-3 border-t border-gray-150 mt-4">
              <button
                type="button"
                onClick={() => setShowDueModal(false)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
