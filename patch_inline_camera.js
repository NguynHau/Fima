import fs from 'fs';

let code = fs.readFileSync('src/components/EditTransactionModal.tsx', 'utf-8');

// Add compressImage import
if (!code.includes('compressImage')) {
  code = code.replace(
    "import { formatDateVN, formatVND, getTodayString } from '../utils/formatters';",
    "import { formatDateVN, formatVND, getTodayString } from '../utils/formatters';\nimport { compressImage } from '../utils/imageCompressor';"
  );
}

// Add state variables
const stateHookTarget = `  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);`;
  
const stateHookReplacement = `  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Inline Camera State
  const [isInlineCameraActive, setIsInlineCameraActive] = useState(false);
  const [inlineStream, setInlineStream] = useState<MediaStream | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [inlineNewPhotoBlob, setInlineNewPhotoBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);`;

code = code.replace(stateHookTarget, stateHookReplacement);

// Update useEffect to consider inlineNewPhotoBlob
const useEffectTarget = `    // Load existing image if no newPhotoBlob provided yet
    if (newPhotoBlob) {
      const url = URL.createObjectURL(newPhotoBlob);
      setPhotoUrl(url);
    } else if (transaction.imageId) {
      getImageBlob(transaction.imageId).then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPhotoUrl(url);
        }
      });
    }`;

const useEffectReplacement = `    // Load existing image if no newPhotoBlob provided yet
    if (inlineNewPhotoBlob) {
      const url = URL.createObjectURL(inlineNewPhotoBlob);
      setPhotoUrl(url);
    } else if (newPhotoBlob) {
      const url = URL.createObjectURL(newPhotoBlob);
      setPhotoUrl(url);
    } else if (transaction.imageId) {
      getImageBlob(transaction.imageId).then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPhotoUrl(url);
        }
      });
    }`;

code = code.replace(useEffectTarget, useEffectReplacement);

// Add inline camera methods right before handleAmountChange
const methodsTarget = `  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);`;
const methodsReplacement = `  const stopInlineCamera = () => {
    if (inlineStream) {
      inlineStream.getTracks().forEach((track) => track.stop());
      setInlineStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsInlineCameraActive(false);
  };

  const startInlineCamera = async () => {
    stopInlineCamera();
    setErrorMessage(null);
    setIsInlineCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera');
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setInlineStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setErrorMessage('Không thể mở camera. Vui lòng cấp quyền.');
      setIsInlineCameraActive(false);
    }
  };

  const captureInlinePhoto = async () => {
    if (!videoRef.current || isProcessingPhoto) return;
    try {
      setIsProcessingPhoto(true);
      const video = videoRef.current;
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;
      
      const squareSize = Math.min(vWidth, vHeight);
      const startX = (vWidth - squareSize) / 2;
      const startY = (vHeight - squareSize) / 2;
      
      const canvas = document.createElement('canvas');
      canvas.width = squareSize;
      canvas.height = squareSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot create canvas');
      
      ctx.drawImage(video, startX, startY, squareSize, squareSize, 0, 0, squareSize, squareSize);
      
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const compressed = await compressImage(blob);
            setInlineNewPhotoBlob(compressed);
            stopInlineCamera();
          } else {
            setErrorMessage('Lỗi khi chụp ảnh');
          }
          setIsProcessingPhoto(false);
        },
        'image/jpeg',
        0.88
      );
    } catch (e) {
      console.error(e);
      setErrorMessage('Lỗi khi chụp ảnh');
      setIsProcessingPhoto(false);
    }
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopInlineCamera();
      setInlineNewPhotoBlob(null);
    }
    return () => stopInlineCamera();
  }, [isOpen]);

  const numericAmount = parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10);`;

code = code.replace(methodsTarget, methodsReplacement);

// Update save logic
const saveTarget = `        newImageBlob: newPhotoBlob || undefined,`;
const saveReplacement = `        newImageBlob: inlineNewPhotoBlob || newPhotoBlob || undefined,`;
code = code.replace(saveTarget, saveReplacement);

// Update JSX
const jsxTarget = `          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Ảnh chứng từ giao dịch"
              className="w-full h-full object-cover"
            />
          ) : (
            <button
              type="button"
              onClick={onRequestChangePhoto}
              className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-300 hover:text-emerald-300 cursor-pointer p-4"
            >
              <Camera size={48} className="text-neutral-400" />
              <span className="text-base font-bold">Chạm để chụp ảnh thay thế</span>
            </button>
          )}`;
          
const jsxReplacement = `          {isInlineCameraActive ? (
            <div className="w-full h-full relative" onClick={captureInlinePhoto}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full border-4 border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto cursor-pointer animate-pulse">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
            </div>
          ) : photoUrl ? (
            <img
              src={photoUrl}
              alt="Ảnh chứng từ giao dịch"
              className="w-full h-full object-cover cursor-pointer"
              onClick={startInlineCamera}
            />
          ) : (
            <button
              type="button"
              onClick={startInlineCamera}
              className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-300 hover:text-emerald-300 cursor-pointer p-4"
            >
              <Camera size={48} className="text-neutral-400" />
              <span className="text-base font-bold">Chạm để chụp ảnh thay thế</span>
            </button>
          )}`;

code = code.replace(jsxTarget, jsxReplacement);

fs.writeFileSync('src/components/EditTransactionModal.tsx', code);
console.log("Patched EditTransactionModal.tsx");
