import fs from 'fs';

let code = fs.readFileSync('src/components/EditTransactionModal.tsx', 'utf-8');

const oldCapture = `  const captureInlinePhoto = async () => {
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
  };`;

const newCapture = `  const captureInlinePhoto = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || isProcessingPhoto) return resolve(null);
      setIsProcessingPhoto(true);
      try {
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
              resolve(compressed);
            } else {
              setErrorMessage('Lỗi khi chụp ảnh');
              resolve(null);
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
        resolve(null);
      }
    });
  };`;

code = code.replace(oldCapture, newCapture);

const oldSave = `      await updateTransaction(transaction.id, {
        date,
        type,
        amount: numericAmount,
        category,
        note: note.trim(),
        account,
        newImageBlob: inlineNewPhotoBlob || newPhotoBlob || undefined,
      });`;

const newSave = `      let finalBlob = inlineNewPhotoBlob || newPhotoBlob || undefined;
      
      if (isInlineCameraActive) {
        const captured = await captureInlinePhoto();
        if (captured) {
          finalBlob = captured;
        } else {
          setIsSaving(false);
          return;
        }
      }

      await updateTransaction(transaction.id, {
        date,
        type,
        amount: numericAmount,
        category,
        note: note.trim(),
        account,
        newImageBlob: finalBlob,
      });`;

code = code.replace(oldSave, newSave);

const oldBottomBtn = `        <button
          type="button"
          onClick={startInlineCamera}
          className="flex flex-col items-center gap-1 text-neutral-300 hover:text-white active:scale-90 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 group-hover:border-neutral-400 flex items-center justify-center text-neutral-200 group-hover:text-white transition-all shadow-md">
            <Camera size={22} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">Đổi ảnh</span>
        </button>`;

const newBottomBtn = `        {isInlineCameraActive ? (
          <button
            type="button"
            onClick={captureInlinePhoto}
            className="flex flex-col items-center gap-1 text-emerald-400 hover:text-emerald-300 active:scale-90 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 transition-all shadow-md">
              <div className="w-6 h-6 bg-emerald-400 rounded-full" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Chụp ảnh</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startInlineCamera}
            className="flex flex-col items-center gap-1 text-neutral-300 hover:text-white active:scale-90 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] hover:bg-[#262626] border border-neutral-800 group-hover:border-neutral-400 flex items-center justify-center text-neutral-200 group-hover:text-white transition-all shadow-md">
              <Camera size={22} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Đổi ảnh</span>
          </button>
        )}`;

code = code.replace(oldBottomBtn, newBottomBtn);

const oldVideoOverlay = `              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full border-4 border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto cursor-pointer animate-pulse">
                  <Camera size={24} className="text-white" />
                </div>
              </div>`;

const newVideoOverlay = `              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-2 pointer-events-auto cursor-pointer animate-pulse">
                  <div className="w-16 h-16 rounded-full border-4 border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Camera size={24} className="text-white" />
                  </div>
                  <span className="text-white font-bold text-sm drop-shadow-md">Chạm để chụp</span>
                </div>
              </div>`;

code = code.replace(oldVideoOverlay, newVideoOverlay);

fs.writeFileSync('src/components/EditTransactionModal.tsx', code);
console.log("Patched successfully");
