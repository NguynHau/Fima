import { SystemColorsConfig, ColorPreset, ColorShades } from '../types/systemColors';

export type { SystemColorsConfig, ColorPreset, ColorShades };

const STORAGE_KEY = 'fima_system_colors_config_v1';

// Helpers for color manipulation (Hex <-> HSL)
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Automatically computes light (for text/badges) and dark (for borders/buttons)
 * from a chosen main hex color.
 */
export function deriveShades(mainHex: string): ColorShades {
  try {
    const { h, s, l } = hexToHsl(mainHex);
    // Light shade: higher lightness (+15%), slightly lower or adjusted saturation
    const light = hslToHex(h, Math.min(100, s + 5), Math.min(92, Math.max(l + 18, 65)));
    // Dark shade: lower lightness (-12%)
    const dark = hslToHex(h, s, Math.max(25, l - 14));
    return { main: mainHex, light, dark };
  } catch {
    return { main: mainHex, light: mainHex, dark: mainHex };
  }
}

// ---------------------------------------------------------------------------
// FACTORY PRESETS
// ---------------------------------------------------------------------------
export const SYSTEM_COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'neon_cyber',
    name: 'Neon Cyber (Rực rỡ)',
    description: 'Tông màu dạ quang phát sáng cực đại, tương phản sắc nét trên nền tối dark mode.',
    tag: 'Mặc định',
    config: {
      red: {
        main: '#ff3366',
        light: '#ff8fab',
        dark: '#eb003b',
      },
      yellow: {
        main: '#ffb300',
        light: '#ffd54f',
        dark: '#ff8f00',
      },
      green: {
        main: '#00e676',
        light: '#4dffa9',
        dark: '#009e52',
      },
      blue: {
        main: '#00b0ff',
        light: '#40c4ff',
        dark: '#0091ea',
      },
      gradient: {
        start: '#a855f7',
        end: '#ec4899',
        purple: '#c084fc',
        pink: '#f472b6',
      },
    },
  },
  {
    id: 'classic_balance',
    name: 'Classic Balance (Cổ điển)',
    description: 'Tông màu trung tính, dịu mắt và chuẩn mực theo phong cách iOS / Material Design.',
    tag: 'Tiêu chuẩn',
    config: {
      red: {
        main: '#f43f5e',
        light: '#fda4af',
        dark: '#e11d48',
      },
      yellow: {
        main: '#f59e0b',
        light: '#fcd34d',
        dark: '#d97706',
      },
      green: {
        main: '#10b981',
        light: '#6ee7b7',
        dark: '#059669',
      },
      blue: {
        main: '#0ea5e9',
        light: '#7dd3fc',
        dark: '#0284c7',
      },
      gradient: {
        start: '#9333ea',
        end: '#db2777',
        purple: '#a855f7',
        pink: '#ec4899',
      },
    },
  },
  {
    id: 'pastel_macaron',
    name: 'Pastel Dream (Dịu nhẹ)',
    description: 'Sắc thái Macaron êm dịu, nhẹ nhàng mang đến cảm giác tinh tế và thư thái.',
    tag: 'Thanh lịch',
    config: {
      red: {
        main: '#ff6b81',
        light: '#ffa8b6',
        dark: '#ee5253',
      },
      yellow: {
        main: '#feca57',
        light: '#ffdd7a',
        dark: '#ff9f43',
      },
      green: {
        main: '#1dd1a1',
        light: '#55efc4',
        dark: '#10ac84',
      },
      blue: {
        main: '#48dbfb',
        light: '#74b9ff',
        dark: '#0abde3',
      },
      gradient: {
        start: '#a29bfe',
        end: '#fd79a8',
        purple: '#b8b2fc',
        pink: '#f8a5c2',
      },
    },
  },
  {
    id: 'tokyo_synth',
    name: 'Tokyo Synthwave (Điện tử)',
    description: 'Cảm hứng Tokyo ánh đèn Neon về đêm với dải sắc độ cyan, magenta và lime bắt mắt.',
    tag: 'Cyberpunk',
    config: {
      red: {
        main: '#ff2a6d',
        light: '#ff6584',
        dark: '#d90429',
      },
      yellow: {
        main: '#ffe600',
        light: '#fff176',
        dark: '#ffb703',
      },
      green: {
        main: '#05ffa1',
        light: '#5effb1',
        dark: '#00d084',
      },
      blue: {
        main: '#00f0ff',
        light: '#6ff7ff',
        dark: '#00b4d8',
      },
      gradient: {
        start: '#b967ff',
        end: '#ff45a4',
        purple: '#cf8bf3',
        pink: '#ff70a6',
      },
    },
  },
  {
    id: 'sunset_glow',
    name: 'Sunset Glow (Hoàng hôn)',
    description: 'Tông màu ấm áp nồng nàn của ánh ráng chiều kết hợp cùng dải tím thẫm sang trọng.',
    tag: 'Ấm áp',
    config: {
      red: {
        main: '#ff3366',
        light: '#ff758c',
        dark: '#c9184a',
      },
      yellow: {
        main: '#f39c12',
        light: '#f1c40f',
        dark: '#d35400',
      },
      green: {
        main: '#2ecc71',
        light: '#7bed9f',
        dark: '#27ae60',
      },
      blue: {
        main: '#2980b9',
        light: '#3498db',
        dark: '#1f618d',
      },
      gradient: {
        start: '#9b59b6',
        end: '#e056fd',
        purple: '#be2edd',
        pink: '#e056fd',
      },
    },
  },
  {
    id: 'minimal_luxury',
    name: 'Luxury Prestige (Sang trọng)',
    description: 'Dải màu quý tộc đậm đà: Đỏ ruby, Vàng kim champagne, Ngọc lục bảo và Xanh sapphire.',
    tag: 'Cao cấp',
    config: {
      red: {
        main: '#dc2626',
        light: '#f87171',
        dark: '#b91c1c',
      },
      yellow: {
        main: '#d97706',
        light: '#fbbf24',
        dark: '#b45309',
      },
      green: {
        main: '#059669',
        light: '#34d399',
        dark: '#047857',
      },
      blue: {
        main: '#2563eb',
        light: '#60a5fa',
        dark: '#1d4ed8',
      },
      gradient: {
        start: '#7e22ce',
        end: '#be185d',
        purple: '#9333ea',
        pink: '#db2777',
      },
    },
  },
];

