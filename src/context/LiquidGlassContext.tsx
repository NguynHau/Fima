import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LiquidGlassConfig,
  IslandConfig,
  ActiveTabConfig,
  PresetType,
  DEFAULT_LIQUID_GLASS_CONFIG,
  DEFAULT_ISLAND_CONFIG,
  DEFAULT_ACTIVE_TAB_CONFIG,
  PRESETS,
} from '../types/liquidGlass';

interface LiquidGlassContextType {
  config: LiquidGlassConfig;
  updateIsland: (partial: Partial<IslandConfig>) => void;
  updateActiveTab: (partial: Partial<ActiveTabConfig>) => void;
  applyPreset: (preset: PresetType) => void;
  resetIsland: () => void;
  resetActiveTab: () => void;
  resetAll: () => void;
}

const STORAGE_KEY = 'fima_liquid_glass_config_v1';

const LiquidGlassContext = createContext<LiquidGlassContextType | null>(null);

export const LiquidGlassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<LiquidGlassConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.island && parsed.activeTab) {
          return {
            preset: parsed.preset || 'custom',
            island: { ...DEFAULT_ISLAND_CONFIG, ...parsed.island },
            activeTab: { ...DEFAULT_ACTIVE_TAB_CONFIG, ...parsed.activeTab },
          };
        }
      }
    } catch (e) {
      console.error('Error loading liquid glass config from storage', e);
    }
    return DEFAULT_LIQUID_GLASS_CONFIG;
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving liquid glass config', e);
    }
  }, [config]);

  // Sync key values to root CSS variables for global styles
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glass-bg-opacity', config.island.bgOpacity.toString());
    root.style.setProperty('--glass-blur', `${config.island.blur}px`);
    root.style.setProperty('--glass-border-opacity', config.island.borderOpacity.toString());
    root.style.setProperty('--glass-saturate', `${config.island.saturation}%`);
    root.style.setProperty('--glass-shadow-opacity', config.island.shadowOpacity.toString());
    root.style.setProperty('--glass-inner-reflection', config.island.innerBorderOpacity.toString());
    root.style.setProperty('--glass-glow-size', `${config.island.outerGlowSize}px`);
    root.style.setProperty('--glass-glow-color', config.island.outerGlowColor);
    root.style.setProperty('--island-scale', config.island.scale.toString());
  }, [config]);

  const updateIsland = useCallback((partial: Partial<IslandConfig>) => {
    setConfig((prev) => ({
      ...prev,
      preset: 'custom',
      island: {
        ...prev.island,
        ...partial,
      },
    }));
  }, []);

  const updateActiveTab = useCallback((partial: Partial<ActiveTabConfig>) => {
    setConfig((prev) => ({
      ...prev,
      preset: 'custom',
      activeTab: {
        ...prev.activeTab,
        ...partial,
      },
    }));
  }, []);

  const applyPreset = useCallback((preset: PresetType) => {
    if (preset === 'custom') return;
    const presetConfig = PRESETS[preset];
    if (presetConfig) {
      setConfig(presetConfig);
    }
  }, []);

  const resetIsland = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      preset: 'custom',
      island: DEFAULT_ISLAND_CONFIG,
    }));
  }, []);

  const resetActiveTab = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      preset: 'custom',
      activeTab: DEFAULT_ACTIVE_TAB_CONFIG,
    }));
  }, []);

  const resetAll = useCallback(() => {
    setConfig(DEFAULT_LIQUID_GLASS_CONFIG);
  }, []);

  return (
    <LiquidGlassContext.Provider
      value={{
        config,
        updateIsland,
        updateActiveTab,
        applyPreset,
        resetIsland,
        resetActiveTab,
        resetAll,
      }}
    >
      {children}
    </LiquidGlassContext.Provider>
  );
};

export const useLiquidGlass = () => {
  const ctx = useContext(LiquidGlassContext);
  if (!ctx) {
    throw new Error('useLiquidGlass must be used within a LiquidGlassProvider');
  }
  return ctx;
};
