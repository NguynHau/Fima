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
  ChevronDown,
  Pencil,
  X,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type AccountType,
  type TransactionType,
} from '../types';
import { createTransaction } from '../db/database';
import { formatDateVN, formatVND, getTodayString } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { DatePickerModal } from './DatePickerModal';
import { defaultReceiptRecognizer } from '../services/receiptRecognition';

interface NewTransactionModalProps {
  isOpen: boolean;
  initialPhotoBlob: Blob | null;
  defaultDate?: string;
  defaultAccount?: AccountType;
  onClose: () => void;
  onRetakePhoto: () => void;
  onSuccess: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  initialPhotoBlob,
  defaultDate,
  defaultAccount,
  onClose,
  onRetakePhoto,
  onSuccess,
}) => {
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(initialPhotoBlob);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [date, setDate] = useState<string>(defaultDate || getTodayString());
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('Ăn uống');
  const [note, setNote] = useState<string>('');
  const [account, setAccount] = useState<AccountType>(defaultAccount || 'wallet');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selector modal states
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const userEditedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDate(defaultDate);
      if (defaultAccount) setAccount(defaultAccount);
      setAmountStr(''); // Reset amount to 0
      setNote(''); // Reset note
      setIsCategorySheetOpen(false);
      setIsAccountSheetOpen(false);
      setErrorMessage(null);
      userEditedRef.current = false;
    }
  }, [isOpen, defaultDate, defaultAccount]);

  useEffect(() => {
    if (initialPhotoBlob) {
      setPhotoBlob(initialPhotoBlob);
      const url = URL.createObjectURL(initialPhotoBlob);
      setPhotoPreviewUrl(url);
      setAmountStr(''); // Reset amount to 0 whenever a new photo is captured
      setNote(''); // Reset note
      setErrorMessage(null);
      userEditedRef.current = false;

      // Automatically trigger AI/OCR receipt recognition in background
      setIsAnalyzing(true);
      defaultReceiptRecognizer
        .recognize(initialPhotoBlob)
        .then((result) => {
          if (!userEditedRef.current) {
            if (result.amount) {
              setAmountStr(result.amount.toString());
            }
            if (result.date) {
              setDate(result.date);
            }
            if (result.type) {
              setType(result.type);
            }
            if (result.category) {
              setCategory(result.category);
            }
            if (result.note) {
              setNote(result.note);
            }
          }
        })
        .catch((err) => {
          console.warn('Receipt recognition notice:', err);
        })
        .finally(() => {
          setIsAnalyzing(false);
        });

      return () => URL.revokeObjectURL(url);
    }
  }, [initialPhotoBlob]);

  // Sync default category on type switch
  useEffect(() => {
    if (type === 'expense') {
      setCategory('Ăn uống');
    } else {
      setCategory('Lương');
    }
  }, [type]);

  if (!isOpen) return null;

  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userEditedRef.current = true;
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountStr(raw);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!photoBlob) {
      setErrorMessage('Vui lòng chụp ảnh chứng từ trước khi lưu.');
      return;
    }

    if (numericAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền lớn hơn 0.');
      amountInputRef.current?.focus();
      return;
    }

    if (!category) {
      setErrorMessage('Vui lòng chọn một hạng mục.');
      return;
    }

    if (!account) {
      setErrorMessage('Vui lòng chọn nguồn tiền.');
      return;
    }

    try {
      setIsSaving(true);
      await createTransaction({
        date,
        type,
        amount: numericAmount,
        category,
        note: note.trim(),
        account,
        imageBlob: photoBlob,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMessage('Đã xảy ra lỗi khi lưu giao dịch vào thiết bị.');
    } finally {
      setIsSaving(false);
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

        <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
          {isAnalyzing && (
            <div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <span>{isAnalyzing ? 'Đang nhận diện...' : 'Giao dịch mới'}</span>
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
          {photoPreviewUrl ? (
            <img
              src={photoPreviewUrl}
              alt="Ảnh chứng từ"
              className="w-full h-full object-cover cursor-pointer" onClick={onRetakePhoto}
            />
          ) : (
            <button
              type="button"
              onClick={onRetakePhoto}
              className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-300 hover:text-emerald-300 cursor-pointer p-4"
            >
              <Camera size={48} className="text-neutral-400" />
              <span className="text-base font-bold">Chạm để chụp ảnh giao dịch</span>
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
                  id="amount-overlay-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={numericAmount > 0 ? numericAmount.toLocaleString('vi-VN') : ''}
                  onChange={handleAmountChange}
                  autoFocus
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
                onChange={(e) => {
                  userEditedRef.current = true;
                  setNote(e.target.value);
                }}
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
              <span className="truncate">{category}</span>
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
                userEditedRef.current = true;
                setType('income');
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
                userEditedRef.current = true;
                setType('expense');
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
        {/* Left: Chụp lại */}
        <button
          type="button"
          onClick={onRetakePhoto}
          className="flex flex-col items-center gap-1 text-neutral-300 hover:text-white active:scale-90 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 group-hover:border-neutral-400 flex items-center justify-center text-neutral-200 group-hover:text-white transition-all shadow-md">
            <Camera size={22} />
          </div>
          <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
            Chụp lại
          </span>
        </button>

        {/* Center: Large Confirm Checkmark Button */}
        <button
          id="btn-confirm-save"
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSaving || numericAmount <= 0 || !photoBlob}
          className="w-16 h-16 rounded-full bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-black flex items-center justify-center shadow-xl border-4 border-black active:scale-95 transition-all cursor-pointer"
          title="Xác nhận lưu giao dịch"
        >
          {isSaving ? (
            <div className="w-7 h-7 border-3 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={32} strokeWidth={3.5} />
          )}
        </button>

        {/* Right: Balanced Spacer */}
        <div className="w-12 flex flex-col items-center opacity-0 pointer-events-none">
          <div className="w-12 h-12" />
          <span className="text-xs">Xác nhận</span>
        </div>
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
                      userEditedRef.current = true;
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

      {/* Custom Calendar Date Picker Sheet */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        selectedDate={date}
        onSelectDate={(newDate) => {
          userEditedRef.current = true;
          setDate(newDate);
        }}
        onClose={() => setIsDatePickerOpen(false)}
      />
    </div>
  );
};

