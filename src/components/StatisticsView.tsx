import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  type Transaction,
  type BalancesSummary,
  type UserSettings,
  type CalendarAccountFilter,
  type Debt,
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
  Users,
  Search,
  WifiOff,
  ChevronDown,
  ChevronUp,
  List,
  X,
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
  debts?: Debt[];
  onSelectDay?: (date: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
  onOpenSearch?: () => void;
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
          {payload.map((entry: any, index: number) => {
            const isNet = entry.name === 'Dòng tiền ròng';
            const itemColor = isNet ? '#c084fc' : (entry.color || entry.fill);
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 font-bold" style={{ color: itemColor }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: itemColor }} />
                  {entry.name || 'Giá trị'}:
                </span>
                <span className="font-mono font-extrabold text-white">
                  {typeof entry.value === 'number' ? formatVND(entry.value) : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

import { AIManager } from '../services/ai/AIManager';
import { AIUsageMonitor } from './AIUsageMonitor';
import { cleanPlainAssistantText } from '../services/ai/cleanText';
import { usePWA } from '../hooks/usePWA';

// AI Assistant & Quota Monitor Component in Statistics
const AIAssistantSection: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const { isOnline } = usePWA();
  const [isQuotaOpen, setIsQuotaOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (q?: string) => {
    const finalQuestion = q || question;
    if (!finalQuestion.trim()) return;
    
    if (!isOnline) {
      setAnswer('Bạn đang ở chế độ ngoại tuyến (Offline). Trợ lý AI cần kết nối Internet để phân tích dữ liệu và trả lời.');
      return;
    }

    setIsLoading(true);
    setAnswer(null);
    try {
      const response = await AIManager.askAssistant(finalQuestion, transactions);
      setAnswer(cleanPlainAssistantText(response));
      setQuestion('');
    } catch (err: any) {
      console.error('AI Assistant Error:', err);
      setAnswer(err?.message || 'Rất tiếc, AI gặp lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    'Tháng này tôi tiêu bao nhiêu?',
    'Khoản chi nào lớn nhất?',
    'Xu hướng chi tiêu của tôi?',
    'Tôi có thể tiết kiệm thêm không?'
  ];

  return (
    <div className="space-y-3 my-4 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="bg-gradient-to-br from-purple-900/40 via-[#121212] to-pink-900/20 rounded-3xl p-5 border border-purple-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">Trợ lý Tài chính AI</h3>
              <p className="text-[10px] text-purple-200/60 font-bold uppercase tracking-wider">Financial Reasoning Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <WifiOff size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Ngoại tuyến</span>
              </div>
            )}
            <button
              onClick={() => setIsQuotaOpen(true)}
              className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center justify-center hover:bg-purple-500/20 transition-colors cursor-pointer active:scale-95"
              title="AI Quota"
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
            <WifiOff size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Chế độ Ngoại tuyến:</span> Tất cả dữ liệu thống kê, biểu đồ thu chi và danh mục hoạt động 100% không cần mạng. Trợ lý AI sẽ tự động hoạt động trở lại ngay khi có kết nối Internet.
            </div>
          </div>
        )}

        {answer && (
          <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-4 text-xs sm:text-sm text-neutral-200 leading-relaxed animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400 shrink-0" />
                <span className="font-extrabold text-purple-300">Phản hồi từ Fima AI:</span>
              </div>
              <button
                onClick={() => setAnswer(null)}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="whitespace-pre-line text-neutral-200 space-y-2 font-normal leading-relaxed">
              {cleanPlainAssistantText(answer)}
            </div>
          </div>
        )}

        <div className="relative group">
          <input
            type="text"
            placeholder={isOnline ? "Hỏi AI về tài chính của bạn..." : "Trợ lý AI cần kết nối Internet..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            disabled={!isOnline}
            className="w-full bg-black/40 border border-purple-500/30 disabled:border-neutral-800 disabled:opacity-60 rounded-2xl py-3.5 pl-4 pr-12 text-sm font-medium placeholder:text-neutral-500 focus:border-purple-400 outline-none transition-all"
          />
          <button
            onClick={() => handleAsk()}
            disabled={isLoading || !question.trim() || !isOnline}
            className="absolute right-2 top-2 bottom-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg flex items-center justify-center cursor-pointer"
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'HỎI'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleAsk(s)}
              disabled={isLoading || !isOnline}
              className="text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isQuotaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] w-full max-w-md rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-[#1a1a1a]">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-purple-400" />
                AI Usage & Quota
              </h3>
              <button
                onClick={() => setIsQuotaOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto bg-[#121212]">
              <AIUsageMonitor />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DEFAULT_CARD_ORDER = [
  'kpis',
  'tx_list',
  'insights',
  'empty_state',
  'chart_income_vs_expense',
  'chart_net_cashflow',
  'chart_category_expense',
  'chart_balance_over_time',
  'chart_wallet_vs_bank',
  'compare_prev_period',
  'debt_summary',
];

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  transactions,
  balances,
  userSettings,
  debts = [],
  onSelectDay,
  onSelectTransaction,
  onOpenSearch,
}) => {
  // 1. GLOBAL FILTERS STATE
  const [accountFilter, setAccountFilter] = useState<CalendarAccountFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  
  const [isTxListOpen, setIsTxListOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [txListFilter, setTxListFilter] = useState<'all' | 'expense' | 'income'>('all');

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
      setAccountFilter(selected);
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

  const timeTabs: TimeFilter[] = ['week', 'month', 'year', 'custom'];
  const timeControlRef = useRef<HTMLDivElement>(null);
  const isDraggingTimeRef = useRef(false);

  const updateTimeFromPointer = (clientX: number) => {
    if (!timeControlRef.current) return;
    const rect = timeControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * timeTabs.length);
    const selected = timeTabs[targetIdx];
    if (selected && selected !== timeFilter) {
      setTimeFilter(selected);
    }
  };

  const handleTimePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTimeRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateTimeFromPointer(e.clientX);
  };

  const handleTimePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTimeRef.current) return;
    updateTimeFromPointer(e.clientX);
  };

  const handleTimePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTimeRef.current) {
      isDraggingTimeRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Reference date state for week/month/year navigation
  const [refDate, setRefDate] = useState<Date>(() => new Date());

  // Custom date picker range
  const todayStr = getISOYearMonthDay(new Date());
  const thirtyDaysAgoStr = getISOYearMonthDay(addDays(new Date(), -30));
  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Dynamic Debt statistics (Independent)
  const debtStats = useMemo(() => {
    if (!debts || debts.length === 0) return null;
    
    let totalLendRemaining = 0; // người khác nợ mình
    let totalBorrowRemaining = 0; // mình nợ người khác
    let activeLendCount = 0;
    let activeBorrowCount = 0;

    debts.forEach((d) => {
      if (d.status !== 'paid') {
        const remaining = Math.max(0, d.amount - d.paidAmount);
        if (d.type === 'lend') {
          totalLendRemaining += remaining;
          activeLendCount++;
        } else {
          totalBorrowRemaining += remaining;
          activeBorrowCount++;
        }
      }
    });

    const grandTotalDebtRemaining = totalLendRemaining + totalBorrowRemaining;

    // Calculate ratio of Lend vs Borrow
    const lendRatio = grandTotalDebtRemaining > 0 ? (totalLendRemaining / grandTotalDebtRemaining) * 100 : 0;
    const borrowRatio = grandTotalDebtRemaining > 0 ? (totalBorrowRemaining / grandTotalDebtRemaining) * 100 : 0;

    return {
      totalLendRemaining,
      totalBorrowRemaining,
      grandTotalDebtRemaining,
      lendRatio,
      borrowRatio,
      activeLendCount,
      activeBorrowCount,
    };
  }, [debts]);

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

  const visibleTransactions = useMemo(() => {
    let list = [...filteredTransactions];
    if (txListFilter === 'expense') list = list.filter((t) => t.type === 'expense');
    if (txListFilter === 'income') list = list.filter((t) => t.type === 'income');
    return list.sort((a, b) => {
      if (b.date === a.date) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.date.localeCompare(a.date);
    });
  }, [filteredTransactions, txListFilter]);

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

  // 9. DYNAMIC INSIGHTS
  const quickInsights = useMemo(() => {
    const insights: Array<{
      id: string;
      title: string;
      valueText: string;
      subText?: string;
      icon: React.ReactNode;
      colorClass: string;
      onClick?: () => void;
      hasArrow?: boolean;
    }> = [];

    if (filteredTransactions.length === 0) return insights;

    let maxExpenseTx: Transaction | null = null;
    let maxIncomeTx: Transaction | null = null;
    
    const dayExp: Record<string, number> = {};
    const dayInc: Record<string, number> = {};
    const dayCount: Record<string, number> = {};
    
    const catExp: Record<string, number> = {};
    const catInc: Record<string, number> = {};
    
    let totalExp = 0; let countExp = 0;
    let totalInc = 0; let countInc = 0;

    filteredTransactions.forEach(tx => {
      dayCount[tx.date] = (dayCount[tx.date] || 0) + 1;
      if (tx.type === 'expense') {
        if (!maxExpenseTx || tx.amount > maxExpenseTx.amount) maxExpenseTx = tx;
        dayExp[tx.date] = (dayExp[tx.date] || 0) + tx.amount;
        catExp[tx.category] = (catExp[tx.category] || 0) + tx.amount;
        totalExp += tx.amount;
        countExp++;
      } else if (tx.type === 'income') {
        if (!maxIncomeTx || tx.amount > maxIncomeTx.amount) maxIncomeTx = tx;
        dayInc[tx.date] = (dayInc[tx.date] || 0) + tx.amount;
        catInc[tx.category] = (catInc[tx.category] || 0) + tx.amount;
        totalInc += tx.amount;
        countInc++;
      }
    });

    const getExtreme = (dict: Record<string, number>) => {
      let maxK = ''; let maxV = 0;
      Object.entries(dict).forEach(([k, v]) => { if (v > maxV) { maxV = v; maxK = k; } });
      return { k: maxK, v: maxV };
    };

    const expDay = getExtreme(dayExp);
    const incDay = getExtreme(dayInc);
    const expCat = getExtreme(catExp);
    const incCat = getExtreme(catInc);
    const bDay = getExtreme(dayCount);

    // 1. Khoản chi lớn nhất
    if (maxExpenseTx && maxExpenseTx.amount > 0) {
      insights.push({
        id: 'max-exp-tx',
        title: 'Khoản chi lớn nhất',
        valueText: `−${formatVND(maxExpenseTx.amount)}`,
        subText: `${maxExpenseTx.category} (${formatDateVN(maxExpenseTx.date)})`,
        icon: <TrendingDown size={18} />,
        colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        onClick: () => onSelectTransaction?.(maxExpenseTx!),
        hasArrow: true
      });
    }

    // 2. Khoản thu lớn nhất
    if (maxIncomeTx && maxIncomeTx.amount > 0) {
      insights.push({
        id: 'max-inc-tx',
        title: 'Khoản thu lớn nhất',
        valueText: `+${formatVND(maxIncomeTx.amount)}`,
        subText: `${maxIncomeTx.category} (${formatDateVN(maxIncomeTx.date)})`,
        icon: <TrendingUp size={18} />,
        colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        onClick: () => onSelectTransaction?.(maxIncomeTx!),
        hasArrow: true
      });
    }

    // 3. Ngày chi nhiều nhất
    if (expDay.v > 0) {
      insights.push({
        id: 'max-exp-day',
        title: 'Ngày chi nhiều nhất',
        valueText: `−${formatVND(expDay.v)}`,
        subText: formatFullDateVN(expDay.k),
        icon: <Calendar size={18} />,
        colorClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        onClick: () => onSelectDay?.(expDay.k),
        hasArrow: true
      });
    }

    // 4. Hạng mục chi nhiều nhất
    if (expCat.v > 0) {
      insights.push({
        id: 'max-exp-cat',
        title: 'Hạng mục chi nhiều nhất',
        valueText: `−${formatVND(expCat.v)}`,
        subText: expCat.k,
        icon: <PieChartIcon size={18} />,
        colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      });
    }

    // 5. Hạng mục thu nhiều nhất
    if (incCat.v > 0) {
      insights.push({
        id: 'max-inc-cat',
        title: 'Hạng mục thu nhiều nhất',
        valueText: `+${formatVND(incCat.v)}`,
        subText: incCat.k,
        icon: <PieChartIcon size={18} />,
        colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      });
    }

    // 6. Chi trung bình / giao dịch
    if (countExp > 1) {
      insights.push({
        id: 'avg-exp',
        title: 'Chi trung bình / giao dịch',
        valueText: `−${formatVND(totalExp / countExp)}`,
        subText: `Trên tổng ${countExp} khoản chi`,
        icon: <BarChart3 size={18} />,
        colorClass: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30'
      });
    }

    // 7. Ngày nhiều giao dịch nhất
    if (bDay.v > 1) {
      insights.push({
        id: 'busiest-day',
        title: 'Ngày sôi động nhất',
        valueText: `${bDay.v} giao dịch`,
        subText: formatFullDateVN(bDay.k),
        icon: <Users size={18} />,
        colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        onClick: () => onSelectDay?.(bDay.k),
        hasArrow: true
      });
    }

    // 8. Tỷ lệ tích lũy
    if (totalInc > 0) {
      const rate = ((totalInc - totalExp) / totalInc) * 100;
      insights.push({
        id: 'savings-rate',
        title: 'Tỷ lệ tiền tích lũy',
        valueText: `${rate.toFixed(1)}%`,
        subText: '(Thu − Chi) / Thu',
        icon: <DollarSign size={18} />,
        colorClass: rate > 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      });
    }

    // We can prioritize and just take the top 6 most interesting
    // They are already pushed in a reasonable order
    return insights.slice(0, 8);
  }, [filteredTransactions, onSelectTransaction, onSelectDay]);

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

  const shouldRenderCard = (cardId: string) => {
    if (cardId === 'kpis') return true;
    if (cardId === 'tx_list') return true;
    if (cardId === 'insights') return true;
    if (cardId === 'compare_prev_period') return true;
    if (cardId === 'debt_summary') return !!debtStats;
    if (cardId === 'empty_state') return !hasDataInPeriod;

    if (!hasDataInPeriod) return false;

    if (cardId === 'chart_income_vs_expense') return true;
    if (cardId === 'chart_net_cashflow') return true;
    if (cardId === 'chart_category_expense') return true;
    if (cardId === 'chart_balance_over_time') return true;
    if (cardId === 'chart_wallet_vs_bank') return accountFilter === 'all';

    return false;
  };

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

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="w-10 h-10 rounded-2xl bg-[#121212] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm"
            title="Tìm kiếm giao dịch"
          >
            <Search size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* AI ASSISTANT SECTION */}
      <AIAssistantSection transactions={transactions} />

      {/* 2 & 3. FILTERS (Account & Time) */}
      <div className="bg-[#121212] rounded-2xl p-2.5 border border-neutral-800 shadow-sm space-y-2.5">
        {/* Account Filter */}
        <div
          ref={accountControlRef}
          onPointerDown={handleAccountPointerDown}
          onPointerMove={handleAccountPointerMove}
          onPointerUp={handleAccountPointerUp}
          onPointerCancel={handleAccountPointerUp}
          className="bg-[#1a1a1a] border border-neutral-800 p-1 rounded-xl grid grid-cols-3 gap-1.5 relative touch-none select-none"
        >
          <button
            type="button"
            onClick={() => setAccountFilter('all')}
            className={`relative py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              accountFilter === 'all'
                ? 'text-black font-extrabold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {accountFilter === 'all' && (
              <motion.div
                layoutId="stats_account_filter_tab"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 bg-white rounded-lg shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Layers size={16} />
              <span>Tất cả</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAccountFilter('wallet')}
            className={`relative py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              accountFilter === 'wallet'
                ? 'text-amber-300 font-extrabold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {accountFilter === 'wallet' && (
              <motion.div
                layoutId="stats_account_filter_tab"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 bg-amber-500/25 border border-amber-500/40 rounded-lg shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Wallet size={16} className="text-amber-400" />
              <span>Ví</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAccountFilter('bank')}
            className={`relative py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              accountFilter === 'bank'
                ? 'text-blue-300 font-extrabold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {accountFilter === 'bank' && (
              <motion.div
                layoutId="stats_account_filter_tab"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 bg-blue-500/25 border border-blue-500/40 rounded-lg shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Building2 size={16} className="text-blue-400" />
              <span>Bank</span>
            </span>
          </button>
        </div>

        {/* Time Filter */}
        <div
          ref={timeControlRef}
          onPointerDown={handleTimePointerDown}
          onPointerMove={handleTimePointerMove}
          onPointerUp={handleTimePointerUp}
          onPointerCancel={handleTimePointerUp}
          className="flex items-center justify-between gap-1.5 bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800 relative touch-none select-none"
        >
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
              type="button"
              onClick={() => setTimeFilter(tab.id)}
              className={`relative flex-1 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                timeFilter === tab.id
                  ? 'text-black font-extrabold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              {timeFilter === tab.id && (
                <motion.div
                  layoutId="stats_time_filter_tab"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  className="absolute inset-0 bg-white rounded-lg shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center justify-center">{tab.label}</span>
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

      {/* 4. CARDS & CHARTS */}
      <div className="space-y-2.5 mt-2.5">
        {DEFAULT_CARD_ORDER.map((cardId) => {
          if (!shouldRenderCard(cardId)) return null;

          switch (cardId) {
            case 'kpis':
              return (
                <div key={cardId} className="bg-[#121212] rounded-2xl p-3.5 sm:p-4 border border-neutral-800 shadow-sm space-y-2.5">
                  <div className="border-b border-neutral-800/80 pb-2">
                    <span className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 size={15} className="text-white" /> KPIs Tổng quan
                    </span>
                  </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800 shadow-xs">
                            <div className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <TrendingUp size={14} className="text-emerald-400" /> Thu nhập
                            </div>
                            <div className="text-sm sm:text-base font-black text-emerald-400 mt-1 truncate font-mono">
                              +{formatVND(currentKPI.income)}
                            </div>
                          </div>

                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800 shadow-xs">
                            <div className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <TrendingDown size={14} className="text-rose-400" /> Chi tiêu
                            </div>
                            <div className="text-sm sm:text-base font-black text-rose-400 mt-1 truncate font-mono">
                              −{formatVND(currentKPI.expense)}
                            </div>
                          </div>

                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800 shadow-xs">
                            <div className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <Scale size={14} className="text-neutral-400" /> Chênh lệch
                            </div>
                            <div
                              className={`text-sm sm:text-base font-black mt-1 truncate font-mono ${
                                currentKPI.net !== 0
                                  ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400'
                                  : 'text-neutral-200'
                              }`}
                            >
                              {formatSignedVND(currentKPI.net, 'net')}
                            </div>
                          </div>

                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800 shadow-xs">
                            <div className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <Wallet size={14} className="text-amber-400" /> Tiền hiện có
                            </div>
                            <div className="text-sm sm:text-base font-black text-white mt-1 truncate font-mono">
                              {formatVND(availableBalance)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                  case 'tx_list':
                    return (
                      <div className="bg-[#121212] rounded-2xl border border-neutral-800 shadow-sm overflow-hidden">
                        <div className="w-full flex items-center justify-between p-4 sm:p-5">
                          <button
                            type="button"
                            onClick={() => setIsTxListOpen(!isTxListOpen)}
                            className="flex items-center gap-3 text-white text-left flex-1 cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-xl bg-neutral-800/50 flex items-center justify-center border border-neutral-700/50 text-neutral-300">
                              <List size={18} />
                            </div>
                            <div>
                              <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-2">
                                Danh sách giao dịch
                              </h3>
                              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 mt-0.5">
                                {filteredTransactions.length} giao dịch trong kỳ
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsTxListOpen(!isTxListOpen)}
                              className="text-neutral-400 bg-[#1a1a1a] hover:bg-[#262626] w-8 h-8 flex items-center justify-center rounded-full border border-neutral-800 cursor-pointer"
                            >
                              {isTxListOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {isTxListOpen && (
                          <div className="border-t border-neutral-800 p-4 sm:p-5 pt-3 space-y-4">
                            <div className="flex p-1 bg-[#1a1a1a] rounded-xl border border-neutral-800">
                              {(['all', 'expense', 'income'] as const).map((filter) => (
                                <button
                                  key={filter}
                                  type="button"
                                  onClick={() => setTxListFilter(filter)}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    txListFilter === filter
                                      ? filter === 'expense'
                                        ? 'bg-rose-500/20 text-rose-300 shadow-xs'
                                        : filter === 'income'
                                        ? 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                                        : 'bg-white text-black shadow-xs'
                                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                  }`}
                                >
                                  {filter === 'all' && 'Tất cả'}
                                  {filter === 'expense' && 'Chi'}
                                  {filter === 'income' && 'Thu'}
                                </button>
                              ))}
                            </div>

                            <div className="space-y-2">
                              {visibleTransactions.length === 0 ? (
                                <div className="py-8 text-center text-neutral-500 text-xs font-bold">
                                  Không có giao dịch nào
                                </div>
                              ) : (
                                visibleTransactions.map((tx) => (
                                  <div
                                    key={tx.id}
                                    onClick={() => onSelectTransaction?.(tx)}
                                    className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-neutral-800/60 cursor-pointer active:scale-98 transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <CategoryIcon category={tx.category} type={tx.type} size={18} />
                                      <div>
                                        <div className="text-xs sm:text-sm font-bold text-neutral-200">
                                          {tx.category}
                                        </div>
                                        <div className="text-[10px] text-neutral-400 font-medium mt-0.5 flex items-center gap-1.5">
                                          <span>{formatDateVN(tx.date)}</span>
                                          {tx.note && (
                                            <>
                                              <span className="w-1 h-1 rounded-full bg-neutral-600" />
                                              <span className="truncate max-w-[120px]">{tx.note}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div
                                      className={`text-sm font-black font-mono ${
                                        tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                                      }`}
                                    >
                                      {formatSignedVND(tx.amount, tx.type)}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );

                  case 'insights':
                    return (
                      <div className="bg-[#121212] rounded-2xl border border-neutral-800 shadow-sm overflow-hidden">
                        <div className="w-full flex items-center justify-between p-4 sm:p-5">
                          <button
                            type="button"
                            onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                            className="flex items-center gap-3 text-white text-left flex-1 cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-xl bg-neutral-800/50 flex items-center justify-center border border-neutral-700/50 text-neutral-300">
                              <Sparkles size={18} className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-2">
                                Gợi ý & Thông tin nhanh
                              </h3>
                              <p className="text-[10px] sm:text-xs font-bold text-neutral-400 mt-0.5">
                                {quickInsights.length} điểm nổi bật
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                              className="text-neutral-400 bg-[#1a1a1a] hover:bg-[#262626] w-8 h-8 flex items-center justify-center rounded-full border border-neutral-800 cursor-pointer"
                            >
                              {isInsightsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {isInsightsOpen && (
                          <div className="border-t border-neutral-800 p-4 sm:p-5 pt-3 space-y-2">
                            {quickInsights.length === 0 ? (
                              <div className="py-6 text-center text-xs font-bold text-neutral-500">
                                Không đủ dữ liệu để tạo gợi ý
                              </div>
                            ) : (
                              quickInsights.map((insight) => (
                                <div
                                  key={insight.id}
                                  onClick={insight.onClick}
                                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                                    insight.onClick
                                      ? 'bg-[#1a1a1a] hover:bg-[#222] border border-neutral-800/60 cursor-pointer active:scale-98'
                                      : 'bg-[#1a1a1a] border border-neutral-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <div className="text-xs sm:text-sm font-bold text-neutral-200">
                                        {insight.title}
                                      </div>
                                      {insight.subText && (
                                        <div className="text-[10px] text-neutral-400 font-medium mt-0.5 max-w-[150px] sm:max-w-[200px] truncate">
                                          {insight.subText}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right flex flex-col justify-center items-end">
                                    <div className="text-sm font-black text-white font-mono">
                                      {insight.valueText}
                                    </div>
                                    {insight.hasArrow && insight.onClick && (
                                      <span className="text-[10px] text-white font-bold flex items-center gap-0.5 justify-end mt-0.5">
                                        Chi tiết <ArrowRight size={10} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );

                  case 'empty_state':
                    return (
                      <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-6 sm:p-8 text-center space-y-3 relative">
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
                    );

                  case 'chart_income_vs_expense':
                    return (
                      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                            <LineChartIcon size={18} className="text-white" />
                            Thu nhập vs Chi tiêu
                          </h3>
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-3 text-xs font-bold">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Thu
                              </span>
                              <span className="flex items-center gap-1 text-rose-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Chi
                              </span>
                            </div>
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
                                tickFormatter={(val) =>
                                  val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                                }
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
                    );

                  case 'chart_net_cashflow':
                    return (
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
                              <defs>
                                <linearGradient id="netGradient" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#c084fc" />
                                  <stop offset="100%" stopColor="#f472b6" />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                tickFormatter={(val) =>
                                  Math.abs(val) >= 1000000
                                    ? `${(val / 1000000).toFixed(1)}M`
                                    : Math.abs(val) >= 1000
                                    ? `${(val / 1000).toFixed(0)}k`
                                    : val
                                }
                              />
                              <Tooltip content={<CustomChartTooltip />} />
                              <Bar dataKey="net" name="Dòng tiền ròng" radius={[4, 4, 0, 0]}>
                                {timeBucketsData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.net !== 0 ? 'url(#netGradient)' : '#64748b'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );

                  case 'chart_category_expense':
                    return (
                      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                            <PieChartIcon size={18} className="text-purple-400" />
                            Chi tiêu theo hạng mục
                          </h3>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-neutral-300 font-mono">
                              {formatVND(categoryBreakdown.totalExpenseInFilter)}
                            </span>
                          </div>
                        </div>

                        {categoryBreakdown.list.length === 0 ? (
                          <div className="py-6 text-center text-neutral-400 text-xs">
                            Không có khoản chi tiêu nào trong kỳ này.
                          </div>
                        ) : (
                          <>
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

                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                    Tổng chi
                                  </span>
                                  <span className="text-xs sm:text-sm font-black text-rose-400 font-mono">
                                    {formatVND(categoryBreakdown.totalExpenseInFilter)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 pt-1 border-t border-neutral-800">
                              {categoryBreakdown.list.map((cat) => (
                                <div key={cat.name} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs sm:text-sm">
                                    <div className="flex items-center gap-2">
                                      <CategoryIcon category={cat.name} type="expense" size={16} />
                                      <span className="font-bold text-neutral-100 text-xs sm:text-sm">
                                        {cat.name}
                                      </span>
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
                    );

                  case 'chart_balance_over_time':
                    return (
                      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                            <LineChartIcon size={18} className="text-amber-400" />
                            Số dư Ví & Bank theo thời gian
                          </h3>
                          <div className="flex items-center gap-2.5">
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
                        </div>

                        <div className="h-52 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={balanceOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                              <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                tickFormatter={(val) =>
                                  val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
                                }
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
                    );

                  case 'chart_wallet_vs_bank':
                    return (
                      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-400" />
                            So sánh Ví vs Bank
                          </h3>
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-2.5 text-xs font-bold">
                              <span className="flex items-center gap-1 text-amber-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Ví
                              </span>
                              <span className="flex items-center gap-1 text-blue-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Bank
                              </span>
                            </div>
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
                                tickFormatter={(val) =>
                                  Math.abs(val) >= 1000000
                                    ? `${(val / 1000000).toFixed(1)}M`
                                    : Math.abs(val) >= 1000
                                    ? `${(val / 1000).toFixed(0)}k`
                                    : val
                                }
                              />
                              <Tooltip content={<CustomChartTooltip />} />
                              <Bar dataKey="Ví" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Bank" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );

                  case 'compare_prev_period':
                    return (
                      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                            <Scale size={18} className="text-white" />
                            So sánh với kỳ trước
                          </h3>
                        </div>

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
                                  <div
                                    className={`text-sm font-black font-mono mt-0.5 ${
                                      currentKPI.net !== 0
                                        ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400'
                                        : 'text-white'
                                    }`}
                                  >
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
                    );

                  case 'debt_summary':
                    if (!debtStats) return null;
                    return (
                      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-sm space-y-3.5">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                            <Users size={18} className="text-[#94a3b8]" />
                            Thống kê Công nợ & Vay mượn (Độc lập)
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Người khác nợ bạn
                            </div>
                            <div className="text-sm font-black text-[#38bdf8] font-mono mt-1">
                              {formatVND(debtStats.totalLendRemaining)}
                            </div>
                            <div className="text-[9px] text-neutral-400 font-bold mt-0.5">
                              {debtStats.activeLendCount} khoản chưa thu hồi
                            </div>
                          </div>

                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Bạn nợ người khác
                            </div>
                            <div className="text-sm font-black text-[#f43f5e] font-mono mt-1">
                              {formatVND(debtStats.totalBorrowRemaining)}
                            </div>
                            <div className="text-[9px] text-neutral-400 font-bold mt-0.5">
                              {debtStats.activeBorrowCount} khoản chưa hoàn trả
                            </div>
                          </div>
                        </div>

                        {debtStats.grandTotalDebtRemaining > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                              <span>Tỷ lệ nợ ròng</span>
                              <span className="font-mono text-[10px]">
                                {debtStats.lendRatio.toFixed(0)}% Cho vay | {debtStats.borrowRatio.toFixed(0)}% Đi vay
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-[#262626] rounded-full overflow-hidden flex border border-neutral-800">
                              <div
                                className="h-full bg-[#38bdf8]"
                                style={{ width: `${debtStats.lendRatio}%` }}
                                title="Cho vay"
                              />
                              <div
                                className="h-full bg-[#f43f5e]"
                                style={{ width: `${debtStats.borrowRatio}%` }}
                                title="Đi vay"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );

                  default:
                    return null;
                }
        })}
      </div>
    </div>
  );
};
