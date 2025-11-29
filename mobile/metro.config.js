const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Performance Optimization: Inline Requires
 *
 * This delays requiring modules until they are actually needed,
 * which can improve cold start time by 30-50% for large apps.
 *
 * @see PERFORMANCE_ROADMAP.md
 */
config.transformer = {
  ...config.transformer,
  inlineRequires: true,
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
