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
} from 'lucide-react';
import { AIManager } from '../services/ai/AIManager';
import { getUserSettings, updateUserSettings, clearAllData } from '../db/database';
import { exportBackupZip, importBackupZip, triggerBlobDownload } from '../services/backupService';
import {
  checkForRemoteUpdate,
  applyAppUpdate,
  isUpdateAvailable,
  subscribeUpdateState,
} from '../services/updateService';
import { parseAmountInput } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { CategoryManagementModal } from './CategoryManagementModal';
import { CategoryIcon } from './CategoryIcon';

interface SettingsViewProps {
  onDataChanged: () => void;
  onOpenInstallGuide: () => void;
  isCategoryModalOpen: boolean;
  onSetCategoryModalOpen: (open: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onDataChanged,
  onOpenInstallGuide,
  isCategoryModalOpen,
  onSetCategoryModalOpen,
}) => {
  const [walletStr, setWalletStr] = useState('');
  const [bankStr, setBankStr] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingBalances, setIsSavingBalances] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { categories, expenseCategories, incomeCategories } = useCategories();

  const [backendUrl, setBackendUrl] = useState(() => AIManager.getBackendUrl());
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<{
    tested: boolean;
    ok?: boolean;
    latency?: number;
    message?: string;
    server?: string;
  } | null>(null);

  const handleSaveBackendUrl = () => {
    AIManager.setBackendUrl(backendUrl);
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
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-black text-white tracking-tight">Cài đặt ứng dụng</h2>
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

      {/* 1. SECTION: TÀI CHÍNH */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3.5">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
          Tài chính & Số dư ban đầu
        </h3>

        <form onSubmit={handleSaveBalances} noValidate className="space-y-3">
          <div>
            <label htmlFor="settings-wallet-input-view" className="block text-xs sm:text-sm font-bold text-neutral-200 mb-1 flex items-center gap-2">
              <Wallet size={16} className="text-amber-400" />
              Số dư ban đầu của Ví
            </label>
            <div className="relative flex items-center">
              <input
                id="settings-wallet-input-view"
                type="text"
                inputMode="numeric"
                value={walletNum > 0 ? walletNum.toLocaleString('vi-VN') : ''}
                onChange={(e) => setWalletStr(e.target.value)}
                placeholder="0"
                className="w-full text-sm sm:text-base font-bold text-white font-mono bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
              />
              <span className="absolute right-3.5 text-sm font-bold text-neutral-400">₫</span>
            </div>
          </div>

          <div>
            <label htmlFor="settings-bank-input-view" className="block text-xs sm:text-sm font-bold text-neutral-200 mb-1 flex items-center gap-2">
              <Building2 size={16} className="text-blue-400" />
              Số dư ban đầu của Ngân hàng
            </label>
            <div className="relative flex items-center">
              <input
                id="settings-bank-input-view"
                type="text"
                inputMode="numeric"
                value={bankNum > 0 ? bankNum.toLocaleString('vi-VN') : ''}
                onChange={(e) => setBankStr(e.target.value)}
                placeholder="0"
                className="w-full text-sm sm:text-base font-bold text-white font-mono bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-400"
              />
              <span className="absolute right-3.5 text-sm font-bold text-neutral-400">₫</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingBalances}
            className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs sm:text-sm font-extrabold transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
          >
            {isSavingBalances ? 'Đang lưu...' : 'Lưu thay đổi số dư ban đầu'}
          </button>
        </form>
      </div>

      {/* 2. SECTION: QUẢN LÝ DANH MỤC */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={15} className="text-amber-400" />
              Quản lý danh mục
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium mt-1">
              Tùy chỉnh toàn bộ danh mục Thu và Chi: thêm mới, đổi tên, đổi icon, màu sắc và sắp xếp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSetCategoryModalOpen(true)}
          className="w-full p-3.5 bg-[#1a1a1a] hover:bg-[#222222] border border-neutral-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs active:scale-98 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2 shrink-0">
              {expenseCategories.slice(0, 2).map((c) => (
                <div key={c.id} className="relative z-10">
                  <CategoryIcon category={c.name} type="expense" size={14} showBackground={false} />
                </div>
              ))}
              {incomeCategories.slice(0, 1).map((c) => (
                <div key={c.id} className="relative z-0">
                  <CategoryIcon category={c.name} type="income" size={14} showBackground={false} />
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Danh mục Thu & Chi
              </div>
              <div className="text-[11px] text-neutral-400">
                {expenseCategories.length} khoản chi • {incomeCategories.length} khoản thu
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-neutral-400 group-hover:text-white transition-colors">
            <span className="text-xs font-semibold">Chỉnh sửa</span>
            <ChevronRight size={16} />
          </div>
        </button>
      </div>

      {/* 3. SECTION: DỮ LIỆU */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
          Sao lưu & Khôi phục Dữ liệu
        </h3>
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
          Dữ liệu và ảnh được lưu an toàn trên máy (IndexedDB). Xuất file .zip để sao lưu hoặc chuyển sang thiết bị mới.
        </p>

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
                Xuất backup (.zip)
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
                Nhập backup (.zip)
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. SECTION: ỨNG DỤNG */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-4">
        {/* PWA Install */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">
                Cài đặt Màn hình chính (PWA)
              </div>
              <div className="text-xs text-neutral-400 font-medium">
                Dùng như ứng dụng native trên iPhone & Android
              </div>
            </div>
          </div>

          <button
            onClick={onOpenInstallGuide}
            className="px-3.5 py-2 rounded-xl bg-white text-black text-xs sm:text-sm font-extrabold hover:bg-neutral-200 active:scale-95 transition-all shrink-0 ml-2 cursor-pointer shadow-md"
          >
            Hướng dẫn
          </button>
        </div>

        {/* Update Checker */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
              <RefreshCw size={20} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
            </div>
            <div className="flex-1">
              <div className="text-xs sm:text-sm font-bold text-white">
                Phiên bản ứng dụng
              </div>
              <div className="text-xs font-medium mt-0.5">
                {updateStatus === 'idle' && <span className="text-neutral-400">Kiểm tra bản cập nhật mới nhất</span>}
                {updateStatus === 'checking' && <span className="text-neutral-400">Đang kiểm tra...</span>}
                {updateStatus === 'latest' && <span className="text-emerald-400">Bạn đang sử dụng phiên bản mới nhất</span>}
                {updateStatus === 'available' && <span className="text-amber-400 font-bold">Có phiên bản mới!</span>}
              </div>
            </div>
          </div>

          {updateStatus === 'available' ? (
            <button
              onClick={handleApplyUpdate}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-md"
            >
              Cập nhật ngay
            </button>
          ) : (
            <button
              onClick={checkForUpdate}
              disabled={updateStatus === 'checking'}
              className="w-full py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer border border-neutral-800 disabled:opacity-50"
            >
              Kiểm tra cập nhật
            </button>
          )}
        </div>
      </div>

      {/* AI BACKEND CLOUD CONFIGURATION */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Server size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-neutral-200 uppercase tracking-wider">
              Máy chủ AI (Cloud Backend)
            </h3>
            <p className="text-[11px] text-neutral-400">
              Kết nối backend Gemini để dùng AI trên GitHub Pages, di động & mạng 4G/5G
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-neutral-300">
            URL Backend Public (HTTPS)
          </label>
          <div className="relative">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="Để trống nếu chạy cùng máy chủ, hoặc https://..."
              className="w-full bg-[#1a1a1a] border border-neutral-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 outline-none transition-colors"
            />
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            • <strong className="text-neutral-300">GitHub Pages</strong>: Nhập URL máy chủ backend (Render, Railway, Cloud Run...) để mọi người dùng đều dùng được AI không cần API key riêng.<br />
            • <strong className="text-neutral-300">Bảo mật</strong>: GEMINI_API_KEY được lưu an toàn trên máy chủ, không lộ ra mã nguồn hay trình duyệt.
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
                {backendStatus.ok ? 'Kết nối máy chủ AI thành công!' : 'Không thể kết nối máy chủ AI'}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {backendStatus.ok
                  ? `Phản hồi trong ${backendStatus.latency}ms • ${backendStatus.server || 'Fima AI Server'}`
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
            {isTestingBackend ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </button>

          <button
            type="button"
            onClick={handleSaveBackendUrl}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-colors cursor-pointer shadow-md"
          >
            <Check size={14} />
            Lưu URL
          </button>

          {backendUrl && (
            <button
              type="button"
              onClick={() => {
                setBackendUrl('');
                AIManager.setBackendUrl('');
                setBackendStatus(null);
                setStatusMessage({ type: 'success', text: 'Đã đặt lại về URL mặc định!' });
                setTimeout(() => setStatusMessage(null), 3000);
              }}
              className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Mặc định
            </button>
          )}
        </div>
      </div>

      {/* 4. PRIVACY */}
      <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10 flex items-start gap-2.5">
        <ShieldCheck size={18} className="text-white shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
          <span className="font-bold text-white">Bảo mật:</span> 100% dữ liệu và ảnh lưu trực tiếp trên thiết bị của bạn. Không qua máy chủ bên ngoài.
        </div>
      </div>

      {/* 5. DANGER ZONE */}
      <div className="bg-rose-500/10 rounded-3xl p-4 sm:p-5 border border-rose-500/25 space-y-2.5">
        <h3 className="text-xs font-black text-rose-300 uppercase tracking-wider">
          Xóa toàn bộ dữ liệu
        </h3>
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
          Hành động này sẽ xóa vĩnh viễn toàn bộ số dư, lịch sử giao dịch và hình ảnh chứng từ trên thiết bị này.
        </p>

        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-md"
        >
          <Trash2 size={16} />
          Xóa toàn bộ dữ liệu
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
              Xác nhận xóa tất cả?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 mb-6 leading-relaxed font-medium">
              Tất cả dữ liệu giao dịch và ảnh hóa đơn sẽ bị xóa vĩnh viễn khỏi thiết bị.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-3 rounded-2xl bg-[#1a1a1a] text-neutral-200 text-xs sm:text-sm font-bold hover:bg-[#262626] active:scale-95 cursor-pointer border border-neutral-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="py-3 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-500 active:scale-95 cursor-pointer shadow-md"
              >
                Xác nhận xóa
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
    </div>
  );
};
