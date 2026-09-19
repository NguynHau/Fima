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
  PiggyBank,
  ReceiptText,
} from 'lucide-react';
import { type UserSettings, type Transaction, type BalancesSummary } from '../types';
import { updateUserSettings } from '../db/database';
import { formatVND, formatDateVN, getTodayString, parseAmountInput } from '../utils/formatters';
import { t } from '../utils/translations';
import { ImageCropModal } from './ImageCropModal';
import { BudgetSettingsModal } from './BudgetSettingsModal';
import { ExpenseReviewModal } from './ExpenseReviewModal';

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

  // Budget & Savings modal state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Expense & Budget Review modal state
  const [isExpenseReviewOpen, setIsExpenseReviewOpen] = useState(false);

  // Initial Balance Edit State
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [walletInput, setWalletInput] = useState('');
  const [bankInput, setBankInput] = useState('');
  const [isSavingBalances, setIsSavingBalances] = useState(false);
  const [balanceToast, setBalanceToast] = useState<string | null>(null);

  const nickname = userSettings?.nickname || '';
  const avatarUrl = userSettings?.avatarDataUrl;

  const [reportMode, setReportMode] = useState<'today' | 'oldest'>('today');

  // Today string YYYY-MM-DD
  const todayStr = getTodayString();

  // Find the furthest (latest) transaction date (could be in the future)
  const furthestDateStr =
    transactions.length > 0
      ? transactions.reduce(
          (furthest, t) => (t.date > furthest ? t.date : furthest),
          transactions[0].date
        )
      : todayStr;

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

  // Sync inputs when opening edit balance modal
  const handleOpenEditBalance = () => {
    setWalletInput(initialWallet.toString());
    setBankInput(initialBank.toString());
    setShowEditBalanceModal(true);
  };

  const handleSaveBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseAmountInput(walletInput);
    const bNum = parseAmountInput(bankInput);

    try {
      setIsSavingBalances(true);
      await updateUserSettings({
        initialWalletBalance: wNum,
        initialBankBalance: bNum,
      });
      setShowEditBalanceModal(false);
      setBalanceToast('Đã cập nhật số dư ban đầu');
      setTimeout(() => setBalanceToast(null), 2500);
      onDataChanged();
    } catch (err) {
      console.error('Error saving initial balances:', err);
    } finally {
      setIsSavingBalances(false);
    }
  };

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

  // Handle Avatar Image Selection & Apply directly
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
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

  const walletParsed = parseAmountInput(walletInput);
  const bankParsed = parseAmountInput(bankInput);

  return (
    <div className="space-y-4 pb-24">
      {/* SVG Defs for 4-point star & purple-pink gradient */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <linearGradient id="profile-pink-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sys-gradient-pink, #f472b6)" />
            <stop offset="50%" stopColor="var(--sys-gradient-fuchsia, #e879f9)" />
            <stop offset="100%" stopColor="var(--sys-gradient-purple, #c084fc)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Invisible file input for photo picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
      />

      {/* 1. PROFILE CARD (AVATAR & NICKNAME) */}
      <div className="bg-[#121212] rounded-3xl p-6 border border-neutral-800 shadow-lg text-center relative overflow-hidden flex flex-col items-center">
        {/* Subtle decorative top background ambient light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-purple-500/15 via-fuchsia-500/15 to-pink-500/15 blur-2xl rounded-full pointer-events-none" />

        {/* Avatar Circle with Gradient Ring, 4-pointed Stars & Edit Badge */}
        <div className="relative my-3">
          {/* 4-pointed stars around avatar */}
          <svg
            className="absolute -top-3 -right-3 w-6 h-6 z-10 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)] animate-pulse"
            viewBox="0 0 24 24"
            fill="url(#profile-pink-purple-grad)"
          >
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>
          <svg
            className="absolute -bottom-2 -left-3 w-5 h-5 z-10 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]"
            viewBox="0 0 24 24"
            fill="url(#profile-pink-purple-grad)"
          >
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>
          <svg
            className="absolute -top-2 -left-2 w-4 h-4 z-10 opacity-80"
            viewBox="0 0 24 24"
            fill="url(#profile-pink-purple-grad)"
          >
            <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
          </svg>
          <svg
            className="absolute bottom-1 -right-3 w-4 h-4 z-10 opacity-90"
            viewBox="0 0 24 24"
            fill="url(#profile-pink-purple-grad)"
          >
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

          {/* Avatar Edit Button Badge */}
          <button
            id="profile-btn-edit-avatar"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white hover:bg-neutral-200 text-black border-2 border-[#121212] flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer z-20"
            aria-label={t('profile.change_avatar')}
            title={t('profile.change_avatar')}
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
                placeholder={t('profile.placeholder_name')}
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
                {nickname || t('profile.untitled_user')}
              </h2>
              <button
                id="profile-btn-edit-nickname"
                onClick={handleStartEditNickname}
                className="p-1.5 rounded-lg bg-[#1a1a1a] text-neutral-300 hover:text-white hover:bg-[#262626] border border-neutral-800 transition-colors cursor-pointer"
                aria-label={t('profile.nickname')}
                title={t('profile.nickname')}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. STATISTIC CARDS SECTION (BÁO CÁO NGAY SAU AVATAR) */}
      <div className="space-y-3">
        {/* Báo cáo & Thời điểm (Không khung, tối giản) */}
        <div className="px-1 py-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon
                size={16}
                color="url(#profile-pink-purple-grad)"
                stroke="url(#profile-pink-purple-grad)"
                className="shrink-0"
              />
              <h3 className="text-xs sm:text-sm font-black text-neutral-200 uppercase tracking-wider">
                {t('profile.report_title')}
              </h3>
            </div>
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight">
              {t('profile.milestone')}: {selectedDateFormatted}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              {t('profile.time_point')}
            </span>
            <div className="relative">
              <select
                value={reportMode}
                onChange={(e) => setReportMode(e.target.value as 'today' | 'oldest')}
                className="bg-[#1a1a1a] hover:bg-[#222222] text-neutral-200 text-xs font-bold py-1.5 pl-3.5 pr-8 rounded-xl border border-neutral-800 outline-none focus:border-purple-500 transition-all cursor-pointer appearance-none min-w-[150px] text-right"
              >
                <option value="today">{t('profile.today')}</option>
                <option value="oldest">{t('profile.furthest_day')}</option>
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
                {t('profile.tx_count')}
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
                {t('profile.balance')}
              </span>
              <Wallet
                size={18}
                color="url(#profile-pink-purple-grad)"
                stroke="url(#profile-pink-purple-grad)"
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
                {t('profile.wallet_current')}
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
                {t('profile.bank_current')}
              </span>
              <Building2 size={18} className="text-cyan-400 shrink-0" />
            </div>
            <div className="mt-3">
              <span className="text-base sm:text-lg font-black text-cyan-400 font-mono truncate block">
                {formatVND(currentBankBalance)}
              </span>
            </div>
          </div>

          {/* HÀNG 3 */}
          {/* Card 5: Tổng thu */}
          <div className="bg-[#121212] rounded-2xl p-4 border border-neutral-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {t('profile.total_income')}
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
                {t('profile.total_expense')}
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

      {/* 3. THẺ CÀI ĐẶT BUDGET & SAVINGS (THIẾT KẾ GIỐNG TAB CÀI ĐẶT, KHÔNG HIỆN SỐ BÊN NGOÀI) */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <PiggyBank
              size={18}
              className="shrink-0"
              stroke="url(#profile-pink-purple-grad)"
              strokeWidth={2.3}
            />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-200">
              {t('budget.title')} & {t('budget.savings')}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            {t('budget.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsBudgetModalOpen(true)}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <PiggyBank size={16} className="text-neutral-400 shrink-0" />
          <span>{t('budget.settings_modal_title')}</span>
        </button>
      </div>

      {/* 4. THẺ XEM LẠI CHI TIÊU (LỊCH SỬ KỲ HẠN, NẰM NGAY DƯỚI CÀI ĐẶT BUDGET) */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ReceiptText
              size={18}
              className="shrink-0"
              stroke="url(#profile-pink-purple-grad)"
              strokeWidth={2.3}
            />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-200">
              {t('budget.review_title')}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            {t('budget.review_subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsExpenseReviewOpen(true)}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <ReceiptText size={16} className="text-neutral-400 shrink-0" />
          <span>{t('budget.review_btn')}</span>
        </button>
      </div>

      {/* 5. THẺ CÀI ĐẶT SỐ DƯ BAN ĐẦU (NẰM PHÍA DƯỚI CÙNG, THIẾT KẾ GIỐNG TAB CÀI ĐẶT, KHÔNG HIỆN SỐ BÊN NGOÀI) */}
      <div className="bg-[#121212] rounded-3xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Wallet
              size={18}
              className="shrink-0"
              stroke="url(#profile-pink-purple-grad)"
              strokeWidth={2.3}
            />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-200">
              {t('settings.balance.title')}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-medium">
            {t('settings.balance.desc')}
          </p>
        </div>

        {balanceToast && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <Check size={14} />
            <span>{balanceToast}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleOpenEditBalance}
          className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs"
        >
          <Wallet size={16} className="text-neutral-400 shrink-0" />
          <span>{t('settings.balance.edit_title')}</span>
        </button>
      </div>

      {/* Modal Cài đặt Budget & Savings */}
      <BudgetSettingsModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onDataChanged={onDataChanged}
      />

      {/* Modal Chỉnh sửa Số dư ban đầu */}
      {showEditBalanceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)]">
          <div className="w-full max-w-xs sm:max-w-sm bg-[#121212] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2.5">
                <Wallet
                  size={20}
                  className="shrink-0"
                  stroke="url(#profile-pink-purple-grad)"
                  strokeWidth={2.3}
                />
                {t('settings.balance.edit_title')}
              </h3>
              <button
                onClick={() => setShowEditBalanceModal(false)}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
                aria-label="Đóng"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 font-medium">
              {t('settings.balance.desc')}
            </p>

            <form onSubmit={handleSaveBalances} noValidate className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-neutral-200 mb-1 flex items-center gap-1.5">
                  <Banknote size={15} className="text-amber-400" />
                  {t('settings.balance.wallet_label')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={walletParsed > 0 ? walletParsed.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setWalletInput(e.target.value)}
                    placeholder="0"
                    className="w-full text-sm font-bold text-white font-mono bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3.5 text-xs font-bold text-neutral-400">₫</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-200 mb-1 flex items-center gap-1.5">
                  <Building2 size={15} className="text-cyan-400" />
                  {t('settings.balance.bank_label')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bankParsed > 0 ? bankParsed.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setBankInput(e.target.value)}
                    placeholder="0"
                    className="w-full text-sm font-bold text-white font-mono bg-[#1a1a1a] border border-neutral-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400"
                  />
                  <span className="absolute right-3.5 text-xs font-bold text-neutral-400">₫</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBalanceModal(false)}
                  className="py-2.5 rounded-xl bg-[#1a1a1a] text-neutral-200 text-xs font-bold hover:bg-[#262626] active:scale-95 cursor-pointer border border-neutral-800"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingBalances}
                  className="py-2.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSavingBalances ? t('settings.balance.saving') : t('settings.balance.save_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Review Modal */}
      <ExpenseReviewModal
        isOpen={isExpenseReviewOpen}
        onClose={() => setIsExpenseReviewOpen(false)}
      />

      {/* Image Crop Modal for Avatar */}
      {cropModalImageSrc && (
        <ImageCropModal
          isOpen={!!cropModalImageSrc}
          imageSrc={cropModalImageSrc}
          shape="circle"
          initialAspectRatio="1:1"
          lockAspectRatio={true}
          title={t('profile.crop_title')}
          onClose={() => setCropModalImageSrc(null)}
          onCropComplete={handleAvatarCropComplete}
        />
      )}
    </div>
  );
};
