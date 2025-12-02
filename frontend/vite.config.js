import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // React with Babel + React Compiler for auto-memoization
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            // React Compiler configuration
            target: '19', // React 19
          }],
        ],
      },
    }),

    // PWA configuration for offline support and caching
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'FaithFlow Church Management',
        short_name: 'FaithFlow',
        description: 'Enterprise-grade church management system',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // Cache API responses
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Cache static assets (JS, CSS)
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
        // Pre-cache critical assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip waiting for new service worker
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // Disable PWA in development
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Allow importing .js files that contain JSX (CRA compatibility)
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },

  // Handle JSX in .js files (CRA compatibility)
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'build', // Match CRA's output directory
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1500,
    // Minification with esbuild (fastest)
    minify: 'esbuild',
    // Target modern browsers only (smaller bundle)
    target: 'es2020',
    rollupOptions: {
      output: {
        // Chunk splitting - keep vendor libs together to avoid React duplication issues
        manualChunks: {
          // Core React - must be in single chunk to avoid hooks errors
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'scheduler'],
          // UI libraries that depend on React
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip', '@radix-ui/react-popover', '@radix-ui/react-switch', '@radix-ui/react-checkbox', '@radix-ui/react-label', '@radix-ui/react-slot'],
          // Data fetching
          'vendor-data': ['@tanstack/react-query', 'axios'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],
          // Forms
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Animation
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    open: false,
    // Proxy API requests to backend (for local development)
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // Preview server (for testing production build locally)
  preview: {
    port: 3000,
  },

  // Define global constants (replaces process.env for non-VITE_ vars)
  define: {
    // This ensures process.env exists for any legacy code
    'process.env': {},
  },
});
