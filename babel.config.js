/**
 * Babel Configuration
 * 
 * Configures Babel presets for Expo and NativeWind.
 * Includes the Reanimated plugin for animations.
 */
module.exports = function (api) {
    api.cache.using(() => process.env.NODE_ENV);
    return {
        presets: [
            ["babel-preset-expo", {
                jsxImportSource: "nativewind",
                reanimated: process.env.NODE_ENV !== 'test',
            }],
            process.env.NODE_ENV === 'test' ? null : "nativewind/babel",
        ].filter(Boolean),
        plugins: [
            // Only valid if not testing, or handled differently in tests
            process.env.NODE_ENV !== 'test' ? 'react-native-reanimated/plugin' : null,
        ].filter(Boolean)
    };
};
