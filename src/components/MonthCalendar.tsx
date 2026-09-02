import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { type Transaction, type CalendarAccountFilter } from '../types';
import {
  formatCompactVND,
  formatDateVN,
  formatMonthVN,
  formatVND,
  getTodayString,
} from '../utils/formatters';

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
}

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
}) => {
  const todayStr = useMemo(() => getTodayString(), []);

  // 1. Filter transactions according to active account tab (Tất cả | Ví | Bank)
  const filteredTransactions = useMemo(() => {
    if (accountFilter === 'all') return transactions;
    return transactions.filter((t) => t.account === accountFilter);
  }, [transactions, accountFilter]);

  // 2. Compute month summary based strictly on filtered transactions
  const monthSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    const net = income - expense;
    return { income, expense, net };
  }, [filteredTransactions]);

  // 3. Aggregate daily transactions strictly on filtered transactions
  const dailyMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; count: number }>();
    for (const t of filteredTransactions) {
      const current = map.get(t.date) || { income: 0, expense: 0, count: 0 };
      if (t.type === 'income') current.income += t.amount;
      else current.expense += t.amount;
      current.count += 1;
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
      const data = dailyMap.get(dateStr) || { income: 0, expense: 0, count: 0 };
      cells.push({
        dateStr,
        dayNum: dNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dailyMap.get(dateStr) || { income: 0, expense: 0, count: 0 };
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
      });
    }

    // 3. Next month leading days to fill up complete weeks (42 cells max)
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const data = dailyMap.get(dateStr) || { income: 0, expense: 0, count: 0 };
      cells.push({
        dateStr,
        dayNum: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
        count: data.count,
      });
    }

    return cells;
  }, [currentYear, currentMonth, dailyMap, todayStr]);

  const isCurrentRealMonth = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth;
  }, [currentYear, currentMonth]);

  return (
    <div className="space-y-2.5 pb-20">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-[#121212] rounded-2xl p-2 px-3 border border-[#262626] shadow-sm">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-xl hover:bg-[#1a1a1a] text-neutral-300 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
            {formatMonthVN(currentYear, currentMonth)}
          </span>
          {!isCurrentRealMonth && (
            <button
              onClick={onTodayMonth}
              className="text-[11px] font-bold text-neutral-200 bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Hôm nay
            </button>
          )}
        </div>

        <button
          onClick={onNextMonth}
          className="w-8 h-8 rounded-xl hover:bg-[#1a1a1a] text-neutral-300 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
          aria-label="Tháng sau"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Account Filter Segmented Control (Tất cả | Ví | Bank) */}
      <div className="bg-[#121212] p-1.5 rounded-2xl border border-[#262626] grid grid-cols-3 gap-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => onAccountFilterChange('all')}
          className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            accountFilter === 'all'
              ? 'bg-[#242424] text-white shadow-xs border border-[#383838]'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#181818]'
          }`}
        >
          <Layers
            size={15}
            className={accountFilter === 'all' ? 'text-neutral-200' : 'text-neutral-500'}
          />
          <span>Tất cả</span>
        </button>

        <button
          type="button"
          onClick={() => onAccountFilterChange('wallet')}
          className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            accountFilter === 'wallet'
              ? 'bg-amber-500/20 text-amber-300 shadow-xs border border-amber-500/40'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#181818]'
          }`}
        >
          <Wallet
            size={15}
            className={accountFilter === 'wallet' ? 'text-amber-400' : 'text-neutral-500'}
          />
          <span>Ví</span>
        </button>

        <button
          type="button"
          onClick={() => onAccountFilterChange('bank')}
          className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            accountFilter === 'bank'
              ? 'bg-blue-500/20 text-blue-300 shadow-xs border border-blue-500/40'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#181818]'
          }`}
        >
          <Building2
            size={15}
            className={accountFilter === 'bank' ? 'text-blue-400' : 'text-neutral-500'}
          />
          <span>Bank</span>
        </button>
      </div>

      {/* Month Summary Cards */}
      <div className="bg-[#121212] rounded-2xl p-2.5 px-3 border border-[#262626] shadow-sm">
        <div className="grid grid-cols-3 gap-1 divide-x divide-[#262626]">
          {/* Income */}
          <div className="pr-1.5 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 flex items-center justify-center gap-1 uppercase tracking-wider">
              <TrendingUp size={12} className="text-emerald-400" />
              <span>Thu</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 truncate font-mono">
              +{formatVND(monthSummary.income)}
            </div>
          </div>

          {/* Expense */}
          <div className="px-1.5 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 flex items-center justify-center gap-1 uppercase tracking-wider">
              <TrendingDown size={12} className="text-rose-400" />
              <span>Chi</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-rose-400 mt-1 truncate font-mono">
              −{formatVND(monthSummary.expense)}
            </div>
          </div>

          {/* Net / Chênh lệch */}
          <div className="pl-1.5 text-center">
            <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 flex items-center justify-center gap-1 uppercase tracking-wider">
              <Scale size={12} className="text-neutral-400" />
              <span>Lệch</span>
            </div>
            <div
              className={`text-xs sm:text-sm font-bold mt-1 truncate font-mono ${
                monthSummary.net > 0
                  ? 'text-emerald-400'
                  : monthSummary.net < 0
                    ? 'text-rose-400'
                    : 'text-neutral-300'
              }`}
            >
              {monthSummary.net !== 0
                ? (monthSummary.net > 0 ? '+' : '−') + formatVND(Math.abs(monthSummary.net))
                : '0 ₫'}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#121212] rounded-2xl p-2.5 sm:p-3 border border-[#262626] shadow-sm">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
            <div
              key={day}
              className={`text-[11px] sm:text-xs font-bold py-1 ${
                idx >= 5 ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((cell) => {
            const hasActivity = cell.count > 0;
            const hasBoth = cell.income > 0 && cell.expense > 0;

            return (
              <button
                key={cell.dateStr}
                onClick={() => onSelectDay(cell.dateStr)}
                className={`min-h-[50px] sm:min-h-[56px] p-1.5 rounded-xl flex flex-col justify-between items-center transition-all relative border active:scale-95 cursor-pointer ${
                  cell.isToday
                    ? 'border-neutral-300 bg-neutral-800/90 font-bold shadow-xs'
                    : cell.isCurrentMonth
                      ? 'border-[#262626] bg-[#171717] hover:bg-[#1f1f1f]'
                      : 'border-transparent bg-transparent opacity-20 hover:opacity-40'
                }`}
              >
                {/* Day number badge */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold inline-flex items-center justify-center w-5.5 h-5.5 rounded-full ${
                      cell.isToday
                        ? 'bg-neutral-200 text-black font-black'
                        : cell.isCurrentMonth
                          ? 'text-neutral-200'
                          : 'text-neutral-500'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Dual badge dot if both income and expense exist */}
                  {hasBoth && (
                    <div className="flex items-center gap-0.5 pr-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    </div>
                  )}
                </div>

                {/* Money Badge (Daily total) */}
                <div className="w-full mt-auto text-center">
                  {hasActivity ? (
                    <div
                      className={`text-[9px] sm:text-[10px] font-bold tracking-tight px-1 py-0.5 rounded leading-tight truncate font-mono ${
                        cell.net > 0
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : cell.net < 0
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-neutral-400 bg-[#222222]'
                      }`}
                    >
                      {cell.net > 0
                        ? `+${formatCompactVND(cell.net)}`
                        : cell.net < 0
                          ? `−${formatCompactVND(Math.abs(cell.net))}`
                          : `0`}
                    </div>
                  ) : (
                    <div className="h-2.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
