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
  borderWidth: number; // 0px - 6px, default 0.2
  borderOpacity: number; // 0.00 - 1.00, default 0.03
  innerBorderOpacity: number; // 0.00 - 1.00, default 0.12
  outerBorderOpacity: number; // 0.00 - 1.00, default 0.00
  borderColor?: string; // hex color, default '#ffffff'
  borderGlowSpread?: number; // 0px - 10px, default 1

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

  // Animation & Elasticity
  transitionDuration: number; // 100ms - 1000ms, default 300
  springStiffness: number; // 100 - 1000, default 420
  springDamping: number; // 10 - 100, default 32
  springMass?: number; // 0.1 - 2.0, default 0.5
  tapScale?: number; // 0.90 - 1.00, default 0.99
}

export interface ActiveTabGradientConfig {
  startColor: string; // hex e.g. '#a855f7' (Purple)
  endColor: string; // hex e.g. '#ec4899' (Pink)
  direction: string; // 'to right' | 'to bottom right' | 'to bottom' | 'to top right'
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

  // Border & Optics
  borderWidth: number; // 0px - 5px, default 0.5
  borderOpacity: number; // 0.00 - 1.00, default 0.16
  innerBorder: number; // 0.00 - 1.00, default 0.30
  outerBorder: number; // 0.00 - 1.00, default 0.08
  borderColor?: string; // hex color, default '#ffffff'
  topHighlightOpacity?: number; // 0.00 - 1.00, default 0.25

  // Droplet Reflected Edge (Secondary reversed optical reflection)
  reflectedEdgeOpacity?: number; // 0.00 - 1.00, default 0.28
  reflectedEdgeWidth?: number; // 0px - 5px, default 1.2
  reflectedEdgeBlur?: number; // 0px - 10px, default 2.5
  reflectedEdgeOffset?: number; // -10px - 10px, default 1.5
  reflectedEdgeDirection?: string; // 'bottom' | 'top' | 'opposite' | 'bottom-right', default 'bottom'

  // Active Tab Gradient (Purple -> Pink default, replaces white active tab)
  activeTabGradient?: ActiveTabGradientConfig;
  gradientStart?: string; // default '#a855f7' (Purple)
  gradientEnd?: string; // default '#ec4899' (Pink)
  gradientDirection?: string; // default 'to right'

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

  // Animation & Elasticity (Quay về lò xo ban đầu mượt mà, không giật)
  springStiffness: number; // 100 - 1000, default 420
  springDamping: number; // 10 - 100, default 32
  iconActiveScale?: number; // 1.0 - 1.5, default 1.18

  // Backward compatibility fields
  moveStiffness?: number;
  moveDamping?: number;
  moveMass?: number;
  pressStiffness?: number;
  pressDamping?: number;
  pressMass?: number;
  velocityStretch?: number;
  velocitySquash?: number;
}

export interface LiquidGlassConfig {
  preset: PresetType;
  island: IslandConfig;
  activeTab: ActiveTabConfig;
}

export type PresetType =
  | 'default_custom'
  | 'level0_clear'
  | 'level1_subtle'
  | 'level2_default'
  | 'level3_frosted'
  | 'level4_cyber'
  | 'level5_heavy'
  | 'custom'
  // Legacy aliases for backward compatibility
  | 'default'
  | 'soft'
  | 'strong'
  | 'clear'
  | 'ios';

export interface PresetInfo {
  id: PresetType;
  level: number;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
}

export const PRESET_INFOS: PresetInfo[] = [
  {
    id: 'level0_clear',
    level: 0,
    name: 'Mức 0: Siêu trong suốt',
    subtitle: 'Kính mỏng tối giản, gần như tàng hình không chiếm tầm nhìn',
    badge: 'Ultra Clear',
    accentColor: '#38bdf8',
  },
  {
    id: 'level1_subtle',
    level: 1,
    name: 'Mức 1: Kính mờ thanh lịch',
    subtitle: 'Độ mờ chuẩn Apple iOS, bão hòa dịu nhẹ và phản chiếu tự nhiên',
    badge: 'Subtle Frosted',
    accentColor: '#a78bfa',
  },
  {
    id: 'level2_default',
    level: 2,
    name: 'Mức 2: Kính lỏng tiêu chuẩn',
    subtitle: 'Fima Tiêu chuẩn cân bằng, giọt nước phồng hữu cơ và bóng đổ sâu',
    badge: 'Standard Liquid',
    accentColor: '#10b981',
  },
  {
    id: 'level3_frosted',
    level: 3,
    name: 'Mức 3: Thủy tinh đậm khối',
    subtitle: 'Kính băng nhám dày, độ tương phản cao và đường viền sắc nét',
    badge: 'Deep Frosted',
    accentColor: '#f59e0b',
  },
  {
    id: 'level4_cyber',
    level: 4,
    name: 'Mức 4: Hào quang Neon',
    subtitle: 'Phát sáng Outer Glow màu tím cyan huyền ảo, phong cách Cyberpunk',
    badge: 'Cyber Glow',
    accentColor: '#ec4899',
  },
  {
    id: 'level5_heavy',
    level: 5,
    name: 'Mức 5: Thủy tinh khối 3D',
    subtitle: 'Hiệu ứng kính cực đại, giọt nước siêu nảy và bóng đổ nổi bật',
    badge: 'Extreme 3D',
    accentColor: '#ef4444',
  },
];

