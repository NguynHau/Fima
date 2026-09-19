import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Building2,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Tag,
  ChevronRight,
  Server,
  Sparkles,
  Activity,
  Edit3,
  X,
  Sliders,
  Database,
  Image as ImageIcon,
  Camera,
  RotateCcw,
  Eye,
  Settings,
  Palette,
  Globe,
  Coins,
  ChevronDown,
} from 'lucide-react';
import { type UserSettings, type Transaction, type BalancesSummary } from '../types';
import { AIManager } from '../services/ai/AIManager';
import { getUserSettings, updateUserSettings, clearAllData, getTransactions, calculateBalances } from '../db/database';
import { exportBackupZip, importBackupZip, triggerBlobDownload } from '../services/backupService';
import {
  checkForRemoteUpdate,
  applyAppUpdate,
  isUpdateAvailable,
  subscribeUpdateState,
} from '../services/updateService';
import { parseAmountInput, currencyConfig } from '../utils/formatters';
import { t, languageConfig } from '../utils/translations';
import { useCategories } from '../hooks/useCategories';
import { CategoryManagementModal } from './CategoryManagementModal';
import { CategoryIcon } from './CategoryIcon';
import { LiquidGlassStudioLogo } from './LiquidGlassStudioLogo';
import { ImageCropModal } from './ImageCropModal';
import { SystemColorStudioModal } from './SystemColorStudioModal';
import { WallpaperEditorModal } from './WallpaperEditorModal';
import {
  optimizeWallpaper,
  setCachedWallpaper,
  removeCachedWallpaper,
  getStoredWallpaperBlur,
  setStoredWallpaperBlur,
  applyWallpaperBlur,
} from '../utils/wallpaperManager';
import {
  getStoredUiTransparency,
  setStoredUiTransparency,
  applyUiTransparency,
} from '../utils/uiAppearanceManager';
import {
  loadStoredSystemColors,
  applySystemColorsToDocument,
  type SystemColorsConfig,
} from '../utils/systemColorManager';

interface SettingsViewProps {
  onDataChanged: () => void;
  onOpenInstallGuide: () => void;
  isCategoryModalOpen: boolean;
  onSetCategoryModalOpen: (open: boolean) => void;
  onOpenLiquidGlassStudio?: () => void;
  userSettings?: UserSettings | null;
  activeWallpaper?: string | null;
  onClearWallpaper?: () => Promise<void>;
  onApplyWallpaper?: (url: string) => Promise<void>;
}

interface SettingsCardHeaderProps {
  icon?: React.ComponentType<{
    size?: number;
    className?: string;
    stroke?: string;
    color?: string;
    strokeWidth?: number;
  }>;
  customIcon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  isDanger?: boolean;
}

