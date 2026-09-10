import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar as CalendarIcon,
  Layers,
  Wallet,
  Building2,
  Plus,
} from 'lucide-react';
import { type Transaction, type CalendarAccountFilter } from '../types';
import {
  formatDateVN,
  formatMonthVN,
  formatVND,
  getTodayString,
} from '../utils/formatters';
import { getImageBlob } from '../db/database';

interface MonthCalendarProps {
  currentYear: number;
  currentMonth: number; // 1-12
  transactions: Transaction[];
  accountFilter: CalendarAccountFilter;
  onAccountFilterChange: (filter: CalendarAccountFilter) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTodayMonth: () => void;
  onSelectDay: (dateStr: string) => void;
  selectedDate?: string;
}

interface DayCellData {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  income: number;
  expense: number;
  net: number;
  count: number;
  transactions: Transaction[];
}

/**
 * Format compact daily net amount:
 * -44k = system red
 * +98k = system green
 * +1.096k = system green
 */
const formatDailyNetCompact = (net: number): string => {
  if (net === 0) return '';
  const sign = net > 0 ? '+' : '-';
  const abs = Math.abs(net);

  if (abs >= 1000) {
    const inK = Math.round(abs / 1000);
    const formatted = inK.toLocaleString('vi-VN');
    return `${sign}${formatted}k`;
  } else {
    const rounded = Math.round(abs);
    if (rounded === 0) return '';
    return `${sign}${rounded}₫`;
  }
};

