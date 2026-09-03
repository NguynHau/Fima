/**
 * Update Service
 * Handles checking for application updates from GitHub Pages or hosting server,
 * version comparison, cache-busting, Service Worker coordination, and safe application reload.
 */

export interface AppBuildInfo {
  version: string;
  buildId: string;
  buildTime: number;
  builtAt?: string;
  gitCommit?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentBuild: AppBuildInfo;
  remoteBuild: AppBuildInfo | null;
  reason?: 'new_build_id' | 'new_version' | 'new_build_time' | 'sw_waiting';
  error?: string;
}

type UpdateListener = (hasUpdate: boolean) => void;
const updateListeners = new Set<UpdateListener>();
let hasUpdateState = false;

export function isUpdateAvailable(): boolean {
  return hasUpdateState;
}

export function setHasUpdateFlag(val: boolean) {
  hasUpdateState = val;
  updateListeners.forEach((fn) => {
    try {
      fn(val);
    } catch (e) {
      console.error('[UpdateService] Listener error:', e);
    }
  });
}

export function subscribeUpdateState(listener: UpdateListener): () => void {
  updateListeners.add(listener);
  listener(hasUpdateState);
  return () => {
    updateListeners.delete(listener);
  };
}

/**
 * Returns the currently running application build info (baked in at build time).
 */
export function getCurrentBuildInfo(): AppBuildInfo {
  try {
    if (typeof __APP_BUILD_INFO__ !== 'undefined' && __APP_BUILD_INFO__) {
      return __APP_BUILD_INFO__;
    }
  } catch {
    // fallback
  }

  return {
    version: '1.0.0',
    buildId: 'dev',
    buildTime: 0,
    builtAt: new Date(0).toISOString(),
  };
}

/**
 * Generates an absolute or base-relative URL for version.json with aggressive cache-busting.
 * Resolves correctly on root domains as well as GitHub Pages repository subpaths.
 */
export function getVersionUrl(): string {
  try {
    const base = document.baseURI || window.location.href;
    const url = new URL('version.json', base);
    url.searchParams.set('t', Date.now().toString());
    return url.toString();
  } catch {
    return `./version.json?t=${Date.now()}`;
  }
}

/**
 * Compares remote build info with current build info.
 */
export function isNewerBuild(remote: AppBuildInfo, current: AppBuildInfo): boolean {
  if (!remote) return false;

  // 1. If buildId is defined and different
  if (remote.buildId && current.buildId && remote.buildId !== current.buildId) {
    // If local is dev and remote is also dev, not an update
    if (current.buildId === 'dev' && remote.buildId === 'dev') {
      return false;
    }
    return true;
  }

  // 2. If remote build timestamp is newer (by more than 1s to ignore clock jitter)
  if (remote.buildTime && current.buildTime && remote.buildTime > current.buildTime + 1000) {
    return true;
  }

  // 3. If version strings differ (e.g. 1.0.0 vs 1.0.1)
  if (remote.version && current.version && remote.version !== current.version) {
    return true;
  }

  return false;
}

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Fetches version.json directly from GitHub Pages or hosting server with no-store cache busting,
 * asks Service Worker to check for updates, and returns whether a new version is available.
 */
