import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, ArrowRight, X } from 'lucide-react';
import { type Category } from '../types';
import {
  getTransactionCountByCategory,
  deleteCategory,
  getAllCategories,
} from '../services/categoryService';
import { CategoryIcon } from './CategoryIcon';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSuccess: () => void;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSuccess,
}) => {
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [availableReplacements, setAvailableReplacements] = useState<Category[]>([]);
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !category) return;

    let isMounted = true;
    setIsChecking(true);
    setError(null);

    Promise.all([
      getTransactionCountByCategory(category.id, category.name),
      getAllCategories(),
    ])
      .then(([count, allCats]) => {
        if (!isMounted) return;
        setTransactionCount(count);

        // Same type, excluding current category
        const alternatives = allCats.filter(
          (c) => c.type === category.type && c.id !== category.id
        );
        setAvailableReplacements(alternatives);
        if (alternatives.length > 0) {
          setSelectedReplacementId(alternatives[0].id);
        }
        setIsChecking(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error checking category usage:', err);
        setIsChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, category]);

  if (!isOpen || !category) return null;

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      if (transactionCount > 0) {
        if (!selectedReplacementId) {
          setError('Vui lòng chọn một danh mục thay thế để tiếp nhận giao dịch.');
          setIsDeleting(false);
          return;
        }
        await deleteCategory(category.id, selectedReplacementId);
      } else {
        await deleteCategory(category.id);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi xóa danh mục';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedReplacement = availableReplacements.find(
    (c) => c.id === selectedReplacementId
  );

  return (
    <div
      id="delete-category-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="delete-category-dialog"
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 size={16} />
            </div>
            <h3 className="text-base font-bold text-white">Xóa danh mục</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {isChecking ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Đang kiểm tra giao dịch liên kết...
            </div>
          ) : transactionCount > 0 ? (
            /* Warning Case: Category in use */
            <div className="space-y-4">
              <div className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={22} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-300">
                    Danh mục này đang được sử dụng
                  </h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Hiện có <strong className="text-white font-black">{transactionCount}</strong> giao dịch đang sử dụng danh mục <span className="text-amber-200 font-semibold underline underline-offset-2">"{category.name}"</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Chuyển {transactionCount} giao dịch sang danh mục:
                </label>
                {availableReplacements.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedReplacementId}
                      onChange={(e) => setSelectedReplacementId(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white font-medium text-sm focus:outline-hidden focus:border-white"
                    >
                      {availableReplacements.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type === 'expense' ? 'Chi' : 'Thu'})
                        </option>
                      ))}
                    </select>

                    {/* Visual reassignment flow */}
                    {selectedReplacement && (
                      <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={category.name} type={category.type} size={16} showBackground={false} />
                          <span className="font-semibold text-neutral-300">{category.name}</span>
                        </div>
                        <ArrowRight size={14} className="text-neutral-500" />
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={selectedReplacement.name} type={selectedReplacement.type} size={16} showBackground={false} />
                          <span className="font-bold text-white">{selectedReplacement.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-950 rounded-xl text-xs text-rose-400">
                    Bạn cần tạo ít nhất một danh mục {category.type === 'expense' ? 'Chi' : 'Thu'} khác trước khi có thể chuyển các giao dịch này.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Case: Zero transactions */
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-neutral-950 rounded-2xl border border-neutral-800">
                <CategoryIcon category={category.name} type={category.type} size={20} />
                <div>
                  <span className="text-xs text-neutral-400 block">Danh mục</span>
                  <span className="text-base font-bold text-white">{category.name}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa danh mục này? Thao tác này không thể hoàn tác.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting || (transactionCount > 0 && !selectedReplacementId)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              'Đang xử lý...'
            ) : transactionCount > 0 ? (
              <>
                <span>Chuyển {transactionCount} giao dịch & Xóa</span>
              </>
            ) : (
              'Xác nhận xóa'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
