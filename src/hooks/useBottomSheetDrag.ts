import { useState, useRef, useCallback } from 'react';

interface UseBottomSheetDragOptions {
  onClose: () => void;
  threshold?: number;
}

export function useBottomSheetDrag({ onClose, threshold = 70 }: UseBottomSheetDragOptions) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHandleActive, setIsHandleActive] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentDeltaRef = useRef<number>(0);
  const isPointerDraggingRef = useRef(false);

  // Touch Handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      currentDeltaRef.current = 0;
      setIsDragging(true);
      setIsHandleActive(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    currentDeltaRef.current = deltaY;
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      // Elastic rubber-band upward
      setDragY(deltaY * 0.15);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startYRef.current === null) return;
    const deltaY = currentDeltaRef.current;
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = deltaY / Math.max(elapsed, 1);
    startYRef.current = null;
    setIsDragging(false);
    setIsHandleActive(false);

    if (deltaY > threshold || (deltaY > 28 && velocity > 0.35)) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragY(0);
      }, 220);
    } else {
      setDragY(0);
    }
  }, [onClose, threshold]);

  const handleTouchCancel = useCallback(() => {
    startYRef.current = null;
    setIsDragging(false);
    setIsHandleActive(false);
    setDragY(0);
  }, []);

  // Pointer Handlers (Works for desktop mouse and stylus)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return;
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    currentDeltaRef.current = 0;
    isPointerDraggingRef.current = true;
    setIsDragging(true);
    setIsHandleActive(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerDraggingRef.current || startYRef.current === null) return;
    const currentY = e.clientY;
    const deltaY = currentY - startYRef.current;
    currentDeltaRef.current = deltaY;
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      setDragY(deltaY * 0.15);
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isPointerDraggingRef.current) return;
    isPointerDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const deltaY = currentDeltaRef.current;
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = deltaY / Math.max(elapsed, 1);
    startYRef.current = null;
    setIsDragging(false);
    setIsHandleActive(false);

    if (deltaY > threshold || (deltaY > 28 && velocity > 0.35)) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragY(0);
      }, 220);
    } else {
      setDragY(0);
    }
  }, [onClose, threshold]);

  // Animated dismissal programmatically (e.g. clicking Close button or Backdrop)
  const closeWithAnimation = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
    }, 220);
  }, [onClose, isClosing]);

  const sheetStyle: React.CSSProperties = {
    transform: isClosing ? 'translateY(100%)' : `translateY(${Math.max(0, dragY)}px)`,
    transition: isDragging
      ? 'none'
      : isClosing
      ? 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease'
      : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
    opacity: isClosing ? 0 : 1,
    willChange: 'transform, opacity',
  };

  const backdropStyle: React.CSSProperties = {
    opacity: isClosing ? 0 : 1,
    transition: 'opacity 0.22s ease',
  };

  return {
    dragY,
    isDragging,
    isHandleActive,
    isClosing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    closeWithAnimation,
    sheetStyle,
    backdropStyle,
    setIsHandleActive,
  };
}