export const DEFAULT_SYSTEM_COLORS: SystemColorsConfig = {
  version: 1,
  activePresetId: 'neon_cyber',
  ...SYSTEM_COLOR_PRESETS[0].config,
};

/**
 * Apply the 5 colors dynamically to document root CSS variables.
 */
export function applySystemColorsToDocument(config: SystemColorsConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Red
  root.style.setProperty('--sys-red', config.red.main);
  root.style.setProperty('--sys-red-light', config.red.light);
  root.style.setProperty('--sys-red-dark', config.red.dark);

  // Yellow
  root.style.setProperty('--sys-yellow', config.yellow.main);
  root.style.setProperty('--sys-yellow-light', config.yellow.light);
  root.style.setProperty('--sys-yellow-dark', config.yellow.dark);

  // Green
  root.style.setProperty('--sys-green', config.green.main);
  root.style.setProperty('--sys-green-light', config.green.light);
  root.style.setProperty('--sys-green-dark', config.green.dark);

  // Blue
  root.style.setProperty('--sys-blue', config.blue.main);
  root.style.setProperty('--sys-blue-light', config.blue.light);
  root.style.setProperty('--sys-blue-dark', config.blue.dark);

  // Gradient
  root.style.setProperty('--sys-gradient-start', config.gradient.start);
  root.style.setProperty('--sys-gradient-end', config.gradient.end);
  root.style.setProperty('--sys-gradient-purple', config.gradient.purple);
  root.style.setProperty('--sys-gradient-pink', config.gradient.pink);
}

/**
 * Load system colors from localStorage or fallback to default
 */
export function loadStoredSystemColors(): SystemColorsConfig {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_COLORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SYSTEM_COLORS;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.red && parsed.yellow && parsed.green && parsed.blue && parsed.gradient) {
      return parsed as SystemColorsConfig;
    }
  } catch (e) {
    console.warn('Failed to parse system colors from localStorage', e);
  }
  return DEFAULT_SYSTEM_COLORS;
}

/**
 * Save and apply system colors
 */
export function saveSystemColors(config: SystemColorsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save system colors to localStorage', e);
  }
  applySystemColorsToDocument(config);
}

/**
 * Reset to factory default
 */
export function resetSystemColorsToFactory(): SystemColorsConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove system colors from localStorage', e);
  }
  applySystemColorsToDocument(DEFAULT_SYSTEM_COLORS);
  return DEFAULT_SYSTEM_COLORS;
}

/**
 * Generate formatted CSS tokens for "Copy CSS" feature
 */
export function generateSystemColorsCss(config: SystemColorsConfig): string {
  return `/* =========================================================================
   FIMA - System Core Color Palette (5 Master Colors & Dynamic Shading)
   ========================================================================= */

:root {
  /* 1. Đỏ (Chi tiêu & Nợ) */
  --sys-red: ${config.red.main};
  --sys-red-light: ${config.red.light};
  --sys-red-dark: ${config.red.dark};

  /* 2. Vàng (Ví tiền & Số dư) */
  --sys-yellow: ${config.yellow.main};
  --sys-yellow-light: ${config.yellow.light};
  --sys-yellow-dark: ${config.yellow.dark};

  /* 3. Xanh lá (Thu nhập & Tăng trưởng) */
  --sys-green: ${config.green.main};
  --sys-green-light: ${config.green.light};
  --sys-green-dark: ${config.green.dark};

  /* 4. Xanh dương (Ngân hàng & Chuyển khoản) */
  --sys-blue: ${config.blue.main};
  --sys-blue-light: ${config.blue.light};
  --sys-blue-dark: ${config.blue.dark};

  /* 5. Tím hồng Gradient (Thương hiệu & Điểm nhấn) */
  --sys-gradient-start: ${config.gradient.start};
  --sys-gradient-end: ${config.gradient.end};
  --sys-gradient-purple: ${config.gradient.purple};
  --sys-gradient-pink: ${config.gradient.pink};
}

@theme {
  --color-rose-400: var(--sys-red);
  --color-rose-500: var(--sys-red);
  --color-amber-400: var(--sys-yellow-light);
  --color-amber-500: var(--sys-yellow);
  --color-emerald-400: var(--sys-green-light);
  --color-emerald-500: var(--sys-green);
  --color-sky-400: var(--sys-blue-light);
  --color-sky-500: var(--sys-blue);
  --color-purple-500: var(--sys-gradient-start);
  --color-pink-500: var(--sys-gradient-end);
}`;
}
