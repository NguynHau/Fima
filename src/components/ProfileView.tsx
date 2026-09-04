import React, { useState, useRef } from 'react';
import {
  Pencil,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  Building2,
  Check,
  X,
  Camera,
} from 'lucide-react';
import { type UserSettings, type Transaction, type BalancesSummary } from '../types';
import { updateUserSettings } from '../db/database';
import { formatVND, formatDateVN, getTodayString } from '../utils/formatters';
import { ImageCropModal } from './ImageCropModal';

interface ProfileViewProps {
  userSettings: UserSettings | null;
  transactions: Transaction[];
  balances: BalancesSummary;
  onDataChanged: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userSettings,
  transactions,
  balances,
  onDataChanged,
}) => {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalImageSrc, setCropModalImageSrc] = useState<string | null>(null);

  const nickname = userSettings?.nickname || '';
  const avatarUrl = userSettings?.avatarDataUrl;

  const [reportMode, setReportMode] = useState<'today' | 'oldest'>('today');

  // Today string YYYY-MM-DD
  const todayStr = getTodayString();
  const todayFormatted = formatDateVN(todayStr);

  // Find the furthest (latest) transaction date (could be in the future)
  const furthestDateStr = transactions.length > 0
    ? transactions.reduce((furthest, t) => t.date > furthest ? t.date : furthest, transactions[0].date)
    : todayStr;
  const furthestFormatted = formatDateVN(furthestDateStr);

  // Determine selected date based on mode
  const selectedDateStr = reportMode === 'today' ? todayStr : furthestDateStr;
  const selectedDateFormatted = formatDateVN(selectedDateStr);

  // Filter transactions up to selected date (date <= selectedDateStr)
  const validTransactions = transactions.filter((t) => t.date <= selectedDateStr);
  const validTransactionsCount = validTransactions.length;

  let totalIncome = 0;
  let totalExpense = 0;
  let walletNetAtDate = 0;
  let bankNetAtDate = 0;

  for (const t of validTransactions) {
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (t.account === 'wallet') walletNetAtDate += t.amount;
      else if (t.account === 'bank') bankNetAtDate += t.amount;
    } else {
      totalExpense += t.amount;
      if (t.account === 'wallet') walletNetAtDate -= t.amount;
      else if (t.account === 'bank') bankNetAtDate -= t.amount;
    }
  }

  const initialWallet = userSettings?.initialWalletBalance ?? balances.initialWallet ?? 0;
  const initialBank = userSettings?.initialBankBalance ?? balances.initialBank ?? 0;

  const currentWalletBalance = initialWallet + walletNetAtDate;
  const currentBankBalance = initialBank + bankNetAtDate;
  const currentTotalBalance = currentWalletBalance + currentBankBalance;

  // Handle Nickname Edit
  const handleStartEditNickname = () => {
    setNicknameInput(nickname);
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    try {
      setIsSaving(true);
      await updateUserSettings({ nickname: nicknameInput.trim() });
      setIsEditingNickname(false);
      onDataChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Avatar Image Selection & Open Cropper
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropModalImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarCropComplete = async (_blob: Blob, dataUrl?: string) => {
    setCropModalImageSrc(null);
    if (dataUrl) {
      try {
        await updateUserSettings({ avatarDataUrl: dataUrl });
        onDataChanged();
      } catch (err) {
        console.error('Error saving avatar:', err);
      }
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Invisible file input for photo picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* 1. PROFILE CARD */}
      <div className="bg-[#121212] rounded-3xl p-6 border border-neutral-800 shadow-lg text-center relative overflow-hidden flex flex-col items-center">
        {/* Subtle decorative top background ambient light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-purple-500/15 via-fuchsia-500/15 to-pink-500/15 blur-2xl rounded-full pointer-events-none" />

        {/* Avatar Circle with Gradient Ring, 4-pointed Stars & Edit Badge */}
        <div className="relative my-3">
          {/* SVG Defs for 4-point star gradient */}
          <svg className="absolute w-0 h-0" aria-hidden="true">
            <defs>
              <linearGradient id="star-pink-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#e879f9" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
          </svg>

          {/* 4-pointed stars around avatar (positioned outside without covering avatar) */}
          {/* Star 1: Top Right */}
          <svg className="absolute -top-3 -right-3 w-6 h-6 z-10 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)] animate-pulse" viewBox="0 0 24 24" fill="url(#star-pink-purple-grad)">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>
          {/* Star 2: Bottom Left */}
          <svg className="absolute -bottom-2 -left-3 w-5 h-5 z-10 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" viewBox="0 0 24 24" fill="url(#star-pink-purple-grad)">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>
          {/* Star 3: Top Left */}
          <svg className="absolute -top-2 -left-2 w-4 h-4 z-10 opacity-80" viewBox="0 0 24 24" fill="url(#star-pink-purple-grad)">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>
          {/* Star 4: Bottom Right */}
          <svg className="absolute bottom-1 -right-3 w-4 h-4 z-10 opacity-90" viewBox="0 0 24 24" fill="url(#star-pink-purple-grad)">
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>

          {/* Avatar Ring with Purple to Pink Gradient */}
          <div className="p-[3px] rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 shadow-[0_0_25px_rgba(217,70,239,0.35)]">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-black p-0.5 flex items-center justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nickname}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-purple-500/20 text-fuchsia-300 flex items-center justify-center font-black text-3xl sm:text-4xl uppercase">
                  {nickname ? nickname.charAt(0) : 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Avatar Edit Button Badge (White) */}
          <button
            id="profile-btn-edit-avatar"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white hover:bg-neutral-200 text-black border-2 border-[#121212] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer z-20"
            aria-label="Thay đổi ảnh đại diện"
            title="Thay đổi ảnh đại diện"
          >
            <Camera size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Nickname */}
        <div className="mt-2.5 flex items-center justify-center gap-2">
          {isEditingNickname ? (
            <form onSubmit={handleSaveNickname} className="flex items-center gap-1.5">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                autoFocus
                className="bg-[#1a1a1a] border border-neutral-700 rounded-xl px-3 py-1.5 text-base sm:text-lg font-black text-white outline-none focus:border-white text-center max-w-[180px]"
                placeholder="Tên của bạn"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="p-2 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-95 cursor-pointer shadow-xs"
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingNickname(false)}
                className="p-2 rounded-xl bg-[#1a1a1a] text-neutral-300 hover:text-white active:scale-95 cursor-pointer border border-neutral-800"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {nickname || 'Chưa đặt tên'}
              </h2>
              <button
                id="profile-btn-edit-nickname"
                onClick={handleStartEditNickname}
                className="p-1.5 rounded-lg bg-[#1a1a1a] text-neutral-300 hover:text-white hover:bg-[#262626] border border-neutral-800 transition-colors cursor-pointer"
                aria-label="Đổi tên"
                title="Đổi tên"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. STATISTIC CARDS SECTION */}
      <div className="space-y-3">
        {/* Báo cáo & Thời điểm (Không khung, tối giản) */}
        <div className="px-1 py-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon
                size={16}
                color="url(#star-pink-purple-grad)"
                stroke="url(#star-pink-purple-grad)"
                className="shrink-0"
              />
              <h3 className="text-xs sm:text-sm font-black text-neutral-200 uppercase tracking-wider">
                Báo cáo
              </h3>
            </div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight">
              Mốc: {selectedDateFormatted}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Thời điểm
            </span>
            <div className="relative">
              <select
                value={reportMode}
                onChange={(e) => setReportMode(e.target.value as 'today' | 'oldest')}
                className="bg-[#1a1a1a] hover:bg-[#222222] text-neutral-200 text-xs font-bold py-1.5 pl-3.5 pr-8 rounded-xl border border-neutral-800 outline-none focus:border-purple-500 transition-all cursor-pointer appearance-none min-w-[150px] text-right"
              >
                <option value="today">Hôm nay</option>
                <option value="oldest">Ngày xa nhất</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                <Pencil size={10} className="rotate-90" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* HÀNG 1 */}
          {/* Card 1: Số giao dịch */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Số giao dịch
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {validTransactionsCount}
              </span>
            </div>
          </div>

          {/* Card 2: Số dư */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Số dư
              </span>
              <Wallet
                size={18}
                color="url(#star-pink-purple-grad)"
                stroke="url(#star-pink-purple-grad)"
                className="shrink-0"
              />
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black font-mono truncate block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400">
                {formatVND(currentTotalBalance)}
              </span>
            </div>
          </div>

          {/* HÀNG 2 */}
          {/* Card 3: Tiền hiện tại trong ví */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Tiền hiện tại trong ví
              </span>
              <Banknote size={18} className="text-amber-400 shrink-0" />
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-amber-400 font-mono truncate block">
                {formatVND(currentWalletBalance)}
              </span>
            </div>
          </div>

          {/* Card 4: Tiền hiện tại trong bank */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Tiền hiện tại trong bank
              </span>
              <Building2 size={18} className="text-blue-400 shrink-0" />
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-blue-400 font-mono truncate block">
                {formatVND(currentBankBalance)}
              </span>
            </div>
          </div>

          {/* HÀNG 3 */}
          {/* Card 5: Tổng thu */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Tổng thu
              </span>
              <TrendingUp size={18} className="text-emerald-400 shrink-0" />
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate block">
                {formatVND(totalIncome)}
              </span>
            </div>
          </div>

          {/* Card 6: Tổng chi */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Tổng chi
              </span>
              <TrendingDown size={18} className="text-rose-400 shrink-0" />
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-rose-400 font-mono truncate block">
                {formatVND(totalExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Crop Modal for Avatar */}
      {cropModalImageSrc && (
        <ImageCropModal
          isOpen={!!cropModalImageSrc}
          imageSrc={cropModalImageSrc}
          shape="circle"
          initialAspectRatio="1:1"
          lockAspectRatio={true}
          title="Cắt ảnh đại diện"
          onClose={() => setCropModalImageSrc(null)}
          onCropComplete={handleAvatarCropComplete}
        />
      )}
    </div>
  );
};
