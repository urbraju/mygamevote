module.exports = {
    default: {
        createAnimatedComponent: (component) => component,
        timing: () => ({ start: () => { } }),
        spring: () => ({ start: () => { } }),
        Value: function () { return { setValue: () => { } }; },
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn(),
    withSpring: jest.fn(),
    withTiming: jest.fn(),
    extend: jest.fn(),
};
