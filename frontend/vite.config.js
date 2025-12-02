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
