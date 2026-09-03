import React, { useEffect, useRef, useState } from 'react';
import { Layers, PieChart, Plus, Settings, User, Users } from 'lucide-react';
import { type ActiveTab } from '../types';
import { motion, useMotionValue, useSpring, useVelocity, useTransform } from 'motion/react';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenAddTransaction: () => void;
}

const TAB_ORDER: ActiveTab[] = ['flow', 'statistics', 'profile', 'debts', 'settings'];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddTransaction,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const isInitialRender = useRef(true);

  const [hoverTab, setHoverTab] = useState<ActiveTab | null>(null);
  const isPressingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 1. Core Horizontal Position Tracking
  const blobX = useMotionValue(0);
  const animatedX = useSpring(blobX, { stiffness: 420, damping: 32, mass: 0.5 });
  const velocityX = useVelocity(animatedX);

  // 2. Velocity-based deformation (Dynamic fluid elongation during drag / jump)
  const velScaleX = useTransform(velocityX, [-700, 0, 700], [1.3, 1, 1.3]);
  const velScaleY = useTransform(velocityX, [-700, 0, 700], [0.8, 1, 0.8]);

  // 3. Press-based "Swell" deformation (Liquid Glass expands outwards and breaks past island borders)
  const pressTargetX = useMotionValue(1);
  const pressTargetY = useMotionValue(1);
  const pressScaleX = useSpring(pressTargetX, { stiffness: 350, damping: 22, mass: 0.5 });
  const pressScaleY = useSpring(pressTargetY, { stiffness: 350, damping: 22, mass: 0.5 });

  // 4. Combined Scale outputs
  const finalScaleX = useTransform([pressScaleX, velScaleX], ([p, v]: number[]) => p * v);
  const finalScaleY = useTransform([pressScaleY, velScaleY], ([p, v]: number[]) => p * v);

  const getTabCenter = (tab: ActiveTab): number => {
    const el = tabsRef.current[tab];
    const navEl = navRef.current;
    if (el && navEl) {
      const rect = el.getBoundingClientRect();
      const navRect = navEl.getBoundingClientRect();
      return rect.left - navRect.left + rect.width / 2;
    }
    return 0;
  };

  const getNearestTab = (currentX: number): ActiveTab => {
    let nearest = activeTab;
    let minDistance = Infinity;
    TAB_ORDER.forEach((tab) => {
      const center = getTabCenter(tab);
      if (center > 0) {
        const dist = Math.abs(center - currentX);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = tab;
        }
      }
    });
    return nearest;
  };

  const updateBlobPosition = (tab: ActiveTab) => {
    const centerX = getTabCenter(tab);
    if (centerX > 0) {
      if (isInitialRender.current) {
        blobX.set(centerX);
        animatedX.set(centerX);
        isInitialRender.current = false;
      } else {
        blobX.set(centerX);
      }
    }
  };

  useEffect(() => {
    if (!isPressingRef.current) {
      requestAnimationFrame(() => updateBlobPosition(activeTab));
    }
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => updateBlobPosition(activeTab);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('#nav-btn-add-transaction')) return;

    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;

    isPressingRef.current = true;
    dragStartXRef.current = touchX;
    isDraggingRef.current = false;

    // SWELL: Instantly trigger spring outwards beyond Island border (1.35x horizontal, 1.85x vertical)
    pressTargetX.set(1.35);
    pressTargetY.set(1.85);

    const touchedTab = getNearestTab(touchX);
    setHoverTab(touchedTab);

    const targetCenter = getTabCenter(touchedTab);
    if (targetCenter > 0) {
      blobX.set(targetCenter);
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressingRef.current) return;
    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;

    if (Math.abs(touchX - dragStartXRef.current) > 3) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      // Continuously glide following the finger with no stepping
      const clampedX = Math.max(30, Math.min(navRect.width - 30, touchX));
      blobX.set(clampedX);

      const currentNearest = getNearestTab(clampedX);
      setHoverTab(currentNearest);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // SPRING: Spring back to normal scale
    pressTargetX.set(1);
    pressTargetY.set(1);

    const navEl = navRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;

    const chosenTab = getNearestTab(touchX);
    const targetCenter = getTabCenter(chosenTab);
    if (targetCenter > 0) {
      blobX.set(targetCenter);
    }

    setHoverTab(null);

    if (chosenTab !== activeTab) {
      onChangeTab(chosenTab);
    }
  };

  const NavItem = ({ tab, Icon, label }: { tab: ActiveTab; Icon: any; label: string }) => {
    const isCurrentActive = activeTab === tab;
    const isHovered = hoverTab === tab;
    const isVisuallyActive = hoverTab !== null ? isHovered : isCurrentActive;

    return (
      <button
        ref={(el) => { tabsRef.current[tab] = el; }}
        id={`nav-btn-${tab}`}
        type="button"
        className="relative flex items-center justify-center flex-1 h-full cursor-pointer outline-none touch-manipulation z-10 select-none"
        aria-label={label}
        title={label}
      >
        <motion.div
          animate={{ scale: isVisuallyActive ? 1.18 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={`p-2 transition-colors flex items-center justify-center ${
            isVisuallyActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Icon size={22} strokeWidth={isVisuallyActive ? 2.5 : 2} />
        </motion.div>
      </button>
    );
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center px-4 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <div className="relative w-full max-w-[500px] flex flex-col items-end gap-2.5 pointer-events-none">
        {/* Floating Add (+) Button on the top-right of the island with clear separation */}
        <div className="pointer-events-auto pr-3">
          <motion.button
            id="nav-btn-add-transaction"
            onClick={onOpenAddTransaction}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-13 h-13 rounded-full bg-white text-black shadow-[0_4px_18px_rgba(255,255,255,0.22)] flex items-center justify-center cursor-pointer outline-none touch-manipulation border-2 border-black"
            aria-label="Thêm mới"
            title="Thêm mới"
          >
            <Plus size={24} strokeWidth={3.5} />
          </motion.button>
        </div>

        {/* The 5-Tab Island Navigation */}
        <nav
          ref={navRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full border rounded-full touch-none pointer-events-auto p-1.5 transition-all flex items-center relative overflow-visible"
          style={{
            height: '68px',
            backgroundColor: 'rgba(255, 255, 255, var(--glass-bg-opacity))',
            backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            borderColor: 'rgba(255, 255, 255, var(--glass-border-opacity))',
            boxShadow: '0 15px 35px rgba(0, 0, 0, var(--glass-shadow-opacity)), inset 0 1px 1px rgba(255, 255, 255, var(--glass-inner-reflection)), 0 0 var(--glass-glow-size) var(--glass-glow-color)',
            transform: 'scale(var(--island-scale))',
          }}
        >
          {/* LIQUID WATER DROPLET INDICATOR */}
          <motion.div
            style={{
              x: animatedX,
              scaleX: finalScaleX,
              scaleY: finalScaleY,
              width: 70,
              height: 46,
              willChange: 'transform',
            }}
            className="absolute top-1/2 left-0 -mt-[23px] -ml-[35px] rounded-full z-0 pointer-events-none overflow-visible"
          >
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.02) 65%, rgba(255, 255, 255, 0.05) 100%)',
                backdropFilter: 'blur(20px) saturate(190%) contrast(105%)',
                WebkitBackdropFilter: 'blur(20px) saturate(190%) contrast(105%)',
                border: '0.5px solid rgba(255, 255, 255, 0.16)',
                boxShadow: 'inset 0 1px 1.5px rgba(255, 255, 255, 0.30), inset 0 -1px 2px rgba(255, 255, 255, 0.08), inset 0 0 8px rgba(255, 255, 255, 0.02), 0 8px 20px -4px rgba(0, 0, 0, 0.30), 0 2px 5px rgba(0, 0, 0, 0.12)',
              }}
            />
          </motion.div>

          {/* 5 Tabs from Left to Right: Dòng tiền -> Thống kê -> Cá nhân -> Công nợ -> Cài đặt */}
          <div className="flex items-center justify-between relative px-1 w-full z-10 pointer-events-none">
            <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="flow" Icon={Layers} label="Dòng tiền" /></div>
            <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="statistics" Icon={PieChart} label="Thống kê" /></div>
            <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="profile" Icon={User} label="Cá nhân" /></div>
            <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="debts" Icon={Users} label="Công nợ" /></div>
            <div className="flex-1 flex justify-center pointer-events-auto"><NavItem tab="settings" Icon={Settings} label="Cài đặt" /></div>
          </div>
        </nav>
      </div>
    </div>
  );
};