export async function checkForRemoteUpdate(): Promise<UpdateCheckResult> {
  // If navigator is explicitly offline, don't even try to fetch to avoid hanging
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      hasUpdate: false,
      currentBuild: getCurrentBuildInfo(),
      remoteBuild: null,
    };
  }

  const currentBuild = getCurrentBuildInfo();
  let remoteBuild: AppBuildInfo | null = null;
  let fetchError: string | undefined;

  // 1. Fetch remote version.json with strict cache busting and timeout
  try {
    const url = getVersionUrl();
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }, 4000); // 4s timeout for version check

    if (res.ok) {
      remoteBuild = (await res.json()) as AppBuildInfo;
    } else {
      fetchError = `HTTP ${res.status}`;
      console.warn(`[UpdateService] Failed to fetch version.json: HTTP ${res.status}`);
    }
  } catch (err: any) {
    fetchError = err?.name === 'AbortError' ? 'Network Timeout' : (err?.message || 'Network error');
    console.warn('[UpdateService] Network error fetching version.json:', err);
  }

  // 2. Trigger Service Worker update check if available
  let swHasWaiting = false;
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          swHasWaiting = true;
        }
      }
    } catch (e) {
      console.warn('[UpdateService] Service Worker check error:', e);
    }
  }

  // 3. Evaluate results
  if (remoteBuild && isNewerBuild(remoteBuild, currentBuild)) {
    setHasUpdateFlag(true);
    return {
      hasUpdate: true,
      currentBuild,
      remoteBuild,
      reason: 'new_build_id',
    };
  }

  if (swHasWaiting) {
    setHasUpdateFlag(true);
    return {
      hasUpdate: true,
      currentBuild,
      remoteBuild,
      reason: 'sw_waiting',
    };
  }

  if (remoteBuild && !isNewerBuild(remoteBuild, currentBuild)) {
    setHasUpdateFlag(false);
    return {
      hasUpdate: false,
      currentBuild,
      remoteBuild,
    };
  }

  if (fetchError) {
    return {
      hasUpdate: false,
      currentBuild,
      remoteBuild: null,
      error: fetchError,
    };
  }

  return {
    hasUpdate: false,
    currentBuild,
    remoteBuild,
  };
}

/**
 * Applies the application update:
 * 1. Instructs the Service Worker to skipWaiting and claim clients
 * 2. Clears HTTP CacheStorage (CRITICAL: NEVER touches IndexedDB or localStorage!)
 * 3. Reloads the window to load the new version assets immediately
 */
export async function applyAppUpdate(): Promise<void> {
  try {
    // 1. Tell Service Worker to activate new version and skip waiting
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          try {
            await reg.update();
          } catch {
            // ignore
          }
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.installing) {
            reg.installing.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch (swErr) {
        console.warn('[UpdateService] Error communicating with Service Worker:', swErr);
      }
    }

    // 2. Clear browser HTTP CacheStorage (CRITICAL: only Cache Storage, NEVER IndexedDB or localStorage!)
    const cacheStorage =
      typeof caches !== 'undefined'
        ? caches
        : typeof window !== 'undefined' && 'caches' in window
        ? (window as any).caches
        : null;

    if (cacheStorage) {
      try {
        const cacheKeys = await cacheStorage.keys();
        await Promise.all(cacheKeys.map((key) => cacheStorage.delete(key)));
      } catch (cacheErr) {
        console.warn('[UpdateService] Error clearing caches:', cacheErr);
      }
    }

    // 3. Force reload with timestamped query param to bypass any browser document cache
    const targetUrl = new URL(window.location.href);
    targetUrl.searchParams.set('v', Date.now().toString());
    window.location.replace(targetUrl.toString());
  } catch (err) {
    console.error('[UpdateService] Error applying update, fallback to reload:', err);
    window.location.reload();
  }
}

/**
 * Initializes automatic background update checks for long-running PWA instances.
 * Checks on resume from background, on focus, and periodically every 15 minutes.
 */
export function initAutoUpdateChecker(): () => void {
  let lastCheckTime = Date.now();

  const handleVisibilityOrFocus = async () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      // If at least 2 minutes have elapsed since last check
      if (now - lastCheckTime > 2 * 60 * 1000) {
        lastCheckTime = now;
        try {
          const res = await checkForRemoteUpdate();
          if (res.hasUpdate) {
            setHasUpdateFlag(true);
          }
        } catch {
          // ignore background check failure
        }
      }
    }
  };

  // Periodic check every 15 minutes
  const intervalId = setInterval(async () => {
    try {
      const res = await checkForRemoteUpdate();
      if (res.hasUpdate) {
        setHasUpdateFlag(true);
      }
    } catch {
      // ignore
    }
  }, 15 * 60 * 1000);

  document.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);

  // If Service Worker detects a new controller in background
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setHasUpdateFlag(true);
    });
  }

  // Initial silent check after 5 seconds to catch updates deployed while app was closed
  const initialTimer = setTimeout(() => {
    checkForRemoteUpdate().catch(() => {});
  }, 5000);

  return () => {
    clearInterval(intervalId);
    clearTimeout(initialTimer);
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
  };
}