const SettingsCardHeader: React.FC<SettingsCardHeaderProps> = ({
  icon: Icon,
  customIcon,
  title,
  description,
  isDanger = false,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      {customIcon ? (
        customIcon
      ) : isDanger && Icon ? (
        <Icon size={18} className="text-rose-500 shrink-0" strokeWidth={2.3} />
      ) : Icon ? (
        <Icon
          size={18}
          className="shrink-0"
          stroke="url(#settings-pink-purple-grad)"
          strokeWidth={2.3}
        />
      ) : null}
      <h3
        className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
          isDanger ? 'text-rose-400' : 'text-neutral-200'
        }`}
      >
        {title}
      </h3>
    </div>
    <div className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
      {description}
    </div>
  </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  onDataChanged,
  onOpenInstallGuide,
  isCategoryModalOpen,
  onSetCategoryModalOpen,
  onOpenLiquidGlassStudio,
  userSettings,
  activeWallpaper,
  onClearWallpaper,
  onApplyWallpaper,
}) => {
  const [walletStr, setWalletStr] = useState('');
  const [bankStr, setBankStr] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingBalances, setIsSavingBalances] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Wallpaper state & refs
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const wallpaperGalleryInputRef = useRef<HTMLInputElement>(null);
  const wallpaperCameraInputRef = useRef<HTMLInputElement>(null);
  const [wallpaperCropSrc, setWallpaperCropSrc] = useState<string | null>(null);
  const [isWallpaperCropOpen, setIsWallpaperCropOpen] = useState(false);
  const [isProcessingWallpaper, setIsProcessingWallpaper] = useState(false);

  // Wallpaper blur state (0 to 30px)
  const [wallpaperBlur, setWallpaperBlur] = useState<number>(() => {
    return userSettings?.wallpaperBlur ?? getStoredWallpaperBlur();
  });

  // UI Transparency state (persisted)
  const [uiTransparency, setUiTransparency] = useState<number>(() => {
    return userSettings?.uiTransparency ?? getStoredUiTransparency(Boolean(activeWallpaper));
  });

  // Currency & Language States
  const [selectedCurrency, setSelectedCurrency] = useState<'VND' | 'USD'>(() => {
    return userSettings?.currency ?? 'VND';
  });
  const [selectedLanguage, setSelectedLanguage] = useState<'vi' | 'en'>(() => {
    return userSettings?.language ?? 'vi';
  });
  const [exchangeRate, setExchangeRate] = useState<number>(() => currencyConfig.exchangeRate);
  const [rateUpdatedDate, setRateUpdatedDate] = useState<Date | null>(null);

  // Sync states if userSettings changes
  useEffect(() => {
    if (userSettings?.currency) {
      setSelectedCurrency(userSettings.currency);
    }
    if (userSettings?.language) {
      setSelectedLanguage(userSettings.language);
    }
  }, [userSettings]);

  // Fetch exchange rate once on SettingsView mount
  useEffect(() => {
    async function loadRate() {
      try {
        const res = await fetch('/api/exchange-rate');
        const data = await res.json();
        if (data && data.success && typeof data.rate === 'number') {
          setExchangeRate(data.rate);
          currencyConfig.exchangeRate = data.rate;
          if (data.updatedAt) {
            setRateUpdatedDate(new Date(data.updatedAt));
          }
        }
      } catch (e) {
        console.warn('Failed to load exchange rate in settings:', e);
      }
    }
    loadRate();
  }, []);

  const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cur = e.target.value as 'VND' | 'USD';
    setSelectedCurrency(cur);
    currencyConfig.currency = cur;
    await updateUserSettings({ currency: cur });
    onDataChanged();
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as 'vi' | 'en';
    setSelectedLanguage(lang);
    languageConfig.language = lang;
    await updateUserSettings({ language: lang });
    onDataChanged();
  };

  // System Core Colors Studio state
  const [isColorStudioOpen, setIsColorStudioOpen] = useState(false);
  const [systemColors, setSystemColors] = useState<SystemColorsConfig>(() => loadStoredSystemColors());

  useEffect(() => {
    applySystemColorsToDocument(systemColors);
  }, [systemColors]);

  useEffect(() => {
    if (userSettings?.wallpaperBlur !== undefined) {
      setWallpaperBlur(userSettings.wallpaperBlur);
      applyWallpaperBlur(userSettings.wallpaperBlur);
    }
  }, [userSettings?.wallpaperBlur]);

  useEffect(() => {
    if (userSettings?.uiTransparency !== undefined) {
      setUiTransparency(userSettings.uiTransparency);
      applyUiTransparency(userSettings.uiTransparency);
    }
  }, [userSettings?.uiTransparency]);

  const handleWallpaperBlurChange = async (val: number) => {
    const clamped = Math.max(0, Math.min(30, val));
    setWallpaperBlur(clamped);
    setStoredWallpaperBlur(clamped);
    try {
      await updateUserSettings({ wallpaperBlur: clamped });
      onDataChanged();
    } catch (e) {
      console.error('Error saving wallpaper blur to database:', e);
    }
  };

  const handleTransparencyChange = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setUiTransparency(clamped);
    setStoredUiTransparency(clamped);
    // Realtime preview is triggered immediately by setStoredUiTransparency via CSS variables
    try {
      await updateUserSettings({ uiTransparency: clamped });
      onDataChanged();
    } catch (e) {
      console.error('Error saving UI transparency to database:', e);
    }
  };

  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setWallpaperCropSrc(event.target.result as string);
        setIsWallpaperCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleWallpaperCropComplete = async (blob: Blob, dataUrl?: string) => {
    setIsWallpaperCropOpen(false);
    const rawCroppedUrl = dataUrl || URL.createObjectURL(blob);
    setIsProcessingWallpaper(true);
    try {
      const optimized = await optimizeWallpaper(rawCroppedUrl);
      if (onApplyWallpaper) {
        await onApplyWallpaper(optimized);
      } else {
        await updateUserSettings({ wallpaperDataUrl: optimized });
        setCachedWallpaper(optimized);
        onDataChanged();
      }

      // Default UI transparency to 50% if currently 0% when adding wallpaper
      if (uiTransparency === 0) {
        await handleTransparencyChange(50);
      }

      setStatusMessage({ type: 'success', text: 'Đã áp dụng hình nền mới thành công!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error optimizing wallpaper:', err);
      setStatusMessage({ type: 'error', text: 'Lỗi khi xử lý hình nền.' });
    } finally {
      setIsProcessingWallpaper(false);
      setWallpaperCropSrc(null);
    }
  };

  const handleRemoveWallpaper = async () => {
    try {
      if (onClearWallpaper) {
        await onClearWallpaper();
      } else {
        removeCachedWallpaper();
        await updateUserSettings({ wallpaperDataUrl: '' });
        onDataChanged();
      }

      // Reset transparency to default 0% when wallpaper is removed
      await handleTransparencyChange(0);

      setStatusMessage({ type: 'success', text: 'Đã khôi phục hình nền mặc định!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error clearing wallpaper:', err);
      setStatusMessage({ type: 'error', text: 'Lỗi khi khôi phục hình nền.' });
    }
  };

  const { categories, expenseCategories, incomeCategories } = useCategories();

  const [backendUrl, setBackendUrl] = useState('');
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{
    tested: boolean;
    ok?: boolean;
    latency?: number;
    message?: string;
    server?: string;
  } | null>(null);

  useEffect(() => {
    AIManager.getBackendUrl().then(url => setBackendUrl(url));
  }, []);

  const handleSaveBackendUrl = async () => {
    await AIManager.setBackendUrl(backendUrl);
    setStatusMessage({ type: 'success', text: 'Đã lưu cấu hình máy chủ AI backend!' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleTestBackend = async () => {
    setIsTestingBackend(true);
    setBackendStatus(null);
    try {
      const res = await AIManager.checkHealth(backendUrl);
      setBackendStatus({
        tested: true,
        ok: res.ok,
        latency: res.latency,
        message: res.message,
        server: res.server,
      });
    } catch (e: any) {
      setBackendStatus({
        tested: true,
        ok: false,
        message: e?.message || 'Lỗi kết nối',
      });
    } finally {
      setIsTestingBackend(false);
    }
  };

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest'>(() => {
    return isUpdateAvailable() ? 'available' : 'idle';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeUpdateState((hasUpdate) => {
      if (hasUpdate) {
        setUpdateStatus('available');
      }
    });
    return unsubscribe;
  }, []);

  const checkForUpdate = async () => {
    setUpdateStatus('checking');
    try {
      const result = await checkForRemoteUpdate();
      if (result.hasUpdate) {
        setUpdateStatus('available');
      } else if (result.error) {
        setStatusMessage({ type: 'error', text: 'Không thể kiểm tra cập nhật. Vui lòng thử lại sau.' });
        setUpdateStatus('idle');
      } else {
        setUpdateStatus('latest');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Lỗi kiểm tra cập nhật:', error);
      setStatusMessage({ type: 'error', text: 'Không thể kiểm tra cập nhật' });
      setUpdateStatus('idle');
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await applyAppUpdate();
    } catch (err) {
      console.error('Lỗi khi cập nhật:', err);
      window.location.reload();
    }
  };

  // Load initial balances on mount
  useEffect(() => {
    getUserSettings().then((s) => {
      setWalletStr(s.initialWalletBalance ? s.initialWalletBalance.toString() : '0');
      setBankStr(s.initialBankBalance ? s.initialBankBalance.toString() : '0');
    });
  }, []);

  const walletNum = parseAmountInput(walletStr);
  const bankNum = parseAmountInput(bankStr);

  const handleSaveBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingBalances(true);
      await updateUserSettings({
        initialWalletBalance: walletNum,
        initialBankBalance: bankNum,
      });
      setStatusMessage({ type: 'success', text: 'Đã cập nhật số dư ban đầu thành công!' });
      setShowEditBalanceModal(false);
      onDataChanged();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Lỗi khi lưu số dư ban đầu.' });
    } finally {
      setIsSavingBalances(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatusMessage(null);
      const zipBlob = await exportBackupZip();
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerBlobDownload(zipBlob, `fima-backup-${dateStr}.zip`);
      setStatusMessage({ type: 'success', text: 'Đã xuất file sao lưu dữ liệu và ảnh thành công!' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Lỗi khi xuất dữ liệu sao lưu.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setStatusMessage(null);
      const res = await importBackupZip(file);
      setStatusMessage({
        type: 'success',
        text: `Đã khôi phục ${res.importedTransactionsCount} giao dịch và ${res.importedImagesCount} hình ảnh thành công!`,
      });
      onDataChanged();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'File backup không hợp lệ hoặc bị lỗi';
      setStatusMessage({ type: 'error', text: `Lỗi khi nhập dữ liệu: ${msg}` });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllData();
      setShowClearConfirm(false);
      setStatusMessage({ type: 'success', text: 'Đã xóa toàn bộ dữ liệu trên thiết bị.' });
      onDataChanged();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Không thể xóa dữ liệu.' });
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. PAGE HEADER (Title & Logo) */}
      <div className="flex items-center justify-between pt-1 px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="text-white" size={24} />
            {t('settings.title')}
          </h1>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check size={18} className="text-white shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-rose-300 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SVG Gradient Defs for Settings Logos */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none', opacity: 0 }} aria-hidden="true">
        <defs>
          <linearGradient id="settings-pink-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sys-gradient-pink, #f472b6)" />
            <stop offset="30%" stopColor="var(--sys-gradient-end, #ec4899)" />
            <stop offset="70%" stopColor="var(--sys-gradient-start, #a855f7)" />
            <stop offset="100%" stopColor="var(--sys-gradient-purple, #c084fc)" />
          </linearGradient>
        </defs>
      </svg>

      {/* NEW SECTION: CURRENCY */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          icon={Coins}
          title={t('settings.currency.title')}
          description={t('settings.currency.desc')}
        />

        <div className="relative">
          <select
            value={selectedCurrency}
            onChange={handleCurrencyChange}
            className="w-full bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 focus:border-purple-500 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold appearance-none outline-none transition-colors cursor-pointer pr-10"
          >
            <option value="VND">🇻🇳 VND – Vietnamese Dong</option>
            <option value="USD">🇺🇸 USD – US Dollar</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
            <ChevronDown size={16} />
          </div>
        </div>

        {selectedCurrency === 'USD' && (
          <div className="text-xs text-purple-300 bg-purple-950/20 border border-purple-900/30 rounded-xl p-3 flex flex-col gap-0.5">
            <div>
              • <span className="font-bold">{t('settings.currency.rate')}:</span> 1 USD = {exchangeRate.toLocaleString('vi-VN')} ₫
            </div>
            {rateUpdatedDate && (
              <div className="text-neutral-400">
                • <span className="font-medium">{t('settings.currency.updated_at')}:</span> {(() => {
                  const hrs = rateUpdatedDate.getHours().toString().padStart(2, '0');
                  const mins = rateUpdatedDate.getMinutes().toString().padStart(2, '0');
                  const day = rateUpdatedDate.getDate().toString().padStart(2, '0');
                  const month = (rateUpdatedDate.getMonth() + 1).toString().padStart(2, '0');
                  return languageConfig.language === 'en'
                    ? `${hrs}:${mins} on ${month}/${day}`
                    : `${hrs}:${mins} ngày ${day}/${month}`;
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW SECTION: LANGUAGE */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          icon={Globe}
          title={t('settings.language.title')}
          description={t('settings.language.desc')}
        />

        <div className="relative">
          <select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            className="w-full bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 focus:border-purple-500 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold appearance-none outline-none transition-colors cursor-pointer pr-10"
          >
            <option value="vi">🇻🇳 Tiếng Việt – Vietnamese</option>
            <option value="en">🇺🇸 English – English</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* 2. SECTION: QUẢN LÝ DANH MỤC */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          icon={Tag}
          title={t('settings.categories.title')}
          description={t('settings.categories.desc')}
        />

        <button
          type="button"
          onClick={() => onSetCategoryModalOpen(true)}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <Tag size={16} className="text-neutral-300 shrink-0" />
          <span>{t('settings.categories.btn')} ({expenseCategories.length} {t('stats.tab.expense').toLowerCase()} • {incomeCategories.length} {t('stats.tab.income').toLowerCase()})</span>
        </button>
      </div>

      {/* 3. SECTION: LIQUID GLASS STUDIO */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          customIcon={<LiquidGlassStudioLogo size={20} />}
          title={t('settings.glass.title')}
          description={t('settings.glass.desc')}
        />

        <button
          type="button"
          onClick={onOpenLiquidGlassStudio}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <LiquidGlassStudioLogo size={16} hasColor={false} className="text-neutral-300" />
          <span>{t('settings.glass.btn')}</span>
        </button>
      </div>

      {/* 4. SECTION: STUDIO MÀU SẮC HỆ THỐNG (5 MASTER COLORS) */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3.5">
        <SettingsCardHeader
          icon={Palette}
          title={t('settings.colors.title')}
          description={t('settings.colors.desc')}
        />

        <button
          type="button"
          onClick={() => setIsColorStudioOpen(true)}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <Palette size={16} className="text-neutral-300 shrink-0" />
          <span>{t('settings.colors.btn')}</span>
        </button>
      </div>

      {/* 5. SECTION: HÌNH NỀN & ĐỘ TRONG GIAO DIỆN */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3.5">
        <SettingsCardHeader
          icon={ImageIcon}
          title={t('settings.wallpaper.title')}
          description={t('settings.wallpaper.desc')}
        />

        {/* Chỉnh sửa hình nền ứng dụng button (Colorless icon on button) */}
        <button
          type="button"
          onClick={() => setIsWallpaperModalOpen(true)}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <ImageIcon size={16} className="text-neutral-300 shrink-0" />
          <span>{t('settings.wallpaper.btn')}</span>
        </button>
      </div>

      {/* 5. SECTION: DỮ LIỆU */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          icon={Database}
          title={t('settings.data.title')}
          description={t('settings.data.desc')}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleImportFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="py-3 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-100 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download size={16} className="text-white" />
                {t('settings.data.export')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="py-3 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-100 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            {isImporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={16} className="text-neutral-300" />
                {t('settings.data.import')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. SECTION: PWA */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          icon={Smartphone}
          title={t('settings.pwa.title')}
          description={t('settings.pwa.desc')}
        />

        <button
          type="button"
          onClick={onOpenInstallGuide}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <Smartphone size={16} className="text-neutral-300" />
          <span>{t('settings.pwa.btn')}</span>
        </button>
      </div>

      {/* 6. SECTION: PHIÊN BẢN ỨNG DỤNG */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <SettingsCardHeader
          icon={RefreshCw}
          title={t('settings.version.title')}
          description={
            <div>
              {updateStatus === 'idle' && <span>{t('settings.version.desc')}</span>}
              {updateStatus === 'checking' && <span className="text-neutral-300">{t('settings.version.checking')}</span>}
              {updateStatus === 'latest' && <span className="text-emerald-400 font-bold">{t('settings.version.latest')}</span>}
              {updateStatus === 'available' && <span className="text-amber-400 font-bold">{t('settings.version.available')}</span>}
            </div>
          }
        />

        {updateStatus === 'available' ? (
          <button
            type="button"
            onClick={handleApplyUpdate}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-md"
          >
            <RefreshCw size={16} />
            {t('settings.version.updateNow')}
          </button>
        ) : (
          <button
            type="button"
            onClick={checkForUpdate}
            disabled={updateStatus === 'checking'}
            className="w-full py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer border border-neutral-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
            {t('settings.version.checkBtn')}
          </button>
        )}
      </div>

      {/* 7. SECTION: MÁY CHỦ AI */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 space-y-3.5 shadow-sm">
        <SettingsCardHeader
          icon={Server}
          title={t('settings.ai.title')}
          description={t('settings.ai.desc')}
        />

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-neutral-300">
            {t('settings.ai.label')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder={t('settings.ai.placeholder')}
              className="w-full bg-[#1a1a1a] border border-neutral-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none transition-colors"
            />
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            • <strong className="text-neutral-300">GitHub Pages</strong>: {t('settings.ai.tip_github')}<br />
            • <strong className="text-neutral-300">{languageConfig.language === 'en' ? 'Security' : 'Bảo mật'}</strong>: {t('settings.ai.tip_security')}
          </p>
        </div>

        {backendStatus?.tested && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
              backendStatus.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {backendStatus.ok ? (
              <Check size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            )}
            <div>
              <div className="font-bold">
                {backendStatus.ok ? t('settings.ai.success') : t('settings.ai.failed')}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {backendStatus.ok
                  ? `${t('settings.ai.latency').replace('{ms}', String(backendStatus.latency))} • ${backendStatus.server || 'Fima AI Server'}`
                  : backendStatus.message}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestBackend}
            disabled={isTestingBackend}
            className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-colors border border-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            <Activity size={14} className={isTestingBackend ? 'animate-spin' : ''} />
            {isTestingBackend ? t('settings.ai.testing') : t('settings.ai.test')}
          </button>

          <button
            type="button"
            onClick={handleSaveBackendUrl}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-colors cursor-pointer shadow-md"
          >
            <Check size={14} />
            {t('settings.ai.save_btn')}
          </button>

          {backendUrl && (
            <button
              type="button"
              onClick={async () => {
                setBackendUrl('');
                await AIManager.setBackendUrl('');
                setBackendStatus(null);
                setStatusMessage({ type: 'success', text: languageConfig.language === 'en' ? 'Reset to default URL!' : 'Đã đặt lại về URL mặc định!' });
                setTimeout(() => setStatusMessage(null), 3000);
              }}
              className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
            >
              {t('settings.ai.default')}
            </button>
          )}
        </div>
      </div>

      {/* 8. PRIVACY */}
      <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-start gap-2.5">
        <ShieldCheck size={18} className="text-white shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
          <span className="font-bold text-white">{t('settings.privacy.title')}</span> {t('settings.privacy.desc')}
        </div>
      </div>

      {/* 9. DANGER ZONE */}
      <div className="bg-rose-500/10 rounded-3xl p-4 sm:p-5 border border-rose-500/25 space-y-3">
        <SettingsCardHeader
          icon={Trash2}
          title={t('settings.danger.title')}
          description={t('settings.danger.desc')}
          isDanger={true}
        />

        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-md"
        >
          <Trash2 size={16} />
          {t('settings.danger.btn')}
        </button>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)]">
          <div className="w-full max-w-xs bg-[#121212] border border-neutral-800 rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center mx-auto mb-3.5">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-base font-extrabold text-white mb-1.5">
              {t('settings.danger.confirm_title')}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 mb-6 leading-relaxed font-medium">
              {t('settings.danger.confirm_desc')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-3 rounded-2xl bg-[#1a1a1a] text-neutral-200 text-xs sm:text-sm font-bold hover:bg-[#262626] active:scale-95 cursor-pointer border border-neutral-800"
              >
                {t('datepicker.prev_day') === 'Ngày trước' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="py-3 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-500 active:scale-95 cursor-pointer shadow-md"
              >
                {t('settings.danger.confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => onSetCategoryModalOpen(false)}
        onDataChanged={onDataChanged}
      />

      {/* Image Crop Modal for Wallpaper */}
      {isWallpaperCropOpen && wallpaperCropSrc && (
        <ImageCropModal
          isOpen={isWallpaperCropOpen}
          imageSrc={wallpaperCropSrc}
          shape="rect"
          initialAspectRatio="9:16"
          lockAspectRatio={false}
          title="Căn chỉnh hình nền"
          onClose={() => {
            setIsWallpaperCropOpen(false);
            setWallpaperCropSrc(null);
          }}
          onCropComplete={handleWallpaperCropComplete}
        />
      )}

      {/* Wallpaper Editor Bottom Sheet Modal */}
      {isWallpaperModalOpen && (
        <WallpaperEditorModal
          isOpen={isWallpaperModalOpen}
          onClose={() => setIsWallpaperModalOpen(false)}
          activeWallpaper={activeWallpaper}
          onApplyWallpaper={onApplyWallpaper}
          onClearWallpaper={onClearWallpaper}
          uiTransparency={uiTransparency}
          onTransparencyChange={handleTransparencyChange}
          wallpaperBlur={wallpaperBlur}
          onWallpaperBlurChange={handleWallpaperBlurChange}
        />
      )}

      {/* System Core Colors Studio Bottom Sheet Modal */}
      {isColorStudioOpen && (
        <SystemColorStudioModal
          isOpen={isColorStudioOpen}
          onClose={() => setIsColorStudioOpen(false)}
          currentColorConfig={systemColors}
          onColorConfigChange={(newCfg) => setSystemColors(newCfg)}
        />
      )}
    </div>
  );
};
