import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { clearAllData } from '../db/database';
import { exportBackupZip, importBackupZip, triggerBlobDownload } from '../services/backupService';
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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setStatusMessage(null);
    setShowClearConfirm(false);
  }, [isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex justify-center items-end sm:items-center overflow-y-auto pt-[max(env(safe-area-inset-top,0px),16px)] sm:pt-0 text-neutral-100">
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
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng cài đặt"
            title="Đóng cài đặt"
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

          {/* 1. Backup & Restore */}
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

          {/* 2. PWA Install Guide */}
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

          {/* 3. Privacy & Info */}
          <div className="bg-emerald-500/15 rounded-2xl p-3.5 border border-emerald-500/30 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-emerald-300 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
              <span className="font-bold text-emerald-300">Bảo mật:</span> 100% dữ liệu và ảnh chỉ lưu trực tiếp trên thiết bị của bạn.
            </div>
          </div>

          {/* 4. Danger Zone */}
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
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)]">
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

        {/* SVG Gradient Defs */}
        <svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
          <defs>
            <linearGradient id="settings-modal-pink-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
