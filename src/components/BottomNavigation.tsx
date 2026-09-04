import React, { useEffect, useRef, useState } from 'react';
import { Layers, PieChart, Plus, Settings, User, Users } from 'lucide-react';
import { type ActiveTab } from '../types';
import { motion, useMotionValue, useSpring, useVelocity, useTransform } from 'motion/react';
import { useLiquidGlass } from '../context/LiquidGlassContext';

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
  const { config } = useLiquidGlass();
  const navRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const isInitialRender = useRef(true);

  const [hoverTab, setHoverTab] = useState<ActiveTab | null>(null);
  const isPressingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 1. Core Horizontal Position Tracking
  const blobX = useMotionValue(0);
  const animatedX = useSpring(blobX, {
    stiffness: config.activeTab.moveStiffness,
    damping: config.activeTab.moveDamping,
    mass: 0.5,
  });
  const velocityX = useVelocity(animatedX);

  // 2. Velocity-based deformation (Dynamic fluid elongation during drag / jump)
  const velScaleX = useTransform(velocityX, [-700, 0, 700], [1.3, 1, 1.3]);
  const velScaleY = useTransform(velocityX, [-700, 0, 700], [0.8, 1, 0.8]);

  // 3. Press-based "Swell" deformation (Liquid Glass expands outwards and breaks past island borders)
  const pressTargetX = useMotionValue(1);
  const pressTargetY = useMotionValue(1);
  const pressScaleX = useSpring(pressTargetX, {
    stiffness: config.activeTab.pressStiffness,
    damping: config.activeTab.pressDamping,
    mass: 0.5,
  });
  const pressScaleY = useSpring(pressTargetY, {
    stiffness: config.activeTab.pressStiffness,
    damping: config.activeTab.pressDamping,
    mass: 0.5,
  });

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

    // SWELL: Instantly trigger spring outwards using config swell parameters
    pressTargetX.set(config.activeTab.swellScaleX);
    pressTargetY.set(config.activeTab.swellScaleY);

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

  // Main Island styles calculated from config
  const islandBorderRadius = config.island.isCustomCorners
    ? `${config.island.cornerTopLeft}px ${config.island.cornerTopRight}px ${config.island.cornerBottomRight}px ${config.island.cornerBottomLeft}px`
    : `${config.island.borderRadius}px`;

  const islandStyle: React.CSSProperties = {
    width: `${config.island.widthPercent}%`,
    minWidth: `${config.island.minWidth}px`,
    maxWidth: `${config.island.maxWidth}px`,
    height: `${config.island.height}px`,
    paddingLeft: `${config.island.paddingX}px`,
    paddingRight: `${config.island.paddingX}px`,
    paddingTop: `${config.island.paddingY}px`,
    paddingBottom: `${config.island.paddingY}px`,
    borderRadius: islandBorderRadius,
    backgroundColor: `rgba(255, 255, 255, ${config.island.bgOpacity})`,
    backdropFilter: `blur(${config.island.blur}px) saturate(${config.island.saturation}%) brightness(${config.island.brightness}%) contrast(${config.island.contrast}%)`,
    WebkitBackdropFilter: `blur(${config.island.blur}px) saturate(${config.island.saturation}%) brightness(${config.island.brightness}%) contrast(${config.island.contrast}%)`,
    borderWidth: `${config.island.borderWidth}px`,
    borderStyle: config.island.borderWidth > 0 ? 'solid' : 'none',
    borderColor: `rgba(255, 255, 255, ${config.island.borderOpacity})`,
    boxShadow: [
      `${config.island.shadowX}px ${config.island.shadowY}px ${config.island.shadowBlur}px ${config.island.shadowRadius}px rgba(0, 0, 0, ${config.island.shadowOpacity})`,
      `inset 0 1px 1px rgba(255, 255, 255, ${config.island.innerBorderOpacity})`,
      config.island.outerGlowSize > 0 ? `0 0 ${config.island.outerGlowSize}px ${config.island.outerGlowColor}` : '',
    ].filter(Boolean).join(', '),
    transform: `translateX(${config.island.positionX}px) scale(${config.island.scale})`,
    transition: `background-color ${config.island.transitionDuration}ms ease, backdrop-filter ${config.island.transitionDuration}ms ease, border-color ${config.island.transitionDuration}ms ease, box-shadow ${config.island.transitionDuration}ms ease`,
  };

  const dropletWidth = config.activeTab.width;
  const dropletHeight = config.activeTab.height;
  const dropletOffsetX = config.activeTab.offsetX;
  const dropletOffsetY = config.activeTab.offsetY;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center px-4 pointer-events-none"
      style={{ paddingBottom: `max(env(safe-area-inset-bottom), ${config.island.bottomOffset}px)` }}
    >
      <div className="relative w-full max-w-[500px] flex flex-col items-end gap-2.5 pointer-events-none">
        {/* Floating Action: + Button */}
        <div className="pointer-events-auto pr-3 flex flex-col items-center">
          <motion.button
            id="nav-btn-add-transaction"
            onClick={onOpenAddTransaction}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-[70px] h-[70px] rounded-full bg-white text-black shadow-[0_4px_18px_rgba(255,255,255,0.22)] flex items-center justify-center cursor-pointer outline-none touch-manipulation border-none"
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
          className="w-full border rounded-full touch-none pointer-events-auto transition-all flex items-center relative overflow-visible"
          style={islandStyle}
        >
          {/* LIQUID WATER DROPLET INDICATOR */}
          <motion.div
            style={{
              x: animatedX,
              scaleX: finalScaleX,
              scaleY: finalScaleY,
              width: dropletWidth,
              height: dropletHeight,
              marginTop: `calc(-${dropletHeight / 2}px + ${dropletOffsetY}px)`,
              marginLeft: `calc(-${dropletWidth / 2}px + ${dropletOffsetX}px)`,
              willChange: 'transform',
            }}
            className="absolute top-1/2 left-0 rounded-full z-0 pointer-events-none overflow-visible"
          >
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                borderRadius: `${config.activeTab.borderRadius}px`,
                background: `radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, ${config.activeTab.bgOpacity}) 0%, rgba(255, 255, 255, 0.02) 65%, rgba(255, 255, 255, 0.05) 100%)`,
                backdropFilter: `blur(${config.activeTab.blur}px) saturate(${config.activeTab.saturation}%) contrast(${config.activeTab.contrast}%)`,
                WebkitBackdropFilter: `blur(${config.activeTab.blur}px) saturate(${config.activeTab.saturation}%) contrast(${config.activeTab.contrast}%)`,
                border: `${config.activeTab.borderWidth}px solid rgba(255, 255, 255, ${config.activeTab.borderOpacity})`,
                boxShadow: `inset 0 1px 1.5px rgba(255, 255, 255, ${config.activeTab.innerBorder}), inset 0 -1px 2px rgba(255, 255, 255, ${config.activeTab.outerBorder}), inset 0 0 ${config.activeTab.innerGlow}px rgba(255, 255, 255, 0.02), ${config.activeTab.shadowX}px ${config.activeTab.shadowY}px ${config.activeTab.shadowBlur}px ${config.activeTab.shadowSpread}px rgba(0, 0, 0, ${config.activeTab.shadowOpacity})`,
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




