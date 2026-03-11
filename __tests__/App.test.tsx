import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('App', () => {
    it('renders text correctly', () => {
        render(<Text>Hello World</Text>);
        expect(screen.getByText('Hello World')).toBeTruthy();
    });
});

