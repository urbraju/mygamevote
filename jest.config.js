/**
 * Jest Configuration
 * 
 * Configures the test environment for React Native/Expo.
 * Specifies transform ignore patterns for native modules.
 */
module.exports = {
    preset: "jest-expo",
    reporters: [
        "default",
        ["jest-junit", { outputDirectory: "reports", outputName: "test-report.xml" }]
    ],
    testPathIgnorePatterns: [
        "/node_modules/",
        "/tests/e2e/"
    ],
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase|react-native-reanimated|react-native-safe-area-context|nativewind|react-native-css-interop)"
    ],
    transform: {
        "^.+\\.[jt]sx?$": "babel-jest"
    },
    moduleNameMapper: {
        'react-native-reanimated': '<rootDir>/__mocks__/react-native-reanimated.js',
        '@expo/vector-icons': '<rootDir>/__mocks__/expo-vector-icons.js',
    },
    setupFiles: ['./jest-setup.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
