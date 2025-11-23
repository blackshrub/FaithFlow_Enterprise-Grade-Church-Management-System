module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@components": "./components",
            "@screens": "./app",
            "@hooks": "./hooks",
            "@stores": "./stores",
            "@lib": "./lib",
            "@types": "./types",
            "@assets": "./assets",
          },
        },
      ],
      // Reanimated plugin must be last
      "react-native-reanimated/plugin",
    ],
  };
};
