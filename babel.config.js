/**
 * Babel Configuration
 * 
 * Configures Babel presets for Expo and NativeWind.
 * Includes the Reanimated plugin for animations.
 */
// Cache buster: v2.0-phase1-validation-update-4
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
            'react-native-reanimated/plugin',
        ],
    };
};
