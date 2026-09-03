import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { type CategoryInfo, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../types';
import { findCategoryInCache } from '../services/categoryService';
import { CATEGORY_ICON_MAP } from '../utils/categoryIcons';

interface CategoryIconProps {
  category: string;
  type?: 'income' | 'expense';
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export const getCategoryInfo = (categoryNameOrId: string, type?: 'income' | 'expense'): CategoryInfo => {
  if (!categoryNameOrId) {
    return {
      name: 'Khác',
      iconName: 'MoreHorizontal',
      color: '#64748b',
      bgColor: 'rgba(100, 116, 139, 0.25)',
    };
  }

  // 1. Try dynamic cache (user custom categories + defaults)
  const cached = findCategoryInCache(categoryNameOrId, type);
  if (cached) {
    return {
      id: cached.id,
      name: cached.name,
      type: cached.type,
      iconName: cached.iconName,
      color: cached.color,
      bgColor: cached.bgColor || `${cached.color}33`,
      isDefault: cached.isDefault,
      order: cached.order,
    };
  }

  // 2. Fallback to default lists
  const pool =
    type === 'income'
      ? DEFAULT_INCOME_CATEGORIES
      : type === 'expense'
      ? DEFAULT_EXPENSE_CATEGORIES
      : [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

  const target = categoryNameOrId.trim().toLowerCase();
  const found = pool.find((c) => c.name.toLowerCase() === target || c.id === categoryNameOrId);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      type: found.type,
      iconName: found.iconName,
      color: found.color,
      bgColor: found.bgColor,
      isDefault: true,
      order: found.order,
    };
  }

  return {
    name: categoryNameOrId,
    iconName: 'MoreHorizontal',
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.25)',
  };
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  type,
  size = 20,
  className = '',
  showBackground = true,
}) => {
  const info = getCategoryInfo(category, type);
  const IconComponent = CATEGORY_ICON_MAP[info.iconName] || MoreHorizontal;

  // Render the icon with white color (#ffffff) per requirement 6
  const renderIcon = (iconSize: number) => {
    return <IconComponent size={iconSize} color="#ffffff" strokeWidth={2.2} className="shrink-0" />;
  };

  if (!showBackground) {
    // Compact colored pill badge with white icon
    return (
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${className}`}
        style={{ backgroundColor: info.color }}
      >
        {renderIcon(size > 16 ? 16 : size)}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl p-2.5 shrink-0 shadow-xs transition-transform ${className}`}
      style={{ backgroundColor: info.color }}
    >
      {renderIcon(size)}
    </div>
  );
};
