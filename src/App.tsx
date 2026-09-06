import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  type BalancesSummary,
  type Transaction,
  type UserSettings,
  type CalendarAccountFilter,
  type AccountType,
  type ActiveTab,
  type PhotoQuality,
  type Debt,
} from './types';
import {
  calculateBalances,
  getUserSettings,
  updateUserSettings,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getDebts,
} from './db/database';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { MonthCalendar } from './components/MonthCalendar';
import { StatisticsView } from './components/StatisticsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { DebtsView } from './components/DebtsView';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { DayDetailModal } from './components/DayDetailModal';
import { InitialSetupModal } from './components/InitialSetupModal';
import { IOSInstallGuide } from './components/IOSInstallGuide';
import { GlobalSearchView } from './components/GlobalSearchView';
import { LiquidGlassStudioView } from './components/LiquidGlassStudioView';
import { LiquidGlassProvider } from './context/LiquidGlassContext';
import { usePWA } from './hooks/usePWA';
import { initAutoUpdateChecker } from './services/updateService';
import { getTodayString } from './utils/formatters';
import { Check } from 'lucide-react';
import { getCachedWallpaper, setCachedWallpaper, removeCachedWallpaper } from './utils/wallpaperManager';
import { initUiTransparency } from './utils/uiAppearanceManager';

