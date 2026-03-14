import React from 'react';
import { render } from '@testing-library/react-native';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { useSegments, useRouter } from 'expo-router';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
    useSegments: jest.fn(),
    Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../components/OrgSwitcher', () => 'OrgSwitcher');
jest.mock('../../services/authService', () => ({
    authService: {
        logout: jest.fn(),
    }
}));
jest.mock('../../firebaseConfig', () => ({
    auth: {},
    db: {},
}));
jest.mock('@expo/vector-icons', () => ({
    MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

describe('Navigation Integration - Header', () => {
    const mockRouter = { push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    it('should show EXPLORE button when on home screen', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'user@example.com' },
            isAdmin: false,
            sportsHubEnabled: true,
            activeOrgId: 'default'
        });
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'home']);

        const { getByText } = render(<Header />);

        expect(getByText('EXPLORE')).toBeTruthy();
    });

    it('should show VOTING button when in the sports hub (explore area)', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'user@example.com' },
            isAdmin: false,
            sportsHubEnabled: true,
            activeOrgId: 'default'
        });
        // Mock being on the explore screen
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'explore']);

        const { getByText } = render(<Header />);

        expect(getByText('VOTING')).toBeTruthy();
    });

    it('should show VOTING button when viewing sport detail', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'user@example.com' },
            isAdmin: false,
            sportsHubEnabled: true,
            activeOrgId: 'default'
        });
        // Mock being in sport-info route
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'sports-info', 'volleyball']);

        const { getByText } = render(<Header />);

        expect(getByText('VOTING')).toBeTruthy();
    });

    it('should show GLOBAL button for superadmin', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'support@mygamevote.com' },
            isAdmin: true,
            isOrgAdmin: false,
            activeOrgId: 'default',
            sportsHubEnabled: true
        });
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'home']);

        const { getByText } = render(<Header />);

        expect(getByText('GLOBAL')).toBeTruthy();
    });

    it('should show ADMIN button for regular org admin', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'orgadmin@example.com' },
            isAdmin: false,
            isOrgAdmin: true,
            activeOrgId: 'org123',
            sportsHubEnabled: true
        });
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'home']);

        const { getByText } = render(<Header />);

        expect(getByText('ADMIN')).toBeTruthy();
    });

    it('should hide EXPLORE button if organization has disabled it', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'user@example.com' },
            isAdmin: false,
            sportsHubEnabled: false, // Combined result (Global && Org)
            activeOrgId: 'org123'
        });
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'home']);

        const { queryByText } = render(<Header />);

        expect(queryByText('EXPLORE')).toBeNull();
    });

    it('should show EXPLORE button if both global and org enable it', () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { email: 'user@example.com' },
            isAdmin: false,
            sportsHubEnabled: true,
            activeOrgId: 'org123'
        });
        (useSegments as jest.Mock).mockReturnValue(['(app)', 'home']);

        const { getByText } = render(<Header />);

        expect(getByText('EXPLORE')).toBeTruthy();
    });
});
