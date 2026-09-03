import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import pkg from './package.json';

// Automatically generate build and version identifier
const now = new Date();
const gitSha = process.env.GITHUB_SHA
  ? process.env.GITHUB_SHA.substring(0, 7)
  : (process.env.GIT_COMMIT ? process.env.GIT_COMMIT.substring(0, 7) : '');
const runNumber = process.env.GITHUB_RUN_NUMBER ? `r${process.env.GITHUB_RUN_NUMBER}` : '';
const timestamp = now.getTime();
const y = now.getUTCFullYear();
const m = String(now.getUTCMonth() + 1).padStart(2, '0');
const d = String(now.getUTCDate()).padStart(2, '0');
const h = String(now.getUTCHours()).padStart(2, '0');
const min = String(now.getUTCMinutes()).padStart(2, '0');
const dateStamp = `${y}${m}${d}.${h}${min}`;
const randomSuffix = Math.random().toString(36).substring(2, 6);

const buildId = gitSha
  ? `v${pkg.version || '1.0.0'}-${dateStamp}-${runNumber ? runNumber + '-' : ''}${gitSha}`
  : `v${pkg.version || '1.0.0'}-${dateStamp}-${randomSuffix}`;

const buildInfo = {
  version: pkg.version || '1.0.0',
  buildId,
  buildTime: timestamp,
  builtAt: now.toISOString(),
  gitCommit: gitSha || undefined,
};

function versionMetadataPlugin() {
  return {
    name: 'version-metadata-plugin',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(
        path.resolve(publicDir, 'version.json'),
        JSON.stringify(buildInfo, null, 2)
      );
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(buildInfo, null, 2),
      });
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && (req.url === '/version.json' || req.url.startsWith('/version.json?'))) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.end(JSON.stringify(buildInfo, null, 2));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: [
      react(),
      tailwindcss(),
      versionMetadataPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.png', 'logo.jpg'],
        manifest: {
          id: './',
          name: 'Fima - Quản Lý Thu Chi',
          short_name: 'Fima',
          description: 'Fima - Ứng dụng quản lý thu chi cá nhân hàng ngày kèm ảnh chứng từ',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/version.json', '**/server.cjs', '**/*.map'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /.*version\.json.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

