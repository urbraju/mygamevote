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
    events: { title: string; date: string; location: string; trackUrl?: string }[];
    deals: { title: string; price: string; imageUrl: string; shopUrl: string }[];
    news: { title: string; source: string; url: string; date: string }[];
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
            { title: 'FIVB Official Rules', content: 'Explore the complete 2024-2028 official rules of indoor volleyball.', sourceUrl: 'https://www.fivb.com/en/volleyball/thegame_glossary/officialrulesofthegames' },
            { title: 'Scoring System', content: 'Rally scoring to 25 points, win by 2. Best of 5 sets.', sourceUrl: 'https://en.wikipedia.org/wiki/Volleyball' }
        ],
        tutorials: [
            { title: 'Passing Fundamentals (Bump)', videoId: 'https://www.youtube.com/watch?v=gOgfoEGUDCA', difficulty: 'Beginner', duration: '8:45' },
            { title: 'How to Set Correcty', videoId: 'https://www.youtube.com/watch?v=lEkr3qgIDlI', difficulty: 'Intermediate', duration: '10:15' },
            { title: 'Spiking Arm Swing Tech', videoId: 'https://www.youtube.com/watch?v=u-WhjYYocBs', difficulty: 'Advanced', duration: '12:30' }
        ],
        events: [
            { title: 'Volleyball Nations League (VNL) 2026', date: 'June 2026', location: 'Canada', trackUrl: 'https://en.volleyballworld.com/volleyball/competitions/vnl-2024/' },
            { title: 'FIVB Girls\' U17 World Championship', date: 'Aug 2026', location: 'Chile', trackUrl: 'https://www.fivb.com/' }
        ],
        deals: [
            { title: 'Mikasa V200W Ball', price: '$74.99', imageUrl: 'https://images.unsplash.com/photo-1592656670411-29111f74474c?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.amazon.com/Mikasa-V200W-Official-Competition-Volleyball/dp/B07N8Z7X5M' },
            { title: 'ASICS Sky Elite FF 2', price: '$129.99', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.asics.com/us/en-us/sky-elite-ff-2/p/ANA_1051A064-001.html' }
        ],
        news: [
            { title: 'VNL 2026 Host Cities and Pools Announced', source: 'Volleyball World', url: 'https://en.volleyballworld.com/', date: 'Jan 2026' },
            { title: 'Belgium and Ukraine set for VNL Debut in 2026', source: 'FIVB', url: 'https://www.fivb.com/', date: 'Feb 2026' },
            { title: 'Germany appoints Botti as new Head Coach', source: 'Volleyball Mag', url: 'https://volleyballmag.com/', date: 'Mar 2026' },
            { title: 'Osaka to host double gender VNL events', source: 'Volleyball World', url: 'https://en.volleyballworld.com/', date: 'Mar 2026' },
            { title: 'Penn State vs Pepperdine: Match Highlights', source: 'NCAA', url: 'https://www.ncaa.com/sports/volleyball-men', date: 'Mar 12, 2026' }
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
            { title: 'IFAB Laws of the Game', content: 'The official laws of association football updated for 2025.', sourceUrl: 'https://www.theifab.com/en/laws-of-the-game/' },
            { title: 'The Offside Rule', content: 'Detailed explanation of the most debated rule in soccer.', sourceUrl: 'https://www.fifa.com/' }
        ],
        tutorials: [
            { title: 'How to Dribble Perfectly', videoId: 'https://www.youtube.com/watch?v=bb6jlHgj7tc', difficulty: 'Beginner', duration: '6:20' },
            { title: 'Soccer Passing Technique', videoId: 'https://www.youtube.com/watch?v=yOXrf0TIphg', difficulty: 'Intermediate', duration: '7:45' },
            { title: 'Shoot with Power & Accuracy', videoId: 'https://www.youtube.com/watch?v=BrzfmkGtnYE', difficulty: 'Advanced', duration: '9:15' }
        ],
        events: [
            { title: 'FIFA World Cup 2026', date: 'June 2026', location: 'USA/CAN/MEX', trackUrl: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canamex2026' },
            { title: 'Champions League Final', date: 'May 2026', location: 'Munich', trackUrl: 'https://www.uefa.com/uefachampionsleague/' }
        ],
        deals: [
            { title: 'Adidas Predator Elite', price: '$249.99', imageUrl: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.adidas.com/us/predator-elite-firm-ground-cleats/IE1802.html' },
            { title: 'Nike Strike Soccer Ball', price: '$34.99', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.nike.com/t/strike-soccer-ball-XvR7Lz/CU8062-101' }
        ],
        news: [
            { title: 'Jan 2026 Transfer Window Summaries', source: 'ESPN Soccer', url: 'https://www.espn.com/soccer/', date: 'Jan 2026' },
            { title: 'FIFA World Cup 2026: Qualification Path', source: 'FIFA', url: 'https://www.fifa.com/', date: 'Feb 2026' },
            { title: 'FA Cup Quarter-Final Draw Results', source: 'The FA', url: 'https://www.thefa.com/', date: 'Mar 2026' },
            { title: 'Premier League Title Race Heating Up', source: 'BBC Sport', url: 'https://www.bbc.com/sport/football', date: 'Mar 12, 2026' },
            { title: 'NWSL 2026 Expansion Teams Named', source: 'NWSL', url: 'https://www.nwslsoccer.com/', date: 'Mar 10, 2026' }
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
            { title: 'USA Pickleball Rulebook', content: 'Official playing rules for the fastest growing sport.', sourceUrl: 'https://usapickleball.org/docs/ifp/Pickleball-Rulebook.pdf' },
            { title: 'The Non-Volley Zone (Kitchen)', content: 'Understanding the unique kitchen rules in detail.', sourceUrl: 'https://usapickleball.org/' }
        ],
        tutorials: [
            { title: 'Improve as a Beginner', videoId: 'https://www.youtube.com/watch?v=28gfmQEzOxI', difficulty: 'Beginner', duration: '11:40' },
            { title: 'Kitchen Rules Explained', videoId: 'https://www.youtube.com/watch?v=5sKMsK2C-fY', difficulty: 'Beginner', duration: '9:55' },
            { title: 'Dinking Strategy Masterclass', videoId: 'https://www.youtube.com/watch?v=EEtlyoDuEmk', difficulty: 'Advanced', duration: '14:20' }
        ],
        events: [
            { title: 'MLP 2026 Season Opener', date: 'Jan 2026', location: 'USA', trackUrl: 'https://www.majorleaguepickleball.net/' },
            { title: 'USA Pickleball Nationals 2026', date: 'Nov 2026', location: 'USA', trackUrl: 'https://usapickleball.org/' }
        ],
        deals: [
            { title: 'Selkirk Vanguard Paddle', price: '$249.99', imageUrl: 'https://images.unsplash.com/photo-1626225967045-9c76db7b6ec4?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.selkirk.com/products/vanguard-power-air-invikta' },
            { title: 'Franklin X-40 Balls (12pk)', price: '$32.99', imageUrl: 'https://images.unsplash.com/photo-1611095773767-114b53ef9121?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.amazon.com/Franklin-Sports-Outdoor-Performance-Pickleballs/dp/B074P8Q6ZM' }
        ],
        news: [
            { title: 'Major League Pickleball 2026 Expanded Schedule', source: 'MLP', url: 'https://www.majorleaguepickleball.net/', date: 'Feb 2026' },
            { title: 'Owl AI Partnership for Automatic Line Calling', source: 'Pickleball News', url: 'https://www.majorleaguepickleball.net/', date: 'Mar 2026' },
            { title: 'Anna Leigh Waters International Debut in Vietnam', source: 'Dink Pickleball', url: 'https://thedinkpickleball.com/', date: 'Mar 2026' },
            { title: 'Top 5 Paddle Tech Trends for 2026', source: 'Ping Pong Academy', url: 'https://usapickleball.org/', date: 'Mar 11, 2026' },
            { title: 'Indoor Pickleball Franchises Rapid Growth', source: 'Business Weekly', url: 'https://usapickleball.org/', date: 'Mar 12, 2026' }
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
