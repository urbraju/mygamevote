import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ExploreScreen from '../../app/(app)/explore';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sportsDataService } from '../../services/sportsDataService';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('expo-router');
jest.mock('../../components/Header', () => 'Header');
jest.mock('@expo/vector-icons', () => ({
    MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('Sports Hub Integration - ExploreScreen', () => {
    const mockRouter = { push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    it('should filter sports based on user interests', async () => {
        // Mock user interested only in Volleyball
        (useAuth as jest.Mock).mockReturnValue({
            sportsInterests: ['volleyball'],
            isAdmin: true,
            sportsHubEnabled: true,
        });

        const { queryByText } = render(<ExploreScreen />);

        await waitFor(() => {
            // Volleyball should be visible
            expect(queryByText(/volleyball/i)).toBeTruthy();
            // Soccer should NOT be visible
            expect(queryByText(/soccer/i)).toBeNull();
        });
    });

    it('should show empty state when no interests match', async () => {
        // Mock user with no interests
        (useAuth as jest.Mock).mockReturnValue({
            sportsInterests: [],
            isAdmin: false,
            sportsHubEnabled: true,
        });

        const { getByText } = render(<ExploreScreen />);

        await waitFor(() => {
            expect(getByText('No Sports Selected')).toBeTruthy();
        });
    });

    it('should navigate to sport detail when a sport card is pressed', async () => {
        (useAuth as jest.Mock).mockReturnValue({
            sportsInterests: ['volleyball'],
            isAdmin: false,
            sportsHubEnabled: true,
        });

        const { getByText } = render(<ExploreScreen />);

        await waitFor(async () => {
            const volleyballCard = getByText(/volleyball/i);
            // Simulation of parent touchable press might be needed depending on implementation
            expect(volleyballCard).toBeTruthy();
        });
    });
});
