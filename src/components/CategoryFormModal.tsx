import React, { useState, useMemo } from 'react';
import { X, Check, Search } from 'lucide-react';
import { type Category, type TransactionType } from '../types';
import { CATEGORY_ICON_DEFINITIONS, DEFAULT_CATEGORY_PALETTE, CATEGORY_ICON_MAP } from '../utils/categoryIcons';
import { createCategory, updateCategory } from '../services/categoryService';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  initialType?: TransactionType;
  onSuccess: (cat: Category, isEdit: boolean) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  initialType = 'expense',
  onSuccess,
}) => {
  const isEditing = Boolean(categoryToEdit);

  const [name, setName] = useState(categoryToEdit?.name || '');
  const [type, setType] = useState<TransactionType>(categoryToEdit?.type || initialType);
  const [iconName, setIconName] = useState(
    categoryToEdit?.iconName || (type === 'income' ? 'Briefcase' : 'UtensilsCrossed')
  );
  const [color, setColor] = useState(
    categoryToEdit?.color || (type === 'income' ? '#10b981' : '#f97316')
  );
  const [iconSearch, setIconSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if categoryToEdit changes
  React.useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setIconName(categoryToEdit.iconName);
      setColor(categoryToEdit.color);
    } else {
      setName('');
      setType(initialType);
      setIconName(initialType === 'income' ? 'Briefcase' : 'UtensilsCrossed');
      setColor(initialType === 'income' ? '#10b981' : '#f97316');
    }
    setError(null);
    setIconSearch('');
  }, [categoryToEdit, initialType, isOpen]);

  // Unique groups for icon filter
  const iconGroups = useMemo(() => {
    const groups = new Set<string>();
    CATEGORY_ICON_DEFINITIONS.forEach((d) => groups.add(d.group));
    return ['all', ...Array.from(groups)];
  }, []);

  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    return CATEGORY_ICON_DEFINITIONS.filter((item) => {
      const matchesSearch =
        !query ||
        item.label.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query);
      const matchesGroup = selectedGroup === 'all' || item.group === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [iconSearch, selectedGroup]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditing && categoryToEdit) {
        const updated = await updateCategory(categoryToEdit.id, {
          name: name.trim(),
          iconName,
          color,
          bgColor: `${color}33`,
        });
        onSuccess(updated, true);
      } else {
        const created = await createCategory({
          name: name.trim(),
          type,
          iconName,
          color,
          bgColor: `${color}33`,
        });
        onSuccess(created, false);
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu danh mục';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIconComponent = CATEGORY_ICON_MAP[iconName] || CATEGORY_ICON_MAP['MoreHorizontal'];

  return (
    <div
      id="category-form-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="category-form-dialog"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Type Selector (only enabled for new category) */}
          {!isEditing ? (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Loại danh mục
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    if (!categoryToEdit) {
                      setColor('#f97316');
                      setIconName('UtensilsCrossed');
                    }
                  }}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                    type === 'expense'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Khoản Chi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    if (!categoryToEdit) {
                      setColor('#10b981');
                      setIconName('Briefcase');
                    }
                  }}
                  className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Khoản Thu
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs text-neutral-400">
              <span>Loại danh mục:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md ${
                  type === 'expense'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {type === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}
              </span>
            </div>
          )}

          {/* Live Preview Box */}
          <div className="p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-colors"
                style={{ backgroundColor: color }}
              >
                {SelectedIconComponent && (
                  <SelectedIconComponent size={24} color="#ffffff" strokeWidth={2.2} />
                )}
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Xem trước hiển thị</span>
                <span className="text-base font-bold text-white">
                  {name.trim() || 'Tên danh mục'}
                </span>
              </div>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: `${color}88` }}
            >
              {type === 'expense' ? 'Chi' : 'Thu'}
            </span>
          </div>

          {/* Category Name Input */}
          <div>
            <label
              htmlFor="category-name-input"
              className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2"
            >
              Tên danh mục <span className="text-rose-500">*</span>
            </label>
            <input
              id="category-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cà phê, Xăng xe, Tiền thưởng..."
              maxLength={40}
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-hidden focus:border-white focus:ring-1 focus:ring-white text-sm"
              autoFocus
            />
            {isEditing && (
              <p className="mt-1.5 text-xs text-amber-400/90 leading-relaxed">
                💡 Khi đổi tên, các giao dịch cũ đang dùng danh mục này sẽ tự động hiển thị tên mới.
              </p>
            )}
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Màu nền danh mục (Icon luôn màu trắng)
            </label>
            <div className="grid grid-cols-8 gap-2.5">
              {DEFAULT_CATEGORY_PALETTE.map((c) => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 relative"
                    style={{ backgroundColor: c }}
                  >
                    {isSelected && (
                      <Check size={18} color="#ffffff" strokeWidth={3} className="drop-shadow-md" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Chọn biểu tượng ({filteredIcons.length})
              </label>
            </div>

            {/* Search and Group filter */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Tìm kiếm icon (vd: ăn, xe, nhà, gym, vé...)"
                  className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white"
                />
              </div>

              {/* Group pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {iconGroups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setSelectedGroup(grp)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                      selectedGroup === grp
                        ? 'bg-white text-black font-semibold'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {grp === 'all' ? 'Tất cả' : grp}
                  </button>
                ))}
              </div>
            </div>

            {/* Icons Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-neutral-950 rounded-2xl border border-neutral-800">
              {filteredIcons.map((item) => {
                const IconComp = item.component;
                const isSelected = iconName === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIconName(item.name)}
                    title={item.label}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-white/20 border border-white text-white shadow-sm scale-105'
                        : 'hover:bg-neutral-800/80 text-neutral-300'
                    }`}
                  >
                    <IconComp size={20} color="#ffffff" strokeWidth={2.2} />
                  </button>
                );
              })}
              {filteredIcons.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-neutral-500">
                  Không tìm thấy icon phù hợp
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-neutral-200 transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo danh mục'}
          </button>
        </div>
      </div>
    </div>
  );
};
