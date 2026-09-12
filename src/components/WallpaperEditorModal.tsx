import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Image as ImageIcon,
  Camera,
  Sliders,
  Sparkles,
  Eye,
  Check,
  Smartphone,
  Droplets,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag';
import { BottomSheetDragHandle } from './BottomSheetDragHandle';
import { ImageCropModal } from './ImageCropModal';
import {
  optimizeWallpaper,
  setCachedWallpaper,
  removeCachedWallpaper,
  getStoredWallpaperBlur,
  setStoredWallpaperBlur,
} from '../utils/wallpaperManager';
import {
  getStoredUiTransparency,
  setStoredUiTransparency,
} from '../utils/uiAppearanceManager';

interface WallpaperEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWallpaper?: string | null;
  onApplyWallpaper?: (url: string) => Promise<void>;
  onClearWallpaper?: () => Promise<void>;
  uiTransparency: number;
  onTransparencyChange: (val: number) => Promise<void>;
  wallpaperBlur: number;
  onWallpaperBlurChange: (val: number) => Promise<void>;
}

export const WallpaperEditorModal: React.FC<WallpaperEditorModalProps> = ({
  isOpen,
  onClose,
  activeWallpaper,
  onApplyWallpaper,
  onClearWallpaper,
  uiTransparency,
  onTransparencyChange,
  wallpaperBlur,
  onWallpaperBlurChange,
}) => {
  const sheetDrag = useBottomSheetDrag({
    onClose,
    threshold: 70,
  });

  const wallpaperGalleryInputRef = useRef<HTMLInputElement>(null);
  const wallpaperCameraInputRef = useRef<HTMLInputElement>(null);
  const [wallpaperCropSrc, setWallpaperCropSrc] = useState<string | null>(null);
  const [isWallpaperCropOpen, setIsWallpaperCropOpen] = useState(false);
  const [isProcessingWallpaper, setIsProcessingWallpaper] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleWallpaperFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setWallpaperCropSrc(event.target.result as string);
        setIsWallpaperCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleWallpaperCropComplete = async (blob: Blob, dataUrl?: string) => {
    setIsWallpaperCropOpen(false);
    const rawCroppedUrl = dataUrl || URL.createObjectURL(blob);
    setIsProcessingWallpaper(true);
    try {
      const optimized = await optimizeWallpaper(rawCroppedUrl);
      if (onApplyWallpaper) {
        await onApplyWallpaper(optimized);
      }
      // Default UI transparency to 50% if currently 0%
      if (uiTransparency === 0) {
        await onTransparencyChange(50);
      }
      showToast('Đã áp dụng hình nền mới thành công!');
    } catch (err) {
      console.error('Error optimizing wallpaper:', err);
      showToast('Lỗi khi xử lý hình nền.');
    } finally {
      setIsProcessingWallpaper(false);
      setWallpaperCropSrc(null);
    }
  };

  const handleRemove = async () => {
    try {
      if (onClearWallpaper) {
        await onClearWallpaper();
      }
      await onTransparencyChange(0);
      await onWallpaperBlurChange(0);
      showToast('Đã khôi phục hình nền mặc định!');
    } catch (err) {
      console.error('Error clearing wallpaper:', err);
      showToast('Lỗi khi khôi phục hình nền.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={sheetDrag.backdropStyle}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-0 pt-[max(env(safe-area-inset-top,0px),16px)] text-neutral-100 select-none"
        onClick={sheetDrag.closeWithAnimation}
      >
        <div
          style={sheetDrag.sheetStyle}
          className="w-full max-w-lg bg-[#0a0b0d] border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. TOP HEADER & DRAG HANDLE */}
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
              {/* Colored Logo (Without Frame) and Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 flex items-center justify-center">
                  <ImageIcon
                    size={22}
                    className="drop-shadow-xs shrink-0"
                    stroke="url(#wallpaper-editor-logo-gradient)"
                    strokeWidth={2.3}
                  />
                  <svg width="0" height="0" className="hidden">
                    <defs>
                      <linearGradient
                        id="wallpaper-editor-logo-gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="var(--sys-gradient-start, #a855f7)" />
                        <stop offset="50%" stopColor="var(--sys-gradient-purple, #c084fc)" />
                        <stop offset="100%" stopColor="var(--sys-gradient-end, #ec4899)" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-2">
                    Hình Nền Ứng Dụng
                  </h1>
                  <p className="text-[11px] text-neutral-400 truncate">
                    Tùy chỉnh ảnh nền, độ mờ ảnh & độ trong giao diện
                  </p>
                </div>
              </div>

              {/* Header Actions: Reset & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeWallpaper && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    title="Khôi phục mặc định"
                    className="p-2 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-neutral-300 hover:text-white border border-neutral-800 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <RotateCcw size={14} className="text-neutral-400" />
                    <span className="hidden sm:inline">Mặc định</span>
                  </button>
                )}

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
          </div>

          {/* 2. SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">
            {/* Hidden file inputs */}
            <input
              ref={wallpaperGalleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleWallpaperFileChange}
              className="hidden"
            />
            <input
              ref={wallpaperCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleWallpaperFileChange}
              className="hidden"
            />

            {/* PREVIEW CONTAINER CARD */}
            <div className="bg-[#121418] border border-neutral-800/90 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Eye size={14} className="text-neutral-400" />
                  Xem trước trực tiếp
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-neutral-700/80 text-neutral-300">
                  {activeWallpaper ? 'Ảnh tùy chỉnh' : 'Nền đen mặc định'}
                </span>
              </div>

              {/* Mockup Preview Area */}
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-neutral-700/60 bg-black flex items-center justify-center">
                {activeWallpaper ? (
                  <>
                    <img
                      src={activeWallpaper}
                      alt="Wallpaper preview"
                      style={{
                        filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : 'none',
                        transform: wallpaperBlur > 0 ? 'scale(1.08)' : 'scale(1)',
                        transition: 'filter 0.15s ease, transform 0.15s ease',
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />

                    {/* Mock floating UI Cards inside preview */}
                    <div className="absolute inset-x-4 top-4 bottom-4 flex flex-col justify-between pointer-events-none">
                      {/* Top bar mockup */}
                      <div
                        style={{
                          backgroundColor: `rgba(18, 18, 18, ${(1 - (uiTransparency / 100) * 0.85).toFixed(3)})`,
                          backdropFilter: `blur(${Math.round(3 + (uiTransparency / 100) * 16)}px)`,
                        }}
                        className="rounded-lg p-2 border border-white/10 flex items-center justify-between"
                      >
                        <div className="h-2 w-16 bg-white/40 rounded-full" />
                        <div className="h-2 w-8 bg-emerald-400/80 rounded-full" />
                      </div>

                      {/* Middle card mockup */}
                      <div
                        style={{
                          backgroundColor: `rgba(18, 18, 18, ${(1 - (uiTransparency / 100) * 0.85).toFixed(3)})`,
                          backdropFilter: `blur(${Math.round(3 + (uiTransparency / 100) * 16)}px)`,
                        }}
                        className="rounded-lg p-2.5 border border-white/10 space-y-1.5"
                      >
                        <div className="h-2 w-24 bg-white/50 rounded-full" />
                        <div className="h-3 w-32 bg-amber-400/80 rounded-full" />
                      </div>

                      {/* Bottom tab mockup */}
                      <div className="h-6 w-28 mx-auto rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
                        <div className="h-1.5 w-12 bg-white/60 rounded-full" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                    <ImageIcon size={28} className="text-neutral-600" />
                    <span className="text-xs font-semibold">Chưa chọn hình nền</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Choose from Gallery & Camera */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => wallpaperGalleryInputRef.current?.click()}
                  disabled={isProcessingWallpaper}
                  className="py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <ImageIcon size={16} className="text-neutral-300 shrink-0" />
                  <span>Chọn từ thư viện</span>
                </button>

                <button
                  type="button"
                  onClick={() => wallpaperCameraInputRef.current?.click()}
                  disabled={isProcessingWallpaper}
                  className="py-2.5 px-3 bg-[#1a1a1a] hover:bg-[#262626] text-neutral-200 border border-neutral-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-98 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Camera size={16} className="text-neutral-300 shrink-0" />
                  <span>Chụp ảnh mới</span>
                </button>
              </div>
            </div>

            {/* SLIDERS CARD */}
            <div className="bg-[#121418] border border-neutral-800/90 rounded-2xl p-4 space-y-4">
              {/* SLIDER 1: ĐỘ MỜ CỦA ẢNH (WALLPAPER BLUR) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets size={15} className="text-neutral-400" />
                    <span className="text-xs sm:text-sm font-bold text-neutral-200">
                      Độ mờ của ảnh nền
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-neutral-700 text-white">
                    {wallpaperBlur} px
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Làm mờ trực tiếp hình nền để các thông tin tài chính và số dư trên màn hình hiển thị rõ ràng, dễ đọc hơn.
                </p>

                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={wallpaperBlur}
                    onChange={(e) => onWallpaperBlurChange(parseInt(e.target.value, 10))}
                    className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-medium">
                    <span>0 px (Sắc nét)</span>
                    <span>15 px (Mờ vừa)</span>
                    <span>30 px (Mờ nhiều)</span>
                  </div>
                </div>
              </div>

              {/* SLIDER 2: ĐỘ TRONG CỦA GIAO DIỆN (UI TRANSPARENCY) */}
              <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders size={15} className="text-neutral-400" />
                    <span className="text-xs sm:text-sm font-bold text-neutral-200">
                      Độ trong của giao diện
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-neutral-700 text-white">
                    {uiTransparency}%
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Điều chỉnh độ trong suốt của các thẻ thông tin và danh sách toàn app (loại trừ Main Island) để làm nổi bật hình nền.
                </p>

                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={uiTransparency}
                    onChange={(e) => onTransparencyChange(parseInt(e.target.value, 10))}
                    className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-medium">
                    <span>0% (Đục / Mặc định)</span>
                    <span>50% (Kính mờ)</span>
                    <span>100% (Trong suốt)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="fixed bottom-6 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div className="py-2.5 px-4 rounded-xl bg-neutral-900/95 border border-neutral-700 text-white text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md">
              <Check size={16} className="text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      {isWallpaperCropOpen && wallpaperCropSrc && (
        <ImageCropModal
          isOpen={isWallpaperCropOpen}
          imageSrc={wallpaperCropSrc}
          shape="rect"
          initialAspectRatio="9:16"
          lockAspectRatio={false}
          title="Căn chỉnh hình nền (9:16)"
          onClose={() => {
            setIsWallpaperCropOpen(false);
            setWallpaperCropSrc(null);
          }}
          onCropComplete={handleWallpaperCropComplete}
        />
      )}
    </>
  );
};
