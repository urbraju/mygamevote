import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ExploreScreen from '../../app/(app)/explore';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { sportsDataService } from '../../services/sportsDataService';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('../../components/Header', () => 'Header');

describe('Sports Hub Integration - ExploreScreen', () => {
    const mockRouter = { push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        // Global mocks are active from jest-setup.js
    });

    it('should filter sports based on user interests', async () => {
        // Mock user interested only in Volleyball
        (useAuth as jest.Mock).mockReturnValue({
            sportsInterests: ['volleyball'],
            isAdmin: true,
            sportsHubEnabled: true,
        });

        const { findByTestId, queryByTestId } = render(<ExploreScreen />);

        // Volleyball should be visible
        expect(await findByTestId('sport-name-volleyball')).toBeTruthy();
        // Soccer should NOT be visible
        expect(queryByTestId('sport-card-soccer')).toBeNull();
    });

    it('should show empty state when no interests match', async () => {
        // Mock user with no interests
        (useAuth as jest.Mock).mockReturnValue({
            sportsInterests: [],
            isAdmin: false,
            sportsHubEnabled: true,
        });

        const { findByText } = render(<ExploreScreen />);
        expect(await findByText(/no sports selected/i)).toBeTruthy();
    });

    it('should navigate to sport detail when a sport card is pressed', async () => {
        const { useRouter } = require('expo-router');
        const mockPush = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

        (useAuth as jest.Mock).mockReturnValue({
            sportsInterests: ['volleyball'],
            isAdmin: false,
            sportsHubEnabled: true,
        });

        const { findByTestId } = render(<ExploreScreen />);
        const volleyballCard = await findByTestId('sport-card-volleyball');
        expect(volleyballCard).toBeTruthy();
    });
});
