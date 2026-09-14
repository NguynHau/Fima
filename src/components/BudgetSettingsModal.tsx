import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { X, Plus, Trash2, Edit2, PiggyBank, Layers, Check, AlertCircle, Sparkles } from 'lucide-react';
import { type Budget, type SavingsGoal, type Category } from '../types';
import {
  getBudgets,
  saveBudget,
  deleteBudget,
  getSavings,
  saveSavings,
  deleteSavings,
} from '../db/database';
import { getCategoriesByType } from '../services/categoryService';
import { CategoryIcon } from './CategoryIcon';
import { formatVND, parseAmountInput } from '../utils/formatters';
import { t, tCategory } from '../utils/translations';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'savings'>('budget');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const budgetTabs: Array<'budget' | 'savings'> = ['budget', 'savings'];
  const tabsControlRef = useRef<HTMLDivElement>(null);
  const isDraggingTabsRef = useRef(false);

  const updateTabFromPointer = (clientX: number) => {
    if (!tabsControlRef.current) return;
    const rect = tabsControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * budgetTabs.length);
    const selected = budgetTabs[targetIdx];
    if (selected && selected !== activeTab) {
      setActiveTab(selected);
      setIsAddingBudget(false);
      setEditingBudget(null);
      setIsAddingSavings(false);
      setEditingSavings(null);
      setFormError('');
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

  // Form states - Budget
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [budgetLimitInput, setBudgetLimitInput] = useState<string>('');

  // Form states - Savings
  const [editingSavings, setEditingSavings] = useState<SavingsGoal | null>(null);
  const [isAddingSavings, setIsAddingSavings] = useState(false);
  const [savingsNameInput, setSavingsNameInput] = useState<string>('');
  const [savingsTargetInput, setSavingsTargetInput] = useState<string>('');
  const [savingsCurrentInput, setSavingsCurrentInput] = useState<string>('');

  const [formError, setFormError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? null : prev)), 2500);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bList, sList, expCats] = await Promise.all([
        getBudgets(),
        getSavings(),
        getCategoriesByType('expense'),
      ]);
      setBudgets(bList);
      setSavings(sList);
      setExpenseCategories(expCats);
    } catch (err) {
      console.error('Error fetching budget data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setFormError('');
      setIsAddingBudget(false);
      setEditingBudget(null);
      setIsAddingSavings(false);
      setEditingSavings(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Remaining expense categories that don't have a budget yet
  const availableCategoriesForBudget = expenseCategories.filter(
    (cat) =>
      !budgets.some(
        (b) =>
          b.categoryId === cat.id ||
          b.categoryName.trim().toLowerCase() === cat.name.trim().toLowerCase()
      )
  );

  // Handle Save Budget
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const limitVal = parseAmountInput(budgetLimitInput);
    if (isNaN(limitVal) || limitVal <= 0) {
      setFormError(t('budget.invalid_amount'));
      return;
    }

    let catId = selectedCategoryId;
    let catName = '';

    if (editingBudget) {
      catId = editingBudget.categoryId;
      catName = editingBudget.categoryName;
    } else {
      const catObj = expenseCategories.find((c) => c.id === catId);
      if (!catObj) {
        setFormError(t('budget.select_category'));
        return;
      }
      catName = catObj.name;
    }

    try {
      await saveBudget({
        id: editingBudget ? editingBudget.id : undefined,
        categoryId: catId,
        categoryName: catName,
        limitAmount: limitVal,
      });

      setIsAddingBudget(false);
      setEditingBudget(null);
      setBudgetLimitInput('');
      setSelectedCategoryId('');
      showToast(editingBudget ? 'Đã cập nhật hạn mức' : 'Đã thêm hạn mức mới');
      await fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error('Save budget error:', err);
      setFormError(err.message || 'Lỗi khi lưu hạn mức');
    }
  };

  const handleStartEditBudget = (b: Budget) => {
    setEditingBudget(b);
    setIsAddingBudget(false);
    setSelectedCategoryId(b.categoryId);
    setBudgetLimitInput(b.limitAmount.toString());
    setFormError('');
  };

  const handleDeleteBudget = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa hạn mức "${name}"?`)) {
      try {
        await deleteBudget(id);
        showToast(`Đã xóa hạn mức "${name}"`);
        await fetchData();
        if (onDataChanged) onDataChanged();
      } catch (err) {
        console.error('Delete budget error:', err);
      }
    }
  };

  // Handle Save Savings
  const handleSaveSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetVal = parseAmountInput(savingsTargetInput);
    const currentVal = parseAmountInput(savingsCurrentInput) || 0;

    if (!savingsNameInput.trim()) {
      setFormError('Vui lòng nhập tên mục tiêu');
      return;
    }
    if (isNaN(targetVal) || targetVal <= 0) {
      setFormError(t('budget.invalid_amount'));
      return;
    }

    try {
      await saveSavings({
        id: editingSavings ? editingSavings.id : undefined,
        name: savingsNameInput.trim(),
        targetAmount: targetVal,
        currentAmount: currentVal,
      });

      setIsAddingSavings(false);
      setEditingSavings(null);
      setSavingsNameInput('');
      setSavingsTargetInput('');
      setSavingsCurrentInput('');
      showToast(editingSavings ? 'Đã cập nhật mục tiêu' : 'Đã thêm mục tiêu tích lũy');
      await fetchData();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      console.error('Save savings error:', err);
      setFormError(err.message || 'Lỗi khi lưu mục tiêu tiết kiệm');
    }
  };

  const handleStartEditSavings = (s: SavingsGoal) => {
    setEditingSavings(s);
    setIsAddingSavings(false);
    setSavingsNameInput(s.name);
    setSavingsTargetInput(s.targetAmount.toString());
    setSavingsCurrentInput(s.currentAmount.toString());
    setFormError('');
  };

  const handleDeleteSavings = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa mục tiêu "${name}"?`)) {
      try {
        await deleteSavings(id);
        showToast(`Đã xóa mục tiêu "${name}"`);
        await fetchData();
        if (onDataChanged) onDataChanged();
      } catch (err) {
        console.error('Delete savings error:', err);
      }
    }
  };

  return (
    <div
      id="budget-settings-screen"
      style={sheetDrag.backdropStyle}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 pt-[max(env(safe-area-inset-top,0px),16px)] text-neutral-100"
      onClick={sheetDrag.closeWithAnimation}
    >
      {/* SVG Defs for system pink-purple gradient */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <linearGradient id="budget-pink-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--sys-gradient-pink, #f472b6)" />
            <stop offset="50%" stopColor="var(--sys-gradient-fuchsia, #e879f9)" />
            <stop offset="100%" stopColor="var(--sys-gradient-purple, #c084fc)" />
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
              <PiggyBank
                size={24}
                className="shrink-0"
                stroke="url(#budget-pink-purple-grad)"
                strokeWidth={2.4}
              />
              <div>
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {t('budget.settings_modal_title')}
                </h1>
                <p className="text-[10px] sm:text-xs text-neutral-400 font-bold mt-0.5">
                  {t('budget.subtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={sheetDrag.closeWithAnimation}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
              title="Đóng"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn shrink-0">
            <Check size={15} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* UNIFIED CONTAINER FOR TABS WITH SMOOTH SPRING SLIDING PILL & DRAGGABLE GESTURE */}
        <div className="px-4 pt-3 pb-2 shrink-0 bg-[#121212]">
          <LayoutGroup id="budget_savings_tabs_nav">
            <div
              ref={tabsControlRef}
              onPointerDown={handleTabsPointerDown}
              onPointerMove={handleTabsPointerMove}
              onPointerUp={handleTabsPointerUp}
              onPointerCancel={handleTabsPointerUp}
              className="bg-[#1a1a1a] border border-neutral-800 p-1 rounded-xl grid grid-cols-2 gap-1.5 relative touch-none select-none"
            >
              {/* Tab 1: Hạn mức chi tiêu */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('budget');
                  setIsAddingBudget(false);
                  setEditingBudget(null);
                  setFormError('');
                }}
                className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'budget'
                    ? 'text-black font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeTab === 'budget' && (
                  <motion.div
                    layoutId="active_budget_savings_tab_bg"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Layers
                    size={16}
                    className={activeTab === 'budget' ? 'text-black' : 'text-neutral-400'}
                  />
                  <span>{t('budget.budgets')}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'budget' ? 'bg-black/15 text-black' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {budgets.length}
                  </span>
                </span>
              </button>

              {/* Tab 2: Mục tiêu tiết kiệm */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('savings');
                  setIsAddingSavings(false);
                  setEditingSavings(null);
                  setFormError('');
                }}
                className={`relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'savings'
                    ? 'text-amber-300 font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeTab === 'savings' && (
                  <motion.div
                    layoutId="active_budget_savings_tab_bg"
                    className="absolute inset-0 bg-amber-500/25 rounded-lg shadow-xs border border-amber-500/40"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <PiggyBank
                    size={16}
                    className={activeTab === 'savings' ? 'text-amber-400' : 'text-neutral-400'}
                  />
                  <span>{t('budget.savings')}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === 'savings' ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {savings.length}
                  </span>
                </span>
              </button>
            </div>
          </LayoutGroup>
        </div>

        {/* Sliding 2-Panel Carousel Container */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">
          {formError && (
            <div className="mx-4 mt-2 mb-1 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-bold flex items-center gap-2 shrink-0">
              <AlertCircle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <motion.div
            className="flex w-[200%] flex-1 h-full min-h-0"
            animate={{ x: activeTab === 'budget' ? '0%' : '-50%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* PANEL 1: HẠN MỨC CHI TIÊU */}
            <div className="w-1/2 h-full overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {/* Form Add or Edit Budget */}
              {isAddingBudget || editingBudget ? (
                <form
                  onSubmit={handleSaveBudget}
                  className="bg-[#181818] p-4 rounded-2xl border border-neutral-700 space-y-3 shadow-md animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      {editingBudget
                        ? `${t('budget.edit_budget')}: ${tCategory(editingBudget.categoryName)}`
                        : t('budget.add_budget')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBudget(false);
                        setEditingBudget(null);
                        setFormError('');
                      }}
                      className="text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>

                  {!editingBudget && (
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1.5">
                        {t('budget.select_category')}
                      </label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 bg-[#121212] rounded-xl border border-neutral-800/80">
                        {availableCategoriesForBudget.length === 0 ? (
                          <div className="col-span-2 text-center text-xs text-neutral-500 py-3">
                            {t('budget.no_categories_left')}
                          </div>
                        ) : (
                          availableCategoriesForBudget.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedCategoryId(cat.id)}
                              className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold text-left transition-all cursor-pointer ${
                                selectedCategoryId === cat.id
                                  ? 'bg-white/15 border-white text-white shadow-xs'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                              }`}
                            >
                              <CategoryIcon category={cat.id} size={15} showBackground={false} />
                              <span className="truncate">{tCategory(cat.name)}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      {t('budget.limit_amount')}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="3.000.000"
                        value={
                          budgetLimitInput
                            ? parseAmountInput(budgetLimitInput).toLocaleString('vi-VN')
                            : ''
                        }
                        onChange={(e) => setBudgetLimitInput(e.target.value)}
                        className="w-full bg-[#121212] border border-neutral-800 rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-white font-bold font-mono focus:outline-none focus:border-white transition-all"
                      />
                      <span className="absolute right-3 text-xs font-bold text-neutral-400">₫</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={!editingBudget && !selectedCategoryId}
                      className="w-full py-2.5 bg-white text-black hover:bg-neutral-200 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 active:scale-98 shadow-md"
                    >
                      {editingBudget ? t('budget.save_changes') : t('budget.create_budget_btn')}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBudget(true);
                    setEditingBudget(null);
                    setBudgetLimitInput('');
                    if (availableCategoriesForBudget.length > 0) {
                      setSelectedCategoryId(availableCategoriesForBudget[0].id);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 hover:border-neutral-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-xs"
                >
                  <Plus size={16} />
                  <span>{t('budget.add_budget')}</span>
                </button>
              )}

              {/* List of Budgets */}
              <div className="space-y-2">
                {budgets.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 bg-[#181818] border border-neutral-800/80 rounded-2xl flex items-center justify-between hover:border-neutral-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        category={b.categoryId || b.categoryName}
                        size={20}
                        showBackground={false}
                      />
                      <div>
                        <div className="text-xs font-black text-white">{tCategory(b.categoryName)}</div>
                        <div className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                          {t('budget.limit_label')}{' '}
                          <span className="text-white font-extrabold font-mono">
                            {formatVND(b.limitAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditBudget(b)}
                        className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBudget(b.id, b.categoryName)}
                        className="p-2 rounded-xl hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        title={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PANEL 2: MỤC TIÊU TIẾT KIỆM */}
            <div className="w-1/2 h-full overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {/* Form Add or Edit Savings Goal */}
              {isAddingSavings || editingSavings ? (
                <form
                  onSubmit={handleSaveSavings}
                  className="bg-[#181818] p-4 rounded-2xl border border-neutral-700 space-y-3 shadow-md animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <PiggyBank size={14} />
                      {editingSavings ? t('budget.edit_savings') : t('budget.add_savings')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSavings(false);
                        setEditingSavings(null);
                        setFormError('');
                      }}
                      className="text-neutral-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      {t('budget.goal_name')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mua xe máy, Quỹ khẩn cấp"
                      value={savingsNameInput}
                      onChange={(e) => setSavingsNameInput(e.target.value)}
                      className="w-full bg-[#121212] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        {t('budget.target_amount')}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="10.000.000"
                          value={
                            savingsTargetInput
                              ? parseAmountInput(savingsTargetInput).toLocaleString('vi-VN')
                              : ''
                          }
                          onChange={(e) => setSavingsTargetInput(e.target.value)}
                          className="w-full bg-[#121212] border border-neutral-800 rounded-xl pl-3 pr-7 py-2.5 text-xs text-white font-bold font-mono focus:outline-none focus:border-amber-400 transition-all"
                        />
                        <span className="absolute right-2.5 text-[10px] font-bold text-neutral-400">₫</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        {t('budget.current_amount')}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="4.000.000"
                          value={
                            savingsCurrentInput
                              ? parseAmountInput(savingsCurrentInput).toLocaleString('vi-VN')
                              : ''
                          }
                          onChange={(e) => setSavingsCurrentInput(e.target.value)}
                          className="w-full bg-[#121212] border border-neutral-800 rounded-xl pl-3 pr-7 py-2.5 text-xs text-white font-bold font-mono focus:outline-none focus:border-amber-400 transition-all"
                        />
                        <span className="absolute right-2.5 text-[10px] font-bold text-neutral-400">₫</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-400 text-black hover:bg-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-98 shadow-md"
                    >
                      {editingSavings ? t('budget.save_changes') : t('budget.create_savings_btn')}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingSavings(true);
                    setEditingSavings(null);
                    setSavingsNameInput('');
                    setSavingsTargetInput('');
                    setSavingsCurrentInput('0');
                  }}
                  className="w-full py-2.5 px-4 bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 hover:border-neutral-700 text-amber-400 hover:text-amber-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-xs"
                >
                  <Plus size={16} />
                  <span>{t('budget.add_savings')}</span>
                </button>
              )}

              {/* List of Savings Goals */}
              <div className="space-y-2">
                {savings.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-[#181818] border border-neutral-800/80 rounded-2xl flex items-center justify-between hover:border-neutral-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <PiggyBank size={20} className="text-amber-400 shrink-0" strokeWidth={2.2} />
                      <div>
                        <div className="text-xs font-black text-white">{s.name}</div>
                        <div className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                          <span className="text-amber-400 font-extrabold font-mono">
                            {formatVND(s.currentAmount)}
                          </span>{' '}
                          /{' '}
                          <span className="font-mono text-neutral-300">
                            {formatVND(s.targetAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditSavings(s)}
                        className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title={t('common.edit')}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavings(s.id, s.name)}
                        className="p-2 rounded-xl hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        title={t('common.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
