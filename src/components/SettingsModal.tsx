import React, { useState, useRef } from 'react';
import {
  X,
  Wallet,
  Building2,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  Smartphone,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { getUserSettings, updateUserSettings, clearAllData } from '../db/database';
import { exportBackupZip, importBackupZip, triggerBlobDownload } from '../services/backupService';
import { parseAmountInput } from '../utils/formatters';
import appLogo from '../assets/logo.png';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  onOpenInstallGuide: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  onOpenInstallGuide,
}) => {
  const [walletStr, setWalletStr] = useState('');
  const [bankStr, setBankStr] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingBalances, setIsSavingBalances] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial balances when opened
  React.useEffect(() => {
    if (!isOpen) return;
    getUserSettings().then((s) => {
      setWalletStr(s.initialWalletBalance ? s.initialWalletBalance.toString() : '0');
      setBankStr(s.initialBankBalance ? s.initialBankBalance.toString() : '0');
    });
    setStatusMessage(null);
    setShowClearConfirm(false);
  }, [isOpen]);

  if (!isOpen) return null;

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
      triggerBlobDownload(zipBlob, `finance-backup-${dateStr}.zip`);
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
      onClose();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Không thể xóa dữ liệu.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-center items-end sm:items-center overflow-y-auto text-neutral-100">
      <div className="w-full max-w-lg bg-[#202328] border border-[#3a3f4b] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#282c34] border-b border-[#3a3f4b] shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={appLogo}
              alt="Fima Logo"
              className="w-7 h-7 rounded-lg object-cover border border-[#4a5060] shadow-xs"
            />
            <h2 className="text-base font-extrabold text-white">Fima - Cài đặt & Dữ liệu</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#323640] hover:bg-[#3c414f] text-neutral-300 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
            aria-label="Đóng cài đặt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check size={18} className="text-emerald-300 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose-300 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Initial Balances Card */}
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm">
            <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider mb-3">
              Số dư ban đầu
            </h3>

            <form onSubmit={handleSaveBalances} noValidate className="space-y-3">
              <div>
                <label htmlFor="settings-wallet-input" className="block text-xs sm:text-sm font-bold text-neutral-200 mb-1 flex items-center gap-2">
                  <Wallet size={16} className="text-amber-400" />
                  Số dư ban đầu của Ví
                </label>
                <div className="relative flex items-center">
                  <input
                    id="settings-wallet-input"
                    type="text"
                    inputMode="numeric"
                    value={walletNum > 0 ? walletNum.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setWalletStr(e.target.value)}
                    placeholder="0"
                    className="w-full text-sm sm:text-base font-bold text-white font-mono bg-[#313540] border border-[#3e4350] rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-400"
                  />
                  <span className="absolute right-3.5 text-sm font-bold text-neutral-400">₫</span>
                </div>
              </div>

              <div>
                <label htmlFor="settings-bank-input" className="block text-xs sm:text-sm font-bold text-neutral-200 mb-1 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-400" />
                  Số dư ban đầu của Ngân hàng
                </label>
                <div className="relative flex items-center">
                  <input
                    id="settings-bank-input"
                    type="text"
                    inputMode="numeric"
                    value={bankNum > 0 ? bankNum.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setBankStr(e.target.value)}
                    placeholder="0"
                    className="w-full text-sm sm:text-base font-bold text-white font-mono bg-[#313540] border border-[#3e4350] rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-400"
                  />
                  <span className="absolute right-3.5 text-sm font-bold text-neutral-400">₫</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingBalances}
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black rounded-xl text-xs sm:text-sm font-extrabold transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
              >
                {isSavingBalances ? 'Đang lưu...' : 'Lưu thay đổi số dư ban đầu'}
              </button>
            </form>
          </div>

          {/* 2. Backup & Restore */}
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm space-y-2.5">
            <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider">
              Sao lưu & Khôi phục
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              Dữ liệu và ảnh được lưu an toàn trên máy (IndexedDB). Xuất file .zip để lưu trữ hoặc chuyển thiết bị.
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
                className="py-2.5 px-3 bg-[#313540] hover:bg-[#3c414f] text-neutral-100 border border-[#3e4350] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download size={16} className="text-emerald-400" />
                    Xuất backup (.zip)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="py-2.5 px-3 bg-[#313540] hover:bg-[#3c414f] text-neutral-100 border border-[#3e4350] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={16} className="text-neutral-300" />
                    Nhập backup (.zip)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. PWA Install Guide */}
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 flex items-center justify-center shrink-0">
                <Smartphone size={20} />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  Cài đặt Màn hình chính (PWA)
                </div>
                <div className="text-xs text-neutral-300 font-medium">
                  Dùng như app native trên iPhone & Android
                </div>
              </div>
            </div>

            <button
              onClick={onOpenInstallGuide}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 text-black text-xs sm:text-sm font-extrabold hover:bg-emerald-300 active:scale-95 transition-all shrink-0 ml-2 cursor-pointer shadow-md"
            >
              Hướng dẫn
            </button>
          </div>

          {/* 4. Privacy & Info */}
          <div className="bg-emerald-500/15 rounded-2xl p-3.5 border border-emerald-500/30 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-emerald-300 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
              <span className="font-bold text-emerald-300">Bảo mật:</span> 100% dữ liệu và ảnh chỉ lưu trực tiếp trên thiết bị của bạn.
            </div>
          </div>

          {/* 5. Danger Zone */}
          <div className="bg-rose-500/15 rounded-2xl p-4 border border-rose-500/30 space-y-2">
            <h3 className="text-xs font-black text-rose-300 uppercase tracking-wider">
              Xóa toàn bộ dữ liệu
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
              Hành động này sẽ xóa toàn bộ số dư, lịch sử giao dịch và hình ảnh chứng từ trên thiết bị này.
            </p>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-md"
            >
              <Trash2 size={16} />
              Xóa toàn bộ dữ liệu
            </button>
          </div>
        </div>

        {/* Clear Data Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-[#282c34] border border-[#3a3f4b] rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
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
                  className="py-3 rounded-2xl bg-[#323640] text-neutral-200 text-xs sm:text-sm font-bold hover:bg-[#3c414f] active:scale-95 cursor-pointer border border-[#3a3f4b]"
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
      </div>
    </div>
  );
};