export default function App() {
  const { isOnline } = usePWA();

  // Core state - 5 tabs: flow | statistics | profile | debts | settings
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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [triggerAddDebtCount, setTriggerAddDebtCount] = useState(0);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App Wallpaper state (custom background)
  const [previewWallpaper, setPreviewWallpaper] = useState<string | null>(null);
  const [cachedWallpaper, setCachedWallpaperState] = useState<string | null>(() => getCachedWallpaper());

  const activeWallpaper = previewWallpaper || userSettings?.wallpaperDataUrl || cachedWallpaper;

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
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);

  // Track if camera has auto-opened on app launch
  const hasAutoOpenedCameraRef = useRef(false);

  // Refresh all core data from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [settings, bal, txs, dbs] = await Promise.all([
        getUserSettings(),
        calculateBalances(),
        getTransactions(),
        getDebts(),
      ]);

      setUserSettings(settings);
      setBalances(bal);
      setTransactions(txs);
      setDebts(dbs);

      const hasLaunchedBefore = settings.hasLaunchedBefore === true || settings.isInitialSetupDone === true;

      if (!hasLaunchedBefore) {
        // First launch ever: show initial setup, do not open camera
        setShowInitialSetup(true);
        hasAutoOpenedCameraRef.current = true;
      } else {
        // From 2nd launch onwards: ensure state is saved and auto-open camera
        if (settings.hasLaunchedBefore !== true) {
          await updateUserSettings({ hasLaunchedBefore: true });
          setUserSettings(prev => prev ? { ...prev, hasLaunchedBefore: true } : prev);
        }
        if (!hasAutoOpenedCameraRef.current) {
          hasAutoOpenedCameraRef.current = true;
          setIsCameraOpen(true);
        }
      }
      if (settings?.wallpaperDataUrl !== undefined) {
        if (settings.wallpaperDataUrl) {
          setCachedWallpaper(settings.wallpaperDataUrl);
          setCachedWallpaperState(settings.wallpaperDataUrl);
        } else {
          removeCachedWallpaper();
          setCachedWallpaperState(null);
        }
      }
      if (settings?.uiTransparency !== undefined) {
        initUiTransparency(settings.uiTransparency);
      } else {
        initUiTransparency();
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApplyWallpaper = async (wallpaperUrl: string) => {
    setCachedWallpaper(wallpaperUrl);
    setCachedWallpaperState(wallpaperUrl);
    setPreviewWallpaper(null);
    await updateUserSettings({ wallpaperDataUrl: wallpaperUrl });
    await refreshData();
  };

  const handleClearWallpaper = async () => {
    setPreviewWallpaper(null);
    setCachedWallpaperState(null);
    removeCachedWallpaper();
    await updateUserSettings({ wallpaperDataUrl: '' });
    await refreshData();
  };

  useEffect(() => {
    refreshData();

    // Start background update checker for long-running PWA
    const cleanupUpdateChecker = initAutoUpdateChecker();

    return () => {
      cleanupUpdateChecker();
    };
  }, [refreshData]);

  useEffect(() => {
    if (userSettings) {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      const hasSeenGuide = userSettings.hasSeenInstallGuide === true;

      if (!isStandalone && !hasSeenGuide) {
        setIsInstallGuideOpen(true);
      }
    }
  }, [userSettings]);

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

  const handleAddClick = () => {
    if (activeTab === 'debts') {
      setTriggerAddDebtCount((c) => c + 1);
    } else {
      handleOpenAddTransaction();
    }
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

  const handleDayDateChange = (newDate: string) => {
    setSelectedDayDate(newDate);
    const [y, m] = newDate.split('-').map(Number);
    if (y && m && (y !== currentYear || m !== currentMonth)) {
      setCurrentYear(y);
      setCurrentMonth(m);
    }
  };

  return (
    <LiquidGlassProvider>
      <div className="min-h-screen bg-black flex justify-center text-neutral-100 font-sans selection:bg-white/20 relative">
        {/* App Wallpaper Background Layer (Behind whole app and Liquid Glass) */}
        {activeWallpaper && (
          <div
            id="app-wallpaper-layer"
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center select-none"
            aria-hidden="true"
          >
            {/* Ambient blurred extension for wide desktop displays */}
            <img
              src={activeWallpaper}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-30 pointer-events-none"
            />

            {/* Crisp wallpaper layer for the mobile app container */}
            <div className="w-full max-w-md h-full relative overflow-hidden">
              <img
                src={activeWallpaper}
                alt="App Wallpaper"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              {/* Subtle tint to ensure high contrast & legibility */}
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Live Wallpaper Preview Floating Bar */}
        {previewWallpaper && (
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-3 animate-in slide-in-from-top duration-300 pointer-events-none">
            <div className="w-full max-w-md bg-[#16181d]/95 border border-purple-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-xl pointer-events-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-black text-white uppercase tracking-wider truncate">
                    Đang xem trước hình nền
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    Chuyển các tab để xem trực tiếp
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewWallpaper(null)}
                  className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyWallpaper(previewWallpaper)}
                  className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-purple-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Áp dụng</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-first centered phone container (max-w-md = 448px) */}
        <div className={`w-full max-w-md min-h-screen border-x border-neutral-900 flex flex-col relative shadow-2xl z-10 ${activeWallpaper ? 'bg-transparent' : 'bg-black'}`}>
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
                debts={debts}
                onSelectDay={(d) => setSelectedDayDate(d)}
                onSelectTransaction={(tx) => setEditingTransaction(tx)}
                onOpenSearch={() => setIsSearchOpen(true)}
              />
            ) : activeTab === 'debts' ? (
              <DebtsView
                triggerAddDebtCount={triggerAddDebtCount}
                onRefreshStats={refreshData}
              />
            ) : activeTab === 'settings' ? (
              <SettingsView
                onDataChanged={refreshData}
                onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
                isCategoryModalOpen={isCategoryManagementOpen}
                onSetCategoryModalOpen={setIsCategoryManagementOpen}
                onOpenLiquidGlassStudio={() => setIsTunerOpen(true)}
                userSettings={userSettings}
                activeWallpaper={activeWallpaper}
                onStartPreviewWallpaper={(url) => setPreviewWallpaper(url)}
                onClearWallpaper={handleClearWallpaper}
                onApplyWallpaper={handleApplyWallpaper}
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
          {!isCategoryManagementOpen && !isTunerOpen && (
            <BottomNavigation
              activeTab={activeTab}
              onChangeTab={(tab) => setActiveTab(tab)}
              onOpenAddTransaction={handleAddClick}
              onOpenSearch={() => setIsSearchOpen(true)}
            />
          )}

          {/* Liquid Glass Studio Full-Page View */}
          {isTunerOpen && (
            <LiquidGlassStudioView
              isOpen={isTunerOpen}
              onClose={() => setIsTunerOpen(false)}
            />
          )}

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
            onDateChange={handleDayDateChange}
            accountFilter={calendarAccountFilter}
            onAccountFilterChange={setCalendarAccountFilter}
            onClose={() => setSelectedDayDate(null)}
            onSelectTransaction={(t) => setEditingTransaction(t)}
            onAddNewForDate={(d, acc) => {
              setSelectedDayDate(null);
              handleOpenAddTransaction(d, acc);
            }}
            allTransactions={transactions}
            balances={balances}
            userSettings={userSettings}
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
            onComplete={async () => {
              await updateUserSettings({ hasLaunchedBefore: true, isInitialSetupDone: true });
              setShowInitialSetup(false);
              refreshData();
            }}
          />

          {/* 6. iOS Safari PWA Install Guide */}
          <IOSInstallGuide
            isOpen={isInstallGuideOpen}
            onClose={() => setIsInstallGuideOpen(false)}
          />

          <GlobalSearchView
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            transactions={transactions}
            onSelectTransaction={(tx) => {
              setIsSearchOpen(false);
              setEditingTransaction(tx);
            }}
          />
        </div>
      </div>
    </LiquidGlassProvider>
  );
}
