module.exports = function (api) {
  const isProd = api.env('production');
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
      /**
       * Performance Optimization: Strip console logs in production
       *
       * Removes console.log, console.debug, console.info in production builds.
       * Keeps console.error and console.warn for debugging critical issues.
       *
       * @see PERFORMANCE_ROADMAP.md
       */
      isProd && [
        'transform-remove-console',
        { exclude: ['error', 'warn'] },
      ],
      // Reanimated plugin must be last in Babel plugins (NOT in app.json!)
      "react-native-reanimated/plugin",
    ].filter(Boolean),
  };
};
