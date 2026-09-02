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

  const nickname = userSettings?.nickname || 'NguyenHau';
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
      <div className="bg-[#282c34] rounded-3xl p-6 border border-[#3a3f4b] shadow-lg text-center relative overflow-hidden flex flex-col items-center">
        {/* Subtle decorative top background ambient light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none" />

        {/* Avatar Circle with Ring & Edit Badge */}
        <div className="relative my-2">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-emerald-400 p-1 bg-[#202328] shadow-xl flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nickname}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-3xl sm:text-4xl uppercase">
                {nickname ? nickname.charAt(0) : 'U'}
              </div>
            )}
          </div>

          {/* Avatar Edit Button Badge */}
          <button
            id="profile-btn-edit-avatar"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-[#282c34] flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
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
                className="bg-[#313540] border border-[#3e4350] rounded-xl px-3 py-1.5 text-base sm:text-lg font-black text-white outline-none focus:border-emerald-400 text-center max-w-[180px]"
                placeholder="Tên của bạn"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="p-2 rounded-xl bg-emerald-400 text-black hover:bg-emerald-300 active:scale-95 cursor-pointer shadow-xs"
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingNickname(false)}
                className="p-2 rounded-xl bg-[#313540] text-neutral-300 hover:text-white active:scale-95 cursor-pointer"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {nickname}
              </h2>
              <button
                id="profile-btn-edit-nickname"
                onClick={handleStartEditNickname}
                className="p-1.5 rounded-lg bg-[#323640] text-neutral-300 hover:text-white hover:bg-[#3c414f] transition-colors cursor-pointer"
                aria-label="Đổi tên"
                title="Đổi tên"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Month Indicator */}
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#323640] border border-[#3d4250] text-xs font-bold text-neutral-300">
          <CalendarIcon size={14} className="text-emerald-400" />
          <span>📅 {currentMonthStr}</span>
        </div>
      </div>

      {/* 2. STATISTIC CARDS SECTION */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-neutral-300 uppercase tracking-wider px-1">
          Tổng quan
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Giao dịch */}
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm flex flex-col justify-between">
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

          {/* Card 2: Tổng thu nhập */}
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm flex flex-col justify-between">
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

          {/* Card 3: Tổng chi tiêu */}
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm flex flex-col justify-between">
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
          <div className="bg-[#282c34] rounded-2xl p-4 border border-[#3a3f4b] shadow-sm flex flex-col justify-between">
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
