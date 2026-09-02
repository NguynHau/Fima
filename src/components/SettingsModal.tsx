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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-end sm:items-center overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0f0f0f] border border-[#262626] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#121212] border-b border-[#262626] shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Fima"
              className="w-5 h-5 rounded-md object-cover border border-[#333333]"
            />
            <h2 className="text-sm font-bold text-white">Fima - Cài đặt & Dữ liệu</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#1c1c1c] hover:bg-[#262626] text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
            aria-label="Đóng cài đặt"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Initial Balances Card */}
          <div className="bg-[#141414] rounded-xl p-3 border border-[#262626] shadow-sm">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Số dư ban đầu
            </h3>

            <form onSubmit={handleSaveBalances} noValidate className="space-y-2">
              <div>
                <label htmlFor="settings-wallet-input" className="block text-[11px] font-semibold text-neutral-300 mb-0.5 flex items-center gap-1.5">
                  <Wallet size={13} className="text-amber-400" />
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
                    className="w-full text-xs font-bold text-white font-mono bg-[#1a1a1a] border border-[#333333] rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 text-xs font-bold text-neutral-500">₫</span>
                </div>
              </div>

              <div>
                <label htmlFor="settings-bank-input" className="block text-[11px] font-semibold text-neutral-300 mb-0.5 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-400" />
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
                    className="w-full text-xs font-bold text-white font-mono bg-[#1a1a1a] border border-[#333333] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-2.5 text-xs font-bold text-neutral-500">₫</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingBalances}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-xs font-extrabold transition-all active:scale-98 flex items-center justify-center gap-1 cursor-pointer shadow-xs shadow-emerald-500/20 mt-1"
              >
                {isSavingBalances ? 'Đang lưu...' : 'Lưu thay đổi số dư ban đầu'}
              </button>
            </form>
          </div>

          {/* 2. Backup & Restore */}
          <div className="bg-[#141414] rounded-xl p-3 border border-[#262626] shadow-sm space-y-2">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Sao lưu & Khôi phục
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Dữ liệu và ảnh được lưu an toàn trên máy (IndexedDB). Xuất file .zip để lưu trữ hoặc chuyển thiết bị.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleImportFileChange}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="py-2 px-2.5 bg-[#1e1e1e] hover:bg-[#282828] text-neutral-200 border border-[#333333] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
              >
                {isExporting ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download size={13} className="text-emerald-400" />
                    Xuất backup (.zip)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="py-2 px-2.5 bg-[#1e1e1e] hover:bg-[#282828] text-neutral-200 border border-[#333333] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
              >
                {isImporting ? (
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={13} className="text-neutral-400" />
                    Nhập backup (.zip)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. PWA Install Guide */}
          <div className="bg-[#141414] rounded-xl p-3 border border-[#262626] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                <Smartphone size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  Cài đặt Màn hình chính (PWA)
                </div>
                <div className="text-[10px] text-neutral-400">
                  Dùng như app native trên iPhone & Android
                </div>
              </div>
            </div>

            <button
              onClick={onOpenInstallGuide}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 active:scale-95 transition-all shrink-0 ml-2 cursor-pointer shadow-xs"
            >
              Hướng dẫn
            </button>
          </div>

          {/* 4. Privacy & Info */}
          <div className="bg-emerald-500/10 rounded-xl p-2.5 border border-emerald-500/25 flex items-start gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-neutral-300 leading-relaxed">
              <span className="font-bold text-emerald-400">Bảo mật:</span> 100% dữ liệu và ảnh chỉ lưu trực tiếp trên thiết bị của bạn.
            </div>
          </div>

          {/* 5. Danger Zone */}
          <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/25 space-y-1.5">
            <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              Xóa toàn bộ dữ liệu
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Hành động này sẽ xóa toàn bộ số dư, lịch sử giao dịch và hình ảnh chứng từ trên thiết bị này.
            </p>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Xóa toàn bộ dữ liệu
            </button>
          </div>
        </div>

        {/* Clear Data Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-[#161616] border border-[#262626] rounded-3xl p-5 shadow-2xl text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Xác nhận xóa tất cả?
              </h3>
              <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                Tất cả dữ liệu giao dịch và ảnh hóa đơn sẽ bị xóa vĩnh viễn khỏi thiết bị.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="py-2.5 rounded-xl bg-[#262626] text-neutral-300 text-xs font-bold hover:bg-[#333333] active:scale-95 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 active:scale-95 cursor-pointer"
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
