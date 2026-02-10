/**
 * Jest Setup
 * 
 * Global setup for Jest tests.
 * - Mocks native modules (Reanimated, Expo Font, etc.) that are not available in the test environment.
 * - Runs before each test file.
 */
// Mock Reanimated
try {
    require('react-native-reanimated/lib/reanimated2/jestUtils').setUpTests();
    global.ReanimatedDataMock = {
        now: () => 0,
    };
} catch (e) {
    console.warn('Reanimated mock failed to load, skipping...');
}

// Mock other native modules if needed
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Expo modules that might cause issues
jest.mock('expo-font');
jest.mock('expo-asset');
