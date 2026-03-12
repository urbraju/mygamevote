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
            { title: 'Mikasa V200W Ball', price: '$74.99', imageUrl: 'https://m.media-amazon.com/images/I/61UW9QbxA8L._AC_SX679_.jpg', shopUrl: 'https://www.amazon.com/MIKASA-V200W-FIVB-Official-Volleyball/dp/B07S5PH3H9/' },
            { title: 'ASICS Sky Elite FF 2', price: '$129.99', imageUrl: 'https://images.asics.com/is/image/asics/1051A064_001_SR_RT_GLB?$sf-pdp-main-image$', shopUrl: 'https://www.squashgear.com/products/asics-sky-elite-ff-2-mens-court-shoes-white-pure-gold' }
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
            { title: 'Adidas Predator Elite', price: '$249.99', imageUrl: 'https://assets.adidas.com/images/w_600,h_600,f_auto,q_auto,fl_lossy,c_fill,g_auto/be7b0633f22744debd2abe8de10dcf53_9366/predator-elite-firm-ground-soccer-cleats.jpg', shopUrl: 'https://www.adidas.com/us/predator-elite-firm-ground-soccer-cleats/JS0433.html' },
            { title: 'Nike Strike Soccer Ball', price: '$34.99', imageUrl: 'https://www.bestbuysoccer.com/cdn/shop/products/30307SC2140144.jpg?v=1683127330&width=1214', shopUrl: 'https://www.bestbuysoccer.com/products/nike-strike-white-blue' }
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
            { title: 'Selkirk Vanguard Paddle', price: '$249.99', imageUrl: 'https://www.selkirk.com/cdn/shop/files/selkirk-vanguard-power-air-pickleball-paddle-red-black.jpg?v=1732049333', shopUrl: 'https://www.selkirk.com/products/vanguard-power-air?variant=40134470107238' },
            { title: 'Franklin X-40 Balls (12pk)', price: '$32.99', imageUrl: 'https://m.media-amazon.com/images/I/61v3jWr-AlL._AC_SX679_.jpg', shopUrl: 'https://www.amazon.com/Franklin-Sports-X-40-Pickleballs-Approved/dp/B06XTW1BND/' }
        ],
        news: [
            { title: 'Major League Pickleball 2026 Expanded Schedule', source: 'MLP', url: 'https://www.majorleaguepickleball.net/', date: 'Feb 2026' },
            { title: 'Owl AI Partnership for Automatic Line Calling', source: 'Pickleball News', url: 'https://www.majorleaguepickleball.net/', date: 'Mar 2026' },
            { title: 'Anna Leigh Waters International Debut in Vietnam', source: 'Dink Pickleball', url: 'https://thedinkpickleball.com/', date: 'Mar 2026' },
            { title: 'Top 5 Paddle Tech Trends for 2026', source: 'Ping Pong Academy', url: 'https://usapickleball.org/', date: 'Mar 11, 2026' },
            { title: 'Indoor Pickleball Franchises Rapid Growth', source: 'Business Weekly', url: 'https://usapickleball.org/', date: 'Mar 12, 2026' }
        ]
    },
    yoga: {
        id: 'yoga',
        name: 'Yoga',
        description: 'A practice that focuses on breath, flexibility, and strength.',
        icon: 'human-handsup',
        howToPlay: {
            title: 'Foundations of Yoga',
            steps: [
                { title: 'Mountain Pose', description: 'Stand tall with feet together and arms at your sides.', icon: 'human-male' },
                { title: 'Cat-Cow', description: 'Archer your back and drop your belly on all fours.', icon: 'animal-variant' },
                { title: 'Downward Dog', description: 'Form an inverted V-shape to stretch your whole body.', icon: 'dog' },
                { title: 'Child\'s Pose', description: 'Kneel and fold forward for rest and recovery.', icon: 'human-child' }
            ]
        },
        rules: [
            { title: 'Yoga Alliance Standards', content: 'Explore the professional standards for yoga practice.', sourceUrl: 'https://yogaalliance.org/About_Yoga/Our_Standards' },
            { title: 'Beginners Guide', content: 'Step-by-step introduction to yoga for all levels.', sourceUrl: 'https://www.yogajournal.com/yoga-101/yoga-for-beginners/' }
        ],
        tutorials: [
            { title: 'Yoga For Beginners', videoId: 'https://www.youtube.com/watch?v=v7AYKMP6rOE', difficulty: 'Beginner', duration: '20:00' },
            { title: 'Sun Salutation Step-by-Step', videoId: 'https://www.youtube.com/watch?v=8qndvD_i3S8', difficulty: 'Beginner', duration: '12:45' },
            { title: 'Morning Yoga Flow', videoId: 'https://www.youtube.com/watch?v=4pKly2JojMw', difficulty: 'Intermediate', duration: '15:00' }
        ],
        events: [
            { title: 'International Day of Yoga 2026', date: 'June 21, 2026', location: 'Global' },
            { title: 'Yoga World Festival 2026', date: 'March 2026', location: 'India' }
        ],
        deals: [
            { title: 'Lululemon The Mat 5mm', price: '$124.00', imageUrl: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.lululemon.com/' },
            { title: 'Manduka Cork Yoga Block', price: '$22.00', imageUrl: 'https://images.unsplash.com/photo-1599447421416-3414502d18a5?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.manduka.com/' }
        ],
        news: [
            { title: 'Yoga Trends for 2026', source: 'Yoga Journal', url: 'https://www.yogajournal.com/news/', date: 'Feb 2026' },
            { title: 'Health Benefits of Daily Yoga', source: 'NYT Health', url: 'https://www.nytimes.com/topic/subject/yoga', date: 'Mar 2026' },
            { title: 'Yoga in the Workplace', source: 'The Guardian', url: 'https://www.theguardian.com/lifeandstyle/yoga', date: 'Mar 2026' }
        ]
    },
    camping: {
        id: 'camping',
        name: 'Camping',
        description: 'Overnight stays in the wilderness using tents or shelters.',
        icon: 'tent',
        howToPlay: {
            title: 'Camping Essentials',
            steps: [
                { title: 'Research & Plan', description: 'Check weather and campsite fire restrictions.', icon: 'map-search' },
                { title: 'Gear Prep', description: 'Test your tent and stove before leaving.', icon: 'toolbox' },
                { title: 'Tent Setup', description: 'Clear level ground and secure the rainfly.', icon: 'tent' },
                { title: 'Leave No Trace', description: 'Respect wildlife and dispose of waste properly.', icon: 'leaf' }
            ]
        },
        rules: [
            { title: 'NPS Safety Guidelines', content: 'Official safety and conduct rules for camping in National Parks.', sourceUrl: 'https://www.nps.gov/subjects/camping/staying-safe.htm' },
            { title: 'Campfire Safety', content: 'Essential rules for building and extinguishing fires.', sourceUrl: 'https://www.nps.gov/articles/campfire-safety.htm' }
        ],
        tutorials: [
            { title: 'Pitch a Tent for Beginners', videoId: 'https://www.youtube.com/watch?v=R9Z_wosM76Q', difficulty: 'Beginner', duration: '5:30' },
            { title: 'Essential Camp Cooking', videoId: 'https://www.youtube.com/watch?v=mD07R1914L0', difficulty: 'Beginner', duration: '12:00' },
            { title: 'Camping Gear Checklist', videoId: 'https://www.youtube.com/watch?v=G3zY_Y3sS68', difficulty: 'Intermediate', duration: '15:45' }
        ],
        events: [
            { title: 'National Park Week 2026', date: 'April 18-26, 2026', location: 'USA' },
            { title: 'Great American Campout', date: 'June 27, 2026', location: 'USA' }
        ],
        deals: [
            { title: 'Coleman Skydome 4P Tent', price: '$119.99', imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.coleman.com/' },
            { title: 'TETON Sports Sleeping Bag', price: '$69.99', imageUrl: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://tetonsports.com/' }
        ],
        news: [
            { title: 'New Campsite Booking Trends', source: 'Outside Online', url: 'https://www.outsideonline.com/category/adventure/camping/', date: 'Feb 2026' },
            { title: 'The Future of Sustainable Camping', source: 'National Geographic', url: 'https://www.nationalgeographic.com/adventure/topic/camping', date: 'Mar 2026' },
            { title: 'Sustainable Gear Innovation', source: 'The Manual', url: 'https://www.themanual.com/outdoors/', date: 'Mar 10, 2026' }
        ]
    },
    hiking: {
        id: 'hiking',
        name: 'Hiking',
        description: 'Vigorous walks on trails in the countryside or wilderness.',
        icon: 'hiking',
        howToPlay: {
            title: 'Hiking Fundamentals',
            steps: [
                { title: 'Select a Trail', description: 'Match the trail to your fitness level.', icon: 'map-marker' },
                { title: 'Pack Essentials', description: 'Carry water, food, and first aid.', icon: 'bag-personal' },
                { title: 'Proper Footwear', description: 'Wear boots with good ankle support.', icon: 'shoe-sneaker' },
                { title: 'Trail Etiquette', description: 'Yield to uphill hikers and horses.', icon: 'account-group' }
            ]
        },
        rules: [
            { title: 'Safety Resources', content: 'Preparation is key to a safe and enjoyable hike.', sourceUrl: 'https://americanhiking.org/hiking-resources/hiking-safety/' },
            { title: 'The Seven Principles', content: 'Essential leave-no-trace ethics for the outdoors.', sourceUrl: 'https://americanhiking.org/hiking-resources/leave-no-trace/' }
        ],
        tutorials: [
            { title: 'Pack a Hiking Backpack', videoId: 'https://www.youtube.com/watch?v=Fj2F5xN_WnE', difficulty: 'Beginner', duration: '9:15' },
            { title: 'Common Hiking Mistakes', videoId: 'https://www.youtube.com/watch?v=kYI9_iVv-yQ', difficulty: 'Beginner', duration: '11:30' },
            { title: 'Trail Navigation Basics', videoId: 'https://www.youtube.com/watch?v=XhYpUvF0T58', difficulty: 'Intermediate', duration: '8:45' }
        ],
        events: [
            { title: 'National Trails Day 2026', date: 'June 6, 2026', location: 'USA' },
            { title: 'Mammoth March: Trail Series', date: 'October 2026', location: 'USA' }
        ],
        deals: [
            { title: 'Salomon X Ultra 4 Boots', price: '$175.00', imageUrl: 'https://images.unsplash.com/photo-1542156822-6924d1a71aba?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.salomon.com/' },
            { title: 'Osprey Talon 22 Daypack', price: '$160.00', imageUrl: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.osprey.com/' }
        ],
        news: [
            { title: 'Restoring Historic Trails', source: 'AHS Trail News', url: 'https://americanhiking.org/trail-news/', date: 'Feb 2026' },
            { title: 'Ultralight Gear Revolution', source: 'Backpacker Mag', url: 'https://www.backpacker.com/news/', date: 'Mar 2026' },
            { title: 'Hiking for Mental Health', source: 'Outside Online', url: 'https://www.outsideonline.com/category/adventure/hiking/', date: 'Mar 12, 2026' }
        ]
    },
    cricket: {
        id: 'cricket',
        name: 'Cricket',
        description: 'A bat-and-ball game played between two teams of eleven players.',
        icon: 'cricket',
        howToPlay: {
            title: 'Master the Game',
            steps: [
                { title: 'Batting Stance', description: 'Feet shoulder-width apart, knees slightly bent.', icon: 'human-handsdown' },
                { title: 'Bowling Action', description: 'Grip along the seam and follow through.', icon: 'arm-flex' },
                { title: 'Fielding Technique', description: 'Cup hands together and watch the ball.', icon: 'hand-okay' },
                { title: 'Scoring Runs', description: 'Run between wickets after hitting the ball.', icon: 'run-fast' }
            ]
        },
        rules: [
            { title: 'ICC Conditions', content: 'Official playing conditions for international matches.', sourceUrl: 'https://www.icc-cricket.com/about/rules-and-regulations/playing-conditions' },
            { title: 'The Laws of Cricket', content: 'The fundamental laws of the game as defined by the MCC.', sourceUrl: 'https://www.lords.org/mcc/the-laws-of-cricket' }
        ],
        tutorials: [
            { title: 'Batting Masterclass', videoId: 'https://www.youtube.com/watch?v=F3S29-y9V1k', difficulty: 'Beginner', duration: '14:20' },
            { title: 'Fast Bowling Basics', videoId: 'https://www.youtube.com/watch?v=N66M7Xb_C54', difficulty: 'Intermediate', duration: '9:45' },
            { title: 'Beginner Fielding Drills', videoId: 'https://www.youtube.com/watch?v=3u_YV-k-GfI', difficulty: 'Beginner', duration: '11:15' }
        ],
        events: [
            { title: 'ICC Men\'s T20 World Cup', date: 'Feb-March 2026', location: 'India/Sri Lanka' },
            { title: 'Women\'s T20 World Cup', date: 'August 2026', location: 'England' }
        ],
        deals: [
            { title: 'Gray-Nicolls Vapour Bat', price: '$449.00', imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.gray-nicolls.com/' },
            { title: 'Kookaburra Ghost Pads', price: '$79.99', imageUrl: 'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.kookaburrasport.com/' }
        ],
        news: [
            { title: 'World Cup 2026 Groupings', source: 'Cricinfo', url: 'https://www.espncricinfo.com/', date: 'Feb 2026' },
            { title: 'Impact Player Rule Updates', source: 'Cricbuzz', url: 'https://www.cricbuzz.com/', date: 'Mar 2026' },
            { title: 'Rising Stars in U19 Circuit', source: 'ICC News', url: 'https://www.icc-cricket.com/news', date: 'Mar 12, 2026' }
        ]
    },
    tennis: {
        id: 'tennis',
        name: 'Tennis',
        description: 'A racket sport for individuals or teams of two.',
        icon: 'tennis',
        howToPlay: {
            title: 'Court Fundamentals',
            steps: [
                { title: 'The Serve', description: 'Strike at peak flight into the diagonal court.', icon: 'arrow-up-right' },
                { title: 'Forehand Power', description: 'Swing low to high with a firm wrist.', icon: 'arm-flex-outline' },
                { title: 'Ready Position', description: 'Weight on balls of feet, racket out front.', icon: 'human-expecting' },
                { title: 'Tennis Scoring', description: 'Understand 15, 30, 40 and Game sequence.', icon: 'numeric-15-box-outline' }
            ]
        },
        rules: [
            { title: 'ITF Rules of Tennis', content: 'Official international rules and regulations.', sourceUrl: 'https://www.itftennis.com/en/about-us/governance/rules-and-regulations/' },
            { title: 'USTA Guidelines', content: 'Comprehensive guide to rules and fair play.', sourceUrl: 'https://www.usta.com/en/home/improve/tips-and-instruction/national/tennis-rules-and-regulations-explained.html' }
        ],
        tutorials: [
            { title: 'Beginner Tennis Lesson', videoId: 'https://www.youtube.com/watch?v=kbmsyOGR6Cc', difficulty: 'Beginner', duration: '12:30' },
            { title: 'Serve like a Pro', videoId: 'https://www.youtube.com/watch?v=fS7mInoMvE0', difficulty: 'Intermediate', duration: '15:15' },
            { title: 'Forehand Technique', videoId: 'https://www.youtube.com/watch?v=A6qVv18wZyo', difficulty: 'Advanced', duration: '10:45' }
        ],
        events: [
            { title: 'Australian Open 2026', date: 'Jan 2026', location: 'Melbourne' },
            { title: 'Wimbledon 2026', date: 'June 2026', location: 'London' }
        ],
        deals: [
            { title: 'Wilson Pro Staff 97', price: '$279.00', imageUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a49704?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.wilson.com/' },
            { title: 'Penn Championship Balls', price: '$4.99', imageUrl: 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=400', shopUrl: 'https://www.pennracquet.com/' }
        ],
        news: [
            { title: 'Grand Slam Schedule 2026', source: 'ATP Tour', url: 'https://www.atptour.com/en/news', date: 'Jan 2026' },
            { title: 'WTA Next Gen Stars', source: 'WTA Tour', url: 'https://www.wtatennis.com/news', date: 'Feb 2026' },
            { title: 'The Evolution of Racket Tech', source: 'Tennis.com', url: 'https://www.tennis.com/news/', date: 'Mar 12, 2026' }
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
