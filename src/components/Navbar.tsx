import { Database, Calendar, Landmark, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';
import logo from '../assets/logo.png';

interface NavbarProps {
  currentTab: 'today' | 'cheques' | 'credits';
  setCurrentTab: (tab: 'today' | 'cheques' | 'credits') => void;
  isMongo: boolean | null;
}

export default function Navbar({ currentTab, setCurrentTab, isMongo }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm md:shadow-none">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-2.5">
          <img src={logo} alt="Kelani Cables Logo" className="h-8 w-auto object-contain" />
          <div>
            <h1 className="text-base font-semibold text-gray-900 tracking-tight leading-none">
              Cheque & Credit Tracker
            </h1>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-1">
          <button
            id="nav-today-desktop"
            onClick={() => setCurrentTab('today')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${currentTab === 'today'
              ? 'bg-teal-50 text-teal-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            id="nav-cheques-desktop"
            onClick={() => setCurrentTab('cheques')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${currentTab === 'cheques'
              ? 'bg-teal-50 text-teal-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Landmark className="h-4 w-4" />
            <span>Cheques</span>
          </button>

          <button
            id="nav-credits-desktop"
            onClick={() => setCurrentTab('credits')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${currentTab === 'credits'
              ? 'bg-teal-50 text-teal-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Credits</span>
          </button>
        </nav>

        {/* Database Status Indicator */}
        <div className="flex items-center">
          {isMongo === null ? (
            <div className="flex items-center space-x-1.5 animate-pulse rounded-full bg-gray-100 px-2.5 py-1 text-2xs font-medium text-gray-500">
              <Database className="h-3 w-3" />
              <span>Connecting...</span>
            </div>
          ) : isMongo ? (
            <div
              title="Connected to MongoDB Atlas Cloud"
              className="flex items-center space-x-1.5 rounded-full bg-green-50 px-2.5 py-1 text-2xs font-medium text-green-700 border border-green-150 shadow-2xs"
            >
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Active</span>
            </div>
          ) : (
            <div
              title="No MONGODB_URI set. Saving data locally to /data/db_fallback.json"
              className="flex items-center space-x-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-2xs font-medium text-amber-700 border border-amber-150 shadow-2xs cursor-help"
            >
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span>Local Storage Fallback</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Top/Bottom Navigation (Tabs layout) */}
      <div className="md:hidden flex border-t border-gray-100 bg-gray-50">
        <button
          id="nav-today-mobile"
          onClick={() => setCurrentTab('today')}
          className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors cursor-pointer ${currentTab === 'today'
            ? 'bg-white text-teal-600 border-b-2 border-teal-600'
            : 'text-gray-500 hover:bg-gray-100'
            }`}
        >
          <Calendar className="h-4 w-4 mb-0.5" />
          <span>Today</span>
        </button>

        <button
          id="nav-cheques-mobile"
          onClick={() => setCurrentTab('cheques')}
          className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors cursor-pointer ${currentTab === 'cheques'
            ? 'bg-white text-teal-600 border-b-2 border-teal-600'
            : 'text-gray-500 hover:bg-gray-100'
            }`}
        >
          <Landmark className="h-4 w-4 mb-0.5" />
          <span>Cheques</span>
        </button>

        <button
          id="nav-credits-mobile"
          onClick={() => setCurrentTab('credits')}
          className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors cursor-pointer ${currentTab === 'credits'
            ? 'bg-white text-teal-600 border-b-2 border-teal-600'
            : 'text-gray-500 hover:bg-gray-100'
            }`}
        >
          <Receipt className="h-4 w-4 mb-0.5" />
          <span>Credits</span>
        </button>
      </div>
    </header>
  );
}
