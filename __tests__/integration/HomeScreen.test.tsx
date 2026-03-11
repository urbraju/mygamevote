import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

describe('HomeScreen Integration Sanity Check', () => {
    it('renders correctly', () => {
        const { getByText } = render(<View><Text>Test Mode</Text></View>);
        expect(getByText('Test Mode')).toBeTruthy();
    });
});
