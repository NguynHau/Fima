import React, { useState, useEffect, useMemo } from 'react';
import { Settings, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { type Transaction, type Budget, type SavingsGoal } from '../types';
import { getBudgets, getSavings, subscribeBudgets, subscribeSavings } from '../db/database';
import { CategoryIcon, getCategoryInfo } from './CategoryIcon';
import { formatVND } from '../utils/formatters';
import { t, tCategory } from '../utils/translations';
import { BudgetSettingsModal } from './BudgetSettingsModal';

interface BudgetSavingsCardProps {
  transactions: Transaction[];
  currentYear: number;
  currentMonth: number;
  compact?: boolean;
  showCardHeader?: boolean;
  onDataChanged?: () => void;
}

export const BudgetSavingsCard: React.FC<BudgetSavingsCardProps> = ({
  transactions,
  currentYear,
  currentMonth,
  compact = false,
  showCardHeader = true,
  onDataChanged,
}) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchBudgetsAndSavings = async () => {
    try {
      const [bList, sList] = await Promise.all([getBudgets(), getSavings()]);
      setBudgets(bList);
      setSavings(sList);
    } catch (err) {
      console.error('Error fetching budgets & savings:', err);
    }
  };

  useEffect(() => {
    fetchBudgetsAndSavings();

    const unsubB = subscribeBudgets(() => {
      fetchBudgetsAndSavings();
      if (onDataChanged) onDataChanged();
    });
    const unsubS = subscribeSavings(() => {
      fetchBudgetsAndSavings();
      if (onDataChanged) onDataChanged();
    });

    return () => {
      unsubB();
      unsubS();
    };
  }, []);

  // Compute spent for each budget in current viewing month
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const budgetProgressList = useMemo(() => {
    // Filter transactions for current month
    const monthTx = transactions.filter(
      (tx) => tx.date.startsWith(monthPrefix) && tx.type === 'expense'
    );

    return budgets.map((b) => {
      const spent = monthTx.reduce((sum, tx) => {
        const matchesId = tx.categoryId && tx.categoryId === b.categoryId;
        const matchesName =
          tx.category &&
          tx.category.trim().toLowerCase() === b.categoryName.trim().toLowerCase();
        if (matchesId || matchesName) {
          return sum + tx.amount;
        }
        return sum;
      }, 0);

      const percent = b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0;
      const catInfo = getCategoryInfo(b.categoryId || b.categoryName, 'expense');

      return {
        id: b.id,
        name: b.categoryName,
        categoryId: b.categoryId,
        spent,
        limit: b.limitAmount,
        percent,
        color: catInfo.color || '#ff7849',
        type: 'budget' as const,
      };
    });
  }, [budgets, transactions, monthPrefix]);

  const savingsProgressList = useMemo(() => {
    return savings.map((s) => {
      const percent = s.targetAmount > 0 ? Math.round((s.currentAmount / s.targetAmount) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        current: s.currentAmount,
        target: s.targetAmount,
        percent,
        color: '#f59e0b', // Amber / Gold for savings
        type: 'savings' as const,
      };
    });
  }, [savings]);

  // Combined items
  const allItems = [...budgetProgressList, ...savingsProgressList];

  // If compact mode, show up to 3 items unless expanded
  const displayItems =
    compact && !isExpanded && allItems.length > 3 ? allItems.slice(0, 3) : allItems;

  return (
    <div className="bg-[#121212] border border-neutral-800/90 rounded-2xl p-3.5 shadow-md space-y-3">
      {/* Header with Title & Settings Button (Rendered only when showCardHeader is true) */}
      {showCardHeader && (
        <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2.5">
          <div className="flex items-center gap-2">
            <PiggyBank size={18} className="text-amber-400 shrink-0" strokeWidth={2.3} />
            <span className="text-xs font-black text-white tracking-tight uppercase">
              {t('budget.title')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Settings size={13} className="text-neutral-400" />
            <span>{t('budget.settings')}</span>
          </button>
        </div>
      )}

      {/* Progress Bars List */}
      {allItems.length === 0 ? (
        <div className="text-center py-3 text-xs font-semibold text-neutral-500">
          {t('budget.empty_card')}
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            if (item.type === 'budget') {
              const isOver = item.spent > item.limit;
              const barWidthPercent = Math.min(item.percent, 100);

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    {/* Icon (frameless) + Category Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon
                        category={item.categoryId || item.name}
                        size={15}
                        showBackground={false}
                      />
                      <span className="font-extrabold text-white truncate text-xs">{tCategory(item.name)}</span>
                    </div>

                    {/* Spent / Limit + Percentage */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-neutral-300 font-mono">
                        {formatVND(item.spent)} /{' '}
                        <span className="text-neutral-400">{formatVND(item.limit)}</span>
                      </span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-md font-mono ${
                          isOver
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {item.percent}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden p-0.5 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-red-500' : ''
                      }`}
                      style={{
                        width: `${barWidthPercent}%`,
                        backgroundColor: isOver ? '#ef4444' : item.color,
                      }}
                    />
                  </div>
                </div>
              );
            } else {
              // Savings Goal Item
              const barWidthPercent = Math.min(item.percent, 100);

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    {/* Piggy Icon (frameless) + Savings Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <PiggyBank
                        size={15}
                        className="text-amber-400 shrink-0"
                        strokeWidth={2.2}
                      />
                      <span className="font-extrabold text-white truncate text-xs">{item.name}</span>
                    </div>

                    {/* Saved / Target + Percentage */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-neutral-300 font-mono">
                        <span className="text-amber-400">{formatVND(item.current)}</span> /{' '}
                        <span className="text-neutral-400">{formatVND(item.target)}</span>
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                        {item.percent}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar for Savings */}
                  <div className="w-full h-2.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden p-0.5 relative">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-emerald-400"
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Show Expand / Collapse if more than 3 items in compact mode */}
      {compact && allItems.length > 3 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full pt-1 text-[11px] font-extrabold text-neutral-400 hover:text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <span>
            {isExpanded
              ? t('budget.collapse')
              : t('budget.expand_more').replace('{count}', String(allItems.length - 3))}
          </span>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}

      {/* Settings Modal (Half Sheet Bottom Sheet) */}
      <BudgetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChanged={fetchBudgetsAndSavings}
      />
    </div>
  );
};
