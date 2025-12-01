const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Performance Optimization: Transformer Configuration
 *
 * - inlineRequires: Delays requiring modules until needed (30-50% cold start improvement)
 * - minifierPath: Use Metro's minifier for production builds
 *
 * @see PERFORMANCE_ROADMAP.md
 */
config.transformer = {
  ...config.transformer,
  inlineRequires: true,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug'],
    },
    mangle: {
      toplevel: true,
    },
  },
};

/**
 * Performance Optimization: Serializer Configuration
 *
 * - createModuleIdFactory: Deterministic module IDs for better caching
 */
config.serializer = {
  ...config.serializer,
  // Use file path hash for stable module IDs (better delta updates)
  createModuleIdFactory: function () {
    const fileToIdMap = new Map();
    let nextId = 0;
    return function (path) {
      if (!fileToIdMap.has(path)) {
        fileToIdMap.set(path, nextId++);
      }
      return fileToIdMap.get(path);
    };
  },
};

/**
 * Performance Optimization: Limit Metro workers
 *
 * On some systems, too many workers can slow down bundling.
 * This is especially helpful for large bundles.
 */
config.maxWorkers = 2;

/**
 * Custom resolver to redirect Node.js modules to browser-compatible alternatives
 *
 * - mqtt → mqtt/dist/mqtt.esm.js (browser build, no Node.js dependencies)
 * - url → react-native-url-polyfill (WHATWG URL implementation)
 * - dom-helpers/* → dom-helpers/cjs/*.js (for gluestack-ui compatibility)
 */
const originalResolver = config.resolver?.resolveRequest;
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
  resolveRequest: (context, moduleName, platform) => {
    // Redirect 'mqtt' to its browser ESM build
    if (moduleName === 'mqtt') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/mqtt/dist/mqtt.esm.js'),
        type: 'sourceFile',
      };
    }

    // Redirect Node.js 'url' module to polyfill
    if (moduleName === 'url') {
      return context.resolveRequest(context, 'react-native-url-polyfill', platform);
    }

    // Redirect dom-helpers/* to cjs build (for gluestack-ui compatibility)
    if (moduleName.startsWith('dom-helpers/') && !moduleName.includes('.js')) {
      const subModule = moduleName.replace('dom-helpers/', '');
      return {
        filePath: path.resolve(__dirname, `node_modules/dom-helpers/cjs/${subModule}.js`),
        type: 'sourceFile',
      };
    }

    // Use default resolver for everything else
    if (originalResolver) {
      return originalResolver(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
