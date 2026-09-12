import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  Sliders,
  Layers,
  Sun,
  Flame,
  TrendingDown,
  TrendingUp,
  Wallet,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { SystemColorsConfig, ColorPreset } from '../types/systemColors';
import {
  SYSTEM_COLOR_PRESETS,
  deriveShades,
  saveSystemColors,
  resetSystemColorsToFactory,
  generateSystemColorsCss,
  hexToHsl,
  hslToHex,
} from '../utils/systemColorManager';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';

interface SystemColorStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColorConfig: SystemColorsConfig;
  onColorConfigChange: (config: SystemColorsConfig) => void;
}

export const SystemColorStudioModal: React.FC<SystemColorStudioModalProps> = ({
  isOpen,
  onClose,
  currentColorConfig,
  onColorConfigChange,
}) => {
  const [config, setConfig] = useState<SystemColorsConfig>(currentColorConfig);
  
  // 2-level navigation:
  // Top Container: Mode ('presets' = Bộ theme, 'custom' = Tùy chỉnh)
  const [mainMode, setMainMode] = useState<'presets' | 'custom'>(
    currentColorConfig.activePresetId ? 'presets' : 'custom'
  );
  
  // Bottom Container: SubTab ('selection' = Lựa chọn, 'preview' = Xem trước, 'export' = Copy CSS)
  const [subTab, setSubTab] = useState<'selection' | 'preview' | 'export'>('selection');
  
  // Color Key selector inside Custom mode (Thu, Chi, Ví, Bank, Theme)
  const [selectedColorKey, setSelectedColorKey] = useState<'green' | 'red' | 'yellow' | 'blue' | 'gradient'>('green');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync incoming props
  useEffect(() => {
    setConfig(currentColorConfig);
    if (currentColorConfig.activePresetId) {
      setMainMode('presets');
    }
  }, [currentColorConfig]);

  // Bottom sheet drag gesture controller
  const sheetDrag = useBottomSheetDrag({
    onClose,
    threshold: 65,
  });

  // Container 1 gesture sliding controller (Bộ theme / Tùy chỉnh)
  const mainModeTabs: ('presets' | 'custom')[] = ['presets', 'custom'];
  const mainModeControlRef = useRef<HTMLDivElement>(null);
  const isDraggingMainModeRef = useRef(false);

  const updateMainModeFromPointer = (clientX: number) => {
    if (!mainModeControlRef.current) return;
    const rect = mainModeControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * mainModeTabs.length);
    const selected = mainModeTabs[targetIdx];
    if (selected && selected !== mainMode) {
      setMainMode(selected);
    }
  };

  const handleMainModePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingMainModeRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateMainModeFromPointer(e.clientX);
  };

  const handleMainModePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMainModeRef.current) return;
    updateMainModeFromPointer(e.clientX);
  };

  const handleMainModePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingMainModeRef.current) {
      isDraggingMainModeRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Container 2 gesture sliding controller (Lựa chọn / Xem trước / Copy CSS)
  const subTabsList: ('selection' | 'preview' | 'export')[] = ['selection', 'preview', 'export'];
  const subTabControlRef = useRef<HTMLDivElement>(null);
  const isDraggingSubTabRef = useRef(false);

  const updateSubTabFromPointer = (clientX: number) => {
    if (!subTabControlRef.current) return;
    const rect = subTabControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * subTabsList.length);
    const selected = subTabsList[targetIdx];
    if (selected && selected !== subTab) {
      setSubTab(selected);
    }
  };

  const handleSubTabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSubTabRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateSubTabFromPointer(e.clientX);
  };

  const handleSubTabPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSubTabRef.current) return;
    updateSubTabFromPointer(e.clientX);
  };

  const handleSubTabPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSubTabRef.current) {
      isDraggingSubTabRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Container 3 gesture sliding controller (Thu / Chi / Ví / Bank / Theme)
  const colorKeyTabs: ('green' | 'red' | 'yellow' | 'blue' | 'gradient')[] = ['green', 'red', 'yellow', 'blue', 'gradient'];
  const colorKeyControlRef = useRef<HTMLDivElement>(null);
  const isDraggingColorKeyRef = useRef(false);

  const updateColorKeyFromPointer = (clientX: number) => {
    if (!colorKeyControlRef.current) return;
    const rect = colorKeyControlRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.999, relX / rect.width));
    const targetIdx = Math.floor(ratio * colorKeyTabs.length);
    const selected = colorKeyTabs[targetIdx];
    if (selected && selected !== selectedColorKey) {
      setSelectedColorKey(selected);
    }
  };

  const handleColorKeyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingColorKeyRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    updateColorKeyFromPointer(e.clientX);
  };

  const handleColorKeyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingColorKeyRef.current) return;
    updateColorKeyFromPointer(e.clientX);
  };

  const handleColorKeyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingColorKeyRef.current) {
      isDraggingColorKeyRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApplyPreset = (preset: ColorPreset) => {
    const updated: SystemColorsConfig = {
      version: 1,
      activePresetId: preset.id,
      ...preset.config,
    };
    setConfig(updated);
    saveSystemColors(updated);
    onColorConfigChange(updated);
    showToast(`Đã áp dụng bộ theme "${preset.name}"`);
  };

  const handleFactoryReset = () => {
    const reset = resetSystemColorsToFactory();
    setConfig(reset);
    setMainMode('presets');
    onColorConfigChange(reset);
    showToast('Đã khôi phục màu sắc hệ thống xuất xưởng!');
  };

  const handleMainColorChange = (key: 'red' | 'yellow' | 'green' | 'blue', newHex: string) => {
    const shades = deriveShades(newHex);
    const updated: SystemColorsConfig = {
      ...config,
      activePresetId: null, // Mark as custom in-use
      [key]: shades,
    };
    setConfig(updated);
    saveSystemColors(updated);
    onColorConfigChange(updated);
  };

  const handleShadeAdjustment = (
    key: 'red' | 'yellow' | 'green' | 'blue',
    type: 'lightness' | 'saturation',
    value: number
  ) => {
    const currentHex = config[key].main;
    const hsl = hexToHsl(currentHex);
    if (type === 'lightness') {
      hsl.l = value;
    } else {
      hsl.s = value;
    }
    const newHex = hslToHex(hsl.h, hsl.s, hsl.l);
    handleMainColorChange(key, newHex);
  };

  const handleGradientChange = (
    field: 'start' | 'end' | 'purple' | 'pink',
    colorHex: string
  ) => {
    const newGradient = {
      ...config.gradient,
      [field]: colorHex,
    };
    // Keep start/purple and end/pink harmonized if user edits
    if (field === 'start') newGradient.purple = colorHex;
    if (field === 'end') newGradient.pink = colorHex;

    const updated: SystemColorsConfig = {
      ...config,
      activePresetId: null,
      gradient: newGradient,
    };
    setConfig(updated);
    saveSystemColors(updated);
    onColorConfigChange(updated);
  };

  const handleCopyCss = async () => {
    try {
      const css = generateSystemColorsCss(config);
      await navigator.clipboard.writeText(css);
      setCopiedCode(true);
      showToast('Đã sao chép toàn bộ mã CSS vào Clipboard!');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast('Không thể sao chép, vui lòng thử lại.');
    }
  };

  if (!isOpen) return null;

  // Status check: Which configuration mode is currently in use/applied
  const isPresetInUse = config.activePresetId !== null;
  const isCustomInUse = config.activePresetId === null;

  const currentHsl = selectedColorKey !== 'gradient' ? hexToHsl(config[selectedColorKey].main) : null;

  // Quick vibrant shade options for each color
  const QUICK_SHADES: Record<'red' | 'yellow' | 'green' | 'blue', string[]> = {
    red: ['#ff073a', '#ff1744', '#f43f5e', '#ef4444', '#dc2626', '#e11d48', '#ff2a6d', '#ff3366'],
    yellow: ['#ffb300', '#ffc107', '#f59e0b', '#feca57', '#ffe600', '#f39c12', '#d97706', '#eab308'],
    green: ['#00e676', '#10b981', '#05ffa1', '#1dd1a1', '#2ecc71', '#10ac84', '#059669', '#22c55e'],
    blue: ['#00b0ff', '#0ea5e9', '#00f0ff', '#48dbfb', '#3b82f6', '#2563eb', '#2980b9', '#0284c7'],
  };

  const GRADIENT_PRESETS = [
    { name: 'Neon Cyber', start: '#a855f7', end: '#ec4899' },
    { name: 'Tokyo Synth', start: '#b967ff', end: '#ff45a4' },
    { name: 'Sunset Glow', start: '#9b59b6', end: '#e056fd' },
    { name: 'Cotton Candy', start: '#a29bfe', end: '#fd79a8' },
    { name: 'Electric Purple', start: '#7e22ce', end: '#be185d' },
    { name: 'Rose Gold', start: '#c084fc', end: '#fb7185' },
  ];

  return (
    <div
      style={sheetDrag.backdropStyle}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 pt-[max(env(safe-area-inset-top,0px),16px)] text-neutral-100 select-none"
      onClick={sheetDrag.closeWithAnimation}
    >
      <div
        style={sheetDrag.sheetStyle}
        className="w-full max-w-lg bg-[#0a0b0d] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] h-[90vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------------------------------------------------- */}
        {/* 1. TOP HEADER & PULL DRAG HANDLE                    */}
        {/* ---------------------------------------------------- */}
        <div className="flex flex-col border-b border-neutral-800/80 bg-[#121418]/95 backdrop-blur-md shrink-0 px-4 pt-1.5 pb-2.5 z-20 space-y-2">
          <BottomSheetDragHandle
            isHandleActive={sheetDrag.isHandleActive}
            onPointerDown={sheetDrag.handlePointerDown}
            onPointerMove={sheetDrag.handlePointerMove}
            onPointerUp={sheetDrag.handlePointerUp}
            onPointerCancel={sheetDrag.handlePointerUp}
            onTouchStart={sheetDrag.handleTouchStart}
            onTouchMove={sheetDrag.handleTouchMove}
            onTouchEnd={sheetDrag.handleTouchEnd}
            onTouchCancel={sheetDrag.handleTouchCancel}
          />

          <div className="flex items-center justify-between">
            {/* Frameless Purple-Pink Gradient Logo and Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0 flex items-center justify-center">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="url(#system-color-studio-logo-gradient)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-xs"
                >
                  <defs>
                    <linearGradient id="system-color-studio-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--sys-gradient-start, #a855f7)" />
                      <stop offset="50%" stopColor="var(--sys-gradient-purple, #c084fc)" />
                      <stop offset="100%" stopColor="var(--sys-gradient-end, #ec4899)" />
                    </linearGradient>
                  </defs>
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-2">
                  Studio Màu Sắc Hệ Thống
                </h1>
                <p className="text-[11px] text-neutral-400 truncate">
                  Sắc độ 5 màu: Chi, Ví, Thu, Bank, Theme
                </p>
              </div>
            </div>

            {/* Header Actions: Reset to Factory and Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleFactoryReset}
                title="Khôi phục xuất xưởng mặc định"
                className="p-2 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white border border-neutral-800 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <RotateCcw size={14} className="text-neutral-400" />
                <span className="hidden sm:inline">Xuất xưởng</span>
              </button>

              <button
                type="button"
                onClick={sheetDrag.closeWithAnimation}
                title="Đóng"
                className="p-2 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-400 hover:text-white border border-neutral-800 active:scale-95 transition-all cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Dải 5 màu chủ đạo đang áp dụng */}
          <div className="p-2.5 sm:p-3 bg-[#181a20] rounded-2xl border border-neutral-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-neutral-300">
                Dải 5 màu chủ đạo đang áp dụng:
              </span>
              {config.activePresetId ? (
                <span className="text-[10px] font-mono text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-800/50">
                  {SYSTEM_COLOR_PRESETS.find(p => p.id === config.activePresetId)?.name || 'Theme mẫu'}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-800/50">
                  Tùy chỉnh riêng
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-0.5">
              {/* 1. Thu (Green) */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full h-7 rounded-xl border border-white/10 shadow-xs transition-colors"
                  style={{ backgroundColor: config.green.main }}
                  title="Thu nhập"
                />
                <span className="text-[10px] font-bold text-neutral-400 truncate">Thu</span>
              </div>

              {/* 2. Chi (Red) */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full h-7 rounded-xl border border-white/10 shadow-xs transition-colors"
                  style={{ backgroundColor: config.red.main }}
                  title="Chi tiêu & Nợ"
                />
                <span className="text-[10px] font-bold text-neutral-400 truncate">Chi</span>
              </div>

              {/* 3. Ví (Yellow) */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full h-7 rounded-xl border border-white/10 shadow-xs transition-colors"
                  style={{ backgroundColor: config.yellow.main }}
                  title="Ví tiền"
                />
                <span className="text-[10px] font-bold text-neutral-400 truncate">Ví</span>
              </div>

              {/* 4. Bank (Blue) */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full h-7 rounded-xl border border-white/10 shadow-xs transition-colors"
                  style={{ backgroundColor: config.blue.main }}
                  title="Ngân hàng"
                />
                <span className="text-[10px] font-bold text-neutral-400 truncate">Bank</span>
              </div>

              {/* 5. Theme (Purple-Pink Gradient) */}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full h-7 rounded-xl border border-white/10 shadow-xs transition-colors"
                  style={{
                    background: `linear-gradient(to right, ${config.gradient.start}, ${config.gradient.end})`,
                  }}
                  title="Tím hồng Gradient Theme"
                />
                <span className="text-[10px] font-bold text-neutral-400 truncate">Theme</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. DUAL NAVIGATION CONTAINERS (SYSTEM DESIGN MATCH)  */}
        {/* ---------------------------------------------------- */}
        <div className="px-4 py-2.5 border-b border-neutral-800/70 bg-[#0d0e12]/95 shrink-0 space-y-2">
          {/* CONTAINER 1: BỘ THEME - TÙY CHỈNH */}
          <LayoutGroup id="system_color_main_mode_group">
            <div
              ref={mainModeControlRef}
              onPointerDown={handleMainModePointerDown}
              onPointerMove={handleMainModePointerMove}
              onPointerUp={handleMainModePointerUp}
              onPointerCancel={handleMainModePointerUp}
              className="bg-[#1a1a1a] border border-neutral-800 p-1 rounded-xl grid grid-cols-2 gap-1.5 relative touch-none select-none"
            >
              {/* Tab 1: Bộ theme */}
              <button
                type="button"
                onClick={() => setMainMode('presets')}
                className="relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              >
                {mainMode === 'presets' && (
                  <motion.div
                    layoutId="system_color_main_mode_active_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <span
                  className={`relative z-10 font-bold ${
                    isPresetInUse
                      ? mainMode === 'presets'
                        ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 bg-clip-text text-transparent font-black tracking-tight'
                        : 'bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent font-black tracking-tight'
                      : mainMode === 'presets'
                      ? 'text-black font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Bộ theme
                </span>
              </button>

              {/* Tab 2: Tùy chỉnh */}
              <button
                type="button"
                onClick={() => setMainMode('custom')}
                className="relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              >
                {mainMode === 'custom' && (
                  <motion.div
                    layoutId="system_color_main_mode_active_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <span
                  className={`relative z-10 font-bold ${
                    isCustomInUse
                      ? mainMode === 'custom'
                        ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 bg-clip-text text-transparent font-black tracking-tight'
                        : 'bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent font-black tracking-tight'
                      : mainMode === 'custom'
                      ? 'text-black font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Tùy chỉnh
                </span>
              </button>
            </div>
          </LayoutGroup>

          {/* CONTAINER 2: LỰA CHỌN - XEM TRƯỚC - COPY CSS (NO LOGOS) */}
          <LayoutGroup id="system_color_sub_tab_group">
            <div
              ref={subTabControlRef}
              onPointerDown={handleSubTabPointerDown}
              onPointerMove={handleSubTabPointerMove}
              onPointerUp={handleSubTabPointerUp}
              onPointerCancel={handleSubTabPointerUp}
              className="bg-[#1a1a1a] border border-neutral-800 p-1 rounded-xl grid grid-cols-3 gap-1.5 relative touch-none select-none"
            >
              {/* SubTab 1: Lựa chọn */}
              <button
                type="button"
                onClick={() => setSubTab('selection')}
                className="relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              >
                {subTab === 'selection' && (
                  <motion.div
                    layoutId="system_color_sub_tab_active_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <span
                  className={`relative z-10 ${
                    subTab === 'selection'
                      ? 'text-black font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-200 font-bold'
                  }`}
                >
                  Lựa chọn
                </span>
              </button>

              {/* SubTab 2: Xem trước */}
              <button
                type="button"
                onClick={() => setSubTab('preview')}
                className="relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              >
                {subTab === 'preview' && (
                  <motion.div
                    layoutId="system_color_sub_tab_active_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <span
                  className={`relative z-10 ${
                    subTab === 'preview'
                      ? 'text-black font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-200 font-bold'
                  }`}
                >
                  Xem trước
                </span>
              </button>

              {/* SubTab 3: Copy CSS */}
              <button
                type="button"
                onClick={() => setSubTab('export')}
                className="relative h-8 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              >
                {subTab === 'export' && (
                  <motion.div
                    layoutId="system_color_sub_tab_active_pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                  />
                )}
                <span
                  className={`relative z-10 ${
                    subTab === 'export'
                      ? 'text-black font-extrabold'
                      : 'text-neutral-400 hover:text-neutral-200 font-bold'
                  }`}
                >
                  Copy CSS
                </span>
              </button>
            </div>
          </LayoutGroup>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 3. MAIN SCROLLABLE CONTENT BODY WITH ANIMATIONS      */}
        {/* ---------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-neutral-200">
          <AnimatePresence mode="wait">
            {/* VIEW A: LỰA CHỌN (SELECTION) */}
            {subTab === 'selection' && (
              <motion.div
                key={`selection_${mainMode}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* SUB-VIEW 1: BỘ THEME PRESETS LIST */}
                {mainMode === 'presets' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                          Các bộ phối màu tạo sẵn
                        </h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Chọn một bộ theme để đồng bộ tức thì 5 màu sắc trên toàn bộ giao diện.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SYSTEM_COLOR_PRESETS.map((preset) => {
                        const isActive = config.activePresetId === preset.id;
                        return (
                          <motion.button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            whileTap={{ scale: 0.98 }}
                            className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                              isActive
                                ? 'bg-[#181a22] border-purple-500/60 shadow-lg ring-1 ring-purple-500/30'
                                : 'bg-[#14151b] border-neutral-800/80 hover:bg-[#1a1c24] hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-white">{preset.name}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700">
                                    {preset.tag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                                  {preset.description}
                                </p>
                              </div>
                              {isActive && (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}
                            </div>

                            {/* 5 Color Palette Swatches (Thu, Chi, Ví, Bank, Theme) */}
                            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/40 border border-white/5">
                              <div
                                className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                                style={{ backgroundColor: preset.config.green.main }}
                                title="Thu"
                              />
                              <div
                                className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                                style={{ backgroundColor: preset.config.red.main }}
                                title="Chi"
                              />
                              <div
                                className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                                style={{ backgroundColor: preset.config.yellow.main }}
                                title="Ví"
                              />
                              <div
                                className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                                style={{ backgroundColor: preset.config.blue.main }}
                                title="Bank"
                              />
                              <div
                                className="flex-1 h-5 rounded-lg border border-black/20"
                                style={{
                                  background: `linear-gradient(to right, ${preset.config.gradient.start}, ${preset.config.gradient.end})`,
                                }}
                                title="Theme"
                              />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2: TÙY CHỈNH CHI TIẾT (CUSTOM COLOR CONTROLS) */}
                {mainMode === 'custom' && (
                  <div className="space-y-4">
                    {/* CONTAINER 3: CHỌN GAM MÀU (THU - CHI - VÍ - BANK - THEME) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                        Chọn gam màu cần hiệu chỉnh:
                      </label>
                      <LayoutGroup id="system_color_key_selector_group">
                        <div
                          ref={colorKeyControlRef}
                          onPointerDown={handleColorKeyPointerDown}
                          onPointerMove={handleColorKeyPointerMove}
                          onPointerUp={handleColorKeyPointerUp}
                          onPointerCancel={handleColorKeyPointerUp}
                          className="bg-[#1a1a1a] border border-neutral-800 p-1 rounded-xl grid grid-cols-5 gap-1.5 relative touch-none select-none"
                        >
                          {/* Color 1: Thu (Xanh lá) */}
                          <button
                            type="button"
                            onClick={() => setSelectedColorKey('green')}
                            className="relative h-8 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {selectedColorKey === 'green' && (
                              <motion.div
                                layoutId="system_color_key_active_pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="absolute inset-0 bg-white rounded-lg shadow-xs"
                              />
                            )}
                            <span
                              className="relative z-10 w-2.5 h-2.5 rounded-full border border-black/30 shrink-0 shadow-xs"
                              style={{ backgroundColor: config.green.main }}
                            />
                            <span
                              className={`relative z-10 text-xs truncate ${
                                selectedColorKey === 'green' ? 'text-black font-extrabold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              Thu
                            </span>
                          </button>

                          {/* Color 2: Chi (Đỏ) */}
                          <button
                            type="button"
                            onClick={() => setSelectedColorKey('red')}
                            className="relative h-8 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {selectedColorKey === 'red' && (
                              <motion.div
                                layoutId="system_color_key_active_pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="absolute inset-0 bg-white rounded-lg shadow-xs"
                              />
                            )}
                            <span
                              className="relative z-10 w-2.5 h-2.5 rounded-full border border-black/30 shrink-0 shadow-xs"
                              style={{ backgroundColor: config.red.main }}
                            />
                            <span
                              className={`relative z-10 text-xs truncate ${
                                selectedColorKey === 'red' ? 'text-black font-extrabold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              Chi
                            </span>
                          </button>

                          {/* Color 3: Ví (Vàng) */}
                          <button
                            type="button"
                            onClick={() => setSelectedColorKey('yellow')}
                            className="relative h-8 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {selectedColorKey === 'yellow' && (
                              <motion.div
                                layoutId="system_color_key_active_pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="absolute inset-0 bg-white rounded-lg shadow-xs"
                              />
                            )}
                            <span
                              className="relative z-10 w-2.5 h-2.5 rounded-full border border-black/30 shrink-0 shadow-xs"
                              style={{ backgroundColor: config.yellow.main }}
                            />
                            <span
                              className={`relative z-10 text-xs truncate ${
                                selectedColorKey === 'yellow' ? 'text-black font-extrabold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              Ví
                            </span>
                          </button>

                          {/* Color 4: Bank (Xanh dương) */}
                          <button
                            type="button"
                            onClick={() => setSelectedColorKey('blue')}
                            className="relative h-8 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {selectedColorKey === 'blue' && (
                              <motion.div
                                layoutId="system_color_key_active_pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="absolute inset-0 bg-white rounded-lg shadow-xs"
                              />
                            )}
                            <span
                              className="relative z-10 w-2.5 h-2.5 rounded-full border border-black/30 shrink-0 shadow-xs"
                              style={{ backgroundColor: config.blue.main }}
                            />
                            <span
                              className={`relative z-10 text-xs truncate ${
                                selectedColorKey === 'blue' ? 'text-black font-extrabold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              Bank
                            </span>
                          </button>

                          {/* Color 5: Theme (Tím hồng) */}
                          <button
                            type="button"
                            onClick={() => setSelectedColorKey('gradient')}
                            className="relative h-8 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {selectedColorKey === 'gradient' && (
                              <motion.div
                                layoutId="system_color_key_active_pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                className="absolute inset-0 bg-white rounded-lg shadow-xs"
                              />
                            )}
                            <span
                              className="relative z-10 w-2.5 h-2.5 rounded-full border border-black/30 shrink-0 shadow-xs"
                              style={{
                                background: `linear-gradient(to right, ${config.gradient.start}, ${config.gradient.end})`,
                              }}
                            />
                            <span
                              className={`relative z-10 text-xs truncate ${
                                selectedColorKey === 'gradient' ? 'text-black font-extrabold' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              Theme
                            </span>
                          </button>
                        </div>
                      </LayoutGroup>
                    </div>

                    {/* CONTROLS FOR SINGLE COLOR (CHI, VÍ, THU, BANK) */}
                    {selectedColorKey !== 'gradient' && (
                      <div className="bg-[#14151b] rounded-2xl p-4 border border-neutral-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black text-white">
                              {selectedColorKey === 'red' && 'Gam màu Chi tiêu & Khoản nợ (Chi)'}
                              {selectedColorKey === 'yellow' && 'Gam màu Ví tiền & Tiền mặt (Ví)'}
                              {selectedColorKey === 'green' && 'Gam màu Thu nhập & Tăng trưởng (Thu)'}
                              {selectedColorKey === 'blue' && 'Gam màu Ngân hàng & Tài khoản (Bank)'}
                            </h4>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              Hệ thống tự động tính toán sắc độ sáng (light) và đậm (dark) tương ứng.
                            </p>
                          </div>

                          {/* Color Input and Hex Picker */}
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="color"
                                value={config[selectedColorKey].main}
                                onChange={(e) => handleMainColorChange(selectedColorKey, e.target.value)}
                                className="w-8 h-8 rounded-xl opacity-0 absolute inset-0 cursor-pointer"
                              />
                              <div
                                className="w-8 h-8 rounded-xl border border-white/20 shadow-xs flex items-center justify-center cursor-pointer pointer-events-none"
                                style={{ backgroundColor: config[selectedColorKey].main }}
                              />
                            </div>
                            <input
                              type="text"
                              value={config[selectedColorKey].main}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                  if (val.length === 7) {
                                    handleMainColorChange(selectedColorKey, val);
                                  }
                                }
                              }}
                              className="w-20 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-center text-white"
                            />
                          </div>
                        </div>

                        {/* Quick Color Swatches */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-neutral-400">
                            Gợi ý sắc độ nổi bật:
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {QUICK_SHADES[selectedColorKey].map((shade) => (
                              <button
                                key={shade}
                                type="button"
                                onClick={() => handleMainColorChange(selectedColorKey, shade)}
                                className={`h-7 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                  config[selectedColorKey].main.toLowerCase() === shade.toLowerCase()
                                    ? 'border-white scale-105 shadow-md ring-2 ring-white/30'
                                    : 'border-white/10 hover:scale-105 opacity-85 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: shade }}
                              >
                                {config[selectedColorKey].main.toLowerCase() === shade.toLowerCase() && (
                                  <Check size={12} className="text-white drop-shadow-md" strokeWidth={3} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sliders for Brightness (Lightness) & Saturation */}
                        {currentHsl && (
                          <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300">
                                <span className="flex items-center gap-1">
                                  <Sun size={12} className="text-neutral-400" />
                                  Độ sáng (Lightness)
                                </span>
                                <span className="font-mono">{currentHsl.l}%</span>
                              </div>
                              <input
                                type="range"
                                min="20"
                                max="80"
                                value={currentHsl.l}
                                onChange={(e) =>
                                  handleShadeAdjustment(selectedColorKey, 'lightness', parseInt(e.target.value, 10))
                                }
                                className="w-full accent-white h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300">
                                <span className="flex items-center gap-1">
                                  <Flame size={12} className="text-neutral-400" />
                                  Độ bão hòa (Saturation)
                                </span>
                                <span className="font-mono">{currentHsl.s}%</span>
                              </div>
                              <input
                                type="range"
                                min="40"
                                max="100"
                                value={currentHsl.s}
                                onChange={(e) =>
                                  handleShadeAdjustment(selectedColorKey, 'saturation', parseInt(e.target.value, 10))
                                }
                                className="w-full accent-white h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          </div>
                        )}

                        {/* Derived Shades Preview */}
                        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                          <span>Sắc thái suy diễn:</span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px]">
                              <span
                                className="w-3 h-3 rounded-full border border-black/30"
                                style={{ backgroundColor: config[selectedColorKey].light }}
                              />
                              Sáng: <strong className="font-mono text-white">{config[selectedColorKey].light}</strong>
                            </span>
                            <span className="flex items-center gap-1 text-[11px]">
                              <span
                                className="w-3 h-3 rounded-full border border-black/30"
                                style={{ backgroundColor: config[selectedColorKey].dark }}
                              />
                              Đậm: <strong className="font-mono text-white">{config[selectedColorKey].dark}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CONTROLS FOR PURPLE-PINK GRADIENT (THEME) */}
                    {selectedColorKey === 'gradient' && (
                      <div className="bg-[#14151b] rounded-2xl p-4 border border-neutral-800 space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-white">
                            Tím Hồng Gradient (Theme & Điểm nhấn)
                          </h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Dùng cho tiêu đề Hôm nay trên Lịch, biểu tượng cài đặt và giọt nước Liquid Glass.
                          </p>
                        </div>

                        {/* Live Gradient Preview Strip */}
                        <div
                          className="h-10 rounded-xl border border-white/10 flex items-center justify-center font-bold text-xs text-white shadow-inner"
                          style={{
                            background: `linear-gradient(to right, ${config.gradient.start}, ${config.gradient.end})`,
                          }}
                        >
                          Dải chuyển màu thực tế
                        </div>

                        {/* Dual Color Controls: Start (Tím) and End (Hồng) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-300">Điểm bắt đầu</span>
                              <div className="relative">
                                <input
                                  type="color"
                                  value={config.gradient.start}
                                  onChange={(e) => handleGradientChange('start', e.target.value)}
                                  className="w-6 h-6 rounded-lg opacity-0 absolute inset-0 cursor-pointer"
                                />
                                <div
                                  className="w-6 h-6 rounded-lg border border-white/20"
                                  style={{ backgroundColor: config.gradient.start }}
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              value={config.gradient.start}
                              onChange={(e) => handleGradientChange('start', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white text-center"
                            />
                          </div>

                          <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-300">Điểm kết thúc</span>
                              <div className="relative">
                                <input
                                  type="color"
                                  value={config.gradient.end}
                                  onChange={(e) => handleGradientChange('end', e.target.value)}
                                  className="w-6 h-6 rounded-lg opacity-0 absolute inset-0 cursor-pointer"
                                />
                                <div
                                  className="w-6 h-6 rounded-lg border border-white/20"
                                  style={{ backgroundColor: config.gradient.end }}
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              value={config.gradient.end}
                              onChange={(e) => handleGradientChange('end', e.target.value)}
                              className="w-full px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white text-center"
                            />
                          </div>
                        </div>

                        {/* Gradient Presets */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-neutral-400">
                            Gợi ý gradient đẹp mắt:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {GRADIENT_PRESETS.map((grad) => (
                              <button
                                key={grad.name}
                                type="button"
                                onClick={() => {
                                  handleGradientChange('start', grad.start);
                                  handleGradientChange('end', grad.end);
                                }}
                                className="p-2 rounded-xl border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer flex items-center gap-2 bg-[#1a1a1a]"
                              >
                                <div
                                  className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                                  style={{
                                    background: `linear-gradient(to right, ${grad.start}, ${grad.end})`,
                                  }}
                                />
                                <span className="text-[11px] font-bold text-neutral-300 truncate">
                                  {grad.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW B: XEM TRƯỚC (LIVE PREVIEW SANDBOX) */}
            {subTab === 'preview' && (
              <motion.div
                key="preview_view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-3.5"
              >
                <div>
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Mô phỏng giao diện thực tế
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Kiểm tra tính hài hòa và độ tương phản của 5 màu sắc trên các thành phần UI cốt lõi.
                  </p>
                </div>

                {/* Sandbox Card 1: Header Gradient & Brand */}
                <div className="bg-[#14151b] rounded-2xl p-3.5 border border-neutral-800 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Điểm nhấn Gradient Theme
                  </span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${config.gradient.start}, ${config.gradient.end})`,
                        }}
                      >
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div
                          className="text-sm font-black bg-clip-text text-transparent"
                          style={{
                            backgroundImage: `linear-gradient(to right, ${config.gradient.start}, ${config.gradient.end})`,
                          }}
                        >
                          Tháng 09, 2026 • Hôm nay
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">Tiêu đề thương hiệu FIMA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sandbox Card 2: Thu - Chi Badges & Amounts */}
                <div className="bg-[#14151b] rounded-2xl p-3.5 border border-neutral-800 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Thu & Chi (Màu Chi & Màu Thu)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Expense */}
                    <div
                      className="p-3 rounded-xl border flex flex-col justify-between"
                      style={{
                        backgroundColor: `${config.red.main}15`,
                        borderColor: `${config.red.main}40`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold" style={{ color: config.red.light }}>
                          Chi tiêu
                        </span>
                        <TrendingDown size={14} style={{ color: config.red.main }} />
                      </div>
                      <div
                        className="text-sm font-black font-mono mt-1"
                        style={{ color: config.red.main }}
                      >
                        -1,250,000 đ
                      </div>
                    </div>

                    {/* Income */}
                    <div
                      className="p-3 rounded-xl border flex flex-col justify-between"
                      style={{
                        backgroundColor: `${config.green.main}15`,
                        borderColor: `${config.green.main}40`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold" style={{ color: config.green.light }}>
                          Thu nhập
                        </span>
                        <TrendingUp size={14} style={{ color: config.green.main }} />
                      </div>
                      <div
                        className="text-sm font-black font-mono mt-1"
                        style={{ color: config.green.main }}
                      >
                        +8,500,000 đ
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sandbox Card 3: Tài khoản Ví & Ngân hàng (Màu Ví & Màu Bank) */}
                <div className="bg-[#14151b] rounded-2xl p-3.5 border border-neutral-800 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Tài khoản (Màu Ví & Màu Bank)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Wallet */}
                    <div
                      className="p-3 rounded-xl border flex items-center gap-2.5"
                      style={{
                        backgroundColor: `${config.yellow.main}15`,
                        borderColor: `${config.yellow.main}40`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${config.yellow.main}25`,
                          borderColor: `${config.yellow.main}50`,
                          color: config.yellow.light,
                        }}
                      >
                        <Wallet size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold" style={{ color: config.yellow.light }}>
                          Ví tiền mặt
                        </div>
                        <div className="text-xs font-mono font-bold text-white">4,200,000 đ</div>
                      </div>
                    </div>

                    {/* Bank */}
                    <div
                      className="p-3 rounded-xl border flex items-center gap-2.5"
                      style={{
                        backgroundColor: `${config.blue.main}15`,
                        borderColor: `${config.blue.main}40`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${config.blue.main}25`,
                          borderColor: `${config.blue.main}50`,
                          color: config.blue.light,
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold" style={{ color: config.blue.light }}>
                          Ngân hàng
                        </div>
                        <div className="text-xs font-mono font-bold text-white">28,500,000 đ</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW C: COPY CSS (EXPORT CSS) */}
            {subTab === 'export' && (
              <motion.div
                key="export_view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Mã CSS Tokens Hệ Thống
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Dùng mã này trong stylesheet dự án hoặc chia sẻ cấu hình màu sắc.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCss}
                    className="py-1.5 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    {copiedCode ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Đã chép!' : 'Sao chép CSS'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0e0f14] border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed shadow-inner">
                  <pre>{generateSystemColorsCss(config)}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 4. BOTTOM ACTION FOOTER                              */}
        {/* ---------------------------------------------------- */}
        <div className="border-t border-neutral-800/80 bg-[#121418]/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={sheetDrag.closeWithAnimation}
            className="py-2 px-5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-bold active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            Hoàn tất & Đóng
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-neutral-900/95 border border-white/20 text-white text-xs font-bold shadow-2xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
