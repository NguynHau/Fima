import React from 'react';
import {
  UtensilsCrossed,
  Car,
  ShoppingBag,
  Receipt,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Home,
  MoreHorizontal,
  Briefcase,
  Award,
  Laptop,
  Gift,
  Store,
  TrendingUp,
} from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type CategoryInfo } from '../types';

interface CategoryIconProps {
  category: string;
  type?: 'income' | 'expense';
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export const getCategoryInfo = (categoryName: string, type?: 'income' | 'expense'): CategoryInfo => {
  const pool = type === 'income' 
    ? INCOME_CATEGORIES 
    : type === 'expense' 
      ? EXPENSE_CATEGORIES 
      : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  const found = pool.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  if (found) return found;

  return {
    name: categoryName,
    iconName: 'MoreHorizontal',
    color: '#64748b',
    bgColor: '#f1f5f9',
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

  const renderIcon = () => {
    const iconProps = { size, color: info.color, strokeWidth: 2.2 };
    switch (info.iconName) {
      case 'UtensilsCrossed':
        return <UtensilsCrossed {...iconProps} />;
      case 'Car':
        return <Car {...iconProps} />;
      case 'ShoppingBag':
        return <ShoppingBag {...iconProps} />;
      case 'Receipt':
        return <Receipt {...iconProps} />;
      case 'Gamepad2':
        return <Gamepad2 {...iconProps} />;
      case 'HeartPulse':
        return <HeartPulse {...iconProps} />;
      case 'GraduationCap':
        return <GraduationCap {...iconProps} />;
      case 'Home':
        return <Home {...iconProps} />;
      case 'Briefcase':
        return <Briefcase {...iconProps} />;
      case 'Award':
        return <Award {...iconProps} />;
      case 'Laptop':
        return <Laptop {...iconProps} />;
      case 'Gift':
        return <Gift {...iconProps} />;
      case 'Store':
        return <Store {...iconProps} />;
      case 'TrendingUp':
        return <TrendingUp {...iconProps} />;
      default:
        return <MoreHorizontal {...iconProps} />;
    }
  };

  if (!showBackground) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{renderIcon()}</span>;
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl p-2.5 shrink-0 ${className}`}
      style={{ backgroundColor: info.bgColor }}
    >
      {renderIcon()}
    </div>
  );
};
