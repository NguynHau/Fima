import React, { useState, useMemo } from 'react';
import {
  type Transaction,
  type BalancesSummary,
  type UserSettings,
  type CalendarAccountFilter,
} from '../types';
import {
  formatVND,
  formatSignedVND,
  formatDateVN,
  formatFullDateVN,
} from '../utils/formatters';
import { CategoryIcon, getCategoryInfo } from './CategoryIcon';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Building2,
  Layers,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  DollarSign,
  Tag,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export type TimeFilter = 'week' | 'month' | 'year' | 'custom';

interface StatisticsViewProps {
  transactions: Transaction[];
  balances?: BalancesSummary;
  userSettings?: UserSettings | null;
  onSelectDay?: (date: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

// Helpers for Date arithmetic
function getISOYearMonthDay(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

// Custom Tooltip Component for Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#181a1e]/95 backdrop-blur-md border border-[#3a3f4b] p-3 rounded-2xl shadow-xl text-xs sm:text-sm text-neutral-100 min-w-[140px] z-50">
        {label && <p className="font-extrabold text-neutral-300 pb-1.5 mb-1.5 border-b border-[#3a3f4b]">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-bold" style={{ color: entry.color || entry.fill }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name || 'Giá trị'}:
              </span>
              <span className="font-mono font-extrabold text-white">
                {typeof entry.value === 'number' ? formatVND(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  transactions,
  balances,
  userSettings,
  onSelectDay,
  onSelectTransaction,
}) => {
  // 1. GLOBAL FILTERS STATE
  const [accountFilter, setAccountFilter] = useState<CalendarAccountFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');

  // Reference date state for week/month/year navigation
  const [refDate, setRefDate] = useState<Date>(() => new Date());

  // Custom date picker range
  const todayStr = getISOYearMonthDay(new Date());
  const thirtyDaysAgoStr = getISOYearMonthDay(addDays(new Date(), -30));
  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // 2. COMPUTE DATE RANGE [startDateStr, endDateStr] & PREVIOUS PERIOD RANGE [prevStartDateStr, prevEndDateStr]
  const { startDateStr, endDateStr, prevStartDateStr, prevEndDateStr, periodLabel } = useMemo(() => {
    let start: Date;
    let end: Date;
    let prevStart: Date;
    let prevEnd: Date;
    let label = '';

    if (timeFilter === 'week') {
      // Find Monday of the current refDate
      const dayOfWeek = refDate.getDay(); // 0 is Sun, 1 is Mon...
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(refDate);
      start.setDate(refDate.getDate() + diffToMon);
      end = new Date(start);
      end.setDate(start.getDate() + 6);

      // Previous period: 7 days prior
      prevStart = addDays(start, -7);
      prevEnd = addDays(end, -7);

      label = `Tuần (${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()})`;
    } else if (timeFilter === 'month') {
      const year = refDate.getFullYear();
      const month = refDate.getMonth();
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);

      // Previous period: previous month
      prevStart = new Date(year, month - 1, 1);
      prevEnd = new Date(year, month, 0);

      label = `Tháng ${month + 1}, ${year}`;
    } else if (timeFilter === 'year') {
      const year = refDate.getFullYear();
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);

      // Previous period: previous year
      prevStart = new Date(year - 1, 0, 1);
      prevEnd = new Date(year - 1, 11, 31);

      label = `Năm ${year}`;
    } else {
      // Custom period
      start = parseISODate(customStartDate || thirtyDaysAgoStr);
      end = parseISODate(customEndDate || todayStr);
      if (start > end) {
        const tmp = start;
        start = end;
        end = tmp;
      }

      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      prevStart = addDays(start, -diffDays);
      prevEnd = addDays(start, -1);

      label = `Từ ${formatDateVN(getISOYearMonthDay(start))} đến ${formatDateVN(getISOYearMonthDay(end))}`;
    }

    return {
      startDateStr: getISOYearMonthDay(start),
      endDateStr: getISOYearMonthDay(end),
      prevStartDateStr: getISOYearMonthDay(prevStart),
      prevEndDateStr: getISOYearMonthDay(prevEnd),
      periodLabel: label,
    };
  }, [timeFilter, refDate, customStartDate, customEndDate, thirtyDaysAgoStr, todayStr]);

  // Navigation handlers for time range
  const handlePrevPeriod = () => {
    if (timeFilter === 'week') {
      setRefDate((prev) => addDays(prev, -7));
    } else if (timeFilter === 'month') {
      setRefDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (timeFilter === 'year') {
      setRefDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    }
  };

  const handleNextPeriod = () => {
    if (timeFilter === 'week') {
      setRefDate((prev) => addDays(prev, 7));
    } else if (timeFilter === 'month') {
      setRefDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (timeFilter === 'year') {
      setRefDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    }
  };

  const handleResetToToday = () => {
    setRefDate(new Date());
  };

  // 3. FILTER TRANSACTIONS
  // Current period transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Account filter
      if (accountFilter === 'wallet' && tx.account !== 'wallet') return false;
      if (accountFilter === 'bank' && tx.account !== 'bank') return false;

      // Date filter
      return tx.date >= startDateStr && tx.date <= endDateStr;
    });
  }, [transactions, accountFilter, startDateStr, endDateStr]);

