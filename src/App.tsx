import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  type BalancesSummary,
  type Transaction,
  type UserSettings,
  type CalendarAccountFilter,
  type AccountType,
  type ActiveTab,
  type PhotoQuality,
} from './types';
import {
  calculateBalances,
  getUserSettings,
  getTransactions,
  updateTransaction,
  deleteTransaction,
} from './db/database';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { MonthCalendar } from './components/MonthCalendar';
import { StatisticsView } from './components/StatisticsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { DayDetailModal } from './components/DayDetailModal';
import { InitialSetupModal } from './components/InitialSetupModal';
import { IOSInstallGuide } from './components/IOSInstallGuide';
import { usePWA } from './hooks/usePWA';
import { initAutoUpdateChecker } from './services/updateService';
import { getTodayString } from './utils/formatters';

export default function App() {
  const { isOnline } = usePWA();

  // Core state - 4 tabs: flow | statistics | settings | profile
  const [activeTab, setActiveTab] = useState<ActiveTab>('flow');
  const [balances, setBalances] = useState<BalancesSummary>({
    initialWallet: 0,
    initialBank: 0,
    walletIncome: 0,
    walletExpense: 0,
    bankIncome: 0,
    bankExpense: 0,
    walletBalance: 0,
    bankBalance: 0,
    totalAssets: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar month state (defaults to current date)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);
  const [calendarAccountFilter, setCalendarAccountFilter] = useState<CalendarAccountFilter>('all');

  // Modals & Navigation state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);
  const [capturedPhotoQuality, setCapturedPhotoQuality] = useState<PhotoQuality>('low');
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [newTxDefaultDate, setNewTxDefaultDate] = useState<string>(getTodayString());
  const [newTxDefaultAccount, setNewTxDefaultAccount] = useState<AccountType | undefined>(undefined);

  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionForPhotoChange, setTransactionForPhotoChange] = useState<Transaction | null>(null);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);

  // Track if camera has auto-opened on app launch
  const hasAutoOpenedCameraRef = useRef(false);

  // Refresh all core data from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [settings, bal, txs] = await Promise.all([
        getUserSettings(),
        calculateBalances(),
        getTransactions(),
      ]);

      setUserSettings(settings);
      setBalances(bal);
      setTransactions(txs);

      const hasLaunchedBefore = localStorage.getItem('hasLaunchedBefore') === 'true' || settings.isInitialSetupDone;

      if (!hasLaunchedBefore) {
        // First launch ever: show initial setup, do not open camera
        setShowInitialSetup(true);
        hasAutoOpenedCameraRef.current = true;
      } else {
        // From 2nd launch onwards: ensure state is saved and auto-open camera
        localStorage.setItem('hasLaunchedBefore', 'true');
        if (!hasAutoOpenedCameraRef.current) {
          hasAutoOpenedCameraRef.current = true;
          setIsCameraOpen(true);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Start background update checker for long-running PWA
    const cleanupUpdateChecker = initAutoUpdateChecker();

    // Check if opening on web for the first time (not standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const hasSeenGuide = localStorage.getItem('fima_has_seen_install_guide') === 'true';

    if (!isStandalone && !hasSeenGuide) {
      setIsInstallGuideOpen(true);
    }

    return () => {
      cleanupUpdateChecker();
    };
  }, [refreshData]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleTodayMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Transaction Creation Flow (+ button -> Camera -> New Transaction)
  const handleOpenAddTransaction = (customDate?: string, customAccount?: AccountType) => {
    setNewTxDefaultDate(customDate || getTodayString());
    setNewTxDefaultAccount(customAccount || (calendarAccountFilter === 'all' ? undefined : calendarAccountFilter));
    setIsCameraOpen(true);
  };

  const handlePhotoCaptured = async (blob: Blob, quality: PhotoQuality = 'low') => {
    // Direct photo update from DayDetailModal swipe action (Vuốt sang phải -> Sửa ảnh)
    if (transactionForPhotoChange) {
      const tx = transactionForPhotoChange;
      setTransactionForPhotoChange(null);
      setIsCameraOpen(false);
      try {
        await updateTransaction(tx.id, {
          date: tx.date,
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          note: tx.note || '',
          account: tx.account,
          newImageBlob: blob,
          photoQuality: quality,
        });
        await refreshData();
      } catch (err) {
        console.error('Lỗi khi cập nhật ảnh giao dịch:', err);
      }
      return;
    }

    setCapturedPhotoBlob(blob);
    setCapturedPhotoQuality(quality);
    setIsCameraOpen(false);
    
    // Only open the NewTransactionModal if we are NOT editing a transaction.
    // If we are editing, the EditTransactionModal is already open and waiting for the photo.
    if (!editingTransaction) {
      setIsNewTxOpen(true);
    }
  };

  const handleDeleteTransactionFromDay = async (tx: Transaction) => {
    await deleteTransaction(tx.id);
    await refreshData();
  };

  const handleRetakePhoto = () => {
    setIsNewTxOpen(false);
    setIsCameraOpen(true);
  };

  const handleNewTxSuccess = () => {
    setIsNewTxOpen(false);
    setCapturedPhotoBlob(null);
    setNewTxDefaultAccount(undefined);
    refreshData();
  };

  const handleEditTxSuccess = () => {
    setEditingTransaction(null);
    refreshData();
  };

  return (
    <div className="min-h-screen bg-black flex justify-center text-neutral-100 font-sans selection:bg-white/20">
      {/* Mobile-first centered phone container (max-w-md = 448px) */}
      <div className="w-full max-w-md min-h-screen bg-black border-x border-neutral-900 flex flex-col relative shadow-2xl">
        {/* Header - shown on Dòng tiền (home) screen */}
        {activeTab === 'flow' && (
          <Header
            balances={balances}
            nickname={userSettings?.nickname}
            avatarDataUrl={userSettings?.avatarDataUrl}
            onNavigateToProfile={() => setActiveTab('profile')}
            isOnline={isOnline}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 px-3.5 sm:px-4 ${activeTab === 'flow' ? 'pt-3' : 'pt-[max(env(safe-area-inset-top,0px),20px)]'}`}>
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-neutral-500">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold tracking-wider">Đang tải dữ liệu...</span>
            </div>
          ) : activeTab === 'flow' ? (
            <MonthCalendar
              currentYear={currentYear}
              currentMonth={currentMonth}
              transactions={transactions}
              accountFilter={calendarAccountFilter}
              onAccountFilterChange={setCalendarAccountFilter}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onTodayMonth={handleTodayMonth}
              onSelectDay={(d) => setSelectedDayDate(d)}
            />
          ) : activeTab === 'statistics' ? (
            <StatisticsView
              transactions={transactions}
              balances={balances}
              userSettings={userSettings}
              onSelectDay={(d) => setSelectedDayDate(d)}
              onSelectTransaction={(tx) => setEditingTransaction(tx)}
            />
          ) : activeTab === 'settings' ? (
            <SettingsView
              onDataChanged={refreshData}
              onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
            />
          ) : (
            <ProfileView
              userSettings={userSettings}
              transactions={transactions}
              balances={balances}
              onDataChanged={refreshData}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          onOpenAddTransaction={() => handleOpenAddTransaction()}
        />

        {/* --- MODALS & WORKFLOWS --- */}

        {/* 1. Camera Capture View */}
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => {
            setIsCameraOpen(false);
            setTransactionForPhotoChange(null);
          }}
          onPhotoCaptured={handlePhotoCaptured}
        />

        {/* 2. New Transaction Form */}
        <NewTransactionModal
          isOpen={isNewTxOpen}
          initialPhotoBlob={capturedPhotoBlob}
          photoQuality={capturedPhotoQuality}
          defaultDate={newTxDefaultDate}
          defaultAccount={newTxDefaultAccount}
          onClose={() => {
            setIsNewTxOpen(false);
            setCapturedPhotoBlob(null);
            setNewTxDefaultAccount(undefined);
          }}
          onRetakePhoto={handleRetakePhoto}
          onSuccess={handleNewTxSuccess}
        />

        {/* 3. Day Detail View */}
        <DayDetailModal
          isOpen={!!selectedDayDate}
          date={selectedDayDate || ''}
          accountFilter={calendarAccountFilter}
          onAccountFilterChange={setCalendarAccountFilter}
          onClose={() => setSelectedDayDate(null)}
          onSelectTransaction={(t) => setEditingTransaction(t)}
          onAddNewForDate={(d, acc) => {
            setSelectedDayDate(null);
            handleOpenAddTransaction(d, acc);
          }}
          allTransactions={transactions}
          onDeleteTransaction={handleDeleteTransactionFromDay}
        />

        {/* 4. Edit / Delete Transaction */}
        <EditTransactionModal
          isOpen={!!editingTransaction}
          transaction={editingTransaction}
          onClose={() => {
            setEditingTransaction(null);
            setCapturedPhotoBlob(null);
          }}
          onRequestChangePhoto={() => {
            setIsCameraOpen(true);
          }}
          newPhotoBlob={capturedPhotoBlob}
          photoQuality={capturedPhotoQuality}
          onSuccess={() => {
            handleEditTxSuccess();
            setCapturedPhotoBlob(null);
          }}
        />

        {/* 5. Initial Setup Onboarding for First-Time Use */}
        <InitialSetupModal
          isOpen={showInitialSetup}
          onComplete={() => {
            localStorage.setItem('hasLaunchedBefore', 'true');
            setShowInitialSetup(false);
            refreshData();
          }}
        />

        {/* 6. iOS Safari PWA Install Guide */}
        <IOSInstallGuide
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
        />
      </div>
    </div>
  );
}
