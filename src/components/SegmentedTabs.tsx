import React from 'react';
import { motion } from 'motion/react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: React.ReactNode;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: readonly TabItem<T>[] | TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  layoutId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  activeBgClassName?: string;
  activeTextColor?: string;
}

/**
 * Design System Standard SegmentedTabs Component
 * Mirrors the smooth spring-sliding pill transition from StatisticsView (Tuần - Tháng - Năm - Tùy chọn)
 */
export function SegmentedTabs<T extends string = string>({
  tabs,
  activeId,
  onChange,
  layoutId,
  className = '',
  size = 'md',
  fullWidth = true,
  activeBgClassName = 'bg-white',
  activeTextColor = 'text-black font-extrabold',
}: SegmentedTabsProps<T>) {
  const pyClass =
    size === 'sm'
      ? 'py-1 px-2 text-xs'
      : size === 'lg'
      ? 'py-2 px-3 text-sm'
      : 'py-1.5 px-2.5 text-xs sm:text-sm';

  return (
    <div
      className={`bg-[#1a1a1a] rounded-xl p-1 border border-neutral-800 flex items-center shadow-xs select-none relative ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 ${pyClass} rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              isActive ? activeTextColor : 'text-neutral-300 hover:text-white'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className={`absolute inset-0 ${activeBgClassName} rounded-lg shadow-xs`}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5 truncate">
              {Icon && (
                <Icon
                  size={size === 'sm' ? 14 : 16}
                  className={`shrink-0 ${isActive ? 'text-black' : 'text-neutral-400'}`}
                />
              )}
              <span>{tab.label}</span>
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
