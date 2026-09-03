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
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; tx: Transaction } | null>(null);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-end sm:items-center overflow-hidden text-neutral-100">
      <div className="w-full max-w-lg bg-[#121212] border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[88vh] max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-4.5 py-3 bg-[#121212] border-b border-neutral-800 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-white border border-neutral-800 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white leading-tight">
                  {formatFullDateVN(date)}
                </h2>
                <p className="text-xs text-neutral-300 font-bold mt-0.5">
                  {filteredTransactions.length} giao dịch {accountFilter !== 'all' ? `(${accountFilter === 'wallet' ? 'Ví' : 'Bank'})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-200 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Account Filter Switcher within Day Detail */}
          {onAccountFilterChange && (
            <div className="bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onAccountFilterChange('all')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  accountFilter === 'all'
                    ? 'bg-white text-black font-extrabold shadow-xs'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Layers
                  size={14}
                  className={accountFilter === 'all' ? 'text-black' : 'text-neutral-400'}
                />
                <span>Tất cả</span>
              </button>

              <button
                type="button"
                onClick={() => onAccountFilterChange('wallet')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  accountFilter === 'wallet'
                    ? 'bg-amber-500/25 text-amber-300 shadow-xs border border-amber-500/50'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Wallet
                  size={14}
                  className={accountFilter === 'wallet' ? 'text-amber-300' : 'text-neutral-400'}
                />
                <span>Ví</span>
              </button>

              <button
                type="button"
                onClick={() => onAccountFilterChange('bank')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  accountFilter === 'bank'
                    ? 'bg-blue-500/25 text-blue-300 shadow-xs border border-blue-500/50'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Building2
                  size={14}
                  className={accountFilter === 'bank' ? 'text-blue-300' : 'text-neutral-400'}
                />
                <span>Bank</span>
              </button>
            </div>
          )}

          {/* Daily Summary Banner */}
          <div className="bg-[#1a1a1a] rounded-2xl p-3 border border-neutral-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                {accountFilter === 'all'
                  ? 'Tổng trong ngày'
                  : accountFilter === 'wallet'
                    ? 'Tổng Ví trong ngày'
                    : 'Tổng Bank trong ngày'}
              </div>
              <div
                className={`text-lg font-black tracking-tight mt-0.5 font-mono ${
                  dayNet !== 0
                    ? 'bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400'
                    : 'text-neutral-200'
                }`}
              >
                {dayNet !== 0 ? formatSignedVND(Math.abs(dayNet), dayNet > 0 ? 'income' : 'expense') : '0 ₫'}
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-xs text-neutral-300 font-bold flex items-center gap-0.5 justify-end uppercase tracking-wider">
                  <TrendingUp size={12} className="text-emerald-400" /> Thu
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                  +{formatVND(dayIncome)}
                </div>
              </div>
              <div className="w-px h-6 bg-neutral-800" />
              <div>
                <div className="text-xs text-neutral-300 font-bold flex items-center gap-0.5 justify-end uppercase tracking-wider">
                  <TrendingDown size={12} className="text-rose-400" /> Chi
                </div>
                <div className="text-xs sm:text-sm font-bold text-rose-400 font-mono">
                  −{formatVND(dayExpense)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold">Đang tải giao dịch...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-white border border-neutral-800 flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                Chưa có giao dịch nào
              </h3>
              <p className="text-xs text-neutral-300 max-w-xs mx-auto mb-4 leading-relaxed font-medium">
                Ngày {formatDateVN(date)} chưa ghi nhận khoản thu hoặc chi nào{' '}
                {accountFilter !== 'all' ? `thuộc ${accountFilter === 'wallet' ? 'Ví tiền' : 'Ngân hàng'}` : ''}.
              </p>
              <button
                type="button"
                onClick={() => onAddNewForDate(date, defaultAccountForNew)}
                className="px-4 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs sm:text-sm font-black shadow-md inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Plus size={16} strokeWidth={3} />
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
                  className="bg-[#1a1a1a] rounded-2xl p-3 border border-neutral-800 shadow-sm hover:border-neutral-500 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {/* Visual Proof Photo Preview */}
                  {photoUrl && (
                    <div
                      className="relative rounded-2xl overflow-hidden h-36 w-full bg-[#121212] border border-neutral-800 mb-2.5 group cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPhoto({ url: photoUrl, tx });
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={`Ảnh chứng từ ${tx.category}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Gradient Overlay with Amount & Phóng to */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-between p-2.5">
                        <div className="flex justify-end">
                          <span className="text-[11px] font-bold bg-black/70 text-neutral-200 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1 border border-white/10 group-hover:border-white/30 transition-all">
                            <ImageIcon size={11} /> Phóng to
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-white pt-2">
                          <span className="text-xs font-bold bg-black/70 px-2 py-0.5 rounded-lg border border-white/10 text-neutral-200">
                            {tx.category}
                          </span>
                          <span className={`text-base font-black font-mono drop-shadow-md ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatSignedVND(tx.amount, tx.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transaction Details Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon
                        category={tx.category}
                        type={tx.type}
                        size={20}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">
                            {tx.category}
                          </span>
                          {/* Account badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                              tx.account === 'wallet'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            }`}
                          >
                            {tx.account === 'wallet' ? (
                              <>
                                <Wallet size={11} /> Ví
                              </>
                            ) : (
                              <>
                                <Building2 size={11} /> Bank
                              </>
                            )}
                          </span>
                        </div>
                        {tx.note && (
                          <p className="text-xs text-neutral-300 mt-0.5 font-medium line-clamp-1">
                            &ldquo;{tx.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-base font-black tracking-tight font-mono ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatSignedVND(tx.amount, tx.type)}
                      </div>
                      <div className="text-xs text-neutral-400 flex items-center justify-end gap-0.5 mt-0.5 font-semibold">
                        <span>Sửa</span>
                        <ChevronRight size={12} />
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
          <div className="p-3 bg-[#121212] border-t border-neutral-800 shrink-0 pb-[max(env(safe-area-inset-bottom),14px)]">
            <button
              type="button"
              onClick={() => onAddNewForDate(date, defaultAccountForNew)}
              className="w-full py-3 bg-white hover:bg-neutral-200 text-black rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-sm"
            >
              <Plus size={18} strokeWidth={3} />
              Thêm giao dịch vào ngày {formatDateVN(date)}
            </button>
          </div>
        )}

        {/* Full Screen Photo Viewer Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-70 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="flex justify-between items-center pt-2 px-2">
              <span className="text-xs font-bold text-neutral-400">Xem ảnh chứng từ</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center active:scale-95 cursor-pointer border border-neutral-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-2 gap-4 my-auto">
              <img
                src={selectedPhoto.url}
                alt="Ảnh chứng từ"
                className="max-w-full max-h-[62vh] object-contain rounded-2xl shadow-2xl border border-neutral-800"
              />

              {/* Amount and Transaction Info Panel Below Photo */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xs bg-[#1a1a1a]/95 border border-neutral-800 rounded-2xl p-4 text-center backdrop-blur-md shadow-2xl flex flex-col items-center gap-1.5"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                  <CategoryIcon category={selectedPhoto.tx.category} type={selectedPhoto.tx.type} size={16} />
                  <span>{selectedPhoto.tx.category}</span>
                  <span className="text-neutral-500">•</span>
                  <span className={selectedPhoto.tx.account === 'wallet' ? 'text-amber-400 font-bold' : 'text-blue-400 font-bold'}>
                    {selectedPhoto.tx.account === 'wallet' ? 'Ví tiền' : 'Ngân hàng'}
                  </span>
                </div>

                {/* Big Amount */}
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight my-0.5 ${selectedPhoto.tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatSignedVND(selectedPhoto.tx.amount, selectedPhoto.tx.type)}
                </div>

                {/* Date & Note */}
                <div className="text-xs text-neutral-400 font-medium flex items-center justify-center gap-1.5 flex-wrap">
                  <span>Ngày {formatDateVN(selectedPhoto.tx.date)}</span>
                  {selectedPhoto.tx.note && (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span className="text-neutral-200 italic">&ldquo;{selectedPhoto.tx.note}&rdquo;</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-neutral-400 pb-2 font-medium">
              Chạm vào màn hình để đóng
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
