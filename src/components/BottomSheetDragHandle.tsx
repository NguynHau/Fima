import React from 'react';

interface BottomSheetDragHandleProps {
  isHandleActive: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchCancel?: (e: React.TouchEvent<HTMLDivElement>) => void;
  className?: string;
}

export const BottomSheetDragHandle: React.FC<BottomSheetDragHandleProps> = ({
  isHandleActive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  className = '',
}) => {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className={`w-full flex items-center justify-center py-2 px-8 -my-1 cursor-grab active:cursor-grabbing select-none group touch-none relative ${className}`}
      title="Kéo xuống để đóng"
      aria-label="Kéo xuống để đóng"
    >
      {/* Background glowing luminous halo when touched / active */}
      <div
        className={`absolute inset-x-12 h-6 rounded-full transition-all duration-200 pointer-events-none blur-md ${
          isHandleActive
            ? 'opacity-100 bg-gradient-to-r from-purple-400/60 via-pink-400/80 to-purple-400/60 scale-x-125 scale-y-125'
            : 'opacity-0 group-hover:opacity-40 bg-white/25'
        }`}
      />

      {/* Central handle bar with glowing highlight on touch */}
      <div
        className={`h-1.5 rounded-full transition-all duration-200 pointer-events-none relative z-10 ${
          isHandleActive
            ? 'w-14 bg-white shadow-[0_0_14px_rgba(255,255,255,0.95),0_0_24px_rgba(236,72,153,0.85)] ring-2 ring-white/70 scale-105'
            : 'w-10 bg-neutral-600/90 group-hover:bg-neutral-300 group-hover:w-12 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.4)]'
        }`}
      />
    </div>
  );
};
