import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (blob: Blob) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ truy cập máy ảnh trực tiếp');
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('Permission') || errorMessage.includes('denied') || errorMessage.includes('NotAllowedError')) {
        setCameraError('Quyền truy cập máy ảnh bị từ chối. Bạn có thể chọn ảnh từ thư viện hoặc chụp qua bộ chọn hệ thống.');
      } else {
        setCameraError('Không thể mở camera trực tiếp. Vui lòng sử dụng máy ảnh hệ thống bên dưới.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = async () => {
    if (!videoRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;

      // Crop to a square (1:1) from the center, matching Locket's square photo format
      const squareSize = Math.min(vWidth, vHeight);
      const startX = (vWidth - squareSize) / 2;
      const startY = (vHeight - squareSize) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = squareSize;
      canvas.height = squareSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể tạo canvas');

      // If user front camera, mirror image
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(
        video,
        startX,
        startY,
        squareSize,
        squareSize,
        0,
        0,
        squareSize,
        squareSize
      );

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const compressed = await compressImage(blob);
            stopCamera();
            onPhotoCaptured(compressed);
          } else {
            setCameraError('Không chụp được ảnh, vui lòng thử lại');
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.88
      );
    } catch (e) {
      console.error(e);
      setCameraError('Lỗi khi chụp ảnh');
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        setIsProcessing(true);
        const file = files[0];
        const compressed = await compressImage(file);
        stopCamera();
        onPhotoCaptured(compressed);
      } catch (err) {
        console.error(err);
        setCameraError('Không thể nén và xử lý ảnh');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden">
      {/* Hidden fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top action bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-4 pb-2 text-white">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-[#1c1c1c]/80 border border-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer shadow-md"
          aria-label="Đóng máy ảnh"
        >
          <X size={20} />
        </button>

        <div className="px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md text-xs font-semibold text-neutral-300">
          Chụp ảnh hóa đơn
        </div>

        <button
          onClick={toggleFacingMode}
          disabled={!stream}
          className="w-10 h-10 rounded-full bg-[#1c1c1c]/80 border border-white/10 backdrop-blur-md flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-all cursor-pointer shadow-md"
          aria-label="Đổi camera"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Camera Viewfinder (Square rounded window like Locket) */}
      <div className="relative flex-1 flex items-center justify-center p-4 w-full max-w-md mx-auto overflow-hidden">
        {cameraError ? (
          <div className="p-6 text-center max-w-sm mx-auto text-white">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Chụp hoặc tải ảnh</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              {cameraError}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-98 rounded-2xl font-bold text-black shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera size={20} />
                Mở máy ảnh hệ thống / Chọn ảnh
              </button>
              <button
                onClick={startCamera}
                className="w-full py-3 bg-white/15 hover:bg-white/25 rounded-2xl font-semibold text-white text-sm cursor-pointer"
              >
                Thử kết nối lại máy ảnh
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-square max-h-[48vh] relative rounded-[2.5rem] border border-[#2e2e2e] bg-[#121212] overflow-hidden shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Bottom Shutter Controls */}
      <div className="relative z-20 px-6 py-4 flex items-center justify-between max-w-md w-full mx-auto pb-[max(env(safe-area-inset-bottom),20px)]">
        {/* Gallery / File Picker */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 text-neutral-400 hover:text-white active:scale-95 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-[#1c1c1c] border border-white/10 group-hover:border-white/30 flex items-center justify-center text-neutral-300 group-hover:text-white transition-all shadow-md">
            <ImageIcon size={20} />
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 group-hover:text-neutral-200">Thư viện</span>
        </button>

        {/* Shutter Button (Locket style outer ring + inner solid circle) */}
        <button
          onClick={capturePhoto}
          disabled={!stream || isProcessing}
          className="w-20 h-20 rounded-full border-[4px] border-white/90 p-1 flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 cursor-pointer shadow-xl shadow-white/5"
          aria-label="Chụp ảnh"
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center active:bg-neutral-200 transition-colors">
            {isProcessing && (
              <div className="w-7 h-7 border-3 border-black border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </button>

        {/* Balance Spacer with matching size */}
        <div className="w-12 flex flex-col items-center opacity-0 pointer-events-none">
          <div className="w-12 h-12" />
          <span className="text-[10px]">Thư viện</span>
        </div>
      </div>
    </div>
  );
};
