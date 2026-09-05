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
  resetToOriginalDefault: () => void;
  saveCurrentConfig: () => void;
  setAsNewDefault: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
}

const STORAGE_KEY = 'fima_liquid_glass_config_v2';
const USER_DEFAULT_KEY = 'fima_liquid_glass_user_default_v2';

const LiquidGlassContext = createContext<LiquidGlassContextType | null>(null);

export const LiquidGlassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialDefault = (): LiquidGlassConfig => {
    return DEFAULT_LIQUID_GLASS_CONFIG;
  };

  const [savedConfig, setSavedConfig] = useState<LiquidGlassConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.island && parsed.activeTab) {
          const activeTabLoaded = { ...DEFAULT_ACTIVE_TAB_CONFIG, ...parsed.activeTab };
          if (!parsed.activeTab.springStiffness || parsed.activeTab.moveStiffness >= 800) {
            activeTabLoaded.springStiffness = DEFAULT_ACTIVE_TAB_CONFIG.springStiffness;
            activeTabLoaded.springDamping = DEFAULT_ACTIVE_TAB_CONFIG.springDamping;
            activeTabLoaded.moveStiffness = DEFAULT_ACTIVE_TAB_CONFIG.springStiffness;
            activeTabLoaded.moveDamping = DEFAULT_ACTIVE_TAB_CONFIG.springDamping;
          }
          return {
            preset: parsed.preset || 'custom',
            island: { ...DEFAULT_ISLAND_CONFIG, ...parsed.island },
            activeTab: activeTabLoaded,
          };
        }
      }
    } catch (e) {
      console.error('Error loading liquid glass config from storage', e);
    }
    return DEFAULT_LIQUID_GLASS_CONFIG;
  });

  const [config, setConfig] = useState<LiquidGlassConfig>(savedConfig);

  // History stacks for Undo / Redo
  const [history, setHistory] = useState<LiquidGlassConfig[]>([]);
  const [future, setFuture] = useState<LiquidGlassConfig[]>([]);

  // Push current config to history before state update
  const pushHistory = (currentCfg: LiquidGlassConfig) => {
    setHistory((prev) => [...prev.slice(-20), currentCfg]); // Keep last 20 steps
    setFuture([]); // clear future on new action
  };

  // Sync to root CSS variables for instant visual update
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

  // Persist to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving liquid glass config', e);
    }
  }, [config]);

  const updateIsland = useCallback((partial: Partial<IslandConfig>) => {
    setConfig((prev) => {
      pushHistory(prev);
      return {
        ...prev,
        preset: 'custom',
        island: {
          ...prev.island,
          ...partial,
        },
      };
    });
  }, []);

  const updateActiveTab = useCallback((partial: Partial<ActiveTabConfig>) => {
    setConfig((prev) => {
      pushHistory(prev);
      return {
        ...prev,
        preset: 'custom',
        activeTab: {
          ...prev.activeTab,
          ...partial,
        },
      };
    });
  }, []);

  const applyPreset = useCallback((preset: PresetType) => {
    if (preset === 'custom') return;
    if (preset === 'default_custom') {
      const userDef = getInitialDefault();
      setConfig((prev) => {
        pushHistory(prev);
        return {
          ...userDef,
          preset: 'default_custom',
        };
      });
      return;
    }
    const presetConfig = PRESETS[preset];
    if (presetConfig) {
      setConfig((prev) => {
        pushHistory(prev);
        return presetConfig;
      });
    }
  }, []);

  const resetIsland = useCallback(() => {
    setConfig((prev) => {
      pushHistory(prev);
      const def = getInitialDefault();
      return {
        ...prev,
        preset: 'custom',
        island: def.island,
      };
    });
  }, []);

  const resetActiveTab = useCallback(() => {
    setConfig((prev) => {
      pushHistory(prev);
      const def = getInitialDefault();
      return {
        ...prev,
        preset: 'custom',
        activeTab: def.activeTab,
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    setConfig((prev) => {
      pushHistory(prev);
      return getInitialDefault();
    });
  }, []);

  const resetToOriginalDefault = useCallback(() => {
    setConfig((prev) => {
      pushHistory(prev);
      try {
        localStorage.removeItem(USER_DEFAULT_KEY);
      } catch (e) {
        console.error(e);
      }
      return DEFAULT_LIQUID_GLASS_CONFIG;
    });
  }, []);

  const saveCurrentConfig = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSavedConfig(config);
    } catch (e) {
      console.error('Error explicitly saving config', e);
    }
  }, [config]);

  const setAsNewDefault = useCallback(() => {
    try {
      localStorage.setItem(USER_DEFAULT_KEY, JSON.stringify(config));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSavedConfig(config);
    } catch (e) {
      console.error('Error saving user default', e);
    }
  }, [config]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [config, ...prev]);
    setConfig(previous);
  }, [history, config]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, config]);
    setConfig(next);
  }, [future, config]);

  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

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
        resetToOriginalDefault,
        saveCurrentConfig,
        setAsNewDefault,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: future.length > 0,
        isDirty,
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
