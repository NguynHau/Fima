import React, { useEffect, useRef, useState } from 'react';
import { Layers, PieChart, Plus, Settings, User, Users } from 'lucide-react';
import { type ActiveTab } from '../types';
import { motion, useMotionValue, useSpring, useVelocity, useTransform } from 'motion/react';
import { useLiquidGlass } from '../context/LiquidGlassContext';
import { getSvgGradientCoords, getReflectedEdgeBoxShadow } from '../utils/liquidGlassOptical';

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
  const navWidthRef = useRef<number>(500);

  const [hoverTab, setHoverTab] = useState<ActiveTab | null>(null);
  const isPressingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 1. Core Horizontal Position Tracking
  const blobX = useMotionValue(0);
  const animatedX = useSpring(blobX, {
    stiffness: config.activeTab.moveStiffness,
    damping: config.activeTab.moveDamping,
    mass: config.activeTab.moveMass ?? 0.5,
  });
  const velocityX = useVelocity(animatedX);

  // 2. Velocity-based deformation (Dynamic fluid elongation during drag / jump)
  const vStretch = config.activeTab.velocityStretch ?? 1.3;
  const vSquash = config.activeTab.velocitySquash ?? 0.8;
  const velScaleX = useTransform(velocityX, [-700, 0, 700], [vStretch, 1, vStretch]);
  const velScaleY = useTransform(velocityX, [-700, 0, 700], [vSquash, 1, vSquash]);

  // 3. Press-based "Swell" deformation (Liquid Glass expands outwards and breaks past island borders)
  const pressTargetX = useMotionValue(1);
  const pressTargetY = useMotionValue(1);
  const pressScaleX = useSpring(pressTargetX, {
    stiffness: config.activeTab.pressStiffness,
    damping: config.activeTab.pressDamping,
    mass: config.activeTab.pressMass ?? 0.5,
  });
  const pressScaleY = useSpring(pressTargetY, {
    stiffness: config.activeTab.pressStiffness,
    damping: config.activeTab.pressDamping,
    mass: config.activeTab.pressMass ?? 0.5,
  });

  // 4. Combined Scale outputs
  const finalScaleX = useTransform([pressScaleX, velScaleX], ([p, v]: number[]) => p * v);
  const finalScaleY = useTransform([pressScaleY, velScaleY], ([p, v]: number[]) => p * v);

  const dropletWidth = config.activeTab.width;
  const dropletHeight = config.activeTab.height;
  const dropletOffsetX = config.activeTab.offsetX;
  const dropletOffsetY = config.activeTab.offsetY;
  const dropletRadius = config.activeTab.borderRadius;

  // Measure and track island container width for responsive pixel-perfect clipping
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          navWidthRef.current = entry.contentRect.width;
        }
      }
    });
    ro.observe(el);
    if (el.offsetWidth > 0) {
      navWidthRef.current = el.offsetWidth;
    }
    return () => ro.disconnect();
  }, []);

  // 5. Dynamic Droplet Mask / Clip-Path
  // The purple-to-pink gradient layer is strictly clipped by this exact droplet silhouette.
  // It follows position (animatedX), stretch/squash (finalScaleX/Y), and press swell continuously.
  const dropletClipPath = useTransform(
    [animatedX, finalScaleX, finalScaleY],
    ([x, sx, sy]: number[]) => {
      const w = dropletWidth * sx;
      const h = dropletHeight * sy;
      const islandH = config.island.height;
      const centerY = islandH / 2 + dropletOffsetY;
      const nw = navRef.current?.offsetWidth || navWidthRef.current || 500;
      navWidthRef.current = nw;

      const left = x + dropletOffsetX - w / 2;
      const top = centerY - h / 2;
      const right = nw - (left + w);
      const bottom = islandH - (top + h);
      const r = Math.min(dropletRadius, w / 2, h / 2);

      return `inset(${top.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px round ${r.toFixed(1)}px)`;
    }
  );

  // Gradient configuration from Studio
  const gradStart = config.activeTab.activeTabGradient?.startColor ?? config.activeTab.gradientStart ?? '#a855f7';
  const gradEnd = config.activeTab.activeTabGradient?.endColor ?? config.activeTab.gradientEnd ?? '#ec4899';
  const gradDirection = config.activeTab.activeTabGradient?.direction ?? config.activeTab.gradientDirection ?? 'to right';
  const gradCoords = getSvgGradientCoords(gradDirection);

  // Secondary reflected optical edge
  const reflectedEdgeShadow = getReflectedEdgeBoxShadow(config.activeTab);

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

  // Main Island styles calculated from config
  const islandBorderRadius = config.island.isCustomCorners
    ? `${config.island.cornerTopLeft}px ${config.island.cornerTopRight}px ${config.island.cornerBottomRight}px ${config.island.cornerBottomLeft}px`
    : `${config.island.borderRadius}px`;

  const islandStyle: React.CSSProperties = {
    width: `${config.island.widthPercent}%`,
    minWidth: `${config.island.minWidth}px`,
    maxWidth: `${config.island.maxWidth}px`,
    height: `${config.island.height}px`,
    borderRadius: islandBorderRadius,
    backgroundColor: `rgba(255, 255, 255, ${config.island.bgOpacity})`,
    backdropFilter: `blur(${config.island.blur}px) saturate(${config.island.saturation}%) brightness(${config.island.brightness}%) contrast(${config.island.contrast}%)`,
    WebkitBackdropFilter: `blur(${config.island.blur}px) saturate(${config.island.saturation}%) brightness(${config.island.brightness}%) contrast(${config.island.contrast}%)`,
    borderWidth: `${config.island.borderWidth}px`,
    borderStyle: config.island.borderWidth > 0 ? 'solid' : 'none',
    borderColor: config.island.borderColor
      ? `${config.island.borderColor}${Math.min(255, Math.max(0, Math.round(config.island.borderOpacity * 255))).toString(16).padStart(2, '0')}`
      : `rgba(255, 255, 255, ${config.island.borderOpacity})`,
    boxShadow: [
      `${config.island.shadowX}px ${config.island.shadowY}px ${config.island.shadowBlur}px ${config.island.shadowRadius}px rgba(0, 0, 0, ${config.island.shadowOpacity})`,
      `inset 0 1px ${config.island.borderGlowSpread ?? 1}px rgba(255, 255, 255, ${config.island.innerBorderOpacity})`,
      (config.island.outerBorderOpacity ?? 0) > 0 ? `0 0 0 1px rgba(255, 255, 255, ${config.island.outerBorderOpacity})` : '',
      config.island.outerGlowSize > 0 ? `0 0 ${config.island.outerGlowSize}px ${config.island.outerGlowColor}` : '',
    ].filter(Boolean).join(', '),
    transform: `translateX(${config.island.positionX}px) scale(${config.island.scale})`,
    transition: `background-color ${config.island.transitionDuration}ms ease, backdrop-filter ${config.island.transitionDuration}ms ease, border-color ${config.island.transitionDuration}ms ease, box-shadow ${config.island.transitionDuration}ms ease`,
  };

  const TABS_NAV_ITEMS = [
    { tab: 'flow' as ActiveTab, Icon: Layers, label: 'Dòng tiền' },
    { tab: 'statistics' as ActiveTab, Icon: PieChart, label: 'Thống kê' },
    { tab: 'profile' as ActiveTab, Icon: User, label: 'Cá nhân' },
    { tab: 'debts' as ActiveTab, Icon: Users, label: 'Công nợ' },
    { tab: 'settings' as ActiveTab, Icon: Settings, label: 'Cài đặt' },
  ];

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
        <motion.nav
          ref={navRef}
          whileTap={{ scale: config.island.tapScale ?? 0.99 }}
          transition={{ type: 'spring', stiffness: config.island.springStiffness, damping: config.island.springDamping, mass: config.island.springMass ?? 0.5 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full border rounded-full touch-none pointer-events-auto transition-all flex items-center relative overflow-visible"
          style={islandStyle}
        >
          {/* SVG Gradient Definition for Active Tab Icons */}
          <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
            <defs>
              <linearGradient
                id="bottom-nav-active-gradient"
                x1={gradCoords.x1}
                y1={gradCoords.y1}
                x2={gradCoords.x2}
                y2={gradCoords.y2}
              >
                <stop offset="0%" stopColor={gradStart} />
                <stop offset="100%" stopColor={gradEnd} />
              </linearGradient>
            </defs>
          </svg>

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
            {/* 1. Base Glass Droplet Body */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                borderRadius: `${config.activeTab.borderRadius}px`,
                background: `radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, ${config.activeTab.bgOpacity}) 0%, rgba(255, 255, 255, 0.02) 65%, rgba(255, 255, 255, 0.05) 100%)`,
                backdropFilter: `blur(${config.activeTab.blur}px) saturate(${config.activeTab.saturation}%) contrast(${config.activeTab.contrast}%)`,
                WebkitBackdropFilter: `blur(${config.activeTab.blur}px) saturate(${config.activeTab.saturation}%) contrast(${config.activeTab.contrast}%)`,
                border: `${config.activeTab.borderWidth}px solid ${
                  config.activeTab.borderColor
                    ? `${config.activeTab.borderColor}${Math.min(255, Math.max(0, Math.round(config.activeTab.borderOpacity * 255))).toString(16).padStart(2, '0')}`
                    : `rgba(255, 255, 255, ${config.activeTab.borderOpacity})`
                }`,
                boxShadow: [
                  `inset 0 1px 1.5px rgba(255, 255, 255, ${config.activeTab.innerBorder})`,
                  `inset 0 -1px 2px rgba(255, 255, 255, ${config.activeTab.outerBorder})`,
                  `inset 0 0 ${config.activeTab.innerGlow}px rgba(255, 255, 255, 0.02)`,
                  (config.activeTab.topHighlightOpacity ?? 0) > 0 ? `inset 0 2px 3px rgba(255, 255, 255, ${config.activeTab.topHighlightOpacity})` : '',
                  `${config.activeTab.shadowX}px ${config.activeTab.shadowY}px ${config.activeTab.shadowBlur}px ${config.activeTab.shadowSpread}px rgba(0, 0, 0, ${config.activeTab.shadowOpacity})`,
                ].filter(Boolean).join(', '),
              }}
            />

            {/* 2. Secondary Reversed / Reflected Optical Edge Layer */}
            {reflectedEdgeShadow && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none transition-all"
                style={{
                  borderRadius: `${config.activeTab.borderRadius}px`,
                  boxShadow: reflectedEdgeShadow,
                }}
              />
            )}
          </motion.div>

          {/* LAYER 1: BASE TAB LAYER (Interactive, inactive gray colors) */}
          <div
            className="absolute inset-0 flex items-center justify-between pointer-events-none z-10"
            style={{
              paddingLeft: `${config.island.paddingX}px`,
              paddingRight: `${config.island.paddingX}px`,
              paddingTop: `${config.island.paddingY}px`,
              paddingBottom: `${config.island.paddingY}px`,
            }}
          >
            {TABS_NAV_ITEMS.map(({ tab, Icon, label }) => {
              const isCurrentActive = activeTab === tab;
              const isHovered = hoverTab === tab;
              const isVisuallyActive = hoverTab !== null ? isHovered : isCurrentActive;

              return (
                <div key={tab} className="flex-1 h-full flex items-center justify-center pointer-events-auto">
                  <button
                    ref={(el) => { tabsRef.current[tab] = el; }}
                    id={`nav-btn-${tab}`}
                    type="button"
                    onClick={() => onChangeTab(tab)}
                    className="relative flex items-center justify-center w-full h-full cursor-pointer outline-none touch-manipulation select-none p-0 m-0 bg-transparent border-none appearance-none"
                    aria-label={label}
                    title={label}
                  >
                    <motion.div
                      animate={{ scale: isVisuallyActive ? (config.activeTab.iconActiveScale ?? 1.18) : 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="p-2 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      <Icon size={22} strokeWidth={isVisuallyActive ? 2.3 : 2} />
                    </motion.div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* LAYER 2: MASKED ACTIVE GRADIENT LAYER */}
          {/* Strictly clipped by droplet's exact real-time shape, position, and deformation */}
          <motion.div
            style={{
              clipPath: dropletClipPath,
              WebkitClipPath: dropletClipPath,
              paddingLeft: `${config.island.paddingX}px`,
              paddingRight: `${config.island.paddingX}px`,
              paddingTop: `${config.island.paddingY}px`,
              paddingBottom: `${config.island.paddingY}px`,
            }}
            className="absolute inset-0 flex items-center justify-between pointer-events-none select-none z-20"
            aria-hidden="true"
          >
            {TABS_NAV_ITEMS.map(({ tab, Icon }) => {
              const isCurrentActive = activeTab === tab;
              const isHovered = hoverTab === tab;
              const isVisuallyActive = hoverTab !== null ? isHovered : isCurrentActive;

              return (
                <div key={`active-${tab}`} className="flex-1 h-full flex items-center justify-center pointer-events-none">
                  <div className="relative flex items-center justify-center w-full h-full p-0 m-0 bg-transparent border-none select-none">
                    <motion.div
                      animate={{ scale: isVisuallyActive ? (config.activeTab.iconActiveScale ?? 1.18) : 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="p-2 flex items-center justify-center"
                    >
                      <Icon
                        size={22}
                        stroke="url(#bottom-nav-active-gradient)"
                        strokeWidth={isVisuallyActive ? 2.5 : 2}
                      />
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </motion.nav>
      </div>
    </div>
  );
};




