import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  Sliders,
  Palette,
  TrendingDown,
  TrendingUp,
  Wallet,
  Building2,
  Layers,
  ArrowRight,
  Sun,
  Flame,
} from 'lucide-react';
import { SystemColorsConfig, ColorPreset } from '../types/systemColors';
import {
  SYSTEM_COLOR_PRESETS,
  DEFAULT_SYSTEM_COLORS,
  deriveShades,
  saveSystemColors,
  resetSystemColorsToFactory,
  generateSystemColorsCss,
  hexToHsl,
  hslToHex,
} from '../utils/systemColorManager';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';
import { SegmentedTabs } from './SegmentedTabs';

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
  const [mainTab, setMainTab] = useState<'presets' | 'custom' | 'preview' | 'export'>('presets');
  const [selectedColorKey, setSelectedColorKey] = useState<'red' | 'yellow' | 'green' | 'blue' | 'gradient'>('red');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync incoming props
  useEffect(() => {
    setConfig(currentColorConfig);
  }, [currentColorConfig]);

  // Bottom sheet drag gesture controller
  const sheetDrag = useBottomSheetDrag({
    onClose,
    threshold: 65,
  });

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
    onColorConfigChange(reset);
    showToast('Đã khôi phục màu sắc hệ thống xuất xưởng!');
  };

  const handleMainColorChange = (key: 'red' | 'yellow' | 'green' | 'blue', newHex: string) => {
    const shades = deriveShades(newHex);
    const updated: SystemColorsConfig = {
      ...config,
      activePresetId: null, // Mark as custom
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
        className="w-full max-w-lg bg-[#0a0b0d] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] h-[88vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------------------------------------------------- */}
        {/* 1. TOP HEADER & PULL DRAG HANDLE                    */}
        {/* ---------------------------------------------------- */}
        <div className="flex flex-col border-b border-neutral-800/80 bg-[#121418]/95 backdrop-blur-md shrink-0 px-4 pt-1.5 pb-2.5 z-20 space-y-1.5">
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
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-sm shrink-0">
                <Palette size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-2">
                  Studio Màu Sắc Hệ Thống
                </h1>
                <p className="text-[11px] text-neutral-400 truncate">
                  Sắc độ 5 màu chủ đạo: Đỏ, Vàng, Xanh lá, Xanh dương, Tím hồng
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

          {/* Quick Color Swatch Indicator Bar */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex-1 flex items-center gap-1.5 p-1 rounded-xl bg-[#181a20] border border-neutral-800/80">
              <div
                className="h-3 flex-1 rounded-md transition-colors"
                style={{ backgroundColor: config.red.main }}
                title="Đỏ (Chi tiêu)"
              />
              <div
                className="h-3 flex-1 rounded-md transition-colors"
                style={{ backgroundColor: config.yellow.main }}
                title="Vàng (Ví tiền)"
              />
              <div
                className="h-3 flex-1 rounded-md transition-colors"
                style={{ backgroundColor: config.green.main }}
                title="Xanh lá (Thu nhập)"
              />
              <div
                className="h-3 flex-1 rounded-md transition-colors"
                style={{ backgroundColor: config.blue.main }}
                title="Xanh dương (Ngân hàng)"
              />
              <div
                className="h-3 flex-1 rounded-md transition-colors"
                style={{
                  background: `linear-gradient(to right, ${config.gradient.start}, ${config.gradient.end})`,
                }}
                title="Tím hồng Gradient"
              />
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. NAVIGATION SEGMENTED TABS                         */}
        {/* ---------------------------------------------------- */}
        <div className="px-4 py-2 border-b border-neutral-800/60 bg-[#0d0e12]/90 shrink-0">
          <SegmentedTabs<'presets' | 'custom' | 'preview' | 'export'>
            layoutId="system_color_studio_tabs"
            activeId={mainTab}
            onChange={setMainTab}
            tabs={[
              { id: 'presets', label: 'Bộ theme', icon: Sparkles },
              { id: 'custom', label: 'Tùy chỉnh', icon: Sliders },
              { id: 'preview', label: 'Xem trước', icon: Layers },
              { id: 'export', label: 'Copy CSS', icon: Copy },
            ]}
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* 3. MAIN SCROLLABLE CONTENT BODY                     */}
        {/* ---------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-neutral-200">
          {/* TAB 1: BỘ THEME (THEME PRESETS) */}
          {mainTab === 'presets' && (
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
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-[#181a22] border-white/40 shadow-lg ring-1 ring-white/20'
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
                          <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* 5 Color Palette Swatches */}
                      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/40 border border-white/5">
                        <div
                          className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.config.red.main }}
                          title="Đỏ"
                        />
                        <div
                          className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.config.yellow.main }}
                          title="Vàng"
                        />
                        <div
                          className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.config.green.main }}
                          title="Xanh lá"
                        />
                        <div
                          className="w-5 h-5 rounded-lg border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.config.blue.main }}
                          title="Xanh dương"
                        />
                        <div
                          className="flex-1 h-5 rounded-lg border border-black/20"
                          style={{
                            background: `linear-gradient(to right, ${preset.config.gradient.start}, ${preset.config.gradient.end})`,
                          }}
                          title="Tím hồng"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TÙY CHỈNH (CUSTOM COLOR ADJUSTMENT) */}
          {mainTab === 'custom' && (
            <div className="space-y-4">
              {/* Selector for 5 master colors */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Chọn gam màu cần hiệu chỉnh:
                </label>
                <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#14151b] rounded-2xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSelectedColorKey('red')}
                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColorKey === 'red'
                        ? 'bg-[#222530] border border-neutral-700 shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/30"
                      style={{ backgroundColor: config.red.main }}
                    />
                    <span className="text-[10px] font-bold text-neutral-200">Đỏ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedColorKey('yellow')}
                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColorKey === 'yellow'
                        ? 'bg-[#222530] border border-neutral-700 shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/30"
                      style={{ backgroundColor: config.yellow.main }}
                    />
                    <span className="text-[10px] font-bold text-neutral-200">Vàng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedColorKey('green')}
                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColorKey === 'green'
                        ? 'bg-[#222530] border border-neutral-700 shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/30"
                      style={{ backgroundColor: config.green.main }}
                    />
                    <span className="text-[10px] font-bold text-neutral-200">Xanh lá</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedColorKey('blue')}
                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColorKey === 'blue'
                        ? 'bg-[#222530] border border-neutral-700 shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/30"
                      style={{ backgroundColor: config.blue.main }}
                    />
                    <span className="text-[10px] font-bold text-neutral-200">Xanh dương</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedColorKey('gradient')}
                    className={`py-2 px-1 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedColorKey === 'gradient'
                        ? 'bg-[#222530] border border-neutral-700 shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/30"
                      style={{
                        background: `linear-gradient(to right, ${config.gradient.start}, ${config.gradient.end})`,
                      }}
                    />
                    <span className="text-[10px] font-bold text-neutral-200">Tím hồng</span>
                  </button>
                </div>
              </div>

              {/* CONTROLS FOR SINGLE COLOR (RED, YELLOW, GREEN, BLUE) */}
              {selectedColorKey !== 'gradient' && (
                <div className="bg-[#14151b] rounded-2xl p-4 border border-neutral-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-white capitalize">
                        {selectedColorKey === 'red' && 'Màu Đỏ (Chi tiêu & Khoản nợ)'}
                        {selectedColorKey === 'yellow' && 'Màu Vàng (Ví tiền & Số dư)'}
                        {selectedColorKey === 'green' && 'Màu Xanh lá (Thu nhập & Tăng trưởng)'}
                        {selectedColorKey === 'blue' && 'Màu Xanh dương (Ngân hàng & Chuyển tiền)'}
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

              {/* CONTROLS FOR PURPLE-PINK GRADIENT */}
              {selectedColorKey === 'gradient' && (
                <div className="bg-[#14151b] rounded-2xl p-4 border border-neutral-800 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-white">
                      Tím Hồng Gradient (Thương hiệu & Điểm nhấn)
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Dùng cho tiêu đề Ngày hôm nay trên Lịch, biểu tượng cài đặt và giọt nước Liquid Glass.
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

          {/* TAB 3: XEM TRƯỚC (LIVE PREVIEW SANDBOX) */}
          {mainTab === 'preview' && (
            <div className="space-y-3.5">
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
                  Điểm nhấn Gradient
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
                  Thu & Chi (Màu Đỏ & Xanh Lá)
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

              {/* Sandbox Card 3: Tài khoản Ví & Ngân hàng (Vàng & Xanh Dương) */}
              <div className="bg-[#14151b] rounded-2xl p-3.5 border border-neutral-800 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Tài khoản (Màu Vàng & Xanh Dương)
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
            </div>
          )}

          {/* TAB 4: SAO CHÉP CSS (EXPORT CSS) */}
          {mainTab === 'export' && (
            <div className="space-y-3">
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
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* 4. BOTTOM ACTION FOOTER                              */}
        {/* ---------------------------------------------------- */}
        <div className="border-t border-neutral-800/80 bg-[#121418]/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-neutral-400">
              {config.activePresetId
                ? `Preset: ${SYSTEM_COLOR_PRESETS.find((p) => p.id === config.activePresetId)?.name}`
                : 'Tùy chỉnh riêng'}
            </span>
          </div>

          <button
            type="button"
            onClick={sheetDrag.closeWithAnimation}
            className="py-2 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-bold active:scale-98 transition-all cursor-pointer"
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
