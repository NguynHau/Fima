import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  X, 
  Calendar, 
  Wallet, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  SearchX,
  History,
  Image as ImageIcon
} from 'lucide-react';
import { type Transaction } from '../types';
import { formatVND, formatDateVN, formatSignedVND } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { getImageBlob } from '../db/database';

interface GlobalSearchViewProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
}

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({
  isOpen,
  onClose,
  transactions,
  onSelectTransaction
}) => {
  const [query, setQuery] = useState('');
  const [imageAssets, setImageAssets] = useState<Record<string, string>>({});

  // Reset query when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  // Handle Search Logic
  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];

    return transactions.filter(tx => {
      // 1. Text match (note, category, account)
      const noteMatch = tx.note?.toLowerCase().includes(trimmedQuery);
      const categoryMatch = tx.category.toLowerCase().includes(trimmedQuery);
      const accountMatch = (tx.account === 'wallet' ? 'ví' : 'bank').includes(trimmedQuery);
      
      // 2. Amount match
      const amountStr = tx.amount.toString();
      const amountMatch = amountStr.includes(trimmedQuery);

      // 3. Date match (YYYY-MM-DD or DD/MM/YYYY style check)
      const dateStr = formatDateVN(tx.date).toLowerCase();
      const isoDateMatch = tx.date.includes(trimmedQuery);
      const vnDateMatch = dateStr.includes(trimmedQuery);

      return noteMatch || categoryMatch || accountMatch || amountMatch || isoDateMatch || vnDateMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [query, transactions]);

  // Load images for results
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

    let isMounted = true;
    const loadImages = async () => {
      const newAssets: Record<string, string> = { ...imageAssets };
      let changed = false;

      // Only load images for the first 20 visible results for performance
      const visibleResults = results.slice(0, 20);

      for (const tx of visibleResults) {
        if (tx.imageId && !newAssets[tx.id]) {
          try {
            const blob = await getImageBlob(tx.imageId);
            if (blob && isMounted) {
              newAssets[tx.id] = URL.createObjectURL(blob);
              changed = true;
            }
          } catch (e) {
            console.error('Search image load error:', e);
          }
        }
      }

      if (isMounted && changed) {
        setImageAssets(newAssets);
      }
    };

    loadImages();

    return () => {
      isMounted = false;
    };
  }, [isOpen, results]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageAssets).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 bg-black flex flex-col animate-in fade-in duration-300 overflow-hidden">
      {/* Top Search Bar */}
      <div className="pt-[max(env(safe-area-inset-top,0px),16px)] bg-[#121212] border-b border-neutral-800 shrink-0">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search 
              size={18} 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" 
            />
            <input
              autoFocus
              type="text"
              placeholder="Tìm nội dung, hạng mục, số tiền..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-neutral-800 rounded-2xl py-3.5 pl-11 pr-11 text-sm font-bold text-white placeholder:text-neutral-500 focus:border-purple-500/50 outline-none transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-black text-neutral-400 hover:text-white transition-colors py-2 px-1 cursor-pointer active:scale-95"
          >
            HỦY
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom,0px),24px)]">
        {!query.trim() ? (
          /* Initial Search State */
          <div className="flex flex-col items-center justify-center h-full text-center px-10 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#121212] border border-neutral-800 flex items-center justify-center text-neutral-600 shadow-xl">
              <Search size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">Tìm kiếm toàn cục</h3>
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Tìm kiếm bất kỳ giao dịch nào theo nội dung, số tiền, ngày tháng hoặc hạng mục.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Ăn uống', '500k', 'Hôm qua', 'Xăng'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-[#121212] border border-neutral-800 text-[10px] font-black text-neutral-400 hover:text-white transition-all active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center px-10 gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#121212] border border-neutral-800 flex items-center justify-center text-rose-500/50 shadow-xl animate-in zoom-in duration-300">
              <SearchX size={32} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">Không tìm thấy kết quả</h3>
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Không tìm thấy giao dịch nào khớp với &quot;{query}&quot;. Thử từ khóa khác xem sao.
              </p>
            </div>
          </div>
        ) : (
          /* Results List */
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                Đã tìm thấy {results.length} kết quả
              </span>
              <div className="h-px flex-1 bg-neutral-800/50 ml-4" />
            </div>
            
            {results.map((tx) => (
              <button
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="w-full text-left bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-lg active:scale-[0.98] transition-all flex flex-col group"
              >
                {/* Result Card Header (Info) */}
                <div className="p-4 flex items-start gap-3">
                  <div className="bg-neutral-800 p-2 rounded-2xl border border-white/5">
                    <CategoryIcon category={tx.category} type={tx.type} size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-tighter flex items-center gap-1.5">
                        <Calendar size={10} />
                        {formatDateVN(tx.date)}
                        <span className="text-neutral-700">•</span>
                        {tx.account === 'wallet' ? <Wallet size={10} className="text-amber-500" /> : <Building2 size={10} className="text-blue-500" />}
                        {tx.account === 'wallet' ? 'Ví tiền' : 'Ngân hàng'}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-black text-white truncate mt-0.5">
                      {tx.category}
                    </h4>
                    
                    {tx.note && (
                      <p className="text-xs text-neutral-400 font-medium line-clamp-1 mt-0.5 italic">
                        &ldquo;{tx.note}&rdquo;
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className={`text-base font-black font-mono tracking-tight ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatSignedVND(tx.amount, tx.type)}
                    </div>
                  </div>
                </div>

                {/* Optional Image Preview */}
                {tx.imageId && imageAssets[tx.id] && (
                  <div className="px-4 pb-4">
                    <div className="h-28 w-full rounded-2xl overflow-hidden relative border border-white/5">
                      <img 
                        src={imageAssets[tx.id]} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" 
                        alt="Hóa đơn"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1.5">
                        <ImageIcon size={10} className="text-neutral-300" />
                        <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wider">Có ảnh chứng từ</span>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
