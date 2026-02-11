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

    // Patch Reanimated components to have displayName for css-interop
    const Reanimated = require('react-native-reanimated');
    if (Reanimated.default) {
        if (Reanimated.default.View) Reanimated.default.View.displayName = 'Animated.View';
        if (Reanimated.default.Text) Reanimated.default.Text.displayName = 'Animated.Text';
        if (Reanimated.default.ScrollView) Reanimated.default.ScrollView.displayName = 'Animated.ScrollView';
        if (Reanimated.default.Image) Reanimated.default.Image.displayName = 'Animated.Image';
    }
} catch (e) {
    console.warn('Reanimated mock failed to load, skipping...');
}


// Mock other native modules if needed
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Firebase
jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(),
    getApp: jest.fn(),
    getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(() => ({
        currentUser: { uid: 'test-user', email: 'test@example.com' },
        onAuthStateChanged: jest.fn(),
    })),
    initializeAuth: jest.fn(),
    getReactNativePersistence: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    onSnapshot: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
    runTransaction: jest.fn(),
    serverTimestamp: jest.fn(),
    Timestamp: {
        now: jest.fn(() => 1234567890),
        fromDate: jest.fn(),
    },
}));

// Mock Expo modules that might cause issues
jest.mock('expo-font');
jest.mock('expo-asset');

// Mock Safe Area Context
const MockSafeAreaProvider = ({ children }) => children;
MockSafeAreaProvider.displayName = 'SafeAreaProvider';

const MockSafeAreaView = ({ children }) => children;
MockSafeAreaView.displayName = 'SafeAreaView';

const MockSafeAreaInsetsContext = {
    Consumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
};
MockSafeAreaInsetsContext.displayName = 'SafeAreaInsetsContext';

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: MockSafeAreaProvider,
    SafeAreaView: MockSafeAreaView,
    SafeAreaInsetsContext: MockSafeAreaInsetsContext,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
}));

