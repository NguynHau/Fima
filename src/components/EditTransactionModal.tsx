import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Calendar as CalendarIcon,
  Wallet,
  Building2,
  Check,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Pencil,
  X,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type AccountType,
  type Transaction,
  type TransactionType,
} from '../types';
import { updateTransaction, deleteTransaction, getImageBlob } from '../db/database';
import { formatDateVN, formatVND, getTodayString } from '../utils/formatters';
import { compressImage } from '../utils/imageCompressor';
import { CategoryIcon } from './CategoryIcon';
import { DatePickerModal } from './DatePickerModal';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onRequestChangePhoto: () => void;
  newPhotoBlob?: Blob | null;
  onSuccess: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onRequestChangePhoto,
  newPhotoBlob,
  onSuccess,
}) => {
  const [date, setDate] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [account, setAccount] = useState<AccountType>('wallet');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selector modal states
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Inline Camera State
  const [isInlineCameraActive, setIsInlineCameraActive] = useState(false);
  const [inlineStream, setInlineStream] = useState<MediaStream | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [inlineNewPhotoBlob, setInlineNewPhotoBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!transaction) return;

    setDate(transaction.date);
    setType(transaction.type);
    setAmountStr(transaction.amount.toString());
    setCategory(transaction.category);
    setNote(transaction.note || '');
    setAccount(transaction.account);
    setShowDeleteConfirm(false);
    setIsCategorySheetOpen(false);
    setIsAccountSheetOpen(false);
    setErrorMessage(null);

    // Load existing image if no newPhotoBlob provided yet
    if (inlineNewPhotoBlob) {
      const url = URL.createObjectURL(inlineNewPhotoBlob);
      setPhotoUrl(url);
    } else if (newPhotoBlob) {
      const url = URL.createObjectURL(newPhotoBlob);
      setPhotoUrl(url);
    } else if (transaction.imageId) {
      getImageBlob(transaction.imageId).then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPhotoUrl(url);
        }
      });
    }
  }, [transaction, newPhotoBlob, inlineNewPhotoBlob, isOpen]);

  if (!isOpen || !transaction) return null;

  const stopInlineCamera = () => {
    if (inlineStream) {
      inlineStream.getTracks().forEach((track) => track.stop());
      setInlineStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsInlineCameraActive(false);
  };

  const startInlineCamera = async () => {
    stopInlineCamera();
    setErrorMessage(null);
    setIsInlineCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera');
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setInlineStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setErrorMessage('Không thể mở camera. Vui lòng cấp quyền.');
      setIsInlineCameraActive(false);
    }
  };

  const captureInlinePhoto = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || isProcessingPhoto) return resolve(null);
      setIsProcessingPhoto(true);
      try {
        const video = videoRef.current;
        const vWidth = video.videoWidth || 1280;
        const vHeight = video.videoHeight || 720;
        
        const squareSize = Math.min(vWidth, vHeight);
        const startX = (vWidth - squareSize) / 2;
        const startY = (vHeight - squareSize) / 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = squareSize;
        canvas.height = squareSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot create canvas');
        
        ctx.drawImage(video, startX, startY, squareSize, squareSize, 0, 0, squareSize, squareSize);
        
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const compressed = await compressImage(blob);
              setInlineNewPhotoBlob(compressed);
              stopInlineCamera();
              resolve(compressed);
            } else {
              setErrorMessage('Lỗi khi chụp ảnh');
              resolve(null);
            }
            setIsProcessingPhoto(false);
          },
          'image/jpeg',
          0.88
        );
      } catch (e) {
        console.error(e);
        setErrorMessage('Lỗi khi chụp ảnh');
        setIsProcessingPhoto(false);
        resolve(null);
      }
    });
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopInlineCamera();
      setInlineNewPhotoBlob(null);
    }
    return () => stopInlineCamera();
  }, [isOpen]);

  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(raw);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (numericAmount <= 0) {
      setErrorMessage('Số tiền phải lớn hơn 0.');
      amountInputRef.current?.focus();
      return;
    }

    if (!category) {
      setErrorMessage('Vui lòng chọn một hạng mục.');
      return;
    }

    try {
      setIsSaving(true);
      let finalBlob = inlineNewPhotoBlob || newPhotoBlob || undefined;
      
      if (isInlineCameraActive) {
        const captured = await captureInlinePhoto();
        if (captured) {
          finalBlob = captured;
        } else {
          setIsSaving(false);
          return;
        }
      }

      await updateTransaction(transaction.id, {
        date,
        type,
        amount: numericAmount,
        category,
        note: note.trim(),
        account,
        newImageBlob: finalBlob,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMessage('Không thể cập nhật giao dịch.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteTransaction(transaction.id);
      onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMessage('Không thể xóa giao dịch.');
      setIsDeleting(false);
    }
  };

  const activeCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isToday = date === getTodayString();
  const dateDisplayText = isToday ? 'Hôm nay' : formatDateVN(date);

  return (
    <div className="fixed inset-0 z-50 bg-[#181a1e]/95 backdrop-blur-md flex flex-col justify-between overflow-hidden text-neutral-100">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,0px),16px)] pb-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-full bg-[#2a2e36] hover:bg-[#343842] border border-[#3e4350] text-sm font-bold text-neutral-200 hover:text-white transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          Hủy
        </button>

        <div className="px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/35 text-blue-300 text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
          <span>Chỉnh sửa</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-between px-4 py-1 max-w-md w-full mx-auto overflow-y-auto">
        {errorMessage && (
          <div className="w-full bg-rose-500/20 text-rose-200 border border-rose-500/40 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2.5 mb-2 animate-in fade-in duration-150 shrink-0">
            <AlertCircle size={18} className="shrink-0 text-rose-300" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* 2 & 3. Central Square Photo with Transparent Overlay inside */}
        <div className="w-full relative rounded-[2.5rem] border border-[#3a3f4b] bg-[#282c34] overflow-hidden shadow-2xl flex items-center justify-center aspect-square max-h-[46vh] shrink-0 my-auto">
          {isInlineCameraActive ? (
            <div className="w-full h-full relative" onClick={captureInlinePhoto}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 pointer-events-auto cursor-pointer animate-pulse">
                  <div className="w-16 h-16 rounded-full border-4 border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                  </div>
                  <span className="text-white font-bold text-sm drop-shadow-md">Chạm để chụp</span>
                </div>
              </div>
            </div>
          ) : photoUrl ? (
            <img
              src={photoUrl}
              alt="Ảnh chứng từ giao dịch"
              className="w-full h-full object-cover cursor-pointer"
              onClick={startInlineCamera}
            />
          ) : (
            <button
              type="button"
              onClick={startInlineCamera}
              className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-300 hover:text-emerald-300 cursor-pointer p-4"
            >
              <Camera size={48} className="text-neutral-400" />
              <span className="text-base font-bold">Chạm để chụp ảnh thay thế</span>
            </button>
          )}

          {/* Ultra-transparent Glass Overlay inside Photo for Amount + Note */}
          <div className="absolute bottom-3 left-3 right-3 bg-black/10 hover:bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center shadow-2xl flex flex-col items-center transition-all">
            {/* Amount display & inline input */}
            <div
              onClick={() => amountInputRef.current?.focus()}
              className="w-full flex items-center justify-center gap-2 cursor-text py-1"
            >
              {/* Sign: − or ＋ */}
              <span
                className={`text-3xl sm:text-4xl font-black transition-colors drop-shadow-md ${
                  type === 'expense' ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {type === 'expense' ? '−' : '＋'}
              </span>

              {/* Number Input / Display */}
              <div className="relative inline-flex items-center justify-center min-w-[70px]">
                <input
                  ref={amountInputRef}
                  id="edit-amount-overlay-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={numericAmount > 0 ? numericAmount.toLocaleString('vi-VN') : ''}
                  onChange={handleAmountChange}
                  className="w-full text-center text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white bg-transparent border-none outline-none placeholder:text-white/60 max-w-[240px] drop-shadow-md"
                />
              </div>

              {/* Currency Symbol */}
              <span className="text-lg sm:text-xl font-black text-neutral-100 drop-shadow-md">₫</span>
            </div>

            {/* Note / Ghi chú inside overlay */}
            <div className="w-full flex items-center gap-2.5 bg-black/10 hover:bg-black/20 border border-white/10 rounded-full px-4 py-2 mt-2 transition-colors">
              <Pencil size={15} className="text-neutral-200 shrink-0" />
              <input
                type="text"
                placeholder="Thêm ghi chú / chi tiết"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-sm sm:text-base text-white placeholder:text-neutral-300 bg-transparent border-none outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* 4. Two Selects: Category & Account in one single row */}
        <div className="w-full grid grid-cols-2 gap-3 my-2 shrink-0">
          {/* Category Select Button */}
          <button
            type="button"
            onClick={() => setIsCategorySheetOpen(true)}
            className="w-full py-3 px-4 rounded-full bg-[#282c34] hover:bg-[#323640] border border-[#3a3f4b] text-neutral-100 text-sm sm:text-base font-bold flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CategoryIcon category={category} type={type} size={18} showBackground={false} />
              <span className="truncate">{category || 'Hạng mục'}</span>
            </div>
            <ChevronDown size={18} className="text-neutral-300 shrink-0 ml-1" />
          </button>

          {/* Account Select Button */}
          <button
            type="button"
            onClick={() => setIsAccountSheetOpen(true)}
            className="w-full py-3 px-4 rounded-full bg-[#282c34] hover:bg-[#323640] border border-[#3a3f4b] text-neutral-100 text-sm sm:text-base font-bold flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {account === 'wallet' ? (
                <Wallet size={18} className="text-amber-400 shrink-0" />
              ) : (
                <Building2 size={18} className="text-blue-400 shrink-0" />
              )}
              <span className="truncate">{account === 'wallet' ? 'Ví' : 'Bank'}</span>
            </div>
            <ChevronDown size={18} className="text-neutral-300 shrink-0 ml-1" />
          </button>
        </div>

        {/* 5. Toggle Thu / Chi (+ / −) */}
        <div className="flex items-center justify-center my-1.5 shrink-0">
          <div className="bg-[#282c34] border border-[#3a3f4b] p-1.5 rounded-full flex items-center gap-2 shadow-xs">
            {/* Thu Button */}
            <button
              type="button"
              onClick={() => {
                setType('income');
                if (type !== 'income') setCategory('Lương');
              }}
              className={`py-2 px-5 rounded-full text-sm sm:text-base font-bold flex items-center gap-2 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Plus size={16} strokeWidth={3} className={type === 'income' ? 'text-emerald-300' : 'text-neutral-400'} />
              <span>Thu</span>
            </button>

            {/* Chi Button */}
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (type !== 'expense') setCategory('Ăn uống');
              }}
              className={`py-2 px-5 rounded-full text-sm sm:text-base font-bold flex items-center gap-2 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Minus size={16} strokeWidth={3} className={type === 'expense' ? 'text-rose-300' : 'text-neutral-400'} />
              <span>Chi</span>
            </button>
          </div>
        </div>

        {/* 6. Chọn ngày (Date Selector) */}
        <div className="flex items-center justify-center my-1.5 shrink-0 relative">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(true)}
            className="py-2.5 px-5 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-100 text-sm sm:text-base font-bold flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <CalendarIcon size={16} className="text-neutral-300" />
            <span>{dateDisplayText}</span>
            <ChevronDown size={16} className="text-neutral-300" />
          </button>
        </div>
      </div>

      {/* 7. Action Area at the Bottom */}
      <div className="w-full max-w-md mx-auto px-6 py-3 pb-[max(env(safe-area-inset-bottom),16px)] flex items-center justify-between shrink-0 border-t border-neutral-800/80">
        {/* Left: Chụp lại / Đổi ảnh */}
        <button
          type="button"
          onClick={startInlineCamera}
          className="flex flex-col items-center gap-1 text-neutral-300 hover:text-white active:scale-90 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 group-hover:border-neutral-400 flex items-center justify-center text-neutral-200 group-hover:text-white transition-all shadow-md">
            <Camera size={22} />
          </div>
          <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
            Đổi ảnh
          </span>
        </button>

        {/* Center: Large Confirm Checkmark Button */}
        <button
          id="btn-confirm-update"
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving || numericAmount <= 0}
          className="w-16 h-16 rounded-full bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-black flex items-center justify-center shadow-xl border-4 border-black active:scale-95 transition-all cursor-pointer"
          title="Xác nhận lưu thay đổi"
        >
          {isSaving ? (
            <div className="w-7 h-7 border-3 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={32} strokeWidth={3.5} />
          )}
        </button>

        {/* Right: Xóa Giao Dịch */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-300 active:scale-90 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 group-hover:border-rose-500/60 flex items-center justify-center text-rose-300 group-hover:text-rose-200 transition-all shadow-md">
            <Trash2 size={22} />
          </div>
          <span className="text-xs font-bold text-rose-300 group-hover:text-rose-200">
            Xóa
          </span>
        </button>
      </div>

      {/* Category Picker Sheet */}
      {isCategorySheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[max(env(safe-area-inset-top,0px),16px)] sm:pt-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#121212] border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800 mb-3.5">
              <h3 className="text-base font-extrabold text-white">
                Chọn hạng mục {type === 'expense' ? 'chi tiêu' : 'thu nhập'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1a1a1a] text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer border border-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 overflow-y-auto p-1 max-h-[50vh]">
              {activeCategories.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setCategory(cat.name);
                      setIsCategorySheetOpen(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all text-center active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'border-white bg-white/20 text-white font-bold shadow-xs'
                        : 'border-neutral-800 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200'
                    }`}
                  >
                    <CategoryIcon category={cat.name} type={type} size={22} />
                    <span className="text-xs font-bold leading-tight line-clamp-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Account Picker Sheet */}
      {isAccountSheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[max(env(safe-area-inset-top,0px),16px)] sm:pt-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-[#121212] border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800 mb-3.5">
              <h3 className="text-base font-extrabold text-white">Chọn nguồn tiền</h3>
              <button
                type="button"
                onClick={() => setIsAccountSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1a1a1a] text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer border border-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setAccount('wallet');
                  setIsAccountSheetOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-98 cursor-pointer ${
                  account === 'wallet'
                    ? 'border-amber-400 bg-amber-500/25 text-amber-200 font-bold'
                    : 'border-[#3a3f4b] bg-[#313540] hover:bg-[#3a3f4c] text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Ví tiền (Wallet)</div>
                    <div className="text-xs text-neutral-300">Tiền mặt trong ví</div>
                  </div>
                </div>
                {account === 'wallet' && <Check size={18} className="text-amber-300" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccount('bank');
                  setIsAccountSheetOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-98 cursor-pointer ${
                  account === 'bank'
                    ? 'border-blue-400 bg-blue-500/25 text-blue-200 font-bold'
                    : 'border-[#3a3f4b] bg-[#313540] hover:bg-[#3a3f4c] text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center">
                    <Building2 size={18} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">Ngân hàng (Bank)</div>
                    <div className="text-xs text-neutral-300">Tài khoản ngân hàng / thẻ</div>
                  </div>
                </div>
                {account === 'bank' && <Check size={18} className="text-blue-300" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)]">
          <div className="w-full max-w-xs bg-[#282c34] border border-[#3a3f4b] rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center mx-auto mb-3.5">
              <Trash2 size={26} />
            </div>
            <h3 className="text-base font-extrabold text-white mb-1.5">Xóa giao dịch?</h3>
            <p className="text-xs sm:text-sm text-neutral-300 mb-6 leading-relaxed font-medium">
              Giao dịch và ảnh chứng từ sẽ bị xóa hoàn toàn khỏi thiết bị.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-3 rounded-2xl bg-[#323640] border border-[#3a3f4b] text-neutral-200 text-xs sm:text-sm font-bold hover:bg-[#3c414f] active:scale-95 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="py-3 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-500 active:scale-95 flex items-center justify-center cursor-pointer shadow-md"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Calendar Date Picker Sheet */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        selectedDate={date}
        onSelectDate={(newDate) => setDate(newDate)}
        onClose={() => setIsDatePickerOpen(false)}
      />
    </div>
  );
};

