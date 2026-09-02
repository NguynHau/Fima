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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selector modal states
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultDate) setDate(defaultDate);
      if (defaultAccount) setAccount(defaultAccount);
      setIsCategorySheetOpen(false);
      setIsAccountSheetOpen(false);
      setErrorMessage(null);
    }
  }, [isOpen, defaultDate, defaultAccount]);

  useEffect(() => {
    if (initialPhotoBlob) {
      setPhotoBlob(initialPhotoBlob);
      const url = URL.createObjectURL(initialPhotoBlob);
      setPhotoPreviewUrl(url);
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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between overflow-hidden">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,0px),14px)] pb-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-full bg-[#1e1e1e] hover:bg-[#2a2a2a] text-xs font-bold text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          Hủy
        </button>

        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1">
          <span>Giao dịch mới</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-between px-4 py-1 max-w-md w-full mx-auto overflow-y-auto">
        {errorMessage && (
          <div className="w-full bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center gap-2 mb-2 animate-in fade-in duration-150 shrink-0">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* 2 & 3. Central Square Photo with Transparent Overlay inside (Locket style) */}
        <div className="w-full relative rounded-[2.5rem] border border-[#2a2a2a] bg-[#121212] overflow-hidden shadow-2xl flex items-center justify-center aspect-square max-h-[46vh] shrink-0 my-auto">
          {photoPreviewUrl ? (
            <img
              src={photoPreviewUrl}
              alt="Ảnh chứng từ"
              className="w-full h-full object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={onRetakePhoto}
              className="w-full h-full flex flex-col items-center justify-center gap-2.5 text-neutral-400 hover:text-emerald-400 cursor-pointer p-4"
            >
              <Camera size={40} className="text-neutral-500" />
              <span className="text-sm font-semibold">Chạm để chụp ảnh giao dịch</span>
            </button>
          )}

          {/* Ultra-transparent Glass Overlay inside Photo for Amount + Note */}
          <div className="absolute bottom-3 left-3 right-3 bg-black/20 hover:bg-black/30 backdrop-blur-xs border border-white/20 rounded-2xl p-2.5 sm:p-3 text-center shadow-lg flex flex-col items-center transition-all">
            {/* Amount display & inline input */}
            <div
              onClick={() => amountInputRef.current?.focus()}
              className="w-full flex items-center justify-center gap-1.5 cursor-text py-0.5"
            >
              {/* Sign: − or ＋ */}
              <span
                className={`text-2xl sm:text-3xl font-black transition-colors drop-shadow-md ${
                  type === 'expense' ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {type === 'expense' ? '−' : '＋'}
              </span>

              {/* Number Input / Display */}
              <div className="relative inline-flex items-center justify-center min-w-[60px]">
                <input
                  ref={amountInputRef}
                  id="amount-overlay-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={numericAmount > 0 ? numericAmount.toLocaleString('vi-VN') : ''}
                  onChange={handleAmountChange}
                  autoFocus
                  className="w-full text-center text-2xl sm:text-3xl font-light font-mono tracking-tight text-white bg-transparent border-none outline-none placeholder:text-white/50 max-w-[220px] drop-shadow-md"
                />
              </div>

              {/* Currency Symbol */}
              <span className="text-base sm:text-lg font-bold text-neutral-100 drop-shadow-md">₫</span>
            </div>

            {/* Note / Ghi chú inside overlay */}
            <div className="w-full flex items-center gap-2 bg-black/25 hover:bg-black/35 border border-white/15 rounded-full px-3.5 py-1.5 mt-1.5 transition-colors">
              <Pencil size={13} className="text-neutral-300 shrink-0" />
              <input
                type="text"
                placeholder="Thêm ghi chú / chi tiết"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs sm:text-sm text-white placeholder:text-neutral-300/80 bg-transparent border-none outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Two Selects: Category & Account in one single row */}
        <div className="w-full grid grid-cols-2 gap-2.5 my-1.5 shrink-0">
          {/* Category Select Button */}
          <button
            type="button"
            onClick={() => setIsCategorySheetOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-full bg-[#171717] hover:bg-[#222222] border border-[#2b2b2b] text-neutral-200 text-xs sm:text-sm font-semibold flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CategoryIcon category={category} type={type} size={16} showBackground={false} />
              <span className="truncate">{category}</span>
            </div>
            <ChevronDown size={16} className="text-neutral-400 shrink-0 ml-1" />
          </button>

          {/* Account Select Button */}
          <button
            type="button"
            onClick={() => setIsAccountSheetOpen(true)}
            className="w-full py-2.5 px-3.5 rounded-full bg-[#171717] hover:bg-[#222222] border border-[#2b2b2b] text-neutral-200 text-xs sm:text-sm font-semibold flex items-center justify-between active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              {account === 'wallet' ? (
                <Wallet size={16} className="text-amber-400 shrink-0" />
              ) : (
                <Building2 size={16} className="text-blue-400 shrink-0" />
              )}
              <span className="truncate">{account === 'wallet' ? 'Ví (Wallet)' : 'Bank'}</span>
            </div>
            <ChevronDown size={16} className="text-neutral-400 shrink-0 ml-1" />
          </button>
        </div>

        {/* 5. Toggle Thu / Chi (+ / −) */}
        <div className="flex items-center justify-center my-1 shrink-0">
          <div className="bg-[#171717] border border-[#2a2a2a] p-1 rounded-full flex items-center gap-1.5 shadow-xs">
            {/* Thu Button */}
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-1.5 px-4.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Plus size={14} strokeWidth={3} className={type === 'income' ? 'text-emerald-400' : 'text-neutral-500'} />
              <span>Thu</span>
            </button>

            {/* Chi Button */}
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-1.5 px-4.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Minus size={14} strokeWidth={3} className={type === 'expense' ? 'text-rose-400' : 'text-neutral-500'} />
              <span>Chi</span>
            </button>
          </div>
        </div>

        {/* 6. Chọn ngày (Date Selector) */}
        <div className="flex items-center justify-center my-1 shrink-0 relative">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(true)}
            className="py-1.5 px-4.5 rounded-full bg-[#171717] hover:bg-[#222222] border border-[#2a2a2a] text-neutral-200 text-xs sm:text-sm font-semibold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <CalendarIcon size={14} className="text-neutral-400" />
            <span>{dateDisplayText}</span>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>
        </div>
      </div>

      {/* 7. Action Area at the Bottom */}
      <div className="w-full max-w-md mx-auto px-6 py-2.5 pb-[max(env(safe-area-inset-bottom),14px)] flex items-center justify-between shrink-0">
        {/* Left: Chụp lại */}
        <button
          type="button"
          onClick={onRetakePhoto}
          className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white active:scale-90 transition-all cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-[#2d2d2d] group-hover:border-neutral-500 flex items-center justify-center text-neutral-300 group-hover:text-white transition-all shadow-md">
            <Camera size={19} />
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 group-hover:text-neutral-200">
            Chụp lại
          </span>
        </button>

        {/* Center: Large Confirm Checkmark Button */}
        <button
          id="btn-confirm-save"
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSaving || numericAmount <= 0 || !photoBlob}
          className="w-15 h-15 rounded-full bg-neutral-200 hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed text-black flex items-center justify-center shadow-xl shadow-white/10 border-4 border-[#121212] active:scale-95 transition-all cursor-pointer"
          title="Xác nhận lưu giao dịch"
        >
          {isSaving ? (
            <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={28} strokeWidth={3.5} />
          )}
        </button>

        {/* Right: Balanced Spacer */}
        <div className="w-11 flex flex-col items-center opacity-0 pointer-events-none">
          <div className="w-11 h-11" />
          <span className="text-[10px]">Xác nhận</span>
        </div>
      </div>

      {/* Category Picker Sheet */}
      {isCategorySheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#141414] border border-[#282828] rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
              <h3 className="text-sm font-bold text-white">
                Chọn hạng mục {type === 'expense' ? 'chi tiêu' : 'thu nhập'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(false)}
                className="w-7 h-7 rounded-full bg-[#202020] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-1 max-h-[45vh]">
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
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-xs'
                        : 'border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300'
                    }`}
                  >
                    <CategoryIcon category={cat.name} type={type} size={18} />
                    <span className="text-[11px] leading-tight line-clamp-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Account Picker Sheet */}
      {isAccountSheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-[#141414] border border-[#282828] rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
              <h3 className="text-sm font-bold text-white">Chọn nguồn tiền</h3>
              <button
                type="button"
                onClick={() => setIsAccountSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-[#202020] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setAccount('wallet');
                  setIsAccountSheetOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all active:scale-98 cursor-pointer ${
                  account === 'wallet'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Wallet size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Ví tiền (Wallet)</div>
                    <div className="text-[10px] text-neutral-400">Tiền mặt trong ví</div>
                  </div>
                </div>
                {account === 'wallet' && <Check size={16} className="text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccount('bank');
                  setIsAccountSheetOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all active:scale-98 cursor-pointer ${
                  account === 'bank'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Tài khoản Ngân hàng (Bank)</div>
                    <div className="text-[10px] text-neutral-400">Tài khoản ngân hàng / thẻ</div>
                  </div>
                </div>
                {account === 'bank' && <Check size={16} className="text-blue-400" />}
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

