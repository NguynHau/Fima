export interface IslandConfig {
  // Geometry
  widthPercent: number; // 50% - 100%, default 100
  height: number; // 40px - 100px, default 68
  minWidth: number; // 200px - 400px, default 280
  maxWidth: number; // 300px - 600px, default 500
  paddingX: number; // 0px - 24px, default 6
  paddingY: number; // 0px - 24px, default 6
  positionX: number; // -100px - 100px, default 0
  bottomOffset: number; // 0px - 60px, default 16
  scale: number; // 0.5 - 1.5, default 1.0

  // Shape
  borderRadius: number; // 0px - 50px, default 9999 (full rounded pill)
  cornerTopLeft: number; // 0 - 50px
  cornerTopRight: number; // 0 - 50px
  cornerBottomLeft: number; // 0 - 50px
  cornerBottomRight: number; // 0 - 50px
  isCustomCorners: boolean; // false

  // Glass
  bgOpacity: number; // 0.00 - 1.00, default 0.00
  glassOpacity: number; // 0.00 - 1.00, default 1.00
  blur: number; // 0px - 50px, default 5.0
  saturation: number; // 50% - 300%, default 95
  brightness: number; // 50% - 200%, default 100
  contrast: number; // 50% - 200%, default 100
  tintIntensity: number; // 0 - 100%, default 0
  tintColor: string; // hex color e.g. '#ffffff'

  // Border
  borderWidth: number; // 0px - 6px, default 1.0
  borderOpacity: number; // 0.00 - 1.00, default 0.09
  innerBorderOpacity: number; // 0.00 - 1.00, default 0.15
  outerBorderOpacity: number; // 0.00 - 1.00, default 0.00

  // Shadow
  shadowOpacity: number; // 0.00 - 1.00, default 0.31
  shadowBlur: number; // 0px - 60px, default 35
  shadowRadius: number; // 0px - 30px, default 0
  shadowX: number; // -30px - 30px, default 0
  shadowY: number; // -30px - 50px, default 15

  // Highlight / Reflection
  highlightOpacity: number; // 0.00 - 1.00, default 0.15
  highlightBlur: number; // 0px - 20px, default 1
  innerGlow: number; // 0px - 20px, default 0
  outerGlowSize: number; // 0px - 30px, default 0
  outerGlowColor: string; // rgba string e.g. 'rgba(139, 92, 246, 0.20)'

  // Animation
  transitionDuration: number; // 100ms - 1000ms, default 300
  springStiffness: number; // 100 - 1000, default 420
  springDamping: number; // 10 - 100, default 32
}

export interface ActiveTabConfig {
  // Geometry
  width: number; // 40px - 120px, default 70
  height: number; // 20px - 80px, default 46
  sizeScale: number; // 0.5 - 2.0, default 1.0
  offsetX: number; // -30px - 30px, default 0
  offsetY: number; // -30px - 30px, default 0
  swellScaleX: number; // 1.0 - 2.5, default 1.35
  swellScaleY: number; // 1.0 - 2.5, default 1.85

  // Shape
  borderRadius: number; // 0px - 50px, default 9999 (full rounded pill)
  roundnessPercent: number; // 0% - 100%, default 100

  // Glass
  bgOpacity: number; // 0.00 - 1.00, default 0.16
  blur: number; // 0px - 50px, default 20
  saturation: number; // 50% - 300%, default 190
  brightness: number; // 50% - 200%, default 100
  contrast: number; // 50% - 200%, default 105
  tintIntensity: number; // 0 - 100%, default 0
  tintColor: string; // hex color e.g. '#ffffff'

  // Border
  borderWidth: number; // 0px - 5px, default 0.5
  borderOpacity: number; // 0.00 - 1.00, default 0.16
  innerBorder: number; // 0.00 - 1.00, default 0.30
  outerBorder: number; // 0.00 - 1.00, default 0.08

  // Shadow
  shadowOpacity: number; // 0.00 - 1.00, default 0.30
  shadowBlur: number; // 0px - 40px, default 20
  shadowSpread: number; // -10px - 20px, default -4
  shadowX: number; // -20px - 20px, default 0
  shadowY: number; // -20px - 30px, default 8

  // Highlight
  highlightOpacity: number; // 0.00 - 1.00, default 0.30
  innerGlow: number; // 0px - 20px, default 8
  glassShine: number; // 0 - 100%, default 20

  // Animation
  moveStiffness: number; // 100 - 1000, default 420
  moveDamping: number; // 10 - 100, default 32
  pressStiffness: number; // 100 - 1000, default 350
  pressDamping: number; // 10 - 100, default 22
}

export interface LiquidGlassConfig {
  preset: PresetType;
  island: IslandConfig;
  activeTab: ActiveTabConfig;
}

export type PresetType = 'default' | 'soft' | 'strong' | 'clear' | 'ios' | 'custom';

