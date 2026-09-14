import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { Plus, Edit2, Trash2, Tag, CheckCircle2, X } from 'lucide-react';
import { type Category, type TransactionType } from '../types';
import { useCategories } from '../hooks/useCategories';
import { getTransactionCountByCategory } from '../services/categoryService';
import { CategoryIcon } from './CategoryIcon';
import { CategoryFormModal } from './CategoryFormModal';
import { DeleteCategoryModal } from './DeleteCategoryModal';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';
import { t, tCategory } from '../utils/translations';

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

  const categoryTabs: Array<TransactionType> = ['expense', 'income'];
  const tabsControlRef = useRef<HTMLDivElement>(null);
  const isDraggingTabsRef = useRef(false);

  const updateTabFromPointer = (clientX: number) => {
    if (!tabsControlRef.current) return;
    const rect = tabsControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * categoryTabs.length);
    const selected = categoryTabs[targetIdx];
    if (selected && selected !== activeTab) {
      setActiveTab(selected);
    }
  };

  const handleTabsPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingTabsRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateTabFromPointer(e.clientX);
  };

  const handleTabsPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTabsRef.current) return;
    updateTabFromPointer(e.clientX);
  };

  const handleTabsPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingTabsRef.current) {
      isDraggingTabsRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Bottom sheet drag gesture with light-up glow handle
  const sheetDrag = useBottomSheetDrag({
    onClose,
    threshold: 65,
  });

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
    showToast(isEdit ? `Đã cập nhật danh mục "${tCategory(cat.name)}"` : `Đã thêm danh mục "${tCategory(cat.name)}"`);
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
      style={sheetDrag.backdropStyle}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 pt-[max(env(safe-area-inset-top,0px),16px)] text-neutral-100"
      onClick={sheetDrag.closeWithAnimation}
    >
      {/* SVG Gradient Defs for Modal Header Logo */}
      <svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <linearGradient id="category-modal-pink-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>

      <div
        style={sheetDrag.sheetStyle}
        className="w-full max-w-lg bg-[#121212] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Drag Pull Handle */}
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
              <Tag size={22} stroke="url(#category-modal-pink-purple-grad)" strokeWidth={2.4} className="shrink-0" />
              <div>
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {t('category.manager_title')}
                </h1>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-bold mt-0.5">
                  {t('category.manager_subtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={sheetDrag.closeWithAnimation}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
              title={t('common.close')}
              aria-label={t('common.close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs: Danh mục chi & Danh mục thu with Spring Pill Animation and Draggable Gesture */}
        <div className="px-4 pt-3 pb-1.5 shrink-0 bg-[#121212]">
          <LayoutGroup id="category_management_type_tabs">
            <div
              ref={tabsControlRef}
              onPointerDown={handleTabsPointerDown}
              onPointerMove={handleTabsPointerMove}
              onPointerUp={handleTabsPointerUp}
              onPointerCancel={handleTabsPointerUp}
              className="bg-[#1a1a1a] border border-neutral-800 p-1 rounded-xl grid grid-cols-2 gap-1.5 relative touch-none select-none"
            >
              <button
                type="button"
                onClick={() => setActiveTab('expense')}
                className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'expense'
                    ? 'text-rose-300 font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeTab === 'expense' && (
                  <motion.div
                    layoutId="category_active_tab_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-rose-500/25 rounded-lg shadow-xs border border-rose-500/40"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>{t('category.tab_expense')}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'expense'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {expenseCategories.length}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('income')}
                className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'income'
                    ? 'text-emerald-300 font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeTab === 'income' && (
                  <motion.div
                    layoutId="category_active_tab_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-emerald-500/25 rounded-lg shadow-xs border border-emerald-500/40"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>{t('category.tab_income')}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'income'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {incomeCategories.length}
                  </span>
                </span>
              </button>
            </div>
          </LayoutGroup>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-4 mt-2 p-3 bg-neutral-900 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-lg animate-in slide-in-from-top duration-200 shrink-0">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2.5 space-y-2.5">
          {currentList.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-sm">
              {t('category.empty')}
            </div>
          ) : (
            currentList.map((cat) => {
              const count = txCounts[cat.id] ?? 0;
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800/80 rounded-2xl transition-all shadow-xs"
                >
                  {/* Left: Icon & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CategoryIcon category={cat.name} type={cat.type} size={22} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">
                          {tCategory(cat.name)}
                        </span>
                        {cat.isDefault && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/60 shrink-0">
                            {t('category.default_tag')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 block mt-0.5">
                        {count > 0
                          ? t('category.tx_count').replace('{count}', count.toString())
                          : t('category.no_tx')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                      title={t('category.edit')}
                    >
                      <Edit2 size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(cat)}
                      className="p-2 text-neutral-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Action Bar inside sheet */}
        <div className="p-3.5 pb-[max(env(safe-area-inset-bottom),14px)] bg-[#121212] border-t border-neutral-800 shrink-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-black text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus size={18} strokeWidth={3} />
            <span>{t('category.add_new')}</span>
          </button>
        </div>
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

