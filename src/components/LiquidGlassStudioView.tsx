import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Undo2,
  Redo2,
  Copy,
  Layers,
  PieChart,
  User,
  Users,
  Settings,
  Plus,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useLiquidGlass } from '../context/LiquidGlassContext';
import { PRESET_INFOS, PresetType } from '../types/liquidGlass';
import { type ActiveTab } from '../types';
import { getSvgGradientCoords, getReflectedEdgeBoxShadow } from '../utils/liquidGlassOptical';

interface LiquidGlassStudioViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const DUMMY_TAB_ORDER: ActiveTab[] = ['flow', 'statistics', 'profile', 'debts', 'settings'];

const TAB_LABELS: Record<ActiveTab, { label: string; icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }> }> = {
  flow: { label: 'Dòng tiền', icon: Layers },
  statistics: { label: 'Thống kê', icon: PieChart },
  profile: { label: 'Cá nhân', icon: User },
  debts: { label: 'Công nợ', icon: Users },
  settings: { label: 'Cài đặt', icon: Settings },
};

export const LiquidGlassStudioView: React.FC<LiquidGlassStudioViewProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    config,
    updateIsland,
    updateActiveTab,
    applyPreset,
    resetIsland,
    resetActiveTab,
    resetAll,
    resetToOriginalDefault,
    saveCurrentConfig,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
  } = useLiquidGlass();

  const [mainTab, setMainTab] = useState<'presets' | 'custom'>('presets');
  const [customSubTab, setCustomSubTab] = useState<'island' | 'droplet' | 'export'>('island');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // ----------------------------------------------------
  // DUMMY ISLAND STATE & ANIMATIONS (Observation Sandbox - 100% Parity)
  // ----------------------------------------------------
  const [dummyActiveTab, setDummyActiveTab] = useState<ActiveTab>('flow');
  const [dummyHoverTab, setDummyHoverTab] = useState<ActiveTab | null>(null);
  const dummyNavRef = useRef<HTMLElement>(null);
  const dummyTabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const isInitialRender = useRef(true);

  const isPressingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 1. Core Horizontal Position Tracking - Clean initial spring without jitter
  const blobX = useMotionValue(0);
  const animatedX = useSpring(blobX, {
    stiffness: config.activeTab.springStiffness ?? config.activeTab.moveStiffness ?? 420,
    damping: config.activeTab.springDamping ?? config.activeTab.moveDamping ?? 32,
    mass: 0.5,
  });

  // 2. Press-based "Swell" deformation (Smooth organic expansion on touch/drag, zero jitter)
  const pressTargetX = useMotionValue(1);
  const pressTargetY = useMotionValue(1);
  const pressScaleX = useSpring(pressTargetX, {
    stiffness: 350,
    damping: 25,
  });
  const pressScaleY = useSpring(pressTargetY, {
    stiffness: 350,
    damping: 25,
  });

  const getTabCenter = (tab: ActiveTab): number => {
    const el = dummyTabsRef.current[tab];
    const navEl = dummyNavRef.current;
    if (el && navEl) {
      const rect = el.getBoundingClientRect();
      const navRect = navEl.getBoundingClientRect();
      return rect.left - navRect.left + rect.width / 2;
    }
    return 0;
  };

  const getNearestTab = (currentX: number): ActiveTab => {
    let nearest = dummyActiveTab;
    let minDistance = Infinity;
    DUMMY_TAB_ORDER.forEach((tab) => {
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

  const updateDummyBlobPosition = (tab: ActiveTab) => {
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
    if (!isOpen) return;
    if (!isPressingRef.current) {
      requestAnimationFrame(() => updateDummyBlobPosition(dummyActiveTab));
    }
  }, [dummyActiveTab, isOpen, config.island.widthPercent, config.island.height]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => updateDummyBlobPosition(dummyActiveTab);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dummyActiveTab, isOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const navEl = dummyNavRef.current;
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
    setDummyHoverTab(touchedTab);

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
    const navEl = dummyNavRef.current;
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
      setDummyHoverTab(currentNearest);
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

    const navEl = dummyNavRef.current;
    if (!navEl) return;
    const navRect = navEl.getBoundingClientRect();
    const touchX = e.clientX - navRect.left;

    const chosenTab = getNearestTab(touchX);
    const targetCenter = getTabCenter(chosenTab);
    if (targetCenter > 0) {
      blobX.set(targetCenter);
    }

    setDummyHoverTab(null);
    setDummyActiveTab(chosenTab);
  };

  const DummyNavItem = ({ tab, Icon, label }: { tab: ActiveTab; Icon: any; label: string }) => {
    const isCurrentActive = dummyActiveTab === tab;
    const isHovered = dummyHoverTab === tab;
    const isVisuallyActive = dummyHoverTab !== null ? isHovered : isCurrentActive;

    return (
      <button
        ref={(el) => {
          dummyTabsRef.current[tab] = el;
        }}
        id={`dummy-nav-btn-${tab}`}
        type="button"
        onClick={() => setDummyActiveTab(tab)}
        className="relative flex items-center justify-center w-full h-full cursor-pointer outline-none touch-manipulation select-none p-0 m-0 bg-transparent border-none appearance-none"
        aria-label={label}
        title={label}
      >
        <motion.div
          animate={{ scale: isVisuallyActive ? (config.activeTab.iconActiveScale ?? 1.18) : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="p-2 transition-colors flex items-center justify-center text-neutral-500 hover:text-neutral-300"
        >
          <Icon size={22} strokeWidth={isVisuallyActive ? 2.3 : 2} />
        </motion.div>
      </button>
    );
  };

  // Island styles calculated from config matching BottomNavigation
  const islandBorderRadius = config.island.isCustomCorners
    ? `${config.island.cornerTopLeft}px ${config.island.cornerTopRight}px ${config.island.cornerBottomRight}px ${config.island.cornerBottomLeft}px`
    : `${config.island.borderRadius}px`;

  const islandStyles: React.CSSProperties = {
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

  const dropletWidth = config.activeTab.width;
  const dropletHeight = config.activeTab.height;
  const dropletOffsetX = config.activeTab.offsetX;
  const dropletOffsetY = config.activeTab.offsetY;

  const dummyNavWidthRef = useRef<number>(500);

  useEffect(() => {
    const el = dummyNavRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          dummyNavWidthRef.current = entry.contentRect.width;
        }
      }
    });
    ro.observe(el);
    if (el.offsetWidth > 0) {
      dummyNavWidthRef.current = el.offsetWidth;
    }
    return () => ro.disconnect();
  }, [isOpen]);

  const dropletClipPath = useTransform(
    [animatedX, pressScaleX, pressScaleY],
    ([x, sx, sy]: number[]) => {
      const w = dropletWidth * sx;
      const h = dropletHeight * sy;
      const islandH = config.island.height;
      const centerY = islandH / 2 + dropletOffsetY;
      const nw = dummyNavRef.current?.offsetWidth || dummyNavWidthRef.current || 500;
      dummyNavWidthRef.current = nw;

      const left = x + dropletOffsetX - w / 2;
      const top = centerY - h / 2;
      const right = nw - (left + w);
      const bottom = islandH - (top + h);
      const r = Math.min(config.activeTab.borderRadius, w / 2, h / 2);

      return `inset(${top.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px round ${r.toFixed(1)}px)`;
    }
  );

  const gradStart = config.activeTab.activeTabGradient?.startColor ?? config.activeTab.gradientStart ?? '#a855f7';
  const gradEnd = config.activeTab.activeTabGradient?.endColor ?? config.activeTab.gradientEnd ?? '#ec4899';
  const gradDirection = config.activeTab.activeTabGradient?.direction ?? config.activeTab.gradientDirection ?? 'to right';
  const gradCoords = getSvgGradientCoords(gradDirection);
  const reflectedEdgeShadow = getReflectedEdgeBoxShadow(config.activeTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0b0d] text-neutral-100 flex flex-col overflow-hidden select-none">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER                                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col border-b border-neutral-800/80 bg-[#121418]/95 backdrop-blur-md shrink-0 pt-[max(env(safe-area-inset-top),12px)] z-50">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng"
            >
              <X size={18} />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                Liquid Glass Studio
              </h1>
              <p className="text-[11px] text-neutral-400">
                Tinh chỉnh quang học & vật lý Đảo điều hướng
              </p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Top row: 3 buttons undo, tiến (redo), reset */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800/80 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Hoàn tác (Undo)"
              >
                <Undo2 size={14} />
              </button>

              <button
                onClick={redo}
                disabled={!canRedo}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800/80 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Làm lại (Tiến/Redo)"
              >
                <Redo2 size={14} />
              </button>

              <button
                onClick={() => {
                  resetAll();
                  showToast('Đã khôi phục về mặc định!');
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Đặt lại mặc định (Reset)"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Bottom: Nút Lưu có theme tím hồng gradient */}
            <button
              onClick={() => {
                saveCurrentConfig();
                showToast('Đã lưu cấu hình Liquid Glass thành công!');
              }}
              className="w-full px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-pink-900/30 active:scale-95 cursor-pointer transition-all border border-pink-400/25"
              title="Lưu cấu hình"
            >
              <Check size={13} strokeWidth={2.5} />
              <span>{isDirty ? 'Lưu' : 'Đã lưu'}</span>
            </button>
          </div>
        </div>

        {/* CHỦ ĐỀ THEO MỨC ĐỘ & TÙY CHỈNH NẰM TRONG 1 THẺ */}
        <div className="px-4 pt-1.5 pb-2">
          <div className="bg-[#121212] rounded-2xl p-1.5 border border-neutral-800 shadow-sm">
            <div className="grid grid-cols-2 gap-1.5 relative select-none">
              <button
                type="button"
                onClick={() => setMainTab('presets')}
                className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  mainTab === 'presets' ? 'text-black' : 'text-neutral-400'
                }`}
              >
                {mainTab === 'presets' && (
                  <motion.div
                    layoutId="liquid_studio_main_tab"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles
                    size={16}
                    className={mainTab === 'presets' ? 'text-black' : 'text-neutral-400'}
                  />
                  <span>Chủ đề theo mức độ</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMainTab('custom')}
                className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  mainTab === 'custom' ? 'text-black' : 'text-neutral-400'
                }`}
              >
                {mainTab === 'custom' && (
                  <motion.div
                    layoutId="liquid_studio_main_tab"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sliders
                    size={16}
                    className={mainTab === 'custom' ? 'text-black' : 'text-neutral-400'}
                  />
                  <span>Tùy chỉnh</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* KHI ẤN QUA TÙY CHỈNH: ĐẢO CHÍNH - GIỌT NƯỚC - MÃ CSS NẰM TRONG 1 THẺ (STYLE TƯƠNG TỰ) */}
        {mainTab === 'custom' && (
          <div className="px-4 pb-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="bg-[#121212] rounded-2xl p-1.5 border border-neutral-800 shadow-sm">
              <div className="grid grid-cols-3 gap-1.5 relative select-none">
                <button
                  type="button"
                  onClick={() => setCustomSubTab('island')}
                  className={`relative py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    customSubTab === 'island' ? 'text-black' : 'text-neutral-400'
                  }`}
                >
                  {customSubTab === 'island' && (
                    <motion.div
                      layoutId="liquid_studio_custom_subtab"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Sliders
                      size={15}
                      className={customSubTab === 'island' ? 'text-black' : 'text-neutral-400'}
                    />
                    <span>Đảo chính</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomSubTab('droplet')}
                  className={`relative py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    customSubTab === 'droplet' ? 'text-black' : 'text-neutral-400'
                  }`}
                >
                  {customSubTab === 'droplet' && (
                    <motion.div
                      layoutId="liquid_studio_custom_subtab"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Layers
                      size={15}
                      className={customSubTab === 'droplet' ? 'text-black' : 'text-neutral-400'}
                    />
                    <span>Giọt nước</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomSubTab('export')}
                  className={`relative py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    customSubTab === 'export' ? 'text-black' : 'text-neutral-400'
                  }`}
                >
                  {customSubTab === 'export' && (
                    <motion.div
                      layoutId="liquid_studio_custom_subtab"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Copy
                      size={15}
                      className={customSubTab === 'export' ? 'text-black' : 'text-neutral-400'}
                    />
                    <span>Mã CSS</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end px-1">
              <button
                type="button"
                onClick={() => setShowControls((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title={showControls ? 'Thu gọn bảng để quan sát rộng hơn' : 'Hiện bảng điều khiển'}
              >
                {showControls ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showControls ? 'Ẩn bảng' : 'Hiện bảng'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Khi ở Chủ đề theo mức độ: Hàng tinh gọn với nút ẩn/hiện bảng */}
        {mainTab === 'presets' && (
          <div className="flex items-center justify-between px-4 pb-2 text-[11px] text-neutral-400">
            <span>Chọn mức độ kính ({PRESET_INFOS.length} cấp độ):</span>
            <button
              onClick={() => setShowControls((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs flex items-center gap-1 cursor-pointer"
            >
              {showControls ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{showControls ? 'Ẩn bảng' : 'Hiện bảng'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast feedback */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-60 px-4 py-2 rounded-2xl bg-black/90 border border-white/20 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
          <Check size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. SCROLLABLE CONTROLS AREA                         */}
      {/* DOES NOT MOVE DUMMY ISLAND; HAS LARGE PADDING BOTTOM */}
      {/* ---------------------------------------------------- */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[220px] transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* SUBTAB 1: PRESETS THEO MỨC ĐỘ */}
        {mainTab === 'presets' && (
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="bg-[#121418] rounded-2xl p-3 border border-neutral-800 text-xs text-neutral-400 flex items-start gap-2">
              <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
              <span>
                Các mẫu thiết kế đã được cân chỉnh tỉ mỉ theo từng cấp độ từ tối giản thanh mảnh đến hiệu ứng 3D cực đại. Nhấn để áp dụng ngay lập tức vào Đảo giả lập bên dưới.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_INFOS.map((p) => {
                const isSelected = config.preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      applyPreset(p.id);
                      showToast(`Đã áp dụng: ${p.name}`);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                      isSelected
                        ? 'bg-neutral-800/90 border-white/40 shadow-lg ring-1 ring-white/20'
                        : 'bg-[#121418] hover:bg-[#181a20] border-neutral-800/80 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.accentColor }}
                        />
                        <span className="font-bold text-xs sm:text-sm text-white">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10">
                        {p.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-relaxed font-normal">
                      {p.subtitle}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-neutral-500">
                      <span>Cấp độ: {p.level}/5</span>
                      {isSelected ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check size={12} /> Đang chọn
                        </span>
                      ) : (
                        <span className="text-neutral-400 group-hover:text-neutral-200">Chọn mẫu →</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: CHỈNH ĐẢO CHÍNH (MAIN ISLAND) */}
        {mainTab === 'custom' && customSubTab === 'island' && (
          <div className="space-y-4 max-w-xl mx-auto">
            {/* Nhóm Hình học & Bo góc */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-400" />
                Kích thước & Bo góc
              </h3>

              <div className="space-y-3 text-xs">
                {/* Chiều cao */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Chiều cao (Height)</span>
                    <span className="font-mono text-emerald-400">{config.island.height}px</span>
                  </div>
                  <input
                    type="range"
                    min="48"
                    max="90"
                    step="1"
                    value={config.island.height}
                    onChange={(e) => updateIsland({ height: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Bo góc */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Bo góc tròn (Border Radius)</span>
                    <span className="font-mono text-emerald-400">
                      {config.island.borderRadius >= 100 ? 'Viên thuốc (Pill)' : `${config.island.borderRadius}px`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="100"
                    step="2"
                    value={config.island.borderRadius > 100 ? 100 : config.island.borderRadius}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateIsland({ borderRadius: val >= 100 ? 9999 : val });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Vị trí cách đáy (Bottom Offset) */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Khoảng cách đáy (Bottom Offset)</span>
                    <span className="font-mono text-emerald-400">{config.island.bottomOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="48"
                    step="2"
                    value={config.island.bottomOffset}
                    onChange={(e) => updateIsland({ bottomOffset: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Thu phóng (Scale) */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ thu phóng (Scale)</span>
                    <span className="font-mono text-emerald-400">{config.island.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.20"
                    step="0.02"
                    value={config.island.scale}
                    onChange={(e) => updateIsland({ scale: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Kính quang học (Glass Optics) */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" />
                Hiệu ứng Kính (Glass Optics)
              </h3>

              <div className="space-y-3 text-xs">
                {/* Độ mờ Blur */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ kính (Blur)</span>
                    <span className="font-mono text-purple-400">{config.island.blur.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={config.island.blur}
                    onChange={(e) => updateIsland({ blur: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Độ bão hòa Saturate */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ bão hòa màu sắc (Saturation)</span>
                    <span className="font-mono text-purple-400">{config.island.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="5"
                    value={config.island.saturation}
                    onChange={(e) => updateIsland({ saturation: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Độ đục nền Background Opacity */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ nền đen/trắng (Background Opacity)</span>
                    <span className="font-mono text-purple-400">{(config.island.bgOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.60"
                    step="0.01"
                    value={config.island.bgOpacity}
                    onChange={(e) => updateIsland({ bgOpacity: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Độ tương phản Contrast */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ tương phản (Contrast)</span>
                    <span className="font-mono text-purple-400">{config.island.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="180"
                    step="5"
                    value={config.island.contrast}
                    onChange={(e) => updateIsland({ contrast: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Đường viền & Bóng đổ */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-amber-400" />
                Viền phản xạ & Bóng đổ 3D
              </h3>

              <div className="space-y-3 text-xs">
                {/* Độ dày viền đảo */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ dày viền ngoài (Border Width)</span>
                    <span className="font-mono text-amber-400">{config.island.borderWidth.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="0.1"
                    value={config.island.borderWidth}
                    onChange={(e) => updateIsland({ borderWidth: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Viền ngoài */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ viền ngoài (Border Opacity)</span>
                    <span className="font-mono text-amber-400">{(config.island.borderOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.80"
                    step="0.01"
                    value={config.island.borderOpacity}
                    onChange={(e) => updateIsland({ borderOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Phản xạ viền trên */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Phản chiếu mép trên (Top Inner Reflection)</span>
                    <span className="font-mono text-amber-400">{(config.island.innerBorderOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.80"
                    step="0.01"
                    value={config.island.innerBorderOpacity}
                    onChange={(e) => updateIsland({ innerBorderOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Lan tỏa viền phản chiếu */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lan tỏa dải sáng viền trên (Top Glow Spread)</span>
                    <span className="font-mono text-amber-400">{config.island.borderGlowSpread ?? 1}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={config.island.borderGlowSpread ?? 1}
                    onChange={(e) => updateIsland({ borderGlowSpread: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Viền bao ngoài thứ cấp */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Viền bao ngoài thứ cấp (Outer Border Ring)</span>
                    <span className="font-mono text-amber-400">{((config.island.outerBorderOpacity ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.50"
                    step="0.01"
                    value={config.island.outerBorderOpacity ?? 0}
                    onChange={(e) => updateIsland({ outerBorderOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Màu sắc đường viền đảo */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Màu sắc đường viền đảo (Border Color)</span>
                    <span className="font-mono text-amber-400 uppercase">{config.island.borderColor ?? '#ffffff'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.island.borderColor ?? '#ffffff'}
                      onChange={(e) => updateIsland({ borderColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-neutral-700 p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={config.island.borderColor ?? '#ffffff'}
                      onChange={(e) => updateIsland({ borderColor: e.target.value })}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Bóng đổ */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ đậm bóng đổ (Shadow Opacity)</span>
                    <span className="font-mono text-amber-400">{(config.island.shadowOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.90"
                    step="0.02"
                    value={config.island.shadowOpacity}
                    onChange={(e) => updateIsland({ shadowOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ nhòe bóng đổ */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ nhòe bóng đổ (Shadow Blur)</span>
                    <span className="font-mono text-amber-400">{config.island.shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={config.island.shadowBlur}
                    onChange={(e) => updateIsland({ shadowBlur: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ lệch trục dọc bóng đổ */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lệch dọc bóng đổ viền (Shadow Y)</span>
                    <span className="font-mono text-amber-400">{config.island.shadowY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    step="1"
                    value={config.island.shadowY}
                    onChange={(e) => updateIsland({ shadowY: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ lệch trục ngang bóng đổ */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lệch ngang bóng đổ viền (Shadow X)</span>
                    <span className="font-mono text-amber-400">{config.island.shadowX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="1"
                    value={config.island.shadowX}
                    onChange={(e) => updateIsland({ shadowX: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ lan tỏa bóng đổ */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lan tỏa bóng đổ viền (Shadow Radius / Spread)</span>
                    <span className="font-mono text-amber-400">{config.island.shadowRadius ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="25"
                    step="1"
                    value={config.island.shadowRadius ?? 0}
                    onChange={(e) => updateIsland({ shadowRadius: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Hào quang Outer Glow */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Hào quang phát sáng ngoài (Outer Glow)</span>
                    <span className="font-mono text-amber-400">{config.island.outerGlowSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={config.island.outerGlowSize}
                    onChange={(e) => updateIsland({ outerGlowSize: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Vật lý Đàn hồi Đảo */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-400" />
                Vật lý Đàn hồi Đảo (Island Elasticity & Spring)
              </h3>

              <div className="space-y-3 text-xs">
                {/* Lò xo độ cứng */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ căng lò xo đảo (Spring Stiffness)</span>
                    <span className="font-mono text-emerald-400">{config.island.springStiffness}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="600"
                    step="10"
                    value={config.island.springStiffness}
                    onChange={(e) => updateIsland({ springStiffness: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Lò xo giảm chấn */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ giảm chấn phanh đảo (Spring Damping)</span>
                    <span className="font-mono text-emerald-400">{config.island.springDamping}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={config.island.springDamping}
                    onChange={(e) => updateIsland({ springDamping: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Khối lượng lò xo */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Khối lượng vật lý / Quán tính (Spring Mass)</span>
                    <span className="font-mono text-emerald-400">{(config.island.springMass ?? 0.5).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={config.island.springMass ?? 0.5}
                    onChange={(e) => updateIsland({ springMass: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Độ nhún đàn hồi khi chạm đảo */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ nhún co lại khi chạm đảo (Tap Scale)</span>
                    <span className="font-mono text-emerald-400">{(config.island.tapScale ?? 0.99).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.90"
                    max="1.00"
                    step="0.01"
                    value={config.island.tapScale ?? 0.99}
                    onChange={(e) => updateIsland({ tapScale: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Thời gian chuyển đổi */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Thời gian chuyển sắc thái kính (Transition Duration)</span>
                    <span className="font-mono text-emerald-400">{config.island.transitionDuration}ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="800"
                    step="50"
                    value={config.island.transitionDuration}
                    onChange={(e) => updateIsland({ transitionDuration: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                resetIsland();
                showToast('Đã đặt lại thông số Đảo chính!');
              }}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Đặt lại Đảo chính về mẫu gốc
            </button>
          </div>
        )}

        {/* SUBTAB 3: CHỈNH GIỌT NƯỚC CHỌN TAB (ACTIVE TAB CIRCLE) */}
        {mainTab === 'custom' && customSubTab === 'droplet' && (
          <div className="space-y-4 max-w-xl mx-auto">
            {/* Nhóm Kích thước & Phình nước */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-blue-400" />
                Kích thước & Biến dạng phình nước (Swell)
              </h3>

              <div className="space-y-3 text-xs">
                {/* Chiều rộng */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Chiều rộng giọt nước (Width)</span>
                    <span className="font-mono text-blue-400">{config.activeTab.width}px</span>
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="95"
                    step="1"
                    value={config.activeTab.width}
                    onChange={(e) => updateActiveTab({ width: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Chiều cao */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Chiều cao giọt nước (Height)</span>
                    <span className="font-mono text-blue-400">{config.activeTab.height}px</span>
                  </div>
                  <input
                    type="range"
                    min="28"
                    max="65"
                    step="1"
                    value={config.activeTab.height}
                    onChange={(e) => updateActiveTab({ height: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Phình ngang Swell X */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ phình giãn ngang khi chạm (Swell X)</span>
                    <span className="font-mono text-blue-400">{config.activeTab.swellScaleX.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={config.activeTab.swellScaleX}
                    onChange={(e) => updateActiveTab({ swellScaleX: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Phình dọc Swell Y */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ phình giãn dọc khi chạm (Swell Y)</span>
                    <span className="font-mono text-blue-400">{config.activeTab.swellScaleY.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={config.activeTab.swellScaleY}
                    onChange={(e) => updateActiveTab({ swellScaleY: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Lệch dọc Offset Y */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Lệch vị trí trục dọc (Offset Y)</span>
                    <span className="font-mono text-blue-400">{config.activeTab.offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    step="1"
                    value={config.activeTab.offsetY}
                    onChange={(e) => updateActiveTab({ offsetY: Number(e.target.value) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Kính & Hiệu ứng giọt nước */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                Độ mờ & Phản chiếu giọt nước
              </h3>

              <div className="space-y-3 text-xs">
                {/* Blur */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ quang học giọt nước (Blur)</span>
                    <span className="font-mono text-cyan-400">{config.activeTab.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    step="1"
                    value={config.activeTab.blur}
                    onChange={(e) => updateActiveTab({ blur: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Độ đục giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ đục nền nước (Opacity)</span>
                    <span className="font-mono text-cyan-400">{(config.activeTab.bgOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.60"
                    step="0.01"
                    value={config.activeTab.bgOpacity}
                    onChange={(e) => updateActiveTab({ bgOpacity: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Phản quang mặt trong (Inner Glow) */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Phản quang lõi trong (Inner Glow)</span>
                    <span className="font-mono text-cyan-400">{config.activeTab.innerGlow}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={config.activeTab.innerGlow}
                    onChange={(e) => updateActiveTab({ innerGlow: Number(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Đường viền & Khúc xạ viền giọt nước (MỚI BỔ SUNG) */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-amber-400" />
                Đường viền & Khúc xạ viền giọt nước
              </h3>

              <div className="space-y-3 text-xs">
                {/* Độ dày viền giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ dày viền giọt nước (Border Width)</span>
                    <span className="font-mono text-amber-400">{config.activeTab.borderWidth.toFixed(1)}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={config.activeTab.borderWidth}
                    onChange={(e) => updateActiveTab({ borderWidth: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ mờ viền giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ viền ngoài (Border Opacity)</span>
                    <span className="font-mono text-amber-400">{(config.activeTab.borderOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={config.activeTab.borderOpacity}
                    onChange={(e) => updateActiveTab({ borderOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Khúc xạ viền trong đỉnh (Inner Border Inset) */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Khúc xạ viền trong đỉnh (Top Inset Border)</span>
                    <span className="font-mono text-amber-400">{(config.activeTab.innerBorder * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={config.activeTab.innerBorder}
                    onChange={(e) => updateActiveTab({ innerBorder: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Viền nổi quang học đáy (Outer Border Inset) */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Viền nổi quang học đáy (Bottom Inset Border)</span>
                    <span className="font-mono text-amber-400">{(config.activeTab.outerBorder * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={config.activeTab.outerBorder}
                    onChange={(e) => updateActiveTab({ outerBorder: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Dải lóa sáng mép trên */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Dải lóa sáng mép trên (Top Highlight Reflection)</span>
                    <span className="font-mono text-amber-400">{((config.activeTab.topHighlightOpacity ?? 0.25) * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.01"
                    value={config.activeTab.topHighlightOpacity ?? 0.25}
                    onChange={(e) => updateActiveTab({ topHighlightOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ bóng kính Specular Shine */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ bóng kính phản quang (Specular Shine)</span>
                    <span className="font-mono text-amber-400">{config.activeTab.glassShine}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={config.activeTab.glassShine}
                    onChange={(e) => updateActiveTab({ glassShine: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Màu sắc viền giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Màu sắc viền giọt nước (Droplet Border Color)</span>
                    <span className="font-mono text-amber-400 uppercase">{config.activeTab.borderColor ?? '#ffffff'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.activeTab.borderColor ?? '#ffffff'}
                      onChange={(e) => updateActiveTab({ borderColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-neutral-700 p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={config.activeTab.borderColor ?? '#ffffff'}
                      onChange={(e) => updateActiveTab({ borderColor: e.target.value })}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-200 font-mono"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Độ mờ bóng đổ giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ bóng đổ giọt nước (Shadow Opacity)</span>
                    <span className="font-mono text-amber-400">{(config.activeTab.shadowOpacity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.02"
                    value={config.activeTab.shadowOpacity}
                    onChange={(e) => updateActiveTab({ shadowOpacity: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ nhòe bóng giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ nhòe bóng giọt nước (Shadow Blur)</span>
                    <span className="font-mono text-amber-400">{config.activeTab.shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={config.activeTab.shadowBlur}
                    onChange={(e) => updateActiveTab({ shadowBlur: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ lệch dọc bóng đổ giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lệch dọc bóng đổ giọt nước (Shadow Y)</span>
                    <span className="font-mono text-amber-400">{config.activeTab.shadowY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="30"
                    step="1"
                    value={config.activeTab.shadowY}
                    onChange={(e) => updateActiveTab({ shadowY: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Độ lan tỏa bóng giọt nước */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lan tỏa bóng giọt nước (Shadow Spread)</span>
                    <span className="font-mono text-amber-400">{config.activeTab.shadowSpread}px</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="20"
                    step="1"
                    value={config.activeTab.shadowSpread}
                    onChange={(e) => updateActiveTab({ shadowSpread: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Động lực học & Vật lý Lò xo Đàn hồi (Thu gọn về chuẩn ban đầu mượt mà) */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} className="text-emerald-400" />
                Vật lý Lò xo Giọt nước (Droplet Spring Physics)
              </h3>

              <div className="space-y-3 text-xs">
                {/* Lò xo độ căng/nảy */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ nảy lò xo giọt nước (Spring Stiffness)</span>
                    <span className="font-mono text-emerald-400">
                      {config.activeTab.springStiffness ?? config.activeTab.moveStiffness ?? 420}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="10"
                    value={config.activeTab.springStiffness ?? config.activeTab.moveStiffness ?? 420}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateActiveTab({ springStiffness: val, moveStiffness: val });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Giảm chấn phanh khi đến tab */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ hãm phanh khi đến tab (Spring Damping)</span>
                    <span className="font-mono text-emerald-400">
                      {config.activeTab.springDamping ?? config.activeTab.moveDamping ?? 32}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={config.activeTab.springDamping ?? config.activeTab.moveDamping ?? 32}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateActiveTab({ springDamping: val, moveDamping: val });
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Độ phóng to icon khi tab kích hoạt */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ phóng to biểu tượng tab chọn (Active Icon Scale)</span>
                    <span className="font-mono text-emerald-400">{(config.activeTab.iconActiveScale ?? 1.18).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="1.4"
                    step="0.02"
                    value={config.activeTab.iconActiveScale ?? 1.18}
                    onChange={(e) => updateActiveTab({ iconActiveScale: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm Dải chuyển màu Tab kích hoạt (Active Tab Gradient) - NEW */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={13} className="text-purple-400" />
                Dải chuyển màu Tab kích hoạt (Active Tab Gradient)
              </h3>
              <p className="text-[11px] text-neutral-400">
                Màu chuyển tiếp Tím → Hồng áp dụng theo ranh giới mặt cắt giọt nước thực tế, thay thế màu trắng cũ.
              </p>

              {/* Preview strip */}
              <div 
                className="h-9 rounded-xl border border-white/10 flex items-center justify-between px-3 text-xs font-bold text-white shadow-inner"
                style={{
                  background: `linear-gradient(${gradDirection}, ${gradStart}, ${gradEnd})`,
                }}
              >
                <span className="text-[10px] text-white/90 drop-shadow-sm flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Hiển thị thực tế ({gradStart} → {gradEnd})
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Layers size={11} className="text-white" />
                  </div>
                  <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <PieChart size={11} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Start Color */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1.5">
                    <span>Màu bắt đầu (Gradient Start)</span>
                    <span className="font-mono text-purple-400 uppercase">{gradStart}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradStart}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        updateActiveTab({
                          gradientStart: newStart,
                          activeTabGradient: {
                            startColor: newStart,
                            endColor: gradEnd,
                            direction: gradDirection,
                          },
                        });
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-neutral-700 p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={gradStart}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        updateActiveTab({
                          gradientStart: newStart,
                          activeTabGradient: {
                            startColor: newStart,
                            endColor: gradEnd,
                            direction: gradDirection,
                          },
                        });
                      }}
                      className="w-[78px] shrink-0 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 font-mono text-center uppercase"
                      placeholder="#a855f7"
                    />
                    {/* Quick swatches */}
                    <div className="flex items-center gap-1 shrink-0">
                      {['#a855f7', '#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981'].map((c) => (
                        <button
                          key={`start-${c}`}
                          type="button"
                          onClick={() => {
                            updateActiveTab({
                              gradientStart: c,
                              activeTabGradient: {
                                startColor: c,
                                endColor: gradEnd,
                                direction: gradDirection,
                              },
                            });
                          }}
                          className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                            gradStart.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* End Color */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1.5">
                    <span>Màu kết thúc (Gradient End)</span>
                    <span className="font-mono text-pink-400 uppercase">{gradEnd}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradEnd}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        updateActiveTab({
                          gradientEnd: newEnd,
                          activeTabGradient: {
                            startColor: gradStart,
                            endColor: newEnd,
                            direction: gradDirection,
                          },
                        });
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-neutral-700 p-0.5 shrink-0"
                    />
                    <input
                      type="text"
                      value={gradEnd}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        updateActiveTab({
                          gradientEnd: newEnd,
                          activeTabGradient: {
                            startColor: gradStart,
                            endColor: newEnd,
                            direction: gradDirection,
                          },
                        });
                      }}
                      className="w-[78px] shrink-0 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 font-mono text-center uppercase"
                      placeholder="#ec4899"
                    />
                    {/* Quick swatches */}
                    <div className="flex items-center gap-1 shrink-0">
                      {['#ec4899', '#f43f5e', '#d946ef', '#f59e0b', '#f97316', '#ef4444'].map((c) => (
                        <button
                          key={`end-${c}`}
                          type="button"
                          onClick={() => {
                            updateActiveTab({
                              gradientEnd: c,
                              activeTabGradient: {
                                startColor: gradStart,
                                endColor: c,
                                direction: gradDirection,
                              },
                            });
                          }}
                          className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 cursor-pointer ${
                            gradEnd.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Direction */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1.5">
                    <span>Hướng dải màu (Gradient Direction)</span>
                    <span className="font-mono text-purple-400">{gradDirection}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'to right', label: 'Ngang →' },
                      { id: 'to bottom right', label: 'Chéo ↘' },
                      { id: 'to bottom', label: 'Dọc ↓' },
                      { id: 'to top right', label: 'Chéo ↗' },
                    ].map((dir) => (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => {
                          updateActiveTab({
                            gradientDirection: dir.id,
                            activeTabGradient: {
                              startColor: gradStart,
                              endColor: gradEnd,
                              direction: dir.id,
                            },
                          });
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          gradDirection === dir.id
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                            : 'bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        {dir.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Nhóm Lớp viền phản chiếu quang học thứ cấp (Droplet Reflected Edge) - NEW */}
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800/80 space-y-3">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-rose-400" />
                Lớp viền phản chiếu quang học thứ cấp (Droplet Reflected Edge)
              </h3>
              <p className="text-[11px] text-neutral-400">
                Hiệu ứng phản xạ ngược chiều ở mép cong giọt nước, tạo độ cong quang học 3D đồng bộ chuyển động.
              </p>

              <div className="space-y-3 text-xs">
                {/* Reflected Edge Opacity */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ mờ phản chiếu (Reflected Edge Opacity)</span>
                    <span className="font-mono text-rose-400">
                      {(((config.activeTab.reflectedEdgeOpacity ?? 0.28) * 100)).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.02"
                    value={config.activeTab.reflectedEdgeOpacity ?? 0.28}
                    onChange={(e) => updateActiveTab({ reflectedEdgeOpacity: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                {/* Reflected Edge Width */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ dày viền phản chiếu (Reflected Edge Width)</span>
                    <span className="font-mono text-rose-400">
                      {(config.activeTab.reflectedEdgeWidth ?? 1.2).toFixed(1)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5.0"
                    step="0.1"
                    value={config.activeTab.reflectedEdgeWidth ?? 1.2}
                    onChange={(e) => updateActiveTab({ reflectedEdgeWidth: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                {/* Reflected Edge Blur */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ nhòe quang học viền (Reflected Edge Blur)</span>
                    <span className="font-mono text-rose-400">
                      {(config.activeTab.reflectedEdgeBlur ?? 2.5).toFixed(1)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10.0"
                    step="0.2"
                    value={config.activeTab.reflectedEdgeBlur ?? 2.5}
                    onChange={(e) => updateActiveTab({ reflectedEdgeBlur: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                {/* Reflected Edge Offset */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1">
                    <span>Độ lệch phản chiếu (Reflected Edge Offset)</span>
                    <span className="font-mono text-rose-400">
                      {(config.activeTab.reflectedEdgeOffset ?? 1.5).toFixed(1)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-10.0"
                    max="10.0"
                    step="0.5"
                    value={config.activeTab.reflectedEdgeOffset ?? 1.5}
                    onChange={(e) => updateActiveTab({ reflectedEdgeOffset: Number(e.target.value) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                {/* Reflected Edge Direction */}
                <div>
                  <div className="flex justify-between font-medium text-neutral-300 mb-1.5">
                    <span>Hướng phản chiếu ngược (Reflection Side)</span>
                    <span className="font-mono text-rose-400">
                      {config.activeTab.reflectedEdgeDirection ?? 'bottom'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'bottom', label: 'Mép đáy (Đáy)' },
                      { id: 'bottom-right', label: 'Chéo đáy phải' },
                      { id: 'bottom-left', label: 'Chéo đáy trái' },
                      { id: 'top', label: 'Mép đỉnh' },
                    ].map((dir) => (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => updateActiveTab({ reflectedEdgeDirection: dir.id })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          (config.activeTab.reflectedEdgeDirection ?? 'bottom') === dir.id
                            ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50'
                            : 'bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        {dir.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                resetActiveTab();
                showToast('Đã đặt lại thông số Giọt nước!');
              }}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Đặt lại Giọt nước về mẫu gốc
            </button>
          </div>
        )}

        {/* SUBTAB 4: MÃ CSS / XUẤT */}
        {mainTab === 'custom' && customSubTab === 'export' && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-300">Cấu hình JSON hiện tại</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                  <span>{copiedCode ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                </button>
              </div>

              <pre className="p-3 rounded-xl bg-black/60 border border-neutral-800/80 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>

            <div className="bg-[#121418] rounded-2xl p-4 border border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold text-neutral-300">Khôi phục gốc toàn bộ</h3>
              <p className="text-xs text-neutral-400">
                Xóa toàn bộ tùy biến cá nhân và khôi phục về cấu hình gốc mặc định của ứng dụng.
              </p>
              <button
                onClick={() => {
                  resetToOriginalDefault();
                  showToast('Đã khôi phục toàn bộ về bản gốc xuất xưởng!');
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Khôi phục về bản gốc xuất xưởng (Factory Baseline)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. DUMMY FIXED BOTTOM ISLAND (Sandbox & Animation)  */}
      {/* "đảo không bị di chuyển khi cuộn, và đảo giả không có */}
      {/* chức năng gì chỉ phục vụ cho animation và quan sát" */}
      {/* ---------------------------------------------------- */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center px-4 pointer-events-none"
        style={{
          paddingBottom: `max(env(safe-area-inset-bottom), ${config.island.bottomOffset}px)`,
        }}
      >
        {/* Floating Sandbox Label */}
        <div className="pointer-events-auto mb-2 px-3.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-[11px] font-bold text-neutral-300 shadow-xl flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Đảo giả lập quan sát • Chạm vào tab để thử animation</span>
        </div>

        <div className="relative w-full max-w-[500px] flex flex-col items-end gap-2.5 pointer-events-none">
          {/* Dummy Island Navigation - 100% Identical Parity with Real Island */}
          <motion.nav
            ref={dummyNavRef}
            id="dummy-island-navigation"
            role="navigation"
            aria-label="Đảo giả lập quan sát"
            whileTap={{ scale: config.island.tapScale ?? 0.99 }}
            transition={{ type: 'spring', stiffness: config.island.springStiffness, damping: config.island.springDamping, mass: config.island.springMass ?? 0.5 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full border rounded-full touch-none pointer-events-auto transition-all flex items-center relative overflow-visible"
            style={islandStyles}
          >
            {/* SVG Gradient Definition for Active Tab Icons */}
            <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
              <defs>
                <linearGradient
                  id="dummy-nav-active-gradient"
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
                scaleX: pressScaleX,
                scaleY: pressScaleY,
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
                  backdropFilter: `blur(${config.activeTab.blur}px) saturate(${config.activeTab.saturation}%) brightness(${config.activeTab.brightness}%) contrast(${config.activeTab.contrast}%)`,
                  WebkitBackdropFilter: `blur(${config.activeTab.blur}px) saturate(${config.activeTab.saturation}%) brightness(${config.activeTab.brightness}%) contrast(${config.activeTab.contrast}%)`,
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

              {/* 2. Secondary Reflected Edge Layer */}
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

            {/* LAYER 1: BASE TAB LAYER (Interactive, neutral gray icons) */}
            <div
              className="absolute inset-0 flex items-center justify-between pointer-events-none z-10"
              style={{
                paddingLeft: `${config.island.paddingX}px`,
                paddingRight: `${config.island.paddingX}px`,
                paddingTop: `${config.island.paddingY}px`,
                paddingBottom: `${config.island.paddingY}px`,
              }}
            >
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto">
                <DummyNavItem tab="flow" Icon={Layers} label="Dòng tiền" />
              </div>
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto">
                <DummyNavItem tab="statistics" Icon={PieChart} label="Thống kê" />
              </div>
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto">
                <DummyNavItem tab="profile" Icon={User} label="Cá nhân" />
              </div>
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto">
                <DummyNavItem tab="debts" Icon={Users} label="Công nợ" />
              </div>
              <div className="flex-1 h-full flex items-center justify-center pointer-events-auto">
                <DummyNavItem tab="settings" Icon={Settings} label="Cài đặt" />
              </div>
            </div>

            {/* LAYER 2: MASKED ACTIVE GRADIENT LAYER (Strictly clipped to droplet) */}
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
              {[
                { tab: 'flow' as ActiveTab, Icon: Layers },
                { tab: 'statistics' as ActiveTab, Icon: PieChart },
                { tab: 'profile' as ActiveTab, Icon: User },
                { tab: 'debts' as ActiveTab, Icon: Users },
                { tab: 'settings' as ActiveTab, Icon: Settings },
              ].map(({ tab, Icon }) => {
                const isCurrentActive = dummyActiveTab === tab;
                const isHovered = dummyHoverTab === tab;
                const isVisuallyActive = dummyHoverTab !== null ? isHovered : isCurrentActive;

                return (
                  <div key={`dummy-active-${tab}`} className="flex-1 h-full flex items-center justify-center pointer-events-none">
                    <div className="relative flex items-center justify-center w-full h-full p-0 m-0 bg-transparent border-none select-none">
                      <motion.div
                        animate={{ scale: isVisuallyActive ? (config.activeTab.iconActiveScale ?? 1.18) : 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        className="p-2 flex items-center justify-center"
                      >
                        <Icon
                          size={22}
                          stroke="url(#dummy-nav-active-gradient)"
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
    </div>
  );
};
