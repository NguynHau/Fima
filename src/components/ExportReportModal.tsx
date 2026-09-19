import React, { useState, useMemo, useRef } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Wallet,
  Building2,
  Check,
  Eye,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  type Transaction,
  type UserSettings,
  type BalancesSummary,
} from '../types';
import {
  formatVND,
  formatDateVN,
  getTodayString,
} from '../utils/formatters';
import {
  exportToExcel,
  printReportPdf,
  calculateReportSummary,
  generateReportHtml,
  type ReportFilterOptions,
} from '../utils/reportExporter';
import { tCategory } from '../utils/translations';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  userSettings?: UserSettings | null;
  balances?: BalancesSummary;
}

type DatePreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  userSettings,
  balances,
}) => {
  const sheetDrag = useBottomSheetDrag({ onClose });

  const today = getTodayString();
  const [currentYear, currentMonth] = today.split('-').map(Number);

  // Default to this month
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [accountFilter, setAccountFilter] = useState<'all' | 'wallet' | 'bank'>('all');

  const accountTabs: ('all' | 'wallet' | 'bank')[] = ['all', 'wallet', 'bank'];
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

  // Custom date ranges
  const [customStartDate, setCustomStartDate] = useState(() => {
    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    return firstDay;
  });
  const [customEndDate, setCustomEndDate] = useState(today);

  // Export states
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Compute active start & end dates based on preset
  const { startDate, endDate } = useMemo(() => {
    if (datePreset === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    if (datePreset === 'this_month') {
      const start = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const end = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'last_month') {
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      const end = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'last_3_months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 2);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const end = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { startDate: start, endDate: end };
    }

    if (datePreset === 'this_year') {
      const start = `${currentYear}-01-01`;
      const end = `${currentYear}-12-31`;
      return { startDate: start, endDate: end };
    }

    // 'all'
    if (transactions.length > 0) {
      let min = transactions[0].date;
      let max = transactions[0].date;
      for (const t of transactions) {
        if (t.date < min) min = t.date;
        if (t.date > max) max = t.date;
      }
      return { startDate: min, endDate: max };
    }

    return { startDate: `${currentYear}-01-01`, endDate: today };
  }, [datePreset, currentYear, currentMonth, customStartDate, customEndDate, today, transactions]);

  // Current filter options
  const filterOptions: ReportFilterOptions = useMemo(() => ({
    startDate,
    endDate,
    accountFilter,
  }), [startDate, endDate, accountFilter]);

  // Aggregated summary
  const summary = useMemo(() => {
    return calculateReportSummary(transactions, filterOptions);
  }, [transactions, filterOptions]);

  // Preview HTML
  const reportHtml = useMemo(() => {
    return generateReportHtml(transactions, filterOptions, userSettings, balances);
  }, [transactions, filterOptions, userSettings, balances]);

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportToExcel(transactions, filterOptions, userSettings, balances);
      setExcelSuccess(true);
      setTimeout(() => setExcelSuccess(false), 2500);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrintPdf = () => {
    printReportPdf(transactions, filterOptions, userSettings, balances);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={sheetDrag.backdropStyle}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 pt-[max(env(safe-area-inset-top,0px),16px)] text-neutral-100 select-none"
        onClick={sheetDrag.closeWithAnimation}
      >
        <div
          style={sheetDrag.sheetStyle}
          className="w-full max-w-lg bg-[#0e1013] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Header & Drag handle */}
          <div className="flex flex-col border-b border-neutral-800/80 bg-[#121418]/95 backdrop-blur-md shrink-0 px-4 pt-1.5 pb-3 z-20 space-y-2">
            <BottomSheetDragHandle
              isHandleActive={sheetDrag.isHandleActive}
              onPointerDown={sheetDrag.handlePointerDown}
              onPointerMove={sheetDrag.handlePointerMove}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Xuất Báo Cáo Tài Chính
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Xuất file Excel (.xlsx) & Báo cáo PDF chuyên nghiệp
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={sheetDrag.closeWithAnimation}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 2. Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Section A: Khoảng thời gian (Date Presets) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-400" />
                <span>Kỳ Thống Kê Báo Cáo</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'this_month', label: 'Tháng này' },
                  { key: 'last_month', label: 'Tháng trước' },
                  { key: 'last_3_months', label: '3 tháng qua' },
                  { key: 'this_year', label: `Năm ${currentYear}` },
                  { key: 'all', label: 'Tất cả' },
                  { key: 'custom', label: 'Tùy chọn' },
                ].map((p) => {
                  const isSelected = datePreset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setDatePreset(p.key as DatePreset)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-xs'
                          : 'bg-[#16181d] border-neutral-800/80 text-neutral-300 hover:bg-[#1f2229]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Inputs if 'custom' selected */}
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-[#16181d] border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 font-medium block mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-[#16181d] border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-neutral-400 px-1">
                Kỳ áp dụng: <strong className="text-neutral-200">{formatDateVN(startDate)}</strong> đến <strong className="text-neutral-200">{formatDateVN(endDate)}</strong>
              </div>
            </div>

            {/* Section B: Nguồn tiền (Account Filter) - UI & ANIMATION GIỐNG TAB DÒNG TIỀN */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-blue-400" />
                <span>Nguồn Tiền Báo Cáo</span>
              </label>

              <div className="bg-[#121212] rounded-2xl p-1.5 border border-neutral-800 shadow-sm">
                <LayoutGroup id="export_report_modal_account">
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
                      className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        accountFilter === 'all'
                          ? 'text-black font-extrabold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {accountFilter === 'all' && (
                        <motion.div
                          layoutId="export_report_modal_account_tab"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          className="absolute inset-0 bg-white rounded-lg shadow-sm"
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <Layers
                          size={15}
                          className={accountFilter === 'all' ? 'text-black' : 'text-neutral-400'}
                        />
                        <span>Tất cả</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountFilter('wallet')}
                      className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        accountFilter === 'wallet'
                          ? 'text-amber-300 font-extrabold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {accountFilter === 'wallet' && (
                        <motion.div
                          layoutId="export_report_modal_account_tab"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          className="absolute inset-0 bg-amber-500/25 rounded-lg shadow-xs border border-amber-500/40"
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <Wallet
                          size={15}
                          className={accountFilter === 'wallet' ? 'text-amber-400' : 'text-neutral-400'}
                        />
                        <span>Ví</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountFilter('bank')}
                      className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        accountFilter === 'bank'
                          ? 'text-cyan-300 font-extrabold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {accountFilter === 'bank' && (
                        <motion.div
                          layoutId="export_report_modal_account_tab"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          className="absolute inset-0 bg-cyan-500/25 rounded-lg shadow-xs border border-cyan-500/40"
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <Building2
                          size={15}
                          className={accountFilter === 'bank' ? 'text-cyan-400' : 'text-neutral-400'}
                        />
                        <span>Bank</span>
                      </span>
                    </button>
                  </div>
                </LayoutGroup>
              </div>
            </div>

            {/* Section C: Tóm tắt nhanh số liệu (Realtime KPI Preview) */}
            <div className="bg-[#14161b] border border-neutral-800/90 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Tổng Hợp Kỳ Báo Cáo
                </span>
                <span className="text-xs text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-full font-medium">
                  {summary.transactionCount} giao dịch
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#1b1e24] p-2.5 rounded-xl border border-neutral-800/60">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-0.5">
                    Tổng Thu (+)
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                    +{formatVND(summary.totalIncome)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {summary.incomeCount} lần
                  </div>
                </div>

                <div className="bg-[#1b1e24] p-2.5 rounded-xl border border-neutral-800/60">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider mb-0.5">
                    Tổng Chi (−)
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-rose-400 truncate">
                    −{formatVND(summary.totalExpense)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {summary.expenseCount} lần
                  </div>
                </div>

                <div className="bg-[#1b1e24] p-2.5 rounded-xl border border-purple-500/30 shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                    Thặng Dư (=)
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold truncate bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                    {summary.netSavings >= 0 ? '+' : '−'}
                    {formatVND(Math.abs(summary.netSavings))}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {summary.totalIncome > 0
                      ? `${((summary.netSavings / summary.totalIncome) * 100).toFixed(0)}% thu`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Top 3 categories */}
              {summary.categoryBreakdown.length > 0 && (
                <div className="pt-1 border-t border-neutral-800/60 space-y-1.5">
                  <div className="text-[11px] text-neutral-400 font-medium">
                    Top danh mục chi tiêu nhiều nhất:
                  </div>
                  <div className="space-y-1">
                    {summary.categoryBreakdown.slice(0, 3).map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between text-xs text-neutral-300"
                      >
                        <span className="truncate max-w-[140px] text-neutral-300">
                          {tCategory(cat.category)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-rose-400">
                            −{formatVND(cat.amount)}
                          </span>
                          <span className="text-[10px] text-neutral-500 w-10 text-right">
                            {cat.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section D: 2 Phương thức xuất chuyên nghiệp */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>Tùy Chọn Xuất Định Dạng</span>
              </label>

              {/* Button 1: Xuất Excel (.xlsx) */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExportingExcel || summary.transactionCount === 0}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  excelSuccess
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                    : 'bg-[#15181e] hover:bg-[#1c2028] border-neutral-800 text-white active:scale-98'
                } disabled:opacity-40 disabled:pointer-events-none`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    {excelSuccess ? (
                      <Check size={20} className="text-emerald-400" />
                    ) : isExportingExcel ? (
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FileSpreadsheet size={20} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>Xuất File Excel (.xlsx)</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                        2 Sheets
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      Bảng tính tổng quan + Bảng kê chi tiết mọi giao dịch
                    </div>
                  </div>
                </div>

                <Download size={18} className="text-emerald-400 shrink-0" />
              </button>

              {/* Button 2: Báo cáo PDF chuyên nghiệp */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={summary.transactionCount === 0}
                  className="p-3 bg-[#15181e] hover:bg-[#1c2028] border border-neutral-800 rounded-2xl flex items-center justify-center gap-2 text-white text-xs font-bold active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Printer size={16} className="text-blue-400" />
                  <span>In / Lưu PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={summary.transactionCount === 0}
                  className="p-3 bg-[#15181e] hover:bg-[#1c2028] border border-neutral-800 rounded-2xl flex items-center justify-center gap-2 text-white text-xs font-bold active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Eye size={16} className="text-purple-400" />
                  <span>Xem Trước Báo Cáo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Fullscreen Report Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col justify-between">
          {/* Top Bar */}
          <div className="px-4 py-3 bg-[#121418] border-b border-neutral-800 flex items-center justify-between z-10 text-white">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-400" />
              <span className="text-sm font-bold">Xem Trước Báo Cáo PDF</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer size={14} />
                <span>In / Lưu PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Report Paper Iframe Container */}
          <div className="flex-1 bg-neutral-900 overflow-auto p-2 sm:p-6 flex justify-center">
            <div className="w-full max-w-[860px] bg-white text-black shadow-2xl rounded-sm overflow-hidden min-h-full">
              <iframe
                title="Bản xem trước báo cáo tài chính"
                srcDoc={reportHtml}
                className="w-full h-full min-h-[85vh] border-0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