const renderCardContent = (photoUrl?: string, tx?: Transaction) => {
  if (photoUrl) {
    return <img src={photoUrl} alt="Chứng từ" className="w-full h-full object-cover" />;
  }
  if (tx?.type === 'income') {
    return (
      <div className="w-full h-full bg-white p-1 flex flex-col justify-between text-black font-mono">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-bold text-[6px] text-emerald-600">Thu</span>
        </div>
        <div className="space-y-0.5 my-auto">
          <div className="h-0.5 bg-neutral-300 rounded w-full" />
          <div className="h-0.5 bg-neutral-200 rounded w-2/3" />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-[#202020] flex items-center justify-center">
      <Plus size={16} className="text-white" strokeWidth={2} />
    </div>
  );
};

/**
 * Component for rendering day cell transaction thumbnails and stacked thumbnails
 */
const CalendarCellThumbnail: React.FC<{
  count: number;
  photoUrls?: string[];
  transactions?: Transaction[];
}> = ({ count, photoUrls = [], transactions = [] }) => {
  // If no transactions in this day -> rounded square with gray border and centered white '+'
  if (count === 0) {
    return (
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] bg-[#1a1a1a] border border-neutral-600 flex items-center justify-center shrink-0 shadow-xs">
        <Plus size={18} className="text-white" strokeWidth={2.2} />
      </div>
    );
  }

  // If exactly 1 transaction -> 1 rounded square with pure white border
  if (count === 1) {
    return (
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] overflow-hidden bg-[#202020] border border-white flex items-center justify-center shrink-0 shadow-sm">
        {renderCardContent(photoUrls[0], transactions[0])}
      </div>
    );
  }

  // If 2 or more transactions -> exactly 2 cards:
  // - First / top card: tilted 25 deg to the left (-25deg) and shifted slightly left (-3px)
  // - Second / bottom card: tilted 25 deg to the right (+25deg) and shifted slightly right (+3px)
  // Both overlap naturally and stay strictly within the cell boundaries
  const firstPhoto = photoUrls[0];
  const secondPhoto = photoUrls[1];
  const firstTx = transactions[0];
  const secondTx = transactions[1];

  return (
    <div className="relative w-10 h-10 sm:w-11 sm:h-11 mx-auto flex items-center justify-center shrink-0">
      {/* Bottom Card (ở dưới) - tilted 25 deg right and shifted 3px right */}
      <div className="absolute inset-0 z-0 w-full h-full rounded-[14px] overflow-hidden bg-[#1e1e1e] border border-white shadow-sm transform rotate-[25deg] translate-x-[3px] scale-[0.88] flex items-center justify-center">
        {renderCardContent(secondPhoto, secondTx)}
      </div>

      {/* Top Card (hình đầu tiên / trên) - tilted 25 deg left and shifted 3px left */}
      <div className="relative z-10 w-full h-full rounded-[14px] overflow-hidden bg-[#222222] border border-white shadow-md transform -rotate-[25deg] -translate-x-[3px] scale-[0.88] flex items-center justify-center">
        {renderCardContent(firstPhoto, firstTx)}
      </div>
    </div>
  );
};

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  currentYear,
  currentMonth,
  transactions,
  accountFilter,
  onAccountFilterChange,
  onPrevMonth,
  onNextMonth,
  onTodayMonth,
  onSelectDay,
  selectedDate,
}) => {
  const todayStr = useMemo(() => getTodayString(), []);
  const [dayPhotosMap, setDayPhotosMap] = useState<Record<string, string[]>>({});

  const accountTabs: CalendarAccountFilter[] = ['all', 'wallet', 'bank'];
  const accountControlRef = useRef<HTMLDivElement>(null);
  const isDraggingAccountRef = useRef(false);

  const updateAccountFromPointer = (clientX: number) => {
    if (!accountControlRef.current) return;
    const rect = accountControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * accountTabs.length);
    const selected = accountTabs[targetIdx];
    if (selected && selected !== accountFilter) {
      onAccountFilterChange(selected);
    }
  };

  const handleAccountPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingAccountRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateAccountFromPointer(e.clientX);
  };

  const handleAccountPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingAccountRef.current) return;
    updateAccountFromPointer(e.clientX);
  };

  const handleAccountPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingAccountRef.current) {
      isDraggingAccountRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // 1. Filter transactions according to active account tab (Tất cả | Ví | Bank)
  const filteredTransactions = useMemo(() => {
    if (accountFilter === 'all') return transactions;
    return transactions.filter((t) => t.account === accountFilter);
  }, [transactions, accountFilter]);

  // Load photos for transactions in current view
  useEffect(() => {
    let isMounted = true;
    const newMap: Record<string, string[]> = {};

    const loadPhotos = async () => {
      for (const t of filteredTransactions) {
        if (t.imageId) {
          try {
            const blob = await getImageBlob(t.imageId);
            if (blob && isMounted) {
              const url = URL.createObjectURL(blob);
              if (!newMap[t.date]) {
                newMap[t.date] = [];
              }
              newMap[t.date].push(url);
            }
          } catch (e) {
            console.error('Lỗi khi tải ảnh lịch:', e);
          }
        }
      }
      if (isMounted) {
        setDayPhotosMap(newMap);
      }
    };

    loadPhotos();

    return () => {
      isMounted = false;
      Object.values(newMap).forEach((urls) => {
        urls.forEach((u) => URL.revokeObjectURL(u));
      });
    };
  }, [filteredTransactions]);

  // 2. Compute month summary based strictly on filtered transactions in current viewing month
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const monthSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filteredTransactions) {
      if (t.date.startsWith(monthPrefix)) {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
      }
    }
    const net = income - expense;
    return { income, expense, net };
  }, [filteredTransactions, monthPrefix]);

  // 3. Aggregate daily transactions strictly on filtered transactions
  const dailyMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; count: number; transactions: Transaction[] }>();
    for (const t of filteredTransactions) {
      const current = map.get(t.date) || { income: 0, expense: 0, count: 0, transactions: [] };
      if (t.type === 'income') current.income += t.amount;
      else current.expense += t.amount;
      current.count += 1;
      current.transactions.push(t);
      map.set(t.date, current);
    }
    return map;
  }, [filteredTransactions]);

  // Generate calendar grid cells (Monday to Sunday)
  const calendarCells = useMemo(() => {
    const cells: DayCellData[] = [];
    // First day of current month
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    // 0 is Sunday, 1 is Monday... convert to Mon=0..Sun=6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday

    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    // 1. Previous month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const data = dailyMap.get(dateStr) || { income: 0, expense: 0, count: 0, transactions: [] };
      cells.push({
        dateStr,
        dayNum: dNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
        transactions: data.transactions,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dailyMap.get(dateStr) || { income: 0, expense: 0, count: 0, transactions: [] };
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
        transactions: data.transactions,
      });
    }

    // 3. Next month leading days to fill up complete weeks (35 or 42 cells)
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const data = dailyMap.get(dateStr) || { income: 0, expense: 0, count: 0, transactions: [] };
      cells.push({
        dateStr,
        dayNum: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
        transactions: data.transactions,
      });
    }

    return cells;
  }, [currentYear, currentMonth, dailyMap, todayStr]);

  const isCurrentRealMonth = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth;
  }, [currentYear, currentMonth]);

  return (
    <div className="space-y-3 pb-36 sm:pb-44 select-none">
      {/* 1. PAGE HEADER (Title, Short Description & Logo) */}
      <div className="flex items-center justify-between pt-1 pb-0.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="text-white" size={24} />
            Dòng tiền
          </h1>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Theo dõi & quản lý thu chi hàng ngày
          </p>
        </div>
      </div>

      {/* Filter & Month Navigation Container */}
      <div className="bg-[#121212] rounded-2xl p-1.5 border border-neutral-800 shadow-sm space-y-1.5">
        {/* Account Filter Segmented Control (Tất cả | Ví | Bank) */}
        <div
          ref={accountControlRef}
          onPointerDown={handleAccountPointerDown}
          onPointerMove={handleAccountPointerMove}
          onPointerUp={handleAccountPointerUp}
          onPointerCancel={handleAccountPointerUp}
          className="grid grid-cols-3 gap-2 relative touch-none select-none"
        >
          <button
            type="button"
            onClick={() => onAccountFilterChange('all')}
            className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              accountFilter === 'all'
                ? 'text-black'
                : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {accountFilter === 'all' && (
              <motion.div
                layoutId="month_calendar_account_tab"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 bg-white rounded-xl shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Layers
                size={18}
                className={accountFilter === 'all' ? 'text-black' : 'text-neutral-400'}
              />
              <span>Tất cả</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onAccountFilterChange('wallet')}
            className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              accountFilter === 'wallet'
                ? 'text-amber-300'
                : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {accountFilter === 'wallet' && (
              <motion.div
                layoutId="month_calendar_account_tab"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 bg-amber-500/25 rounded-xl shadow-xs border border-amber-500/50"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Wallet
                size={18}
                className={accountFilter === 'wallet' ? 'text-amber-300' : 'text-neutral-400'}
              />
              <span>Ví</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onAccountFilterChange('bank')}
            className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              accountFilter === 'bank'
                ? 'text-cyan-300'
                : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {accountFilter === 'bank' && (
              <motion.div
                layoutId="month_calendar_account_tab"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 bg-cyan-500/25 rounded-xl shadow-xs border border-cyan-500/50"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Building2
                size={18}
                className={accountFilter === 'bank' ? 'text-cyan-300' : 'text-neutral-400'}
              />
              <span>Bank</span>
            </span>
          </button>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center justify-between px-2 py-1">
          <button
            onClick={onPrevMonth}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
            aria-label="Tháng trước"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex-1 flex items-center justify-center gap-2 min-w-0 px-2 text-center">
            <span className="font-black text-base sm:text-lg tracking-tight text-white truncate">
              {formatMonthVN(currentYear, currentMonth)}
            </span>
            {!isCurrentRealMonth && (
              <button
                onClick={onTodayMonth}
                className="text-[11px] sm:text-xs font-bold text-black bg-white hover:bg-neutral-200 px-2.5 py-0.5 sm:py-1 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0 active:scale-95"
              >
                Hôm nay
              </button>
            )}
          </div>

          <button
            onClick={onNextMonth}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
            aria-label="Tháng sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Month Summary Cards */}
      <div className="bg-[#121212] rounded-2xl p-3 px-3.5 border border-neutral-800 shadow-sm">
        <div className="grid grid-cols-3 gap-1.5 divide-x divide-neutral-800">
          {/* Income (Xanh lá) */}
          <div className="pr-1.5 text-center">
            <div className="text-xs sm:text-xs font-bold text-neutral-400 flex items-center justify-center gap-1 uppercase tracking-wider">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Thu</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-1 truncate font-mono">
              +{formatVND(monthSummary.income)}
            </div>
          </div>

          {/* Expense (Đỏ) */}
          <div className="px-1.5 text-center">
            <div className="text-xs sm:text-xs font-bold text-neutral-400 flex items-center justify-center gap-1 uppercase tracking-wider">
              <TrendingDown size={14} className="text-rose-400" />
              <span>Chi</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-rose-400 mt-1 truncate font-mono">
              −{formatVND(monthSummary.expense)}
            </div>
          </div>

          {/* Net / Chênh lệch */}
          <div className="pl-1.5 text-center">
            <div className="text-xs sm:text-xs font-bold text-neutral-400 flex items-center justify-center gap-1 uppercase tracking-wider">
              <Scale size={14} className="text-neutral-400" />
              <span>Lệch</span>
            </div>
            <div
              className={`text-sm sm:text-base font-bold mt-1 truncate font-mono ${
                monthSummary.net !== 0
                  ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400'
                  : 'text-neutral-200'
              }`}
            >
              {monthSummary.net !== 0
                ? (monthSummary.net > 0 ? '+' : '−') + formatVND(Math.abs(monthSummary.net))
                : '0 ₫'}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-[#121212] rounded-[24px] p-2.5 sm:p-3.5 border border-neutral-800/80 shadow-xl">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
            <div
              key={day}
              className="text-[12px] sm:text-xs font-semibold text-neutral-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((cell) => {
            const isSelected = cell.isCurrentMonth && Boolean(selectedDate && cell.dateStr === selectedDate);
            const isToday = cell.isCurrentMonth && cell.isToday;
            const formattedNet = formatDailyNetCompact(cell.net);

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  if (cell.isCurrentMonth) {
                    onSelectDay(cell.dateStr);
                  }
                }}
                className={`flex flex-col items-center justify-start p-1 transition-all relative cursor-pointer min-h-[78px] sm:min-h-[88px] ${
                  cell.isCurrentMonth
                    ? 'active:scale-95'
                    : 'opacity-30 pointer-events-none'
                }`}
              >
                {/* Top Section: Thumbnail or Placeholder */}
                {cell.isCurrentMonth ? (
                  <CalendarCellThumbnail
                    count={cell.count}
                    photoUrls={dayPhotosMap[cell.dateStr]}
                    transactions={cell.transactions}
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0" />
                )}

                {/* Middle Section: Day Number (Today's number changes color, no dot) */}
                <div className="flex flex-col items-center justify-center mt-1">
                  <span
                    className={`text-xs sm:text-sm tracking-tight leading-none ${
                      isToday
                        ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-extrabold drop-shadow-[0_0_6px_rgba(236,72,153,0.4)]'
                        : isSelected
                        ? 'text-purple-300 font-extrabold'
                        : cell.isCurrentMonth
                        ? 'text-white font-semibold'
                        : 'text-neutral-600 font-medium'
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                </div>

                {/* Bottom Section: Daily Net Amount */}
                <div className="min-h-[14px] flex items-center justify-center mt-0.5">
                  {cell.isCurrentMonth && formattedNet ? (
                    <span
                      className={`text-[9.5px] sm:text-[10px] font-normal tracking-tight leading-none text-center font-mono ${
                        cell.net > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formattedNet}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