export const DEFAULT_ISLAND_CONFIG: IslandConfig = {
  widthPercent: 100,
  height: 64,
  minWidth: 280,
  maxWidth: 500,
  paddingX: 6,
  paddingY: 6,
  positionX: 0,
  bottomOffset: 16,
  scale: 1,

  borderRadius: 50,
  cornerTopLeft: 34,
  cornerTopRight: 34,
  cornerBottomLeft: 34,
  cornerBottomRight: 34,
  isCustomCorners: false,

  bgOpacity: 0,
  glassOpacity: 1,
  blur: 2.5,
  saturation: 50,
  brightness: 100,
  contrast: 100,
  tintIntensity: 0,
  tintColor: '#ffffff',

  borderWidth: 0.2,
  borderOpacity: 0.03,
  innerBorderOpacity: 0.12,
  outerBorderOpacity: 0,
  borderColor: '#ffffff',
  borderGlowSpread: 1,

  shadowOpacity: 0,
  shadowBlur: 0,
  shadowRadius: 0,
  shadowX: 0,
  shadowY: -30,

  highlightOpacity: 0.15,
  highlightBlur: 1,
  innerGlow: 0,
  outerGlowSize: 0,
  outerGlowColor: 'rgba(139, 92, 246, 0.20)',

  transitionDuration: 300,
  springStiffness: 420,
  springDamping: 32,
  springMass: 0.5,
  tapScale: 0.99,
};

export const DEFAULT_ACTIVE_TAB_CONFIG: ActiveTabConfig = {
  width: 82,
  height: 48,
  sizeScale: 1,
  offsetX: 0,
  offsetY: 0,
  swellScaleX: 1.2,
  swellScaleY: 1.7,

  borderRadius: 9999,
  roundnessPercent: 100,

  bgOpacity: 0,
  blur: 0,
  saturation: 50,
  brightness: 100,
  contrast: 50,
  tintIntensity: 0,
  tintColor: '#ffffff',

  borderWidth: 0.2,
  borderOpacity: 0.41,
  innerBorder: 0,
  outerBorder: 0.51,
  borderColor: '#ffffff',
  topHighlightOpacity: 0.25,

  // Droplet Reflected Edge (Secondary reversed optical reflection)
  reflectedEdgeOpacity: 0.28,
  reflectedEdgeWidth: 1.2,
  reflectedEdgeBlur: 2.5,
  reflectedEdgeOffset: 1.5,
  reflectedEdgeDirection: 'bottom',

  // Active Tab Gradient (Purple -> Pink default, replaces white active tab)
  activeTabGradient: {
    startColor: '#a855f7',
    endColor: '#ec4899',
    direction: 'to right',
  },
  gradientStart: '#a855f7',
  gradientEnd: '#ec4899',
  gradientDirection: 'to right',

  shadowOpacity: 0,
  shadowBlur: 0,
  shadowSpread: -4,
  shadowX: 0,
  shadowY: -20,

  highlightOpacity: 0.3,
  innerGlow: 8,
  glassShine: 20,

  springStiffness: 420,
  springDamping: 32,
  iconActiveScale: 1.18,
  moveStiffness: 420,
  moveDamping: 32,
};

export const DEFAULT_LIQUID_GLASS_CONFIG: LiquidGlassConfig = {
  preset: 'custom',
  island: DEFAULT_ISLAND_CONFIG,
  activeTab: DEFAULT_ACTIVE_TAB_CONFIG,
};

