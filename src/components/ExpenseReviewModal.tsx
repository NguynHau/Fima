import React, { useState, useEffect } from 'react';
import { X, Calendar, ReceiptText, Trash2, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { type BudgetHistoryRecord } from '../types';
import { getBudgetHistory, deleteBudgetHistoryRecord, syncExpiredBudgetsToHistory } from '../db/database';
import { CategoryIcon } from './CategoryIcon';
import { formatVND } from '../utils/formatters';
import { t, tCategory } from '../utils/translations';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';

interface ExpenseReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseReviewModal: React.FC<ExpenseReviewModalProps> = ({ isOpen, onClose }) => {
  const [historyRecords, setHistoryRecords] = useState<BudgetHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const sheetDrag = useBottomSheetDrag({
    onClose,
    threshold: 65,
  });

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      await syncExpiredBudgetsToHistory();
      const records = await getBudgetHistory();
      setHistoryRecords(records);
    } catch (err) {
      console.error('Error loading budget history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa bản ghi kỳ này?')) {
      try {
        await deleteBudgetHistoryRecord(id);
        setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        console.error('Error deleting budget history record:', err);
      }
    }
  };

  if (!isOpen) return null;

  // Filter options
  const periods = Array.from(new Set(historyRecords.map((r) => r.periodLabel)));

  const filteredRecords = selectedFilter === 'all'
    ? historyRecords
    : historyRecords.filter((r) => r.periodLabel === selectedFilter);

  // Overall totals across filtered
  const totalBudgeted = filteredRecords.reduce((sum, r) => sum + r.limitAmount, 0);
  const totalSpent = filteredRecords.reduce((sum, r) => sum + r.spentAmount, 0);
  const totalSaved = totalBudgeted - totalSpent;

  return (
    <div
      id="expense-review-modal"
      style={sheetDrag.backdropStyle}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 pt-[max(env(safe-area-inset-top,0px),16px)] text-neutral-100"
      onClick={sheetDrag.closeWithAnimation}
    >
      <div
        style={sheetDrag.sheetStyle}
        className="w-full max-w-lg bg-[#121212] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drag Handle & Header */}
        <div className="shrink-0 bg-[#121212] border-b border-neutral-800/80 px-4 pt-1.5 pb-3 space-y-2 z-20">
          <BottomSheetDragHandle
            isHandleActive={sheetDrag.isHandleActive}
            onPointerDown={sheetDrag.handlePointerDown}
            onPointerMove={sheetDrag.handlePointerMove}
            onPointerUp={sheetDrag.handlePointerUp}
            onPointerCancel={sheetDrag.handlePointerUp}
            onTouchStart={sheetDrag.handleTouchStart}
            onTouchMove={sheetDrag.handleTouchMove}
            onTouchEnd={sheetDrag.handleTouchEnd}
            onTouchCancel={sheetDrag.handleTouchCancel}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-fuchsia-400">
                <ReceiptText size={18} strokeWidth={2.3} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {t('budget.review_title')}
                </h2>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-bold mt-0.5">
                  {t('budget.review_subtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={sheetDrag.closeWithAnimation}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills if multiple periods exist */}
        {periods.length > 1 && (
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-neutral-800/80 shrink-0 bg-[#141414]">
            <span className="text-[10px] uppercase font-bold text-neutral-500 shrink-0 flex items-center gap-1">
              <Filter size={11} />
              Lọc:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              Tất cả ({historyRecords.length})
            </button>
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedFilter(p)}
                className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedFilter === p
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Overview Stat Banner */}
        {filteredRecords.length > 0 && (
          <div className="mx-4 my-3 p-3 bg-[#181818] rounded-2xl border border-neutral-800 grid grid-cols-3 gap-2 text-center shrink-0">
            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Hạn mức</div>
              <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5 truncate">
                {formatVND(totalBudgeted)}
              </div>
            </div>
            <div className="border-x border-neutral-800 px-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Đã chi</div>
              <div className="text-xs sm:text-sm font-black text-rose-400 font-mono mt-0.5 truncate">
                {formatVND(totalSpent)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-neutral-400 uppercase">
                {totalSaved >= 0 ? 'Tiết kiệm' : 'Vượt hạn mức'}
              </div>
              <div
                className={`text-xs sm:text-sm font-black font-mono mt-0.5 truncate ${
                  totalSaved >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatVND(Math.abs(totalSaved))}
              </div>
            </div>
          </div>
        )}

        {/* Records List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 custom-scrollbar">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-neutral-500">
              Đang tải dữ liệu lịch sử...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center mx-auto text-neutral-500">
                <ReceiptText size={22} />
              </div>
              <div className="text-xs font-bold text-neutral-300">
                {t('budget.history_empty')}
              </div>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                Khi kỳ hạn của một hạn mức kết thúc (hết tháng hoặc hết chu kỳ), số tiền chi tiêu thực tế sẽ tự động được lưu lại tại đây.
              </p>
            </div>
          ) : (
            filteredRecords.map((r) => {
              const diff = r.limitAmount - r.spentAmount;
              const isUnder = diff >= 0;
              const percent = Math.min(Math.round((r.spentAmount / (r.limitAmount || 1)) * 100), 100);

              return (
                <div
                  key={r.id}
                  className="p-3 bg-[#181818] border border-neutral-800/80 rounded-2xl space-y-2 hover:border-neutral-700 transition-colors"
                >
                  {/* Top Row: Category + Period Label + Delete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon
                        category={r.categoryId || r.categoryName}
                        size={18}
                        showBackground={false}
                      />
                      <div>
                        <div className="text-xs font-black text-white">
                          {tCategory(r.categoryName)}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} className="text-neutral-500" />
                          <span>{r.periodLabel}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                      title="Xóa bản ghi này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isUnder ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-neutral-400">
                        Đã chi: <strong className="text-white font-bold">{formatVND(r.spentAmount)}</strong>
                      </span>
                      <span className="text-neutral-400">
                        Hạn mức: <strong className="text-neutral-200">{formatVND(r.limitAmount)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Result Pill */}
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-[10px] font-bold text-neutral-400">Kết quả kỳ:</span>
                    {isUnder ? (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-black">
                        <CheckCircle2 size={13} />
                        <span>Dư +{formatVND(diff)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-rose-400 text-xs font-black">
                        <AlertTriangle size={13} />
                        <span>Vượt -{formatVND(Math.abs(diff))}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
