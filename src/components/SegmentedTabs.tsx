import React, { useRef } from 'react';
import { motion, LayoutGroup } from 'motion/react';

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
 * Exactly matches the look, feel, spring physics (stiffness: 500, damping: 38),
 * and touch/pointer sliding interaction of the time filter container in StatisticsView.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const pyClass =
    size === 'sm'
      ? 'py-1 px-2 text-xs'
      : size === 'lg'
      ? 'py-2 px-3 text-sm'
      : 'py-1.5 px-2.5 text-xs sm:text-sm';

  const updateFromPointer = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * tabs.length);
    const selected = tabs[targetIdx]?.id;
    if (selected && selected !== activeId) {
      onChange(selected);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <LayoutGroup id={layoutId}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`flex items-center justify-between gap-1.5 bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800 relative touch-none select-none ${
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
    </LayoutGroup>
  );
}