export const PRESETS: Record<string, LiquidGlassConfig> = {
  level0_clear: {
    preset: 'level0_clear',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.02,
      blur: 2.0,
      saturation: 100,
      borderWidth: 0.5,
      borderOpacity: 0.12,
      innerBorderOpacity: 0.08,
      shadowOpacity: 0.12,
      shadowBlur: 14,
      shadowY: 8,
      outerGlowSize: 0,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.09,
      blur: 8,
      saturation: 120,
      borderWidth: 0.5,
      borderOpacity: 0.15,
      innerBorder: 0.18,
      outerBorder: 0.04,
      shadowOpacity: 0.14,
      shadowBlur: 10,
      swellScaleX: 1.25,
      swellScaleY: 1.6,
    },
  },
  level1_subtle: {
    preset: 'level1_subtle',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.08,
      blur: 16,
      saturation: 130,
      brightness: 102,
      borderWidth: 0.8,
      borderOpacity: 0.15,
      innerBorderOpacity: 0.20,
      shadowOpacity: 0.22,
      shadowBlur: 24,
      shadowY: 12,
      outerGlowSize: 0,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.22,
      blur: 24,
      saturation: 190,
      borderWidth: 0.7,
      borderOpacity: 0.20,
      innerBorder: 0.35,
      outerBorder: 0.10,
      shadowOpacity: 0.25,
      shadowBlur: 18,
      swellScaleX: 1.30,
      swellScaleY: 1.75,
    },
  },
  level2_default: DEFAULT_LIQUID_GLASS_CONFIG,
  level3_frosted: {
    preset: 'level3_frosted',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.18,
      blur: 32,
      saturation: 200,
      contrast: 110,
      borderWidth: 1.4,
      borderOpacity: 0.25,
      innerBorderOpacity: 0.32,
      shadowOpacity: 0.50,
      shadowBlur: 40,
      shadowY: 18,
      outerGlowSize: 0,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.36,
      blur: 32,
      saturation: 240,
      contrast: 115,
      borderWidth: 1.0,
      borderOpacity: 0.30,
      innerBorder: 0.48,
      outerBorder: 0.18,
      shadowOpacity: 0.45,
      shadowBlur: 26,
      swellScaleX: 1.40,
      swellScaleY: 1.95,
    },
  },
  level4_cyber: {
    preset: 'level4_cyber',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.12,
      blur: 24,
      saturation: 220,
      brightness: 110,
      borderWidth: 1.2,
      borderOpacity: 0.35,
      innerBorderOpacity: 0.40,
      shadowOpacity: 0.60,
      shadowBlur: 45,
      shadowY: 16,
      outerGlowSize: 18,
      outerGlowColor: 'rgba(168, 85, 247, 0.35)',
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      bgOpacity: 0.28,
      blur: 26,
      saturation: 260,
      contrast: 120,
      borderWidth: 1.0,
      borderOpacity: 0.40,
      innerBorder: 0.55,
      outerBorder: 0.25,
      shadowOpacity: 0.50,
      shadowBlur: 25,
      innerGlow: 15,
      swellScaleX: 1.45,
      swellScaleY: 2.05,
    },
  },
  level5_heavy: {
    preset: 'level5_heavy',
    island: {
      ...DEFAULT_ISLAND_CONFIG,
      bgOpacity: 0.25,
      blur: 45,
      saturation: 250,
      brightness: 115,
      contrast: 120,
      borderWidth: 2.0,
      borderOpacity: 0.45,
      innerBorderOpacity: 0.50,
      shadowOpacity: 0.70,
      shadowBlur: 55,
      shadowY: 22,
      outerGlowSize: 12,
      outerGlowColor: 'rgba(255, 255, 255, 0.20)',
      springStiffness: 480,
      springDamping: 28,
    },
    activeTab: {
      ...DEFAULT_ACTIVE_TAB_CONFIG,
      width: 76,
      height: 50,
      bgOpacity: 0.45,
      blur: 40,
      saturation: 280,
      contrast: 130,
      borderWidth: 1.5,
      borderOpacity: 0.50,
      innerBorder: 0.65,
      outerBorder: 0.30,
      shadowOpacity: 0.60,
      shadowBlur: 35,
      innerGlow: 18,
      swellScaleX: 1.55,
      swellScaleY: 2.20,
      moveStiffness: 480,
      moveDamping: 28,
      pressStiffness: 400,
      pressDamping: 20,
    },
  },
  // Legacy mappings for backwards compatibility
  default: DEFAULT_LIQUID_GLASS_CONFIG,
  soft: {
    preset: 'level1_subtle',
    island: { ...DEFAULT_ISLAND_CONFIG, bgOpacity: 0.08, blur: 16 },
    activeTab: { ...DEFAULT_ACTIVE_TAB_CONFIG, bgOpacity: 0.22, blur: 24 },
  },
  strong: {
    preset: 'level3_frosted',
    island: { ...DEFAULT_ISLAND_CONFIG, bgOpacity: 0.18, blur: 32 },
    activeTab: { ...DEFAULT_ACTIVE_TAB_CONFIG, bgOpacity: 0.36, blur: 32 },
  },
  clear: {
    preset: 'level0_clear',
    island: { ...DEFAULT_ISLAND_CONFIG, bgOpacity: 0.02, blur: 2 },
    activeTab: { ...DEFAULT_ACTIVE_TAB_CONFIG, bgOpacity: 0.09, blur: 8 },
  },
  ios: {
    preset: 'level1_subtle',
    island: { ...DEFAULT_ISLAND_CONFIG, bgOpacity: 0.12, blur: 22 },
    activeTab: { ...DEFAULT_ACTIVE_TAB_CONFIG, bgOpacity: 0.22, blur: 25 },
  },
};
