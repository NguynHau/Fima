export interface ColorShades {
  main: string;
  light: string;
  dark: string;
}

export interface GradientConfig {
  start: string;
  end: string;
  purple: string;
  pink: string;
}

export interface SystemColorsConfig {
  version: number;
  activePresetId: string | null;
  red: ColorShades;
  yellow: ColorShades;
  green: ColorShades;
  blue: ColorShades;
  gradient: GradientConfig;
}

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  tag: string;
  config: Omit<SystemColorsConfig, 'version' | 'activePresetId'>;
}
