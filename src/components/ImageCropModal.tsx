import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Crop,
  RefreshCw,
} from 'lucide-react';
import { type PhotoQuality } from '../types';
import { compressImageWithQuality } from '../utils/imageCompressor';

export type AspectRatioPreset = 'free' | '1:1' | '4:5' | '3:4' | '16:9' | '9:16';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  photoQuality?: PhotoQuality;
  shape?: 'rect' | 'circle';
  initialAspectRatio?: AspectRatioPreset;
  lockAspectRatio?: boolean;
  title?: string;
  onClose: () => void;
  onCropComplete: (blob: Blob, dataUrl?: string) => void;
}

interface RatioOption {
  key: AspectRatioPreset;
  label: string;
  ratio: number | null; // width / height
}

const RATIO_OPTIONS: RatioOption[] = [
  { key: 'free', label: 'Tự do', ratio: null },
  { key: '1:1', label: '1 : 1', ratio: 1 },
  { key: '4:5', label: '4 : 5', ratio: 4 / 5 },
  { key: '3:4', label: '3 : 4', ratio: 3 / 4 },
  { key: '16:9', label: '16 : 9', ratio: 16 / 9 },
  { key: '9:16', label: '9 : 16', ratio: 9 / 16 },
];

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  photoQuality = 'low',
  shape = 'rect',
  initialAspectRatio = '4:5',
  lockAspectRatio = false,
  title = 'Căn chỉnh & Cắt ảnh',
  onClose,
  onCropComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [selectedRatioKey, setSelectedRatioKey] = useState<AspectRatioPreset>(
    shape === 'circle' ? '1:1' : initialAspectRatio
  );

  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);

  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Touch tracking for drag & pinch-to-zoom
  const touchStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    initialDistance: number | null;
    initialScale: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    initialDistance: null,
    initialScale: 1,
  });

  // Calculate crop viewport size based on container and chosen aspect ratio
  const getCropBoxDimensions = useCallback(() => {
    if (!containerSize.width || !containerSize.height) {
      return { width: 300, height: 300 };
    }

    const pad = 32;
    const maxW = Math.min(containerSize.width - pad * 2, 420);
    const maxH = Math.min(containerSize.height - pad * 2, 540);

    const selectedOpt = RATIO_OPTIONS.find((o) => o.key === selectedRatioKey);
    let targetRatio = selectedOpt?.ratio;

    if (!targetRatio) {
      // Freeform or natural ratio
      if (naturalSize.width && naturalSize.height) {
        const isRotated90 = rotation % 180 !== 0;
        const imgW = isRotated90 ? naturalSize.height : naturalSize.width;
        const imgH = isRotated90 ? naturalSize.width : naturalSize.height;
        targetRatio = imgW / imgH;
      } else {
        targetRatio = 1;
      }
    }

    let width = maxW;
    let height = width / targetRatio;

    if (height > maxH) {
      height = maxH;
      width = height * targetRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }, [containerSize, selectedRatioKey, naturalSize, rotation]);

  const cropBox = getCropBoxDimensions();

  // Reset transform state when image opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setFlipH(false);
      setSelectedRatioKey(shape === 'circle' ? '1:1' : initialAspectRatio);

      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setNaturalSize({
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
        });

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContainerSize({ width: rect.width, height: rect.height });
        }
      };
    }
  }, [isOpen, imageSrc, shape, initialAspectRatio]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Calculate base display size (to fit image inside crop box initially)
  const getBaseDisplaySize = useCallback(() => {
    if (!naturalSize.width || !naturalSize.height) return { width: 300, height: 300 };

    const isRotated90 = rotation % 180 !== 0;
    const imgW = isRotated90 ? naturalSize.height : naturalSize.width;
    const imgH = isRotated90 ? naturalSize.width : naturalSize.height;

    // Cover scale so image fully fills the crop viewport at scale = 1
    const scaleToCoverW = cropBox.width / imgW;
    const scaleToCoverH = cropBox.height / imgH;
    const baseScale = Math.max(scaleToCoverW, scaleToCoverH);

    return {
      width: Math.round(naturalSize.width * baseScale),
      height: Math.round(naturalSize.height * baseScale),
    };
  }, [naturalSize, rotation, cropBox]);

  const baseDisplaySize = getBaseDisplaySize();

  // Pointer & Gesture Handlers
  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      if (e.touches.length === 1) {
        // Single touch drag
        setIsInteracting(true);
        touchStateRef.current = {
          isDragging: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          initialPosX: position.x,
          initialPosY: position.y,
          initialDistance: null,
          initialScale: scale,
        };
      } else if (e.touches.length === 2) {
        // 2-finger pinch
        setIsInteracting(true);
        const dist = getDistance(e.touches[0], e.touches[1]);
        touchStateRef.current.initialDistance = dist;
        touchStateRef.current.initialScale = scale;
      }
    } else {
      // Mouse drag
      setIsInteracting(true);
      touchStateRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initialPosX: position.x,
        initialPosY: position.y,
        initialDistance: null,
        initialScale: scale,
      };
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!touchStateRef.current.isDragging && !touchStateRef.current.initialDistance) return;

    if ('touches' in e) {
      if (e.touches.length === 1 && touchStateRef.current.isDragging) {
        const dx = e.touches[0].clientX - touchStateRef.current.startX;
        const dy = e.touches[0].clientY - touchStateRef.current.startY;
        setPosition({
          x: touchStateRef.current.initialPosX + dx,
          y: touchStateRef.current.initialPosY + dy,
        });
      } else if (e.touches.length === 2 && touchStateRef.current.initialDistance) {
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        const factor = currentDist / touchStateRef.current.initialDistance;
        const newScale = Math.min(Math.max(touchStateRef.current.initialScale * factor, 0.5), 5);
        setScale(newScale);
      }
    } else if (touchStateRef.current.isDragging) {
      const dx = (e as React.MouseEvent).clientX - touchStateRef.current.startX;
      const dy = (e as React.MouseEvent).clientY - touchStateRef.current.startY;
      setPosition({
        x: touchStateRef.current.initialPosX + dx,
        y: touchStateRef.current.initialPosY + dy,
      });
    }
  };

  const handlePointerUp = () => {
    setIsInteracting(false);
    touchStateRef.current.isDragging = false;
    touchStateRef.current.initialDistance = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 5));
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation((prev) => {
      const step = direction === 'cw' ? 90 : -90;
      return (prev + step + 360) % 360;
    });
    setPosition({ x: 0, y: 0 });
  };

  const handleFlip = () => {
    setFlipH((prev) => !prev);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setSelectedRatioKey(shape === 'circle' ? '1:1' : initialAspectRatio);
  };

  // Confirm and Export Canvas Crop
  const handleConfirmCrop = async () => {
    if (!naturalSize.width || !naturalSize.height) return;

    try {
      setIsProcessing(true);

      const exportScale = 2; // high definition multiplier
      const outputWidth = Math.round(cropBox.width * exportScale);
      const outputHeight = Math.round(cropBox.height * exportScale);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Load original image safely
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Canvas transformation stack
      ctx.save();

      // If circle crop, clip to circle
      if (shape === 'circle') {
        ctx.beginPath();
        const radius = Math.min(outputWidth, outputHeight) / 2;
        ctx.arc(outputWidth / 2, outputHeight / 2, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      // 1. Move to canvas center
      ctx.translate(outputWidth / 2, outputHeight / 2);

      // 2. Apply user drag offset (scaled to output canvas)
      ctx.translate(position.x * exportScale, position.y * exportScale);

      // 3. Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Apply horizontal flip
      ctx.scale(flipH ? -1 : 1, 1);

      // 5. Apply zoom scale
      ctx.scale(scale, scale);

      // 6. Draw image with baseDisplaySize
      const renderW = baseDisplaySize.width * exportScale;
      const renderH = baseDisplaySize.height * exportScale;

      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);

      ctx.restore();

      // Generate Blob and DataUrl
      const mimeType = shape === 'circle' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/jpeg' ? 0.92 : 1.0;

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }

          let finalBlob = blob;
          try {
            if (photoQuality && mimeType === 'image/jpeg') {
              finalBlob = await compressImageWithQuality(
                new File([blob], 'cropped.jpg', { type: mimeType }),
                photoQuality
              );
            }
          } catch {
            finalBlob = blob;
          }

          const dataUrl = canvas.toDataURL(mimeType, quality);
          setIsProcessing(false);
          onCropComplete(finalBlob, dataUrl);
        },
        mimeType,
        quality
      );
    } catch (err) {
      console.error('Error during image crop export:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="fima-image-crop-modal"
      className="fixed inset-0 z-[110] bg-[#090a0c]/95 backdrop-blur-xl flex flex-col text-neutral-100 select-none animate-in fade-in duration-200"
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[max(env(safe-area-inset-top,0px),16px)] border-b border-neutral-800/80 bg-[#121418]/90 backdrop-blur-md shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all font-semibold text-sm cursor-pointer disabled:opacity-50"
        >
          Hủy
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
            <Crop size={16} className="text-purple-400" />
            <span>{title}</span>
          </h2>
          <span className="text-[10px] text-neutral-400 font-medium">Kéo • Thu phóng • Xoay</span>
        </div>

        <button
          type="button"
          onClick={handleConfirmCrop}
          disabled={isProcessing}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center gap-1.5 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={16} />
          )}
          <span>Xong</span>
        </button>
      </div>

      {/* 2. Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden touch-none flex items-center justify-center bg-[#050608]"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Draggable & Transformable Image */}
        <div
          className="absolute transition-transform duration-75 ease-out cursor-grab active:cursor-grabbing flex items-center justify-center pointer-events-none"
          style={{
            width: `${baseDisplaySize.width}px`,
            height: `${baseDisplaySize.height}px`,
            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${
              flipH ? -1 : 1
            }, 1) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop Preview"
            draggable={false}
            className="w-full h-full block object-contain select-none pointer-events-none"
          />
        </div>

        {/* Dark Mask with Crop Cutout Viewport */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`relative border-2 border-white/90 shadow-[0_0_0_9999px_rgba(5,6,8,0.78)] transition-all duration-200 ${
              shape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            }`}
            style={{
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
            }}
          >
            {/* Rule-of-Thirds Grid (illuminates when user is interacting) */}
            <div
              className={`absolute inset-0 grid grid-cols-3 grid-rows-3 transition-opacity duration-200 ${
                isInteracting ? 'opacity-80' : 'opacity-25'
              } ${shape === 'circle' ? 'rounded-full overflow-hidden' : ''}`}
            >
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-white/40" />
              <div className="border-r border-white/40" />
              <div />
            </div>

            {/* iOS style High-contrast Corner L-Brackets */}
            {shape !== 'circle' && (
              <>
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-[3px] border-l-[3px] border-white rounded-tl-lg shadow-sm" />
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-[3px] border-r-[3px] border-white rounded-tr-lg shadow-sm" />
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-[3px] border-l-[3px] border-white rounded-bl-lg shadow-sm" />
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-[3px] border-r-[3px] border-white rounded-br-lg shadow-sm" />
              </>
            )}
          </div>
        </div>

        {/* Floating Zoom & Interaction Info */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none bg-[#181a20]/80 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 text-[11px] text-neutral-300 font-semibold shadow-md flex items-center gap-2">
          <span>{Math.round(scale * 100)}%</span>
          {rotation !== 0 && (
            <>
              <span className="text-neutral-500">•</span>
              <span className="text-purple-300 font-mono">{rotation}°</span>
            </>
          )}
          {flipH && (
            <>
              <span className="text-neutral-500">•</span>
              <span className="text-pink-300">Lật</span>
            </>
          )}
        </div>
      </div>

      {/* 3. Bottom Toolbar */}
      <div className="bg-[#121418]/95 backdrop-blur-md border-t border-neutral-800/80 px-4 py-3 pb-[max(env(safe-area-inset-bottom,0px),16px)] flex flex-col gap-3 shrink-0">
        {/* Aspect Ratio Selector Pills (hidden if aspect ratio is strictly locked, e.g. for circular avatar) */}
        {!lockAspectRatio && shape !== 'circle' && (
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            {RATIO_OPTIONS.map((opt) => {
              const isSelected = selectedRatioKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSelectedRatioKey(opt.key);
                    setPosition({ x: 0, y: 0 });
                    setScale(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Transformation & Zoom Controls */}
        <div className="flex items-center justify-between gap-2 max-w-md w-full mx-auto">
          {/* Rotate CCW */}
          <button
            type="button"
            onClick={() => handleRotate('ccw')}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-90"
            title="Xoay trái 90°"
          >
            <RotateCcw size={17} />
          </button>

          {/* Rotate CW */}
          <button
            type="button"
            onClick={() => handleRotate('cw')}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-90"
            title="Xoay phải 90°"
          >
            <RotateCw size={17} />
          </button>

          {/* Flip Horizontal */}
          <button
            type="button"
            onClick={handleFlip}
            className={`p-2.5 rounded-xl transition-all cursor-pointer active:scale-90 ${
              flipH
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
            }`}
            title="Lật ngang"
          >
            <FlipHorizontal size={17} />
          </button>

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 flex-1 max-w-[150px] px-1">
            <button
              type="button"
              onClick={() => setScale((prev) => Math.max(prev * 0.9, 0.5))}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut size={15} />
            </button>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setScale((prev) => Math.min(prev * 1.1, 4))}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-90"
            title="Đặt lại ảnh ban đầu"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};
