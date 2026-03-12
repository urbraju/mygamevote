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
                { title: 'The Spike', description: 'Powerfully hit the ball into the opponent court.', icon: 'flash' }
            ]
        },
        rules: [
            { title: 'Scoring', content: 'Games are played to 25 points, must win by 2.', sourceUrl: 'https://www.fivb.com' },
            { title: 'Rotation', content: 'Players must rotate clockwise when winning a serve.', sourceUrl: 'https://www.fivb.com' }
        ],
        tutorials: [
            { title: 'How to Pass (Bump) Correctly', videoId: 'Nn70RjC7O2E', difficulty: 'Beginner', duration: '5:42' },
            { title: 'Perfecting the Setting Technique', videoId: 'P6U62O9qmq4', difficulty: 'Intermediate', duration: '8:30' },
            { title: 'Advanced Spiking Drills', videoId: 'R3n0R_f0f2k', difficulty: 'Advanced', duration: '12:15' }
        ],
        events: [
            { title: 'VNL Finals', date: 'June 2026', location: 'USA' },
            { title: 'Volleyball World Championship', date: 'Sept 2026', location: 'Philippines' }
        ],
        deals: [
            { title: 'Mikasa V200W Ball', price: '$74.99', imageUrl: 'https://m.media-amazon.com/images/I/81LNoIuKzLL._AC_SL1500_.jpg', shopUrl: 'https://www.amazon.com/Mikasa-V200W-Official-Competition-Volleyball/dp/B07N8Z7X5M' },
            { title: 'ASICS Sky Elite FF 2', price: '$129.99', imageUrl: 'https://images.asics.com/is/image/asics/1051A064_001_p_primary?$zoom$', shopUrl: 'https://www.asics.com/us/en-us/sky-elite-ff-2/p/ANA_1051A064-001.html' }
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
            { title: 'Master the Knuckleball Kick', videoId: '0hK25W_n8wI', difficulty: 'Intermediate', duration: '10:05' },
            { title: 'Top 5 Soccer Dribbling Skills', videoId: 'jW0Tj_NqD-Y', difficulty: 'Beginner', duration: '7:45' }
        ],
        events: [
            { title: 'World Cup 2026', date: 'June 2026', location: 'NA' },
            { title: 'Champions League Final', date: 'May 2026', location: 'Munich' }
        ],
        deals: [
            { title: 'Adidas Predator Elite', price: '$249.99', imageUrl: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/71e4e6d4c06240d9959e4c1965ce2c82_9366/Predator_Elite_Firm_Ground_Cleats_Black_IE1802_01_standard.jpg', shopUrl: 'https://www.adidas.com/us/predator-elite-firm-ground-cleats/IE1802.html' },
            { title: 'Nike Strike Soccer Ball', price: '$34.99', imageUrl: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/a1c1d09e-7d1c-4b5a-9c1a-d09e7d1c4b5a/strike-soccer-ball-XvR7Lz.png', shopUrl: 'https://www.nike.com/t/strike-soccer-ball-XvR7Lz/CU8062-101' }
        ]
    },
    pickleball: {
        id: 'pickleball',
        name: 'Pickleball',
        description: 'A fun sport that combines elements of tennis, badminton and ping-pong.',
        icon: 'table-tennis',
        howToPlay: {
            title: 'Learn the Game',
            steps: [
                { title: 'The Serve', description: 'Must be underhand and hit the ball into the diagonal court.', icon: 'arrow-up-right' },
                { title: 'The Kitchen', description: 'Stay out of the non-volley zone unless the ball bounces.', icon: 'home-variant' },
                { title: 'The Dinking', description: 'Soft shots at the net to force an error.', icon: 'hand-okay' },
                { title: 'The Volley', description: 'Hit the ball before it bounces to keep pressure.', icon: 'flash' }
            ]
        },
        rules: [
            { title: 'Scoring', content: 'Points can only be won by the serving team, games to 11.', sourceUrl: 'https://usapickleball.org' },
            { title: 'Double Bounce', content: 'The ball must bounce once on each side after the serve.', sourceUrl: 'https://usapickleball.org' }
        ],
        tutorials: [
            { title: 'Pickleball 101: How to Play', videoId: 'fTvPYUX_I6Q', difficulty: 'Beginner', duration: '5:10' },
            { title: '3 Secrets for Better Pickleball', videoId: 'd_idGf_0nSw', difficulty: 'Intermediate', duration: '12:05' }
        ],
        events: [
            { title: 'PPA Tour Finals', date: 'Dec 2025', location: 'USA' },
            { title: 'USA Pickleball Nationals', date: 'Nov 2025', location: 'USA' }
        ],
        deals: [
            { title: 'Selkirk Vanguard Paddle', price: '$249.99', imageUrl: 'https://m.media-amazon.com/images/I/71YyM7ySzhL._AC_SL1500_.jpg', shopUrl: 'https://www.selkirk.com/products/vanguard-power-air-invikta' },
            { title: 'Franklin X-40 Balls', price: '$12.99', imageUrl: 'https://m.media-amazon.com/images/I/81Ipx7fQ7TL._AC_SL1500_.jpg', shopUrl: 'https://www.amazon.com/Franklin-Sports-Outdoor-Performance-Pickleballs/dp/B074P8Q6ZM' }
        ]
    }
};

export const sportsDataService = {
    async getSportKnowledge(sportId: string): Promise<SportKnowledge | null> {
        return SPORTS_KNOWLEDGE[sportId.toLowerCase()] || null;
    },
    async getAllSports(): Promise<SportKnowledge[]> {
        // Return curated data directly for speed and reliability
        return Object.values(SPORTS_KNOWLEDGE);
    },

    /**
     * Get global system configuration (Feature Toggles).
     */
    getSystemConfig: async (): Promise<{ multiTenancyEnabled: boolean; sportsHubEnabled: boolean }> => {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebaseConfig');
        const snap = await getDoc(doc(db, 'settings', 'system'));
        const data = snap.data();
        return {
            multiTenancyEnabled: data?.multiTenancyEnabled ?? true,
            sportsHubEnabled: data?.sportsHubEnabled ?? true
        };
    }
};
