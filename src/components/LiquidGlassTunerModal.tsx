import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Maximize2,
  Minimize2,
  Eye,
  Layers,
  Droplets,
} from 'lucide-react';
import { useLiquidGlass } from '../context/LiquidGlassContext';
import { PresetType, PRESETS } from '../types/liquidGlass';

interface LiquidGlassTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiquidGlassTunerModal: React.FC<LiquidGlassTunerModalProps> = ({
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
  } = useLiquidGlass();

  const [activeMainTab, setActiveMainTab] = useState<'island' | 'activeTab'>('island');
  
  // Accordion collapsed state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    geometry: true,
    shape: true,
    glass: true,
    border: true,
    shadow: true,
    highlight: true,
    animation: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const expandAllSections = () => {
    setOpenSections({
      geometry: true,
      shape: true,
      glass: true,
      border: true,
      shadow: true,
      highlight: true,
      animation: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      geometry: false,
      shape: false,
      glass: false,
      border: false,
      shadow: false,
      highlight: false,
      animation: false,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-start items-center pointer-events-none">
        {/* Backdrop - transparent/light overlay click-outside trigger, NO blur so island & active tab are 100% crisp & clear */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/20 pointer-events-auto"
        />

        {/* Tuner Panel Container - Expanded downwards to max-h-[calc(100vh-200px)] so it stays above the island navigation */}
        <motion.div
          initial={{ y: '-100%', opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: '-100%', opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative w-full max-w-md bg-[#121214] border-b border-x border-neutral-800 rounded-b-3xl shadow-2xl flex flex-col max-h-[calc(100vh-200px)] overflow-hidden pointer-events-auto mt-0 z-10"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 12px)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-800/80 bg-[#17171a] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sliders size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                  Liquid Glass Tuner
                </h2>
                <p className="text-[10px] text-neutral-400">Realtime appearance & motion control</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={resetAll}
                title="Khôi phục mặc định toàn bộ"
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1 border border-neutral-700/50"
              >
                <RotateCcw size={12} />
                <span>Reset All</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-400 hover:text-white flex items-center justify-center transition-all"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="px-4 py-2.5 bg-[#141416] border-b border-neutral-800/60 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" /> Presets
              </span>
              <span className="text-[10px] text-neutral-500">
                Hiện tại: <strong className="text-emerald-400 capitalize">{config.preset}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {(['default', 'soft', 'strong', 'clear', 'ios'] as PresetType[]).map((presetKey) => {
                const isActive = config.preset === presetKey;
                return (
                  <button
                    key={presetKey}
                    onClick={() => applyPreset(presetKey)}
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize shrink-0 transition-all border ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-neutral-800/60 text-neutral-400 border-neutral-700/40 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    {presetKey === 'default' ? 'Default (Fima)' : presetKey}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2 Main Group Tabs: MAIN ISLAND vs ACTIVE TAB CIRCLE */}
          <div className="flex border-b border-neutral-800 bg-[#121214] shrink-0 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveMainTab('island')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                activeMainTab === 'island'
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Layers size={14} />
              <span>A. Main Island</span>
            </button>

            <button
              onClick={() => setActiveMainTab('activeTab')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                activeMainTab === 'activeTab'
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800/80'
              }`}
            >
              <Droplets size={14} />
              <span>B. Active Tab Circle</span>
            </button>
          </div>

          {/* Toolbar for Accordion Collapse/Expand & Group Reset */}
          <div className="px-4 py-1.5 bg-[#18181b] border-b border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={expandAllSections}
                className="hover:text-white flex items-center gap-0.5"
                title="Mở tất cả mục"
              >
                <Maximize2 size={11} /> Mở hết
              </button>
              <span>•</span>
              <button
                onClick={collapseAllSections}
                className="hover:text-white flex items-center gap-0.5"
                title="Thu gọn tất cả mục"
              >
                <Minimize2 size={11} /> Thu gọn
              </button>
            </div>

            <button
              onClick={activeMainTab === 'island' ? resetIsland : resetActiveTab}
              className="text-amber-400/90 hover:text-amber-300 font-medium flex items-center gap-1 active:scale-95"
            >
              <RotateCcw size={11} />
              <span>Reset {activeMainTab === 'island' ? 'Island' : 'Active Tab'}</span>
            </button>
          </div>

          {/* Scrollable Tuner Controls Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-700">
            {activeMainTab === 'island' ? (
              <>
                {/* 1. Geometry */}
                <SectionGroup
                  title="1. Geometry (Kích thước & Vị trí)"
                  isOpen={openSections.geometry}
                  onToggle={() => toggleSection('geometry')}
                >
                  <ControlSlider
                    label="Width (%)"
                    value={config.island.widthPercent}
                    min={50}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(v) => updateIsland({ widthPercent: v })}
                  />
                  <ControlSlider
                    label="Height"
                    value={config.island.height}
                    min={40}
                    max={100}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ height: v })}
                  />
                  <ControlSlider
                    label="Min Width"
                    value={config.island.minWidth}
                    min={200}
                    max={400}
                    step={5}
                    unit="px"
                    onChange={(v) => updateIsland({ minWidth: v })}
                  />
                  <ControlSlider
                    label="Max Width"
                    value={config.island.maxWidth}
                    min={300}
                    max={600}
                    step={5}
                    unit="px"
                    onChange={(v) => updateIsland({ maxWidth: v })}
                  />
                  <ControlSlider
                    label="Padding Horizontal"
                    value={config.island.paddingX}
                    min={0}
                    max={24}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ paddingX: v })}
                  />
                  <ControlSlider
                    label="Padding Vertical"
                    value={config.island.paddingY}
                    min={0}
                    max={24}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ paddingY: v })}
                  />
                  <ControlSlider
                    label="Position X Offset"
                    value={config.island.positionX}
                    min={-100}
                    max={100}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ positionX: v })}
                  />
                  <ControlSlider
                    label="Bottom Offset"
                    value={config.island.bottomOffset}
                    min={0}
                    max={60}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ bottomOffset: v })}
                  />
                  <ControlSlider
                    label="Overall Scale"
                    value={config.island.scale}
                    min={0.5}
                    max={1.5}
                    step={0.02}
                    unit="x"
                    onChange={(v) => updateIsland({ scale: v })}
                  />
                </SectionGroup>

                {/* 2. Shape */}
                <SectionGroup
                  title="2. Shape (Hình dạng & Bo góc)"
                  isOpen={openSections.shape}
                  onToggle={() => toggleSection('shape')}
                >
                  <ControlSlider
                    label="Main Border Radius"
                    value={config.island.borderRadius}
                    min={0}
                    max={50}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ borderRadius: v })}
                  />
                  <div className="pt-1">
                    <label className="flex items-center justify-between text-xs text-neutral-300 mb-2 cursor-pointer">
                      <span>Tùy chỉnh 4 góc độc lập</span>
                      <input
                        type="checkbox"
                        checked={config.island.isCustomCorners}
                        onChange={(e) => updateIsland({ isCustomCorners: e.target.checked })}
                        className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0"
                      />
                    </label>

                    {config.island.isCustomCorners && (
                      <div className="grid grid-cols-2 gap-2 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                        <ControlSlider
                          label="Top-Left"
                          value={config.island.cornerTopLeft}
                          min={0}
                          max={50}
                          step={1}
                          unit="px"
                          onChange={(v) => updateIsland({ cornerTopLeft: v })}
                        />
                        <ControlSlider
                          label="Top-Right"
                          value={config.island.cornerTopRight}
                          min={0}
                          max={50}
                          step={1}
                          unit="px"
                          onChange={(v) => updateIsland({ cornerTopRight: v })}
                        />
                        <ControlSlider
                          label="Bottom-Left"
                          value={config.island.cornerBottomLeft}
                          min={0}
                          max={50}
                          step={1}
                          unit="px"
                          onChange={(v) => updateIsland({ cornerBottomLeft: v })}
                        />
                        <ControlSlider
                          label="Bottom-Right"
                          value={config.island.cornerBottomRight}
                          min={0}
                          max={50}
                          step={1}
                          unit="px"
                          onChange={(v) => updateIsland({ cornerBottomRight: v })}
                        />
                      </div>
                    )}
                  </div>
                </SectionGroup>

                {/* 3. Glass */}
                <SectionGroup
                  title="3. Glass (Độ mờ & Màu nền kính)"
                  isOpen={openSections.glass}
                  onToggle={() => toggleSection('glass')}
                >
                  <ControlSlider
                    label="Background Opacity"
                    value={config.island.bgOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateIsland({ bgOpacity: v })}
                  />
                  <ControlSlider
                    label="Backdrop Blur"
                    value={config.island.blur}
                    min={0}
                    max={50}
                    step={0.5}
                    unit="px"
                    onChange={(v) => updateIsland({ blur: v })}
                  />
                  <ControlSlider
                    label="Saturation"
                    value={config.island.saturation}
                    min={50}
                    max={300}
                    step={5}
                    unit="%"
                    onChange={(v) => updateIsland({ saturation: v })}
                  />
                  <ControlSlider
                    label="Brightness"
                    value={config.island.brightness}
                    min={50}
                    max={200}
                    step={5}
                    unit="%"
                    onChange={(v) => updateIsland({ brightness: v })}
                  />
                  <ControlSlider
                    label="Contrast"
                    value={config.island.contrast}
                    min={50}
                    max={200}
                    step={5}
                    unit="%"
                    onChange={(v) => updateIsland({ contrast: v })}
                  />
                </SectionGroup>

                {/* 4. Border */}
                <SectionGroup
                  title="4. Border (Viền kính)"
                  isOpen={openSections.border}
                  onToggle={() => toggleSection('border')}
                >
                  <ControlSlider
                    label="Border Width"
                    value={config.island.borderWidth}
                    min={0}
                    max={6}
                    step={0.1}
                    unit="px"
                    onChange={(v) => updateIsland({ borderWidth: v })}
                  />
                  <ControlSlider
                    label="Border Opacity"
                    value={config.island.borderOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateIsland({ borderOpacity: v })}
                  />
                  <ControlSlider
                    label="Inner Reflection Opacity"
                    value={config.island.innerBorderOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateIsland({ innerBorderOpacity: v })}
                  />
                </SectionGroup>

                {/* 5. Shadow */}
                <SectionGroup
                  title="5. Shadow (Bóng đổ)"
                  isOpen={openSections.shadow}
                  onToggle={() => toggleSection('shadow')}
                >
                  <ControlSlider
                    label="Shadow Opacity"
                    value={config.island.shadowOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateIsland({ shadowOpacity: v })}
                  />
                  <ControlSlider
                    label="Shadow Blur"
                    value={config.island.shadowBlur}
                    min={0}
                    max={60}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ shadowBlur: v })}
                  />
                  <ControlSlider
                    label="Shadow Y Offset"
                    value={config.island.shadowY}
                    min={-30}
                    max={50}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ shadowY: v })}
                  />
                </SectionGroup>

                {/* 6. Highlight / Glow */}
                <SectionGroup
                  title="6. Highlight & Glow (Phản chiếu & Phát sáng)"
                  isOpen={openSections.highlight}
                  onToggle={() => toggleSection('highlight')}
                >
                  <ControlSlider
                    label="Outer Glow Size"
                    value={config.island.outerGlowSize}
                    min={0}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={(v) => updateIsland({ outerGlowSize: v })}
                  />
                </SectionGroup>

                {/* 7. Animation */}
                <SectionGroup
                  title="7. Animation (Động lực học)"
                  isOpen={openSections.animation}
                  onToggle={() => toggleSection('animation')}
                >
                  <ControlSlider
                    label="Spring Stiffness"
                    value={config.island.springStiffness}
                    min={100}
                    max={1000}
                    step={10}
                    onChange={(v) => updateIsland({ springStiffness: v })}
                  />
                  <ControlSlider
                    label="Spring Damping"
                    value={config.island.springDamping}
                    min={10}
                    max={100}
                    step={1}
                    onChange={(v) => updateIsland({ springDamping: v })}
                  />
                </SectionGroup>
              </>
            ) : (
              <>
                {/* 1. Active Tab Geometry */}
                <SectionGroup
                  title="1. Geometry (Kích thước & Phồng khi ấn)"
                  isOpen={openSections.geometry}
                  onToggle={() => toggleSection('geometry')}
                >
                  <ControlSlider
                    label="Width"
                    value={config.activeTab.width}
                    min={40}
                    max={120}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ width: v })}
                  />
                  <ControlSlider
                    label="Height"
                    value={config.activeTab.height}
                    min={20}
                    max={80}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ height: v })}
                  />
                  <ControlSlider
                    label="Horizontal Offset X"
                    value={config.activeTab.offsetX}
                    min={-30}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ offsetX: v })}
                  />
                  <ControlSlider
                    label="Vertical Offset Y"
                    value={config.activeTab.offsetY}
                    min={-30}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ offsetY: v })}
                  />
                  <ControlSlider
                    label="Swell Horizontal (Kéo/Ấn)"
                    value={config.activeTab.swellScaleX}
                    min={1.0}
                    max={2.5}
                    step={0.05}
                    unit="x"
                    onChange={(v) => updateActiveTab({ swellScaleX: v })}
                  />
                  <ControlSlider
                    label="Swell Vertical (Kéo/Ấn)"
                    value={config.activeTab.swellScaleY}
                    min={1.0}
                    max={2.5}
                    step={0.05}
                    unit="x"
                    onChange={(v) => updateActiveTab({ swellScaleY: v })}
                  />
                </SectionGroup>

                {/* 2. Active Tab Glass */}
                <SectionGroup
                  title="2. Glass & Material (Chất liệu giọt nước)"
                  isOpen={openSections.glass}
                  onToggle={() => toggleSection('glass')}
                >
                  <ControlSlider
                    label="Background Gradient Opacity"
                    value={config.activeTab.bgOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateActiveTab({ bgOpacity: v })}
                  />
                  <ControlSlider
                    label="Backdrop Blur"
                    value={config.activeTab.blur}
                    min={0}
                    max={50}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ blur: v })}
                  />
                  <ControlSlider
                    label="Saturation"
                    value={config.activeTab.saturation}
                    min={50}
                    max={300}
                    step={5}
                    unit="%"
                    onChange={(v) => updateActiveTab({ saturation: v })}
                  />
                  <ControlSlider
                    label="Contrast"
                    value={config.activeTab.contrast}
                    min={50}
                    max={200}
                    step={5}
                    unit="%"
                    onChange={(v) => updateActiveTab({ contrast: v })}
                  />
                </SectionGroup>

                {/* 3. Active Tab Border */}
                <SectionGroup
                  title="3. Border & Inner Reflection (Viền & Phản xạ)"
                  isOpen={openSections.border}
                  onToggle={() => toggleSection('border')}
                >
                  <ControlSlider
                    label="Border Width"
                    value={config.activeTab.borderWidth}
                    min={0}
                    max={5}
                    step={0.1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ borderWidth: v })}
                  />
                  <ControlSlider
                    label="Border Opacity"
                    value={config.activeTab.borderOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateActiveTab({ borderOpacity: v })}
                  />
                  <ControlSlider
                    label="Top Inner Reflection"
                    value={config.activeTab.innerBorder}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateActiveTab({ innerBorder: v })}
                  />
                  <ControlSlider
                    label="Bottom Inner Reflection"
                    value={config.activeTab.outerBorder}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateActiveTab({ outerBorder: v })}
                  />
                </SectionGroup>

                {/* 4. Active Tab Shadow */}
                <SectionGroup
                  title="4. Shadow (Bóng đổ giọt nước)"
                  isOpen={openSections.shadow}
                  onToggle={() => toggleSection('shadow')}
                >
                  <ControlSlider
                    label="Shadow Opacity"
                    value={config.activeTab.shadowOpacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => updateActiveTab({ shadowOpacity: v })}
                  />
                  <ControlSlider
                    label="Shadow Blur"
                    value={config.activeTab.shadowBlur}
                    min={0}
                    max={40}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ shadowBlur: v })}
                  />
                  <ControlSlider
                    label="Shadow Y Offset"
                    value={config.activeTab.shadowY}
                    min={-20}
                    max={30}
                    step={1}
                    unit="px"
                    onChange={(v) => updateActiveTab({ shadowY: v })}
                  />
                </SectionGroup>

                {/* 5. Active Tab Animation */}
                <SectionGroup
                  title="5. Motion Spring (Động lực lò xo trượt)"
                  isOpen={openSections.animation}
                  onToggle={() => toggleSection('animation')}
                >
                  <ControlSlider
                    label="Move Spring Stiffness"
                    value={config.activeTab.moveStiffness}
                    min={100}
                    max={1000}
                    step={10}
                    onChange={(v) => updateActiveTab({ moveStiffness: v })}
                  />
                  <ControlSlider
                    label="Move Spring Damping"
                    value={config.activeTab.moveDamping}
                    min={10}
                    max={100}
                    step={1}
                    onChange={(v) => updateActiveTab({ moveDamping: v })}
                  />
                  <ControlSlider
                    label="Press Spring Stiffness"
                    value={config.activeTab.pressStiffness}
                    min={100}
                    max={1000}
                    step={10}
                    onChange={(v) => updateActiveTab({ pressStiffness: v })}
                  />
                  <ControlSlider
                    label="Press Spring Damping"
                    value={config.activeTab.pressDamping}
                    min={10}
                    max={100}
                    step={1}
                    onChange={(v) => updateActiveTab({ pressDamping: v })}
                  />
                </SectionGroup>
              </>
            )}
          </div>

          {/* Footer instruction note */}
          <div className="px-4 py-2 bg-[#17171a] border-t border-neutral-800 text-[11px] text-neutral-400 text-center flex items-center justify-center gap-1.5 shrink-0">
            <Eye size={13} className="text-emerald-400" />
            <span>Quan sát thay đổi trực tiếp trên Island phía bên dưới</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Collapsible Section Accordion Component
function SectionGroup({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#18181b] border border-neutral-800/90 rounded-2xl overflow-hidden transition-all shadow-xs">
      <button
        onClick={onToggle}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left font-bold text-xs text-neutral-200 hover:text-white bg-[#1a1a1e] hover:bg-[#202025] transition-colors"
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>

      {isOpen && <div className="p-3.5 space-y-3.5 bg-[#141417]">{children}</div>}
    </div>
  );
}

// Single Control Slider Component with precise numeric display and direct input toggle
function ControlSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempText, setTempText] = useState(value.toString());

  const handleTextSubmit = () => {
    setIsEditing(false);
    const num = parseFloat(tempText);
    if (!isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, num));
      onChange(clamped);
    } else {
      setTempText(value.toString());
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-300 font-medium">{label}</span>
        <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 bg-neutral-900/90 px-2 py-0.5 rounded-md border border-neutral-800">
          {isEditing ? (
            <input
              type="number"
              value={tempText}
              autoFocus
              step={step}
              onChange={(e) => setTempText(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              className="w-14 bg-black text-emerald-300 px-1 rounded text-right outline-none border border-emerald-500/50"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempText(value.toString());
                setIsEditing(true);
              }}
              title="Nhấn để nhập số trực tiếp"
              className="hover:underline cursor-pointer"
            >
              {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value} {unit}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
        />
      </div>
    </div>
  );
}
