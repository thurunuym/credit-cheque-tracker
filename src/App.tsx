import { useState, useEffect } from 'react';
import {
  fetchDbStatus,
  fetchCheques,
  fetchCredits,
  fetchShops,
  addCheque,
  updateCheque,
  deleteCheque,
  addCreditInvoice,
  deleteCreditInvoice,
  addCreditPayment,
  deleteCreditPayment
} from './lib/api';
import { Cheque, CreditInvoice } from './types';
import Navbar from './components/Navbar';
import TodayView from './components/TodayView';
import ChequesView from './components/ChequesView';
import CreditsView from './components/CreditsView';
import { Landmark, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'today' | 'cheques' | 'credits'>('today');
  const [isMongo, setIsMongo] = useState<boolean | null>(null);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [invoices, setInvoices] = useState<CreditInvoice[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = async () => {
    try {
      setError(null);

      // Fetch DB status
      const dbStatus = await fetchDbStatus();
      setIsMongo(dbStatus.isMongo);

      // Fetch all core modules concurrently
      const [chequesData, invoicesData, shopsData] = await Promise.all([
        fetchCheques(),
        fetchCredits(),
        fetchShops()
      ]);

      setCheques(chequesData);
      setInvoices(invoicesData);
      setShops(shopsData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to communicate with full-stack server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- ACTIONS ---

  const handleAddCheque = async (chequeData: any) => {
    const result = await addCheque(chequeData);
    await loadData(); // refresh state
    return result;
  };

  const handleUpdateCheque = async (id: string, updates: Partial<Cheque>) => {
    const result = await updateCheque(id, updates);
    await loadData(); // refresh state
    return result;
  };

  const handleDeleteCheque = async (id: string) => {
    const result = await deleteCheque(id);
    await loadData(); // refresh state
    return result;
  };

  const handleAddCreditInvoice = async (invoiceData: any) => {
    const result = await addCreditInvoice(invoiceData);
    await loadData(); // refresh state
    return result;
  };

  const handleDeleteInvoice = async (id: string) => {
    const result = await deleteCreditInvoice(id);
    await loadData(); // refresh state
    return result;
  };

  const handleRecordPayment = async (invoiceId: string, paymentData: any) => {
    const result = await addCreditPayment(invoiceId, paymentData);
    await loadData(); // refresh state
    return result;
  };

  const handleDeleteCreditPayment = async (paymentId: string) => {
    const result = await deleteCreditPayment(paymentId);
    await loadData(); // refresh state
    return result;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-800">

      {/* Header / Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isMongo={isMongo}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Error Alert Display */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 shadow-3xs">
            <div className="flex items-center space-x-2.5 text-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <h3 className="text-sm font-semibold">System Communication Error</h3>
            </div>
            <p className="mt-1 text-xs text-red-700 leading-relaxed pl-7">{error}</p>
            <div className="mt-3 pl-7">
              <button
                onClick={loadData}
                className="inline-flex items-center rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 cursor-pointer"
              >
                Retry Server Sync
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            <p className="mt-4 text-xs font-medium text-gray-500">Syncing internal ledger...</p>
          </div>
        ) : (
          <>
            {currentTab === 'today' && (
              <TodayView
                invoices={invoices}
                shops={shops}
                onAddCheque={handleAddCheque}
                onAddCreditInvoice={handleAddCreditInvoice}
                onRecordPayment={handleRecordPayment}
              />
            )}

            {currentTab === 'cheques' && (
              <ChequesView
                cheques={cheques}
                onUpdateCheque={handleUpdateCheque}
                onDeleteCheque={handleDeleteCheque}
              />
            )}

            {currentTab === 'credits' && (
              <CreditsView
                invoices={invoices}
                onAddCreditPayment={handleRecordPayment}
                onDeleteCreditPayment={handleDeleteCreditPayment}
                onDeleteInvoice={handleDeleteInvoice}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4.5 mt-12 text-center text-3xs font-medium text-gray-400 font-mono tracking-wider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>&copy; KELANI CABLES PLC.</span>
        </div>
      </footer>

    </div>
  );
}
