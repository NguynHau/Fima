import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Tag, CheckCircle2 } from 'lucide-react';
import { type Category, type TransactionType } from '../types';
import { useCategories } from '../hooks/useCategories';
import { getTransactionCountByCategory } from '../services/categoryService';
import { CategoryIcon } from './CategoryIcon';
import { CategoryFormModal } from './CategoryFormModal';
import { DeleteCategoryModal } from './DeleteCategoryModal';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const { categories, expenseCategories, incomeCategories } = useCategories();

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Transaction counts per category
  const [txCounts, setTxCounts] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  const refreshCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = await getTransactionCountByCategory(cat.id, cat.name);
    }
    setTxCounts(counts);
  }, [categories]);

  useEffect(() => {
    if (isOpen && categories.length > 0) {
      refreshCounts();
    }
  }, [isOpen, categories, refreshCounts]);

  if (!isOpen) return null;

  const currentList = activeTab === 'expense' ? expenseCategories : incomeCategories;

  const handleOpenAdd = () => {
    setCategoryToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setCategoryToEdit(cat);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (cat: Category) => {
    setCategoryToDelete(cat);
    setIsDeleteOpen(true);
  };

  const handleFormSuccess = (cat: Category, isEdit: boolean) => {
    showToast(isEdit ? `Đã cập nhật danh mục "${cat.name}"` : `Đã thêm danh mục "${cat.name}"`);
    refreshCounts();
    if (onDataChanged) onDataChanged();
  };

  const handleDeleteSuccess = () => {
    showToast('Đã xóa danh mục thành công');
    refreshCounts();
    if (onDataChanged) onDataChanged();
  };

  return (
    <div
      id="category-management-screen"
      className="fixed inset-0 z-40 bg-neutral-950 flex flex-col text-neutral-100 overflow-hidden animate-in fade-in duration-200"
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
            title="Quay lại Cài đặt"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Tag size={18} className="text-amber-400" />
              Quản lý danh mục
            </h1>
            <p className="text-xs text-neutral-400">Tùy chỉnh danh mục Thu và Chi của bạn</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black rounded-xl font-bold text-xs hover:bg-neutral-200 transition-all shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {/* Tabs: Danh mục chi & Danh mục thu */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 rounded-2xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'expense'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Danh mục chi</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'expense' ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {expenseCategories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'income'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Danh mục thu</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'income' ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {incomeCategories.length}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-4 mt-2 p-3 bg-neutral-900 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in slide-in-from-top duration-200">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 pb-24">
        {currentList.length === 0 ? (
          <div className="py-16 text-center text-neutral-500 text-sm">
            Chưa có danh mục nào. Nhấn "+ Thêm danh mục" để tạo mới.
          </div>
        ) : (
          currentList.map((cat) => {
            const count = txCounts[cat.id] ?? 0;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800/80 rounded-2xl transition-all shadow-xs"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <CategoryIcon category={cat.name} type={cat.type} size={22} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{cat.name}</span>
                      {cat.isDefault && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/60 shrink-0">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400 block mt-0.5">
                      {count > 0 ? `${count} giao dịch` : 'Chưa có giao dịch'}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                    title="Chỉnh sửa danh mục"
                  >
                    <Edit2 size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(cat)}
                    className="p-2 text-neutral-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                    title="Xóa danh mục"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent border-t border-neutral-900/50 backdrop-blur-xs flex justify-center">
        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full max-w-md py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Thêm danh mục mới</span>
        </button>
      </div>

      {/* Add / Edit Modal */}
      <CategoryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        categoryToEdit={categoryToEdit}
        initialType={activeTab}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCategoryModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        category={categoryToDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};
