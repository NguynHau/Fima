export const UI_TRANSPARENCY_STORAGE_KEY = 'fima_ui_transparency_v1';

/**
 * Retrieves the default UI transparency based on wallpaper presence:
 * 50% if custom wallpaper is active, 0% if no wallpaper.
 */
export function getDefaultUiTransparency(hasWallpaper: boolean = false): number {
  return hasWallpaper ? 50 : 0;
}

/**
 * Retrieves the stored UI transparency (0 to 100).
 * Defaults to 50 if hasWallpaper is true, otherwise 0.
 */
export function getStoredUiTransparency(hasWallpaper: boolean = false): number {
  try {
    const val = localStorage.getItem(UI_TRANSPARENCY_STORAGE_KEY);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        return Math.max(0, Math.min(100, parsed));
      }
    }
  } catch {
    // Fallback
  }
  return getDefaultUiTransparency(hasWallpaper);
}

/**
 * Applies UI transparency CSS variables and state attribute to the document.
 * This dynamically controls the transparency and backdrop-blur of in-app cards and header
 * across Dòng tiền, Thống kê, Cá nhân, Công nợ, and Cài đặt.
 *
 * IMPORTANT: Strictly does NOT modify or touch Main Island, which uses independent
 * island configs and sits outside the <main> element.
 */
export function applyUiTransparency(transparency: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(transparency)));
  const root = document.documentElement;
  const body = document.body;

  if (clamped <= 0) {
    body.removeAttribute('data-ui-transparency');
    root.style.removeProperty('--ui-glass-transparency');
    root.style.removeProperty('--ui-card-alpha');
    root.style.removeProperty('--ui-card-sub-alpha');
    root.style.removeProperty('--ui-card-blur');
  } else {
    body.setAttribute('data-ui-transparency', 'active');
    // Calculate card alpha: 0% -> 1.0, 50% -> 0.55, 100% -> 0.15
    const alpha = (1 - (clamped / 100) * 0.85).toFixed(3);
    const subAlpha = (1 - (clamped / 100) * 0.75).toFixed(3);
    const blurPx = Math.round(3 + (clamped / 100) * 16);

    root.style.setProperty('--ui-glass-transparency', clamped.toString());
    root.style.setProperty('--ui-card-alpha', alpha);
    root.style.setProperty('--ui-card-sub-alpha', subAlpha);
    root.style.setProperty('--ui-card-blur', `blur(${blurPx}px)`);
  }
}

/**
 * Persists and immediately applies the UI transparency setting.
 */
export function setStoredUiTransparency(transparency: number): void {
  const clamped = Math.max(0, Math.min(100, Math.round(transparency)));
  try {
    localStorage.setItem(UI_TRANSPARENCY_STORAGE_KEY, clamped.toString());
  } catch (e) {
    console.warn('Could not persist UI transparency to localStorage:', e);
  }
  applyUiTransparency(clamped);
}

/**
 * Initializes UI transparency on app launch.
 */
export function initUiTransparency(persistedDbValue?: number, hasWallpaper: boolean = false): number {
  const transparency = persistedDbValue !== undefined ? persistedDbValue : getStoredUiTransparency(hasWallpaper);
  applyUiTransparency(transparency);
  return transparency;
}