export const DEFAULT_ISLAND_CONFIG: IslandConfig = {
  widthPercent: 100,
  height: 68,
  minWidth: 280,
  maxWidth: 500,
  paddingX: 6,
  paddingY: 6,
  positionX: 0,
  bottomOffset: 16,
  scale: 1.0,

  borderRadius: 9999,
  cornerTopLeft: 34,
  cornerTopRight: 34,
  cornerBottomLeft: 34,
  cornerBottomRight: 34,
  isCustomCorners: false,

  bgOpacity: 0.00,
  glassOpacity: 1.00,
  blur: 5.0,
  saturation: 95,
  brightness: 100,
  contrast: 100,
  tintIntensity: 0,
  tintColor: '#ffffff',

  borderWidth: 1.0,
  borderOpacity: 0.09,
  innerBorderOpacity: 0.15,
  outerBorderOpacity: 0.00,

  shadowOpacity: 0.31,
  shadowBlur: 35,
  shadowRadius: 0,
  shadowX: 0,
  shadowY: 15,

  highlightOpacity: 0.15,
  highlightBlur: 1,
  innerGlow: 0,
  outerGlowSize: 0,
  outerGlowColor: 'rgba(139, 92, 246, 0.20)',

  transitionDuration: 300,
  springStiffness: 420,
  springDamping: 32,
};

export const DEFAULT_ACTIVE_TAB_CONFIG: ActiveTabConfig = {
  width: 70,
  height: 46,
  sizeScale: 1.0,
  offsetX: 0,
  offsetY: 0,
  swellScaleX: 1.35,
  swellScaleY: 1.85,

  borderRadius: 9999,
  roundnessPercent: 100,

  bgOpacity: 0.16,
  blur: 20,
  saturation: 190,
  brightness: 100,
  contrast: 105,
  tintIntensity: 0,
  tintColor: '#ffffff',

  borderWidth: 0.5,
  borderOpacity: 0.16,
  innerBorder: 0.30,
  outerBorder: 0.08,

  shadowOpacity: 0.30,
  shadowBlur: 20,
  shadowSpread: -4,
  shadowX: 0,
  shadowY: 8,

  highlightOpacity: 0.30,
  innerGlow: 8,
  glassShine: 20,

  moveStiffness: 420,
  moveDamping: 32,
  pressStiffness: 350,
  pressDamping: 22,
};

export const DEFAULT_LIQUID_GLASS_CONFIG: LiquidGlassConfig = {
  preset: 'default',
  island: DEFAULT_ISLAND_CONFIG,
  activeTab: DEFAULT_ACTIVE_TAB_CONFIG,
};

export const PRESETS: Record<Exclude<PresetType, 'custom'>, LiquidGlassConfig> = {
  default: DEFAULT_LIQUID_GLASS_CONFIG,
  soft: {
    preset: 'soft',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.08,
      blur: 16,
      saturation: 130,
      borderWidth: 0.8,
      borderOpacity: 0.14,
      shadowOpacity: 0.20,
      shadowBlur: 25,
      highlightOpacity: 0.22,
      innerGlow: 4,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.25,
      blur: 28,
      saturation: 210,
      innerBorder: 0.40,
      shadowOpacity: 0.25,
      innerGlow: 12,
    },
  },
  strong: {
    preset: 'strong',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.18,
      blur: 30,
      saturation: 200,
      contrast: 110,
      borderWidth: 1.5,
      borderOpacity: 0.25,
      innerBorderOpacity: 0.35,
      shadowOpacity: 0.55,
      shadowBlur: 45,
      highlightOpacity: 0.30,
      innerGlow: 8,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.38,
      blur: 35,
      saturation: 250,
      contrast: 115,
      borderWidth: 1.0,
      borderOpacity: 0.30,
      innerBorder: 0.50,
      outerBorder: 0.20,
      shadowOpacity: 0.50,
      shadowBlur: 28,
    },
  },
  clear: {
    preset: 'clear',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.02,
      blur: 2,
      saturation: 100,
      borderWidth: 0.5,
      borderOpacity: 0.18,
      innerBorderOpacity: 0.10,
      shadowOpacity: 0.15,
      shadowBlur: 15,
      highlightOpacity: 0.10,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.10,
      blur: 8,
      saturation: 120,
      borderWidth: 0.5,
      borderOpacity: 0.20,
      innerBorder: 0.20,
      shadowOpacity: 0.15,
    },
  },
  ios: {
    preset: 'ios',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.12,
      blur: 22,
      saturation: 180,
      brightness: 105,
      borderWidth: 1.0,
      borderOpacity: 0.18,
      innerBorderOpacity: 0.20,
      shadowOpacity: 0.35,
      shadowBlur: 30,
      highlightOpacity: 0.25,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.22,
      blur: 25,
      saturation: 200,
      borderWidth: 0.8,
      borderOpacity: 0.22,
      innerBorder: 0.35,
      shadowOpacity: 0.30,
    },
  },
};
