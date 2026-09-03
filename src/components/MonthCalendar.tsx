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
      <div className="flex items-center justify-between bg-[#121212] rounded-2xl p-2.5 px-3.5 border border-neutral-800 shadow-sm">
        <button
          onClick={onPrevMonth}
          className="w-10 h-10 rounded-xl hover:bg-[#1a1a1a] text-neutral-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="font-black text-lg sm:text-xl tracking-tight text-white">
            {formatMonthVN(currentYear, currentMonth)}
          </span>
          {!isCurrentRealMonth && (
            <button
              onClick={onTodayMonth}
              className="text-xs font-bold text-black bg-white hover:bg-neutral-200 px-3 py-1 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Hôm nay
            </button>
          )}
        </div>

        <button
          onClick={onNextMonth}
          className="w-10 h-10 rounded-xl hover:bg-[#1a1a1a] text-neutral-200 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
          aria-label="Tháng sau"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Account Filter Segmented Control (Tất cả | Ví | Bank) */}
      <div className="bg-[#121212] p-1.5 rounded-2xl border border-neutral-800 grid grid-cols-3 gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => onAccountFilterChange('all')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            accountFilter === 'all'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1a]'
          }`}
        >
          <Layers
            size={18}
            className={accountFilter === 'all' ? 'text-black' : 'text-neutral-400'}
          />
          <span>Tất cả</span>
        </button>

        <button
          type="button"
          onClick={() => onAccountFilterChange('wallet')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            accountFilter === 'wallet'
              ? 'bg-amber-500/25 text-amber-300 shadow-xs border border-amber-500/50'
              : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1a]'
          }`}
        >
          <Wallet
            size={18}
            className={accountFilter === 'wallet' ? 'text-amber-300' : 'text-neutral-400'}
          />
          <span>Ví</span>
        </button>

        <button
          type="button"
          onClick={() => onAccountFilterChange('bank')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            accountFilter === 'bank'
              ? 'bg-blue-500/25 text-blue-300 shadow-xs border border-blue-500/50'
              : 'text-neutral-300 hover:text-white hover:bg-[#1a1a1a]'
          }`}
        >
          <Building2
            size={18}
            className={accountFilter === 'bank' ? 'text-blue-300' : 'text-neutral-400'}
          />
          <span>Bank</span>
        </button>
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

      {/* Calendar Grid */}
      <div className="bg-[#121212] rounded-2xl p-3 sm:p-3.5 border border-neutral-800 shadow-sm">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
            <div
              key={day}
              className={`text-xs sm:text-sm font-black py-1 ${
                idx >= 5 ? 'text-neutral-300' : 'text-neutral-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarCells.map((cell) => {
            const hasActivity = cell.count > 0;
            const hasBoth = cell.income > 0 && cell.expense > 0;

            return (
              <button
                key={cell.dateStr}
                onClick={() => onSelectDay(cell.dateStr)}
                className={`min-h-[58px] sm:min-h-[66px] p-1.5 rounded-xl flex flex-col justify-between items-center transition-all relative border active:scale-95 cursor-pointer ${
                  cell.isToday
                    ? 'border-white bg-[#1e1e1e] font-bold shadow-sm ring-1 ring-white/30'
                    : cell.isCurrentMonth
                      ? 'border-neutral-800/80 bg-[#181818] hover:bg-[#222222]'
                      : 'border-transparent bg-transparent opacity-25 hover:opacity-50'
                }`}
              >
                {/* Day number badge */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      cell.isToday
                        ? 'bg-white text-black font-black shadow-xs'
                        : cell.isCurrentMonth
                          ? 'text-neutral-100'
                          : 'text-neutral-500'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Dual badge dot if both income and expense exist */}
                  {hasBoth && (
                    <div className="flex items-center gap-0.5 pr-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                    </div>
                  )}
                </div>

                {/* Money Badge (Daily total) */}
                <div className="w-full mt-auto text-center">
                  {hasActivity ? (
                    <div
                      className={`text-[10px] sm:text-[11px] font-extrabold tracking-tight px-1 py-0.5 rounded leading-tight truncate font-mono ${
                        cell.net !== 0
                          ? 'bg-fuchsia-500/20'
                          : 'text-neutral-300 bg-neutral-800'
                      }`}
                    >
                      {cell.net !== 0 ? (
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                          {cell.net > 0 ? '+' : '−'}{formatCompactVND(Math.abs(cell.net))}
                        </span>
                      ) : (
                        `0`
                      )}
                    </div>
                  ) : (
                    <div className="h-3" />
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
