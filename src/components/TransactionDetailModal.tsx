import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Clock,
  Pencil,
  Image as ImageIcon,
} from 'lucide-react';
import {
  type Transaction,
  type BalancesSummary,
  type UserSettings,
} from '../types';
import { getImageBlob, getUserSettings, getTransactions } from '../db/database';
import {
  formatDateVN,
  formatSignedVND,
  formatVND,
  formatTimeVN,
} from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  initialTransactionId: string | null;
  onEditTransaction?: (tx: Transaction) => void;
  allTransactions?: Transaction[];
  balances?: BalancesSummary;
  userSettings?: UserSettings | null;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transactions,
  initialTransactionId,
  onEditTransaction,
  allTransactions,
  balances,
  userSettings,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0); // 1 = next (downwards to up), -1 = prev
  const [loadedImages, setLoadedImages] = useState<Record<string, string>>({});
  const [fallbackAllTx, setFallbackAllTx] = useState<Transaction[]>([]);
  const [fallbackSettings, setFallbackSettings] = useState<UserSettings | null>(null);

  const wheelTimeoutRef = useRef<number | null>(null);

  // Fallback data loading if not supplied
  useEffect(() => {
    if (!isOpen) return;
    if (!allTransactions) {
      getTransactions().then(setFallbackAllTx).catch(console.error);
    }
    if (!balances && !userSettings) {
      getUserSettings().then(setFallbackSettings).catch(console.error);
    }
  }, [isOpen, allTransactions, balances, userSettings]);

  // Set initial index when modal opens
  useEffect(() => {
    if (!isOpen || !initialTransactionId || transactions.length === 0) return;
    const idx = transactions.findIndex((t) => t.id === initialTransactionId);
    if (idx !== -1) {
      setCurrentIndex(idx);
      setDirection(0);
    } else {
      setCurrentIndex(0);
    }
  }, [isOpen, initialTransactionId, transactions]);

  const currentTx: Transaction | undefined = transactions[currentIndex];

  // Pre-load images for current, previous, and next transactions
  useEffect(() => {
    if (!isOpen || !currentTx) return;

    let isMounted = true;
    const indicesToLoad = [currentIndex - 1, currentIndex, currentIndex + 1].filter(
      (i) => i >= 0 && i < transactions.length
    );

    const loadImages = async () => {
      for (const idx of indicesToLoad) {
        const tx = transactions[idx];
        if (tx && tx.imageId && !loadedImages[tx.imageId]) {
          try {
            const blob = await getImageBlob(tx.imageId);
            if (blob && isMounted) {
              const url = URL.createObjectURL(blob);
              setLoadedImages((prev) => ({ ...prev, [tx.imageId!]: url }));
            }
          } catch (e) {
            console.error('Error loading image in viewer:', e);
          }
        }
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentIndex, transactions, currentTx, loadedImages]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(loadedImages).forEach((url) => {
        URL.revokeObjectURL(url);
      });
      setLoadedImages({});
    };
  }, [isOpen]);

  // Navigation callbacks
  const goToNext = useCallback(() => {
    if (currentIndex < transactions.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, transactions.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Calculate balance before and after for the current transaction
  const { photoBalanceBefore, photoBalanceAfter } = useMemo(() => {
    if (!currentTx) {
      return { photoBalanceBefore: 0, photoBalanceAfter: 0 };
    }

    const tx = currentTx;
    const effectiveSettings = userSettings || fallbackSettings;
    const initialBal =
      tx.account === 'wallet'
        ? (balances?.initialWallet ?? effectiveSettings?.initialWalletBalance ?? 0)
        : (balances?.initialBank ?? effectiveSettings?.initialBankBalance ?? 0);

    const sourceTxList = allTransactions || fallbackAllTx;

    const accountTxs = sourceTxList.filter((t) => t.account === tx.account);

    const sortedAccountTxs = [...accountTxs].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.id.localeCompare(b.id);
    });

    let runningBalance = initialBal;
    let before = initialBal;

    for (const item of sortedAccountTxs) {
      if (item.id === tx.id) {
        before = runningBalance;
        break;
      }
      if (item.type === 'income') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
    }

    const after = tx.type === 'income' ? before + tx.amount : before - tx.amount;

    return { photoBalanceBefore: before, photoBalanceAfter: after };
  }, [currentTx, balances, userSettings, fallbackSettings, allTransactions, fallbackAllTx]);

  // Keyboard navigation (ArrowUp / ArrowDown / Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrev, onClose]);

  // Mouse wheel swipe interaction
  const handleWheel = (e: React.WheelEvent) => {
    if (wheelTimeoutRef.current) return;
    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        wheelTimeoutRef.current = null;
      }, 350);
    }
  };

  if (!isOpen || !currentTx) return null;

  const currentPhotoUrl = currentTx.imageId ? loadedImages[currentTx.imageId] : undefined;

  return (
    <div
      className="fixed inset-0 z-70 bg-black/95 flex flex-col justify-between px-4 pb-4 pt-[max(env(safe-area-inset-top,0px),16px)] animate-in fade-in duration-200 select-none touch-none"
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* Top Header */}
      <div
        className="flex justify-between items-center pt-2 px-1 shrink-0 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-400">
            Xem ảnh chứng từ ({currentIndex + 1}/{transactions.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onEditTransaction && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditTransaction(currentTx);
              }}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
              title="Chỉnh sửa giao dịch"
              aria-label="Chỉnh sửa giao dịch"
            >
              <Pencil size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition-colors cursor-pointer shrink-0"
            title="Đóng"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Swipeable Content with Smooth Vertical Spring Motion */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden my-auto w-full max-w-sm mx-auto">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentTx.id}
            custom={direction}
            initial={{
              opacity: 0,
              y: direction > 0 ? 60 : direction < 0 ? -60 : 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: direction > 0 ? -60 : 60,
              scale: 0.96,
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              const swipeThreshold = 45;
              const velocityThreshold = 250;
              if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
                goToNext();
              } else if (info.offset.y > swipeThreshold || info.velocity.y > velocityThreshold) {
                goToPrev();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col items-center justify-center gap-3 cursor-grab active:cursor-grabbing"
          >
            {/* Photo / Placeholder */}
            {currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt="Ảnh chứng từ"
                className="max-w-full max-h-[44vh] object-contain rounded-2xl shadow-2xl border border-neutral-800 shrink-0 select-none pointer-events-none"
              />
            ) : (
              <div className="w-full h-48 sm:h-56 rounded-2xl bg-[#161616] border border-neutral-800 flex flex-col items-center justify-center gap-2 text-neutral-500 shadow-2xl shrink-0">
                <ImageIcon size={36} strokeWidth={1.5} />
                <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                  Giao dịch không có ảnh
                </span>
              </div>
            )}

            {/* Amount and Transaction Info Panel Below Photo */}
            <div className="w-full bg-[#1a1a1a]/95 border border-neutral-800 rounded-2xl p-3.5 text-center backdrop-blur-md shadow-2xl flex flex-col items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                <CategoryIcon category={currentTx.category} type={currentTx.type} size={16} />
                <span>{currentTx.category}</span>
                <span className="text-neutral-500">•</span>
                <span
                  className={
                    currentTx.account === 'wallet'
                      ? 'text-amber-400 font-bold'
                      : 'text-cyan-400 font-bold'
                  }
                >
                  {currentTx.account === 'wallet' ? 'Ví tiền' : 'Ngân hàng'}
                </span>
              </div>

              {/* Big Amount */}
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight my-0.5 ${
                  currentTx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatSignedVND(currentTx.amount, currentTx.type)}
              </div>

              {/* Date, Time & Note */}
              <div className="text-xs text-neutral-400 font-medium flex items-center justify-center gap-1.5 flex-wrap">
                <span>Ngày {formatDateVN(currentTx.date)}</span>
                {currentTx.createdAt && formatTimeVN(currentTx.createdAt) && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-200 font-mono font-bold inline-flex items-center gap-1">
                      <Clock size={12} className="text-neutral-400" />
                      {formatTimeVN(currentTx.createdAt)}
                    </span>
                  </>
                )}
                {currentTx.note && (
                  <>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-200 italic">&ldquo;{currentTx.note}&rdquo;</span>
                  </>
                )}
              </div>
            </div>

            {/* Balance Before & After Transaction Box */}
            <div className="w-full bg-[#1a1a1a]/95 border border-neutral-800 rounded-2xl p-3 backdrop-blur-md shadow-2xl grid grid-cols-2 gap-2 divide-x divide-neutral-800/80 text-center shrink-0">
              {/* Số dư trước */}
              <div className="pr-1 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Số dư trước
                </span>
                <span className="text-sm sm:text-base font-black font-mono tracking-tight text-white mt-0.5 truncate max-w-full">
                  {formatVND(photoBalanceBefore)}
                </span>
              </div>

              {/* Số dư sau */}
              <div className="pl-2 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Số dư sau
                </span>
                <span className="text-sm sm:text-base font-black font-mono tracking-tight text-white mt-0.5 truncate max-w-full">
                  {formatVND(photoBalanceAfter)}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-xs text-neutral-400 pb-2 font-medium shrink-0">
        Lướt lên / xuống để xem giao dịch • Chạm để đóng
      </div>
    </div>
  );
};
