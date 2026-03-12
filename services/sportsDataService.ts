/**
 * Sports Data Service
 * 
 * Provides curated content for the Sports Knowledge Hub.
 * This includes rules, guides, tutorial videos, and gear deals.
 */

export interface SportKnowledge {
    id: string;
    name: string;
    description: string;
    icon: string;
    heroImage?: string;
    howToPlay: {
        title: string;
        steps: { title: string; description: string; icon: string }[];
    };
    rules: { title: string; content: string; sourceUrl: string }[];
    tutorials: { title: string; videoId: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; duration: string }[];
    events: { title: string; date: string; location: string }[];
    deals: { title: string; price: string; imageUrl: string; shopUrl: string }[];
}

const SPORTS_KNOWLEDGE: Record<string, SportKnowledge> = {
    volleyball: {
        id: 'volleyball',
        name: 'Volleyball',
        description: 'A fast-paced team sport played on a court divided by a net.',
        icon: 'volleyball',
        howToPlay: {
            title: 'Master the Basics',
            steps: [
                { title: 'The Serve', description: 'Begin the rally by hitting the ball over the net.', icon: 'arrow-up-bold' },
                { title: 'The Pass', description: 'Use your forearms to control the ball (Bump).', icon: 'hand-back-right' },
                { title: 'The Set', description: 'Position the ball perfectly for an attack.', icon: 'hands-pray' },
                { title: 'The Spile', description: 'Powerfully hit the ball into the opponent court.', icon: 'flash' }
            ]
        },
        rules: [
            { title: 'Scoring', content: 'Games are played to 25 points, must win by 2.', sourceUrl: 'https://www.fivb.com' },
            { title: 'Rotation', content: 'Players must rotate clockwise when winning a serve.', sourceUrl: 'https://www.fivb.com' }
        ],
        tutorials: [
            { title: 'How to Serve (Underhand)', videoId: 'dQw4w9WgXcQ', difficulty: 'Beginner', duration: '4:20' },
            { title: 'Advanced Blocking Techniques', videoId: 'dQw4w9WgXcQ', difficulty: 'Advanced', duration: '8:15' }
        ],
        events: [
            { title: 'VNL Finals', date: 'June 2026', location: 'USA' },
            { title: 'Volleyball World Championship', date: 'Sept 2026', location: 'Philippines' }
        ],
        deals: [
            { title: 'Mikasa V200W Ball', price: '$59.99', imageUrl: 'https://example.com/ball.png', shopUrl: 'https://amazon.com' },
            { title: 'ASICS Sky Elite FF 2', price: '$129.99', imageUrl: 'https://example.com/shoes.png', shopUrl: 'https://amazon.com' }
        ]
    },
    soccer: {
        id: 'soccer',
        name: 'Soccer',
        description: 'The world\'s most popular sport played with a spherical ball.',
        icon: 'soccer',
        howToPlay: {
            title: 'Essential Skills',
            steps: [
                { title: 'Dribbling', description: 'Control the ball at your feet while moving.', icon: 'run' },
                { title: 'Passing', description: 'Accurately transfer the ball to teammates.', icon: 'arrow-right-bold' },
                { title: 'Shooting', description: 'Kick the ball into the net to score.', icon: 'goal' }
            ]
        },
        rules: [
            { title: 'Offside', content: 'A player is offside if closer to the goal than the last defender.', sourceUrl: 'https://www.fifa.com' },
            { title: 'Fouls', content: 'Incorrect physical contact results in a free kick or penalty.', sourceUrl: 'https://www.fifa.com' }
        ],
        tutorials: [
            { title: 'Basic Dribbling Drills', videoId: 'dQw4w9WgXcQ', difficulty: 'Beginner', duration: '5:30' },
            { title: 'Perfecting the Free Kick', videoId: 'dQw4w9WgXcQ', difficulty: 'Intermediate', duration: '10:00' }
        ],
        events: [
            { title: 'World Cup 2026', date: 'June 2026', location: 'NA' },
            { title: 'Champions League Final', date: 'May 2026', location: 'Munich' }
        ],
        deals: [
            { title: 'Adidas Predator Elite', price: '$249.99', imageUrl: 'https://example.com/cleats.png', shopUrl: 'https://adidas.com' },
            { title: 'Nike Strike Pro Ball', price: '$34.99', imageUrl: 'https://example.com/soccerball.png', shopUrl: 'https://nike.com' }
        ]
    }
};

export const sportsDataService = {
    async getSportKnowledge(sportId: string): Promise<SportKnowledge | null> {
        return SPORTS_KNOWLEDGE[sportId.toLowerCase()] || null;
    },
    async getAllSports(): Promise<SportKnowledge[]> {
        return Object.values(SPORTS_KNOWLEDGE);
    }
};
