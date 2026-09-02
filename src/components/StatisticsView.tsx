import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Wallet,
  Building2,
  Layers,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { type Transaction, type AccountType } from '../types';
import { formatSignedVND, formatVND } from '../utils/formatters';
import { CategoryIcon, getCategoryInfo } from './CategoryIcon';

interface StatisticsViewProps {
  transactions: Transaction[];
}

type TimeRange = 'week' | 'month' | 'year' | 'all';
type AccountFilter = 'all' | 'wallet' | 'bank';

export const StatisticsView: React.FC<StatisticsViewProps> = ({ transactions }) => {
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Filter transactions by account & time
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Get current week start (Monday)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    return transactions.filter((t) => {
      // 1. Account Filter
      if (accountFilter !== 'all' && t.account !== accountFilter) {
        return false;
      }

      // 2. Time Filter
      const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
      const txDate = new Date(tYear, tMonth - 1, tDay);

      if (timeRange === 'week') {
        return txDate >= monday;
      } else if (timeRange === 'month') {
        return tYear === currentYear && tMonth === currentMonth;
      } else if (timeRange === 'year') {
        return tYear === currentYear;
      }
      return true; // 'all'
    });
  }, [transactions, accountFilter, timeRange]);

  // Aggregate totals
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return {
      income,
      expense,
      net: income - expense,
    };
  }, [filteredTransactions]);

  // Group by category for expense & income
  const categoryBreakdown = useMemo(() => {
    const targetType = activeTab;
    const relevant = filteredTransactions.filter((t) => t.type === targetType);
    const total = targetType === 'expense' ? totals.expense : totals.income;

    const map = new Map<string, { amount: number; count: number }>();
    for (const t of relevant) {
      const cur = map.get(t.category) || { amount: 0, count: 0 };
      cur.amount += t.amount;
      cur.count += 1;
      map.set(t.category, cur);
    }

    const items = Array.from(map.entries())
      .map(([name, data]) => {
        const percentage = total > 0 ? (data.amount / total) * 100 : 0;
        const info = getCategoryInfo(name, targetType);
        return {
          name,
          amount: data.amount,
          count: data.count,
          percentage,
          color: info.color,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return items;
  }, [filteredTransactions, activeTab, totals]);

  // Generate SVG Donut slices
  const donutSlices = useMemo(() => {
    const total = activeTab === 'expense' ? totals.expense : totals.income;
    if (total <= 0 || categoryBreakdown.length === 0) return [];

    let currentAngle = 0;
    return categoryBreakdown.map((cat) => {
      const angle = (cat.amount / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      // SVG Donut Path calculations
      const radius = 64;
      const innerRadius = 44;
      const center = 80;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const x3 = center + innerRadius * Math.cos(endRad);
      const y3 = center + innerRadius * Math.sin(endRad);
      const x4 = center + innerRadius * Math.cos(startRad);
      const y4 = center + innerRadius * Math.sin(startRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
        'Z',
      ].join(' ');

      return {
        ...cat,
        pathData,
      };
    });
  }, [categoryBreakdown, activeTab, totals]);

  return (
    <div className="space-y-2.5 pb-16">
      {/* 1. Account Filter Segment */}
      <div className="bg-[#121212] border border-[#262626] p-1 rounded-xl grid grid-cols-3 gap-1">
        <button
          onClick={() => setAccountFilter('all')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            accountFilter === 'all'
              ? 'bg-[#1f1f1f] text-white border border-[#333333] shadow-xs'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Layers size={13} />
          Tổng
        </button>
        <button
          onClick={() => setAccountFilter('wallet')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            accountFilter === 'wallet'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Wallet size={13} className="text-amber-400" />
          Ví
        </button>
        <button
          onClick={() => setAccountFilter('bank')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            accountFilter === 'bank'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Building2 size={13} className="text-blue-400" />
          Bank
        </button>
      </div>

      {/* 2. Time Range Selector */}
      <div className="flex items-center justify-between bg-[#121212] rounded-xl p-1 border border-[#262626] shadow-sm">
        {(
          [
            { id: 'week', label: 'Tuần' },
            { id: 'month', label: 'Tháng' },
            { id: 'year', label: 'Năm' },
            { id: 'all', label: 'Tất cả' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTimeRange(tab.id)}
            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              timeRange === tab.id
                ? 'bg-neutral-200 text-black shadow-xs font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Income Card */}
        <div className="bg-[#121212] rounded-xl p-2 border border-[#262626] shadow-sm">
          <div className="text-[9px] font-medium text-neutral-400 flex items-center gap-0.5 uppercase tracking-wider">
            <TrendingUp size={10} className="text-emerald-400" /> Thu
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-emerald-400 mt-0.5 truncate font-mono">
            +{formatVND(totals.income)}
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-[#121212] rounded-xl p-2 border border-[#262626] shadow-sm">
          <div className="text-[9px] font-medium text-neutral-400 flex items-center gap-0.5 uppercase tracking-wider">
            <TrendingDown size={10} className="text-rose-400" /> Chi
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-rose-400 mt-0.5 truncate font-mono">
            −{formatVND(totals.expense)}
          </div>
        </div>

        {/* Net Card */}
        <div className="bg-[#121212] rounded-xl p-2 border border-[#262626] shadow-sm">
          <div className="text-[9px] font-medium text-neutral-400 flex items-center gap-0.5 uppercase tracking-wider">
            <Scale size={10} className="text-neutral-400" /> Lệch
          </div>
          <div
            className={`text-[11px] sm:text-xs font-bold mt-0.5 truncate font-mono ${
              totals.net > 0
                ? 'text-emerald-400'
                : totals.net < 0
                  ? 'text-rose-400'
                  : 'text-neutral-300'
            }`}
          >
            {totals.net !== 0 ? formatSignedVND(Math.abs(totals.net), totals.net > 0 ? 'income' : 'expense') : '0 ₫'}
          </div>
        </div>
      </div>

      {/* 4. Tab switcher: Expense vs Income breakdown */}
      <div className="bg-[#121212] rounded-2xl p-3 border border-[#262626] shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#262626] pb-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <PieChartIcon size={14} className="text-neutral-300" />
            Cơ cấu {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}
          </h3>

          <div className="flex items-center gap-1 bg-[#171717] border border-[#262626] p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Chi tiêu
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'income'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Thu nhập
            </button>
          </div>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            <div className="w-10 h-10 rounded-xl bg-[#171717] border border-[#262626] flex items-center justify-center mx-auto mb-2 text-neutral-500">
              <PieChartIcon size={20} />
            </div>
            <p className="text-xs font-medium">Chưa có dữ liệu thống kê.</p>
          </div>
        ) : (
          <>
            {/* Donut Chart Visual */}
            <div className="flex items-center justify-center py-1">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                  {donutSlices.map((slice, i) => (
                    <path
                      key={i}
                      d={slice.pathData}
                      fill={slice.color}
                      className="transition-all hover:opacity-80"
                    />
                  ))}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[9px] font-medium text-neutral-500 uppercase tracking-wider">Tổng cộng</span>
                  <span className="text-[11px] font-bold text-white px-1 font-mono">
                    {formatVND(activeTab === 'expense' ? totals.expense : totals.income)}
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2 pt-1">
              {categoryBreakdown.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon category={cat.name} type={activeTab} size={14} />
                      <span className="font-semibold text-neutral-200 text-xs">{cat.name}</span>
                      <span className="text-[10px] text-neutral-500">({cat.count})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white text-xs font-mono">
                        {formatVND(cat.amount)}
                      </span>
                      <span className="text-[10px] font-medium text-neutral-400 ml-1 font-mono">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-[#1c1c1c] rounded-full overflow-hidden border border-[#262626]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${cat.percentage}%`,
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
    </div>
  );
};
