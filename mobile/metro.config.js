const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure for Reanimated
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-reanimated/plugin"),
};

module.exports = withNativeWind(config, { input: './global.css' });
