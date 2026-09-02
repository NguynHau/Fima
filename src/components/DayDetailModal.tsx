import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Calendar,
  Wallet,
  Building2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { type Transaction, type CalendarAccountFilter, type AccountType } from '../types';
import { getTransactionsByDate, getImageBlob } from '../db/database';
import { formatDateVN, formatFullDateVN, formatSignedVND, formatVND } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface DayDetailModalProps {
  isOpen: boolean;
  date: string;
  accountFilter?: CalendarAccountFilter;
  onAccountFilterChange?: (filter: CalendarAccountFilter) => void;
  onClose: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onAddNewForDate: (date: string, defaultAccount?: AccountType) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  date,
  accountFilter = 'all',
  onAccountFilterChange,
  onClose,
  onSelectTransaction,
  onAddNewForDate,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !date) return;

    let isMounted = true;
    setIsLoading(true);

    getTransactionsByDate(date).then(async (list) => {
      if (!isMounted) return;
      setTransactions(list);

      // Load image URLs for each transaction
      const urlMap: Record<string, string> = {};
      for (const t of list) {
        if (t.imageId) {
          const blob = await getImageBlob(t.imageId);
          if (blob && isMounted) {
            urlMap[t.id] = URL.createObjectURL(blob);
          }
        }
      }

      if (isMounted) {
        setImageUrls(urlMap);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      // Clean up object URLs
      Object.values(imageUrls).forEach((url) => {
        if (typeof url === 'string') {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [isOpen, date]);

  // Filter transactions based on active accountFilter
  const filteredTransactions = useMemo(() => {
    if (!accountFilter || accountFilter === 'all') return transactions;
    return transactions.filter((t) => t.account === accountFilter);
  }, [transactions, accountFilter]);

  if (!isOpen) return null;

  // Calculate day totals for the filtered transactions
  let dayIncome = 0;
  let dayExpense = 0;
  for (const t of filteredTransactions) {
    if (t.type === 'income') dayIncome += t.amount;
    else dayExpense += t.amount;
  }
  const dayNet = dayIncome - dayExpense;

  const defaultAccountForNew: AccountType | undefined =
    accountFilter === 'wallet' || accountFilter === 'bank' ? accountFilter : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-end sm:items-center overflow-hidden">
      <div className="w-full max-w-lg bg-[#0f0f0f] border border-[#262626] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[88vh] max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#121212] border-b border-[#262626] shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Calendar size={15} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  {formatFullDateVN(date)}
                </h2>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {filteredTransactions.length} giao dịch {accountFilter !== 'all' ? `(${accountFilter === 'wallet' ? 'Ví' : 'Bank'})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[#1c1c1c] hover:bg-[#262626] text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          {/* Account Filter Switcher within Day Detail */}
          {onAccountFilterChange && (
            <div className="bg-[#171717] p-0.5 rounded-lg border border-[#262626] grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onAccountFilterChange('all')}
                className={`py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  accountFilter === 'all'
                    ? 'bg-[#262626] text-white shadow-xs border border-[#383838]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers
                  size={11}
                  className={accountFilter === 'all' ? 'text-neutral-200' : 'text-neutral-500'}
                />
                <span>Tất cả</span>
              </button>

              <button
                type="button"
                onClick={() => onAccountFilterChange('wallet')}
                className={`py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  accountFilter === 'wallet'
                    ? 'bg-amber-500/20 text-amber-300 shadow-xs border border-amber-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Wallet
                  size={11}
                  className={accountFilter === 'wallet' ? 'text-amber-400' : 'text-neutral-500'}
                />
                <span>Ví</span>
              </button>

              <button
                type="button"
                onClick={() => onAccountFilterChange('bank')}
                className={`py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  accountFilter === 'bank'
                    ? 'bg-blue-500/20 text-blue-300 shadow-xs border border-blue-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Building2
                  size={11}
                  className={accountFilter === 'bank' ? 'text-blue-400' : 'text-neutral-500'}
                />
                <span>Bank</span>
              </button>
            </div>
          )}

          {/* Daily Summary Banner */}
          <div className="bg-[#171717] rounded-xl p-2.5 border border-[#262626] flex items-center justify-between">
            <div>
              <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">
                {accountFilter === 'all'
                  ? 'Tổng trong ngày'
                  : accountFilter === 'wallet'
                    ? 'Tổng Ví trong ngày'
                    : 'Tổng Bank trong ngày'}
              </div>
              <div
                className={`text-base font-bold tracking-tight mt-0.5 font-mono ${
                  dayNet > 0
                    ? 'text-emerald-400'
                    : dayNet < 0
                      ? 'text-rose-400'
                      : 'text-neutral-300'
                }`}
              >
                {dayNet !== 0 ? formatSignedVND(Math.abs(dayNet), dayNet > 0 ? 'income' : 'expense') : '0 ₫'}
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-right">
              <div>
                <div className="text-[9px] text-neutral-400 font-medium flex items-center gap-0.5 justify-end uppercase tracking-wider">
                  <TrendingUp size={10} className="text-emerald-400" /> Thu
                </div>
                <div className="text-[11px] font-bold text-emerald-400 font-mono">
                  +{formatVND(dayIncome)}
                </div>
              </div>
              <div className="w-px h-5 bg-[#262626]" />
              <div>
                <div className="text-[9px] text-neutral-400 font-medium flex items-center gap-0.5 justify-end uppercase tracking-wider">
                  <TrendingDown size={10} className="text-rose-400" /> Chi
                </div>
                <div className="text-[11px] font-bold text-rose-400 font-mono">
                  −{formatVND(dayExpense)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-500 gap-2">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Đang tải giao dịch...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <Calendar size={22} />
              </div>
              <h3 className="text-xs font-bold text-white mb-0.5">
                Chưa có giao dịch nào
              </h3>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto mb-3">
                Ngày {formatDateVN(date)} chưa ghi nhận khoản thu hoặc chi nào{' '}
                {accountFilter !== 'all' ? `thuộc ${accountFilter === 'wallet' ? 'Ví tiền' : 'Ngân hàng'}` : ''}.
              </p>
              <button
                type="button"
                onClick={() => onAddNewForDate(date, defaultAccountForNew)}
                className="px-3 py-2 bg-neutral-200 hover:bg-white text-black rounded-lg text-xs font-extrabold shadow-sm inline-flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                Thêm giao dịch ngay
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const photoUrl = imageUrls[tx.id];
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="bg-[#141414] rounded-xl p-2.5 border border-[#262626] shadow-sm hover:border-[#3a3a3a] transition-all active:scale-[0.99] cursor-pointer"
                >
                  {/* Visual Proof Photo Preview */}
                  {photoUrl && (
                    <div
                      className="relative rounded-lg overflow-hidden h-28 w-full bg-[#0a0a0a] border border-[#262626] mb-2 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto(photoUrl);
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={`Ảnh chứng từ ${tx.category}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span className="text-[10px] font-bold bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 border border-[#333333]">
                          <ImageIcon size={10} /> Phóng to
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Transaction Details Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        category={tx.category}
                        type={tx.type}
                        size={16}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {tx.category}
                          </span>
                          {/* Account badge */}
                          <span
                            className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              tx.account === 'wallet'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {tx.account === 'wallet' ? (
                              <>
                                <Wallet size={9} /> Ví
                              </>
                            ) : (
                              <>
                                <Building2 size={9} /> Bank
                              </>
                            )}
                          </span>
                        </div>
                        {tx.note && (
                          <p className="text-[11px] text-neutral-400 mt-0.5 font-medium line-clamp-1">
                            &ldquo;{tx.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-bold tracking-tight font-mono ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatSignedVND(tx.amount, tx.type)}
                      </div>
                      <div className="text-[9.5px] text-neutral-500 flex items-center justify-end gap-0.5 mt-0.5">
                        <span>Sửa</span>
                        <ChevronRight size={10} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar: Add more for this date */}
        {filteredTransactions.length > 0 && (
          <div className="p-2.5 bg-[#121212] border-t border-[#262626] shrink-0 pb-[max(env(safe-area-inset-bottom),10px)]">
            <button
              type="button"
              onClick={() => onAddNewForDate(date, defaultAccountForNew)}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/15 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-colors cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              Thêm giao dịch vào ngày {formatDateVN(date)}
            </button>
          </div>
        )}

        {/* Full Screen Photo Viewer Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-70 bg-black/95 flex flex-col justify-between p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-2">
              <img
                src={selectedPhoto}
                alt="Ảnh phóng to"
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-[#333333]"
              />
            </div>
            <div className="text-center text-xs text-neutral-400 pb-4 font-medium">
              Chạm vào màn hình để đóng
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
