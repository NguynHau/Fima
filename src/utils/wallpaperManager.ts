export const WALLPAPER_STORAGE_KEY = 'finance_app_wallpaper';

/**
 * Retrieves the cached wallpaper data URL from localStorage for instant display on startup
 */
export function getCachedWallpaper(): string | null {
  try {
    return localStorage.getItem(WALLPAPER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Saves the wallpaper data URL in localStorage
 */
export function setCachedWallpaper(dataUrl: string): void {
  try {
    localStorage.setItem(WALLPAPER_STORAGE_KEY, dataUrl);
  } catch (e) {
    console.warn('Could not cache wallpaper in localStorage (quota may be exceeded):', e);
  }
}

/**
 * Clears the cached wallpaper from localStorage
 */
export function removeCachedWallpaper(): void {
  try {
    localStorage.removeItem(WALLPAPER_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Optimizes a wallpaper image by scaling it to standard device wallpaper dimensions
 * (max 1080x1920 or aspect ratio preserving) and compressing as WebP / JPEG
 * to ensure maximum PWA performance and low memory footprint.
 */
export async function optimizeWallpaper(
  imageSrc: string,
  maxWidth = 1080,
  maxHeight = 1920,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        // Calculate scaled dimensions keeping aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP if supported, fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      } catch (err) {
        console.error('Error optimizing wallpaper:', err);
        resolve(imageSrc); // Fallback to original
      }
    };

    img.onerror = (err) => {
      console.error('Failed to load image for wallpaper optimization:', err);
      reject(err);
    };

    img.src = imageSrc;
  });
}
