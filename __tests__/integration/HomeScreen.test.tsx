import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../app/(app)/home';
import { votingService } from '../../services/votingService';
import { useAuth } from '../../context/AuthContext';
import * as dateUtils from '../../utils/dateUtils';

// Mocks
jest.mock('../../services/votingService');
jest.mock('../../context/AuthContext');
jest.mock('../../utils/dateUtils');
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

// Mock VoteButton to bypass nativewind/reanimated issues during test
jest.mock('../../components/VoteButton', () => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    // @ts-ignore
    return ({ onVote }) => (
        <TouchableOpacity onPress={onVote} testID="vote-button">
            <Text>VOTE NOW</Text>
        </TouchableOpacity>
    );
});


describe('HomeScreen Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly and allows voting', async () => {
        // Mock Auth Hook
        (useAuth as jest.Mock).mockReturnValue({
            user: {
                uid: 'test-user-id',
                email: 'test@example.com',
            },
            admin: false,
        });

        // Mock Slots Data
        const mockSlotsData = {
            slots: [],
            isOpen: true,
            maxSlots: 14,
            maxWaitlist: 4,
            votingOpensAt: new Date('2023-10-10T19:00:00').getTime(), // Tuesday 7PM
        };

        // Mock subscribe implementation
        (votingService.subscribeToSlots as jest.Mock).mockImplementation((callback) => {
            callback(mockSlotsData);
            return () => { }; // unsubscribe
        });

        const { getByText, findByText, debug } = render(<HomeScreen />);
        debug();

        // Verify "Vote" button exists
        const voteButton = await findByText('VOTE NOW');
        expect(voteButton).toBeTruthy();

        // Simulate Vote
        fireEvent.press(voteButton);

        // Verify vote service called
        await waitFor(() => {
            expect(votingService.vote).toHaveBeenCalledWith('test-user-id', 'test@example.com');
        });
    });
});
