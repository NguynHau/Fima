import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Trash2,
  Camera,
} from 'lucide-react';
import { type Transaction, type CalendarAccountFilter, type AccountType } from '../types';
import { getTransactionsByDate, getImageBlob, deleteTransaction } from '../db/database';
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
  allTransactions?: Transaction[];
  onDeleteTransaction?: (transaction: Transaction) => Promise<void> | void;
  onChangePhoto?: (transaction: Transaction) => void;
}

interface SwipeableTransactionRowProps {
  tx: Transaction;
  photoUrl?: string;
  isSwipedOpen: boolean;
  onSwipeOpen: (direction: 'left' | 'right') => void;
  onSwipeClose: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onSelectPhoto: (photo: { url: string; tx: Transaction }) => void;
  onDeleteClick: (tx: Transaction) => void;
  onChangePhotoClick: (tx: Transaction) => void;
}

const ACTION_WIDTH = 84;
const SWIPE_THRESHOLD = 36;

export const SwipeableTransactionRow: React.FC<SwipeableTransactionRowProps> = ({
  tx,
  photoUrl,
  isSwipedOpen,
  onSwipeOpen,
  onSwipeClose,
  onSelectTransaction,
  onSelectPhoto,
  onDeleteClick,
  onChangePhotoClick,
}) => {
  const [offset, setOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialOffsetRef = useRef<number>(0);
  const gestureTypeRef = useRef<'horizontal' | 'vertical' | null>(null);
  const hasSwipedRef = useRef<boolean>(false);

  // Close this item when another item is swiped open
  useEffect(() => {
    if (!isSwipedOpen && offset !== 0 && !isDragging) {
      setOffset(0);
    }
  }, [isSwipedOpen, offset, isDragging]);

  // Touch Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    initialOffsetRef.current = offset;
    gestureTypeRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (gestureTypeRef.current === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX < 8 && absY < 8) return;
      if (absY >= absX) {
        // Vertical scroll: do not interfere with natural list scrolling
        gestureTypeRef.current = 'vertical';
        return;
      } else {
        // Horizontal swipe: activate drag
        gestureTypeRef.current = 'horizontal';
        setIsDragging(true);
      }
    }

    if (gestureTypeRef.current === 'vertical') return;

    // Calculate next offset with damping beyond action width
    let nextX = initialOffsetRef.current + deltaX;
    if (nextX > ACTION_WIDTH) {
      nextX = ACTION_WIDTH + (nextX - ACTION_WIDTH) * 0.25;
    } else if (nextX < -ACTION_WIDTH) {
      nextX = -ACTION_WIDTH + (nextX - (-ACTION_WIDTH)) * 0.25;
    }

    setOffset(nextX);
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;

    if (gestureTypeRef.current === 'horizontal') {
      setIsDragging(false);
      hasSwipedRef.current = true;
      setTimeout(() => {
        hasSwipedRef.current = false;
      }, 250);

      if (offset < -SWIPE_THRESHOLD) {
        setOffset(-ACTION_WIDTH);
        onSwipeOpen('left');
      } else if (offset > SWIPE_THRESHOLD) {
        setOffset(ACTION_WIDTH);
        onSwipeOpen('right');
      } else {
        setOffset(0);
        onSwipeClose();
      }
    }

    touchStartRef.current = null;
    gestureTypeRef.current = null;
  };

  const handleTouchCancel = () => {
    setIsDragging(false);
    setOffset(0);
    onSwipeClose();
    touchStartRef.current = null;
    gestureTypeRef.current = null;
  };

  // Mouse Handlers for Desktop Testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = offset;
    gestureTypeRef.current = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mouseStartRef.current) return;
      const deltaX = moveEvent.clientX - mouseStartRef.current.x;
      const deltaY = moveEvent.clientY - mouseStartRef.current.y;

      if (gestureTypeRef.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX < 6 && absY < 6) return;
        if (absY >= absX) {
          gestureTypeRef.current = 'vertical';
          return;
        } else {
          gestureTypeRef.current = 'horizontal';
          setIsDragging(true);
        }
      }

      if (gestureTypeRef.current === 'horizontal') {
        let nextX = initialOffsetRef.current + deltaX;
        if (nextX > ACTION_WIDTH) {
          nextX = ACTION_WIDTH + (nextX - ACTION_WIDTH) * 0.25;
        } else if (nextX < -ACTION_WIDTH) {
          nextX = -ACTION_WIDTH + (nextX - (-ACTION_WIDTH)) * 0.25;
        }
        setOffset(nextX);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (gestureTypeRef.current === 'horizontal') {
        setIsDragging(false);
        hasSwipedRef.current = true;
        setTimeout(() => {
          hasSwipedRef.current = false;
        }, 250);

        setOffset((cur) => {
          if (cur < -SWIPE_THRESHOLD) {
            onSwipeOpen('left');
            return -ACTION_WIDTH;
          } else if (cur > SWIPE_THRESHOLD) {
            onSwipeOpen('right');
            return ACTION_WIDTH;
          } else {
            onSwipeClose();
            return 0;
          }
        });
      }

      mouseStartRef.current = null;
      gestureTypeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasSwipedRef.current) {
      e.stopPropagation();
      return;
    }
    if (offset !== 0) {
      e.stopPropagation();
      setOffset(0);
      onSwipeClose();
      return;
    }
    onSelectTransaction(tx);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden select-none touch-pan-y">
      {/* 1. LEFT ACTION: Sửa / Thay ảnh (Xanh dương) - Chỉ xuất hiện khi kéo sang phải (offset > 0) */}
      <div
        className={`absolute inset-y-0 left-0 w-[84px] bg-blue-600 rounded-l-2xl flex items-center justify-center transition-opacity duration-150 ${
          offset > 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onSwipeClose();
            onChangePhotoClick(tx);
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-white hover:bg-blue-700 active:scale-95 transition-all cursor-pointer select-none"
          title={tx.imageId ? 'Sửa / Thay ảnh' : 'Chụp ảnh'}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <Camera size={20} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-black tracking-tight leading-tight">
            {tx.imageId ? 'Sửa ảnh' : 'Thêm ảnh'}
          </span>
        </button>
      </div>

      {/* 2. RIGHT ACTION: Xóa (Đỏ) - Chỉ xuất hiện khi kéo sang trái (offset < 0) */}
      <div
        className={`absolute inset-y-0 right-0 w-[84px] bg-rose-600 rounded-r-2xl flex items-center justify-center transition-opacity duration-150 ${
          offset < 0 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onSwipeClose();
            onDeleteClick(tx);
          }}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-white hover:bg-rose-700 active:scale-95 transition-all cursor-pointer select-none"
          title="Xóa giao dịch"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <Trash2 size={20} strokeWidth={2.4} />
          </div>
          <span className="text-[11px] font-black tracking-tight leading-tight">Xóa</span>
        </button>
      </div>

      {/* 3. FOREGROUND TRANSACTION CARD */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className="bg-[#1a1a1a] rounded-2xl p-3 border border-neutral-800 shadow-sm hover:border-neutral-500 transition-colors active:scale-[0.99] cursor-pointer relative z-10 w-full"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
      >
        {/* Photo Thumbnail if available */}
        {photoUrl && (
          <div
            className="relative rounded-2xl overflow-hidden h-36 w-full bg-[#121212] border border-neutral-800 mb-2.5 group cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (hasSwipedRef.current || offset !== 0) {
                setOffset(0);
                onSwipeClose();
                return;
              }
              onSelectPhoto({ url: photoUrl, tx });
            }}
          >
            <img
              src={photoUrl}
              alt={`Ảnh chứng từ ${tx.category}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
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
          </div>
        </div>
      </div>
    </div>
  );
};

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  date,
  accountFilter = 'all',
  onAccountFilterChange,
  onClose,
  onSelectTransaction,
  onAddNewForDate,
  allTransactions,
  onDeleteTransaction,
  onChangePhoto,
}) => {
  const [dbTransactions, setDbTransactions] = useState<Transaction[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; tx: Transaction } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSwipedId, setActiveSwipedId] = useState<string | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // If allTransactions is provided by App.tsx, automatically derive day transactions
  const transactions = useMemo(() => {
    if (allTransactions) {
      return allTransactions.filter((t) => t.date === date);
    }
    return dbTransactions;
  }, [allTransactions, date, dbTransactions]);

  // If allTransactions is not provided, fetch from DB on [isOpen, date]
  useEffect(() => {
    if (!isOpen || !date || allTransactions) return;

    let isMounted = true;
    setIsLoading(true);

    getTransactionsByDate(date).then((list) => {
      if (!isMounted) return;
      setDbTransactions(list);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, date, allTransactions]);

  // Load and refresh image URLs whenever transactions change
  useEffect(() => {
    if (!isOpen || !date) return;

    let isMounted = true;
    const urlMap: Record<string, string> = {};

    const loadImages = async () => {
      for (const t of transactions) {
        if (t.imageId && isMounted) {
          try {
            const blob = await getImageBlob(t.imageId);
            if (blob && isMounted) {
              urlMap[t.id] = URL.createObjectURL(blob);
            }
          } catch (e) {
            console.error('Lỗi khi tải ảnh cho giao dịch:', e);
          }
        }
      }
      if (isMounted) {
        setImageUrls(urlMap);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
      Object.values(urlMap).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [isOpen, date, transactions]);

  // Filter transactions based on active accountFilter
  const filteredTransactions = useMemo(() => {
    if (!accountFilter || accountFilter === 'all') return transactions;
    return transactions.filter((t) => t.account === accountFilter);
  }, [transactions, accountFilter]);

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteTransaction) {
        await onDeleteTransaction(txToDelete);
      } else {
        await deleteTransaction(txToDelete.id);
      }
      if (imageUrls[txToDelete.id]) {
        URL.revokeObjectURL(imageUrls[txToDelete.id]);
      }
      setTxToDelete(null);
      setActiveSwipedId(null);
    } catch (err) {
      console.error('Lỗi khi xóa giao dịch:', err);
    } finally {
      setIsDeleting(false);
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-center items-end sm:items-center overflow-hidden pt-[max(env(safe-area-inset-top,0px),16px)] sm:pt-0 text-neutral-100">
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
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          onScroll={() => {
            if (activeSwipedId) {
              setActiveSwipedId(null);
            }
          }}
        >
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
            filteredTransactions.map((tx) => (
              <SwipeableTransactionRow
                key={tx.id}
                tx={tx}
                photoUrl={imageUrls[tx.id]}
                isSwipedOpen={activeSwipedId === tx.id}
                onSwipeOpen={() => setActiveSwipedId(tx.id)}
                onSwipeClose={() => {
                  if (activeSwipedId === tx.id) {
                    setActiveSwipedId(null);
                  }
                }}
                onSelectTransaction={onSelectTransaction}
                onSelectPhoto={(photo) => setSelectedPhoto(photo)}
                onDeleteClick={(t) => setTxToDelete(t)}
                onChangePhotoClick={(t) => {
                  setActiveSwipedId(null);
                  onChangePhoto?.(t);
                }}
              />
            ))
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
            className="fixed inset-0 z-70 bg-black/95 flex flex-col justify-between px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)] animate-in fade-in duration-200"
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

        {/* Delete Confirmation Dialog */}
        {txToDelete && (
          <div
            className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setTxToDelete(null)}
          >
            <div
              className="bg-[#1a1a1a] border border-neutral-800 rounded-2xl p-5 max-w-xs w-full space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Xóa giao dịch?</h3>
                  <p className="text-xs text-neutral-400 font-medium">
                    {txToDelete.category} ({formatSignedVND(txToDelete.amount, txToDelete.type)})
                  </p>
                </div>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTxToDelete(null)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Xóa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
