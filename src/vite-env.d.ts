/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD_INFO__: {
  version: string;
  buildId: string;
  buildTime: number;
  builtAt?: string;
  gitCommit?: string;
};
