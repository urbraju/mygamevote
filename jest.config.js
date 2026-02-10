/**
 * Jest Configuration
 * 
 * Configures the test environment for React Native/Expo.
 * Specifies transform ignore patterns for native modules.
 */
module.exports = {
    preset: "ts-jest",
    reporters: [
        "default",
        ["jest-junit", { outputDirectory: "reports", outputName: "test-report.xml" }]
    ],
    transform: {
        "^.+\\.(js|jsx)$": "babel-jest",
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|pirates)"
    ],
    setupFiles: ['./jest-setup.js'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
};
