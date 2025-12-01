import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

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
        // Better chunk splitting for caching
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // Radix UI components
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix';
          }
          // TanStack Query
          if (id.includes('node_modules/@tanstack/')) {
            return 'query';
          }
          // Date utilities
          if (id.includes('node_modules/date-fns/')) {
            return 'date-fns';
          }
          // Form libraries
          if (id.includes('node_modules/react-hook-form/') || id.includes('node_modules/zod/')) {
            return 'forms';
          }
          // Rich text editor
          if (id.includes('node_modules/@tiptap/')) {
            return 'editor';
          }
          // i18n
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n';
          }
          // Framer Motion
          if (id.includes('node_modules/framer-motion/')) {
            return 'motion';
          }
          // Other large dependencies
          if (id.includes('node_modules/axios/')) {
            return 'axios';
          }
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
