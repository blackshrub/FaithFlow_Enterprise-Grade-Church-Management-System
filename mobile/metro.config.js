const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

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

module.exports = withNativeWind(config, { input: './global.css' });