  // Previous period transactions
  const prevFilteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (accountFilter === 'wallet' && tx.account !== 'wallet') return false;
      if (accountFilter === 'bank' && tx.account !== 'bank') return false;
      return tx.date >= prevStartDateStr && tx.date <= prevEndDateStr;
    });
  }, [transactions, accountFilter, prevStartDateStr, prevEndDateStr]);

  // 4. KPI CALCULATIONS
  const currentKPI = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  const prevKPI = useMemo(() => {
    let income = 0;
    let expense = 0;
    prevFilteredTransactions.forEach((tx) => {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    });
    return { income, expense, net: income - expense };
  }, [prevFilteredTransactions]);

  // "Tiền hiện có là số dư hiện tại của tài khoản, không bị giới hạn bởi khoảng thời gian filter."
  const availableBalance = useMemo(() => {
    const initWallet = balances?.initialWallet ?? userSettings?.initialWalletBalance ?? 0;
    const initBank = balances?.initialBank ?? userSettings?.initialBankBalance ?? 0;

    if (accountFilter === 'wallet') {
      return balances?.walletBalance ?? initWallet;
    }
    if (accountFilter === 'bank') {
      return balances?.bankBalance ?? initBank;
    }
    return balances?.totalAssets ?? initWallet + initBank;
  }, [balances, userSettings, accountFilter]);

  // 5. CHART 1 & 2 DATA: Granularity buckets (Income vs Expense & Net Flow)
  const timeBucketsData = useMemo(() => {
    if (!startDateStr || !endDateStr) return [];

    const isYearMode = timeFilter === 'year';
    const isCustomLong =
      timeFilter === 'custom' &&
      Math.abs(parseISODate(endDateStr).getTime() - parseISODate(startDateStr).getTime()) > 35 * 86400000;

    const map = new Map<string, { label: string; income: number; expense: number; net: number }>();

    if (isYearMode || isCustomLong) {
      // Group by Month (YYYY-MM)
      const startD = parseISODate(startDateStr);
      const endD = parseISODate(endDateStr);
      const curr = new Date(startD.getFullYear(), startD.getMonth(), 1);

      while (curr <= endD) {
        const ymKey = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `Thg ${curr.getMonth() + 1}`;
        map.set(ymKey, { label: monthLabel, income: 0, expense: 0, net: 0 });
        curr.setMonth(curr.getMonth() + 1);
      }

      filteredTransactions.forEach((tx) => {
        const ymKey = tx.date.substring(0, 7);
        if (map.has(ymKey)) {
          const b = map.get(ymKey)!;
          if (tx.type === 'income') b.income += tx.amount;
          else b.expense += tx.amount;
          b.net = b.income - b.expense;
        }
      });
    } else {
      // Group by Day (YYYY-MM-DD)
      const startD = parseISODate(startDateStr);
      const endD = parseISODate(endDateStr);
      const curr = new Date(startD);

      while (curr <= endD) {
        const dateKey = getISOYearMonthDay(curr);
        const dayLabel = `${String(curr.getDate()).padStart(2, '0')}/${String(curr.getMonth() + 1).padStart(2, '0')}`;
        map.set(dateKey, { label: dayLabel, income: 0, expense: 0, net: 0 });
        curr.setDate(curr.getDate() + 1);
      }

      filteredTransactions.forEach((tx) => {
        if (map.has(tx.date)) {
          const b = map.get(tx.date)!;
          if (tx.type === 'income') b.income += tx.amount;
          else b.expense += tx.amount;
          b.net = b.income - b.expense;
        }
      });
    }

    return Array.from(map.values());
  }, [filteredTransactions, startDateStr, endDateStr, timeFilter]);

  // 6. CHART 3: CATEGORY DONUT CHART DATA (Expenses only)
  const categoryBreakdown = useMemo(() => {
    const categoryTotals: Record<string, { amount: number; count: number }> = {};
    let totalExpenseInFilter = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        totalExpenseInFilter += tx.amount;
        if (!categoryTotals[tx.category]) {
          categoryTotals[tx.category] = { amount: 0, count: 0 };
        }
        categoryTotals[tx.category].amount += tx.amount;
        categoryTotals[tx.category].count += 1;
      }
    });

    const list = Object.entries(categoryTotals).map(([name, data]) => {
      const info = getCategoryInfo(name, 'expense');
      return {
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenseInFilter > 0 ? (data.amount / totalExpenseInFilter) * 100 : 0,
        color: info.color,
      };
    });

    list.sort((a, b) => b.amount - a.amount);
    return { list, totalExpenseInFilter };
  }, [filteredTransactions]);

  // 7. CHART 4: BALANCE OVER TIME (Reconstructed from initial balances + cumulative transactions)
  const balanceOverTimeData = useMemo(() => {
    if (!startDateStr || !endDateStr) return [];

    const initWallet = balances?.initialWallet ?? userSettings?.initialWalletBalance ?? 0;
    const initBank = balances?.initialBank ?? userSettings?.initialBankBalance ?? 0;

    // Sort all transactions in system by date ascending
    const sortedAllTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    // Build timeline buckets
    const startD = parseISODate(startDateStr);
    const endD = parseISODate(endDateStr);
    const timelineDates: string[] = [];
    const curr = new Date(startD);

    while (curr <= endD) {
      timelineDates.push(getISOYearMonthDay(curr));
      curr.setDate(curr.getDate() + 1);
    }

    // Cumulative sums
    let cumWalletInc = 0;
    let cumWalletExp = 0;
    let cumBankInc = 0;
    let cumBankExp = 0;

    // Precompute up to startDate
    let txIdx = 0;
    while (txIdx < sortedAllTx.length && sortedAllTx[txIdx].date < startDateStr) {
      const tx = sortedAllTx[txIdx];
      if (tx.account === 'wallet') {
        if (tx.type === 'income') cumWalletInc += tx.amount;
        else cumWalletExp += tx.amount;
      } else if (tx.account === 'bank') {
        if (tx.type === 'income') cumBankInc += tx.amount;
        else cumBankExp += tx.amount;
      }
      txIdx++;
    }

    const result = [];
    for (const dStr of timelineDates) {
      // Process transactions on date dStr
      while (txIdx < sortedAllTx.length && sortedAllTx[txIdx].date === dStr) {
        const tx = sortedAllTx[txIdx];
        if (tx.account === 'wallet') {
          if (tx.type === 'income') cumWalletInc += tx.amount;
          else cumWalletExp += tx.amount;
        } else if (tx.account === 'bank') {
          if (tx.type === 'income') cumBankInc += tx.amount;
          else cumBankExp += tx.amount;
        }
        txIdx++;
      }

      const walletBal = initWallet + cumWalletInc - cumWalletExp;
      const bankBal = initBank + cumBankInc - cumBankExp;
      const dayLabel = `${dStr.split('-')[2]}/${dStr.split('-')[1]}`;

      result.push({
        dateStr: dStr,
        label: dayLabel,
        wallet: walletBal,
        bank: bankBal,
        total: walletBal + bankBal,
      });
    }

    return result;
  }, [transactions, startDateStr, endDateStr, balances, userSettings]);

  // 8. CHART 5: WALLET VS BANK COMPARISON (In filtered period)
  const walletVsBankData = useMemo(() => {
    let walletInc = 0;
    let walletExp = 0;
    let bankInc = 0;
    let bankExp = 0;

    // Filter transactions in range regardless of accountFilter
    transactions.forEach((tx) => {
      if (tx.date >= startDateStr && tx.date <= endDateStr) {
        if (tx.account === 'wallet') {
          if (tx.type === 'income') walletInc += tx.amount;
          else walletExp += tx.amount;
        } else if (tx.account === 'bank') {
          if (tx.type === 'income') bankInc += tx.amount;
          else bankExp += tx.amount;
        }
      }
    });

    return [
      { metric: 'Thu nhập', 'Ví': walletInc, 'Bank': bankInc },
      { metric: 'Chi tiêu', 'Ví': walletExp, 'Bank': bankExp },
      { metric: 'Chênh lệch', 'Ví': walletInc - walletExp, 'Bank': bankInc - bankExp },
    ];
  }, [transactions, startDateStr, endDateStr]);

  // 9. INSIGHTS
  // Highest expense day in current period
  const highestExpenseDay = useMemo(() => {
    const dayTotals: Record<string, number> = {};
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'expense') {
        dayTotals[tx.date] = (dayTotals[tx.date] || 0) + tx.amount;
      }
    });

    let maxDay = '';
    let maxAmount = 0;
    Object.entries(dayTotals).forEach(([dStr, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxDay = dStr;
      }
    });

    return maxAmount > 0 ? { dateStr: maxDay, amount: maxAmount } : null;
  }, [filteredTransactions]);

  // Largest transaction in current period
  const largestTransaction = useMemo(() => {
    if (filteredTransactions.length === 0) return null;
    let maxTx = filteredTransactions[0];
    filteredTransactions.forEach((tx) => {
      if (tx.amount > maxTx.amount) {
        maxTx = tx;
      }
    });
    return maxTx;
  }, [filteredTransactions]);

  // Savings rate: ((Income - Expense) / Income) * 100
  const savingsRate = useMemo(() => {
    if (currentKPI.income <= 0) return null;
    const rate = ((currentKPI.income - currentKPI.expense) / currentKPI.income) * 100;
    return rate;
  }, [currentKPI]);

  // Comparison helper calculation
  const compareMeta = (curr: number, prev: number) => {
    if (prev === 0) {
      return { text: '—', direction: 'neutral' };
    }
    const diff = curr - prev;
    const pct = (diff / Math.abs(prev)) * 100;
    if (Math.abs(pct) < 0.1) return { text: '0%', direction: 'neutral' };
    return {
      text: `${Math.abs(pct).toFixed(1)}%`,
      direction: diff > 0 ? 'up' : 'down',
    };
  };

  const hasDataInPeriod = filteredTransactions.length > 0;

  return (
    <div className="space-y-4 pb-24 text-neutral-100">
      {/* 1. HEADER */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-white" size={24} />
            Thống kê tài chính
          </h1>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Báo cáo chi tiết dòng tiền & số dư
          </p>
        </div>
      </div>

      {/* 2. ACCOUNT FILTER */}
      <div className="bg-[#121212] border border-neutral-800 p-1.5 rounded-2xl grid grid-cols-3 gap-2 shadow-sm">
        <button
          onClick={() => setAccountFilter('all')}
          className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            accountFilter === 'all'
              ? 'bg-white text-black font-extrabold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers size={16} />
          <span>Tất cả</span>
        </button>
        <button
          onClick={() => setAccountFilter('wallet')}
          className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            accountFilter === 'wallet'
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Wallet size={16} className="text-amber-400" />
          <span>Ví</span>
        </button>
        <button
          onClick={() => setAccountFilter('bank')}
          className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            accountFilter === 'bank'
              ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Building2 size={16} className="text-blue-400" />
          <span>Bank</span>
        </button>
      </div>

      {/* 3. TIME FILTER & NAVIGATION */}
      <div className="bg-[#121212] rounded-2xl p-2.5 border border-neutral-800 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-1.5 bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800">
          {(
            [
              { id: 'week', label: 'Tuần' },
              { id: 'month', label: 'Tháng' },
              { id: 'year', label: 'Năm' },
              { id: 'custom', label: 'Tùy chọn' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeFilter(tab.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                timeFilter === tab.id
                  ? 'bg-white text-black shadow-xs font-extrabold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time Period Navigation Controls */}
        {timeFilter !== 'custom' ? (
          <div className="flex items-center justify-between px-2 pt-0.5">
            <button
              onClick={handlePrevPeriod}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Kỳ trước"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <span className="text-xs sm:text-sm font-extrabold text-white block">
                {periodLabel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetToToday}
                className="px-2.5 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-[11px] font-bold text-neutral-200 transition-colors cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                onClick={handleNextPeriod}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-200 flex items-center justify-center transition-colors cursor-pointer"
                title="Kỳ sau"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* Custom Date Inputs */
          <div className="grid grid-cols-2 gap-2 pt-1 px-1">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-white font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. OVERVIEW KPIs (4 Cards) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Income */}
        <div className="bg-[#121212] rounded-2xl p-3.5 border border-neutral-800 shadow-sm">
          <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingUp size={15} className="text-emerald-400" /> Thu nhập
          </div>
          <div className="text-sm sm:text-lg font-black text-emerald-400 mt-1.5 truncate font-mono">
            +{formatVND(currentKPI.income)}
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-[#121212] rounded-2xl p-3.5 border border-neutral-800 shadow-sm">
          <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <TrendingDown size={15} className="text-rose-400" /> Chi tiêu
          </div>
          <div className="text-sm sm:text-lg font-black text-rose-400 mt-1.5 truncate font-mono">
            −{formatVND(currentKPI.expense)}
          </div>
        </div>

        {/* Net Difference */}
        <div className="bg-[#121212] rounded-2xl p-3.5 border border-neutral-800 shadow-sm">
          <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Scale size={15} className="text-neutral-400" /> Chênh lệch
          </div>
          <div
            className={`text-sm sm:text-lg font-black mt-1.5 truncate font-mono ${
              currentKPI.net > 0
                ? 'text-emerald-400'
                : currentKPI.net < 0
                ? 'text-rose-400'
                : 'text-neutral-200'
            }`}
          >
            {formatSignedVND(currentKPI.net, 'net')}
          </div>
        </div>

        {/* Current Available Balance */}
        <div className="bg-[#121212] rounded-2xl p-3.5 border border-neutral-800 shadow-sm">
          <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Wallet size={15} className="text-amber-400" /> Tiền hiện có
          </div>
          <div className="text-sm sm:text-lg font-black text-white mt-1.5 truncate font-mono">
            {formatVND(availableBalance)}
          </div>
        </div>
      </div>

      {!hasDataInPeriod ? (
        /* Empty State */
        <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-8 text-center my-4 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400 shadow-inner">
            <AlertCircle size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">Chưa có dữ liệu</h3>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">
              Không có giao dịch nào trong khoảng thời gian đã chọn.
            </p>
            <p className="text-xs text-white font-bold pt-1">
              Thêm giao dịch đầu tiên để xem thống kê.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 5. CHART 1 — THU NHẬP VS CHI TIÊU */}
          <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <LineChartIcon size={18} className="text-white" />
                Thu nhập vs Chi tiêu
              </h3>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Thu
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Chi
                </span>
              </div>
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeBucketsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Thu nhập"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Chi tiêu"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. CHART 2 — DÒNG TIỀN RÒNG (NET CASHFLOW BAR CHART) */}
          <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-400" />
                Dòng tiền ròng (Net = Thu − Chi)
              </h3>
            </div>

            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeBucketsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => (Math.abs(val) >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="net" name="Dòng tiền ròng" radius={[4, 4, 0, 0]}>
                    {timeBucketsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.net > 0 ? '#10b981' : entry.net < 0 ? '#f43f5e' : '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7. CHART 3 — CHI TIÊU THEO HẠNG MỤC (EXPENSE DONUT CHART) */}
          <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <PieChartIcon size={18} className="text-purple-400" />
                Chi tiêu theo hạng mục
              </h3>
              <span className="text-xs font-bold text-neutral-300 font-mono">
                {formatVND(categoryBreakdown.totalExpenseInFilter)}
              </span>
            </div>

            {categoryBreakdown.list.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 text-xs">
                Không có khoản chi tiêu nào trong kỳ này.
              </div>
            ) : (
              <>
                {/* Donut Chart */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown.list}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="amount"
                        >
                          {categoryBreakdown.list.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tổng chi</span>
                      <span className="text-xs sm:text-sm font-black text-rose-400 font-mono">
                        {formatVND(categoryBreakdown.totalExpenseInFilter)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Categories Compact Ranking List */}
                <div className="space-y-3 pt-1 border-t border-neutral-800">
                  {categoryBreakdown.list.map((cat) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={cat.name} type="expense" size={16} />
                          <span className="font-bold text-neutral-100 text-xs sm:text-sm">{cat.name}</span>
                          <span className="text-xs text-neutral-400 font-medium">({cat.count})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-white text-xs sm:text-sm font-mono">
                            {formatVND(cat.amount)}
                          </span>
                          <span className="text-xs font-bold text-neutral-300 ml-2 font-mono">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Fill */}
                      <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-neutral-800">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 8. CHART 4 — SỐ DƯ VÍ & BANK THEO THỜI GIAN */}
          <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <LineChartIcon size={18} className="text-amber-400" />
                Số dư Ví & Bank theo thời gian
              </h3>
              <div className="flex items-center gap-2.5 text-xs font-bold">
                {(accountFilter === 'all' || accountFilter === 'wallet') && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Ví
                  </span>
                )}
                {(accountFilter === 'all' || accountFilter === 'bank') && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Bank
                  </span>
                )}
              </div>
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  {(accountFilter === 'all' || accountFilter === 'wallet') && (
                    <Line
                      type="monotone"
                      dataKey="wallet"
                      name="Số dư Ví"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  )}
                  {(accountFilter === 'all' || accountFilter === 'bank') && (
                    <Line
                      type="monotone"
                      dataKey="bank"
                      name="Số dư Bank"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 9. CHART 5 — SO SÁNH VÍ VS BANK (Visible ONLY when accountFilter === 'all') */}
          {accountFilter === 'all' && (
            <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-400" />
                  So sánh Ví vs Bank
                </h3>
                <div className="flex items-center gap-2.5 text-xs font-bold">
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Ví
                  </span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Bank
                  </span>
                </div>
              </div>

              <div className="h-48 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={walletVsBankData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="metric" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => (Math.abs(val) >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="Ví" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Bank" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* 10. SO SÁNH VỚI KỲ TRƯỚC */}
      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
        <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2 border-b border-neutral-800 pb-2.5">
          <Scale size={18} className="text-white" />
          So sánh với kỳ trước
        </h3>

        <div className="space-y-2.5 pt-1">
          {/* Expense Comparison */}
          {(() => {
            const expMeta = compareMeta(currentKPI.expense, prevKPI.expense);
            return (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] border border-neutral-800">
                <div>
                  <div className="text-xs font-bold text-neutral-300">Chi tiêu kỳ này</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {formatVND(currentKPI.expense)}
                  </div>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xs font-medium text-neutral-400">So kỳ trước:</span>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                      expMeta.direction === 'up'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : expMeta.direction === 'down'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/30'
                    }`}
                  >
                    {expMeta.direction === 'up' && <ArrowUpRight size={14} />}
                    {expMeta.direction === 'down' && <ArrowDownRight size={14} />}
                    {expMeta.direction === 'neutral' && <Minus size={14} />}
                    <span>{expMeta.text}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Income Comparison */}
          {(() => {
            const incMeta = compareMeta(currentKPI.income, prevKPI.income);
            return (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] border border-neutral-800">
                <div>
                  <div className="text-xs font-bold text-neutral-300">Thu nhập kỳ này</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {formatVND(currentKPI.income)}
                  </div>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xs font-medium text-neutral-400">So kỳ trước:</span>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                      incMeta.direction === 'up'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : incMeta.direction === 'down'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/30'
                    }`}
                  >
                    {incMeta.direction === 'up' && <ArrowUpRight size={14} />}
                    {incMeta.direction === 'down' && <ArrowDownRight size={14} />}
                    {incMeta.direction === 'neutral' && <Minus size={14} />}
                    <span>{incMeta.text}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Net Comparison */}
          {(() => {
            const netMeta = compareMeta(currentKPI.net, prevKPI.net);
            return (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] border border-neutral-800">
                <div>
                  <div className="text-xs font-bold text-neutral-300">Chênh lệch kỳ này</div>
                  <div className="text-sm font-black text-white font-mono mt-0.5">
                    {formatSignedVND(currentKPI.net, 'net')}
                  </div>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xs font-medium text-neutral-400">So kỳ trước:</span>
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 ${
                      netMeta.direction === 'up'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : netMeta.direction === 'down'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/30'
                    }`}
                  >
                    {netMeta.direction === 'up' && <ArrowUpRight size={14} />}
                    {netMeta.direction === 'down' && <ArrowDownRight size={14} />}
                    {netMeta.direction === 'neutral' && <Minus size={14} />}
                    <span>{netMeta.text}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 11. INSIGHTS CARDS */}
      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3.5">
        <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2 border-b border-neutral-800 pb-2.5">
          <Sparkles size={18} className="text-amber-400" />
          Gợi ý & Thông tin nhanh (Insights)
        </h3>

        <div className="grid grid-cols-1 gap-3 pt-1">
          {/* Card 1: Ngày chi tiêu nhiều nhất */}
          <div
            onClick={() => {
              if (highestExpenseDay && onSelectDay) {
                onSelectDay(highestExpenseDay.dateStr);
              }
            }}
            className={`p-3.5 rounded-2xl border transition-all ${
              highestExpenseDay
                ? 'bg-[#1a1a1a] hover:bg-[#222] border-neutral-800 cursor-pointer active:scale-98'
                : 'bg-[#1a1a1a]/60 border-neutral-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-300">Ngày chi tiêu nhiều nhất</div>
                  {highestExpenseDay ? (
                    <div className="text-sm font-black text-white mt-0.5">
                      {formatFullDateVN(highestExpenseDay.dateStr)}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400 mt-0.5">—</div>
                  )}
                </div>
              </div>
              {highestExpenseDay && (
                <div className="text-right">
                  <div className="text-xs font-black text-rose-400 font-mono">
                    −{formatVND(highestExpenseDay.amount)}
                  </div>
                  <span className="text-[10px] text-white font-bold flex items-center gap-0.5 justify-end mt-0.5">
                    Xem chi tiết <ArrowRight size={10} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Giao dịch lớn nhất */}
          <div
            onClick={() => {
              if (largestTransaction && onSelectTransaction) {
                onSelectTransaction(largestTransaction);
              }
            }}
            className={`p-3.5 rounded-2xl border transition-all ${
              largestTransaction
                ? 'bg-[#1a1a1a] hover:bg-[#222] border-neutral-800 cursor-pointer active:scale-98'
                : 'bg-[#1a1a1a]/60 border-neutral-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {largestTransaction ? (
                  <CategoryIcon category={largestTransaction.category} type={largestTransaction.type} size={20} />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Tag size={18} />
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-neutral-300">Giao dịch lớn nhất</div>
                  {largestTransaction ? (
                    <div className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                      <span>{largestTransaction.category}</span>
                      <span className="text-xs font-medium text-neutral-400">
                        ({formatDateVN(largestTransaction.date)})
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400 mt-0.5">—</div>
                  )}
                </div>
              </div>

              {largestTransaction && (
                <div className="text-right">
                  <div
                    className={`text-xs font-black font-mono ${
                      largestTransaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatSignedVND(largestTransaction.amount, largestTransaction.type)}
                  </div>
                  <span className="text-[10px] text-white font-bold flex items-center gap-0.5 justify-end mt-0.5">
                    Sửa <ArrowRight size={10} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Tỷ lệ tiền còn lại (Savings / Remaining Income Rate) */}
          <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <DollarSign size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-300">Tỷ lệ tiền tích lũy / còn lại</div>
                  <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                    (Thu nhập − Chi tiêu) / Thu nhập
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm sm:text-base font-black font-mono ${
                    savingsRate !== null && savingsRate > 0
                      ? 'text-emerald-400'
                      : savingsRate !== null && savingsRate < 0
                      ? 'text-rose-400'
                      : 'text-neutral-300'
                  }`}
                >
                  {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
