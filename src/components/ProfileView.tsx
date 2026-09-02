import React, { useState, useRef } from 'react';
import {
  Pencil,
  Calendar as CalendarIcon,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  Check,
  X,
  Camera,
} from 'lucide-react';
import { type UserSettings, type Transaction, type BalancesSummary } from '../types';
import { updateUserSettings } from '../db/database';
import { formatVND, formatMonthVN } from '../utils/formatters';

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

  const nickname = userSettings?.nickname || '';
  const avatarUrl = userSettings?.avatarDataUrl;

  // Today's month indicator string (e.g. "Tháng 9 2026")
  const today = new Date();
  const currentMonthStr = formatMonthVN(today.getFullYear(), today.getMonth() + 1);

  // Compute 4 global stats
  const totalTransactionsCount = transactions.length;

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  }

  const currentTotalBalance = balances.totalAssets;

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

  // Handle Avatar Image Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64 data URL
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        try {
          await updateUserSettings({ avatarDataUrl: dataUrl });
          onDataChanged();
        } catch (err) {
          console.error('Error saving avatar:', err);
        }
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

        {/* Month Indicator */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a1a] border border-neutral-800 text-xs font-bold text-neutral-300">
          <CalendarIcon size={14} className="text-neutral-300" />
          <span>📅 {currentMonthStr}</span>
        </div>
      </div>

      {/* 2. STATISTIC CARDS SECTION */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider px-1">
          Tổng quan
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Giao dịch */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Giao dịch
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/35 flex items-center justify-center shrink-0">
                <Receipt size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {totalTransactionsCount}
              </span>
            </div>
          </div>

          {/* Card 2: Tổng thu nhập (Dương = Xanh lá) */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Tổng thu nhập
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate block">
                {formatVND(totalIncome)}
              </span>
            </div>
          </div>

          {/* Card 3: Tổng chi tiêu (Âm = Đỏ) */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Tổng chi tiêu
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/35 flex items-center justify-center shrink-0">
                <TrendingDown size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-rose-400 font-mono truncate block">
                {formatVND(totalExpense)}
              </span>
            </div>
          </div>

          {/* Card 4: Số dư */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Số dư
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/35 flex items-center justify-center shrink-0">
                <Wallet size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-white font-mono truncate block">
                {formatVND(currentTotalBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
