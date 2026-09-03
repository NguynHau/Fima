import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { PhotoQuality } from '../types';
import { compressImageWithQuality } from '../utils/imageCompressor';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  photoQuality?: PhotoQuality;
  onClose: () => void;
  onCropComplete: (blob: Blob) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  photoQuality = 'low',
  onClose,
  onCropComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Reset state when modal opens or image changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setContainerSize({ width: rect.width, height: rect.height });
          // Initial fit scale so image fills or fits nicely
          const cropW = Math.min(rect.width * 0.85, 360);
          const cropH = cropW * 1.25; // 4:5 receipt ratio
          const initScale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
          setScale(initScale);
          setPosition({ x: 0, y: 0 });
        }
      };
    }
  }, [isOpen, imageSrc]);

  // Handle window resize
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

  if (!isOpen) return null;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.2), 5));
  };

  const handleReset = () => {
    if (!containerRef.current || !imageSize.width) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cropW = Math.min(rect.width * 0.85, 360);
    const cropH = cropW * 1.25;
    const initScale = Math.max(cropW / imageSize.width, cropH / imageSize.height);
    setScale(initScale);
    setPosition({ x: 0, y: 0 });
  };

  const handleConfirmCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    // Crop viewport dimensions in screen pixels
    const cropW = Math.min(containerSize.width * 0.85, 360);
    const cropH = cropW * 1.25;

    // Center of container
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;

    // Crop box top-left in container coordinates
    const cropLeft = centerX - cropW / 2;
    const cropTop = centerY - cropH / 2;

    // Image top-left in container coordinates
    // Image is centered initially, then offset by position, and scaled around its center or top-left depending on styling.
    // In our render: image has style transform translate(position.x, position.y) scale(scale).
    // Let's calculate exact source rectangle on the original image.
    const imgNaturalW = imageSize.width;
    const imgNaturalH = imageSize.height;

    // Current rendered image width and height on screen before transform scale
    // Or we can use an offscreen canvas.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Output resolution proportional to crop box at high quality
    const outputWidth = 1200;
    const outputHeight = Math.round(outputWidth * (cropH / cropW));
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Calculate mapping from crop box to natural image coordinates
    // Image element center relative to container center is position.x, position.y
    // Rendered image rect in container:
    const renderedW = imgNaturalW * scale;
    const renderedH = imgNaturalH * scale;
    const renderedLeft = centerX - renderedW / 2 + position.x;
    const renderedTop = centerY - renderedH / 2 + position.y;

    // Intersection of crop box and rendered image
    const sourceX = ((cropLeft - renderedLeft) / scale);
    const sourceY = ((cropTop - renderedTop) / scale);
    const sourceW = (cropW / scale);
    const sourceH = (cropH / scale);

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      outputWidth,
      outputHeight
    );

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        try {
          const compressed = await compressImageWithQuality(
            new File([blob], 'cropped.jpg', { type: 'image/jpeg' }),
            photoQuality
          );
          onCropComplete(compressed);
        } catch {
          onCropComplete(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-80 bg-black/90 backdrop-blur-md flex flex-col text-neutral-100 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[max(env(safe-area-inset-top,0px),16px)] border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <X size={22} />
        </button>
        <h2 className="text-base font-semibold text-white">Căn chỉnh & Cắt ảnh</h2>
        <button
          type="button"
          onClick={handleConfirmCrop}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Check size={18} />
          Xong
        </button>
      </div>

      {/* Interactive Crop Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden touch-none flex items-center justify-center bg-black"
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Draggable & Zoomable Image */}
        <div
          className="absolute transition-transform duration-75 ease-out cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop target"
            draggable={false}
            className="max-none block select-none pointer-events-none"
            style={{ width: imageSize.width ? `${imageSize.width}px` : 'auto', height: imageSize.height ? `${imageSize.height}px` : 'auto' }}
          />
        </div>

        {/* Darkened Overlay with Fixed Crop Viewport Frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Backdrop mask simulation using box-shadow or absolute boxes */}
          <div className="relative w-[85%] max-w-[360px] aspect-[4/5] border-2 border-indigo-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
            {/* Grid lines inside crop frame for precision */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div></div>
            </div>

            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-md"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-md"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-md"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-md"></div>
          </div>
        </div>

        {/* Helper Instructions Tip */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700/60 text-xs text-neutral-300 shadow-md">
          Kéo để di chuyển • Cuộn/Pinch để thu phóng
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="px-6 py-4 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800 flex items-center justify-between gap-4 pb-[max(env(safe-area-inset-bottom,0px),16px)] shrink-0">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white px-3 py-2 rounded-xl hover:bg-neutral-800 transition-all cursor-pointer"
        >
          <RotateCcw size={16} />
          Đặt lại
        </button>

        <div className="flex items-center gap-3 flex-1 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setScale((prev) => Math.max(prev * 0.9, 0.2))}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut size={18} />
          </button>
          <input
            type="range"
            min="0.2"
            max="4"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setScale((prev) => Math.min(prev * 1.1, 5))}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="text-xs font-semibold text-neutral-400 w-12 text-right">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
};
