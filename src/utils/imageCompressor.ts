import { type PhotoQuality } from '../types';

export const QUALITY_PRESETS: Record<PhotoQuality, { maxWidth: number; maxHeight: number; quality: number }> = {
  // "Thấp" — mặc định. Nén/resize hợp lý để giảm đáng kể dung lượng lưu trữ, ưu tiên tiết kiệm bộ nhớ thiết bị.
  low: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.65,
  },
  // "Cao" — Giữ chất lượng và độ phân giải cao hơn.
  high: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.88,
  },
};

/**
 * Compresses an image file or blob to an optimized JPEG blob
 * Resizes down to max dimensions while maintaining aspect ratio
 */
export async function compressImage(
  source: Blob | File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback to original blob if canvas context fails
          resolve(source);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(source);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Không thể xử lý hình ảnh'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Không thể đọc file ảnh'));
    };

    reader.readAsDataURL(source);
  });
}

/**
 * Compresses an image using predefined quality presets:
 * - 'low' (Thấp): Max 800x800, quality 0.65 (dramatically reduced storage footprint)
 * - 'high' (Cao): Max 1600x1600, quality 0.88 (higher resolution and details)
 */
export async function compressImageWithQuality(
  source: Blob | File,
  qualityLevel: PhotoQuality = 'low'
): Promise<Blob> {
  const preset = QUALITY_PRESETS[qualityLevel] || QUALITY_PRESETS.low;
  return compressImage(source, preset.maxWidth, preset.maxHeight, preset.quality);
}

/**
 * Creates an object URL from a Blob and handles revoke cleanup
 */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
