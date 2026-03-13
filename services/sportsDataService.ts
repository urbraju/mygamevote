import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebaseConfig';

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
    lastAutoRefresh?: { seconds: number; nanoseconds: number };
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
            { title: 'Volleyball Nations League (Women)', date: 'June 3, 2026', location: 'Global', trackUrl: 'https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/' },
            { title: 'Beach Pro Tour: Elite16 Tepic', date: 'April 2026', location: 'Mexico', trackUrl: 'https://en.volleyballworld.com/beachvolleyball/competitions/beach-pro-tour/2026/schedule/' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Volleyball_Nations_League_Logo.svg',
        deals: [
            { title: 'Rec League Volleyball Net Set', price: '$99.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/RL24VBSET_NOCOLOR_AL?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/rec-league-volleyball-net-set-21eqquvllybllstxxstg/21eqquvllybllstxxstg?sku=25300028' },
            { title: 'DSG Solana ProLite Volleyball', price: '$24.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/22QYFUDSGSLNPNKRRVLL_Pink_White_Blue?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/dsg-solana-prolite-volleyball-23dsguslnprltvllb/23dsguslnprltvllb' },
            { title: 'Mizuno T10 Plus Knee Pads', price: '$19.99', imageUrl: 'https://www.allvolleyball.com/cdn/shop/files/mizuno-t10-plus-kneepad-volleyball-equipment-knee-pads.jpg?v=1744059727', shopUrl: 'https://www.dickssportinggoods.com/p/mizuno-t10-plus-volleyball-knee-pads-16mizut10plsxxxxxvll/16mizut10plsxxxxxvll' }
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
            { title: 'Champions League Final', date: 'May 30, 2026', location: 'Budapest', trackUrl: 'https://www.uefa.com/uefachampionsleague/' },
            { title: 'FIFA World Cup 2026 (Opener)', date: 'June 11, 2026', location: 'Mexico City', trackUrl: 'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/2026_FIFA_World_Cup_emblem_%28without_trophy%29.svg',
        deals: [
            { title: 'adidas FIFA WC 2026 Training Ball', price: '$32.00', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/25ADIUSOCCWC26TRNNBFF_White_Royal_Blue_Blue?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/adidas-fifa-world-cup-2026-trionda-training-soccer-ball-25adiusoccwc26trnnbff/25adiusoccwc26trnnbff?sku=26967978' },
            { title: 'Lotto 6\' x 4\' Practice Youth Goal', price: '$55.00', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/24LOTULTT6X4NSTNTSCT_No_Color?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/lotto-6-x-4-practice-youth-soccer-goal-24lotultt6x4ythglsct/24lotultt6x4ythglsct?sku=25270958' },
            { title: 'Nike Mercurial Lite Shin Guards', price: '$26.00', imageUrl: 'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/e9d4135e-c85d-4f81-9b88-60d778d2b772/mercurial-lite-soccer-shin-guards-H6BD9S.png', shopUrl: 'https://www.dickssportinggoods.com/p/nike-mercurial-lite-soccer-shin-guards-22nikumrcltgrdwtbscs/22nikumrcltgrdwtbscs?sku=23248159' }
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
            { title: 'PPA Sacramento Open', date: 'April 13-19, 2026', location: 'Sacramento, CA', trackUrl: 'https://ppatour.com/schedule/' },
            { title: 'PPA Atlanta Championships', date: 'April 27-May 3, 2026', location: 'Atlanta, GA', trackUrl: 'https://ppatour.com/schedule/' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Pickleball_logo.svg',
        deals: [
            { title: 'JOOLA Tundra Pickleball Paddle Set', price: '$67.46', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/23JOOUTNDRPCKLBLLTNN_Blue_White?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/joola-tundra-pickleball-paddle-set-23jooutndrpcklblltnn/23jooutndrpcklblltnn?sku=24863162' },
            { title: 'Franklin Pickleball Jet Paddle Set', price: '$29.98', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/19FRAUJTPDDLNDBLLPCK_Black_Blue?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/franklin-pickleball-jet-paddle-and-ball-set-24fraujtstsmxxxxxtnn/24fraujtstsmxxxxxtnn?sku=25296513' },
            { title: 'Monarch Pickleball Paddle & Ball Set', price: '$24.98', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/16MO2UMNRCHPCKLBLPCKA_Lime_Green?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/monarch-pickleball-pack-16mo2umnrchpcklblpcka/16mo2umnrchpcklblpcka?sku=18728313' }
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
            { title: 'International Day of Yoga', date: 'June 21, 2026', location: 'Global', trackUrl: 'https://www.un.org/en/observances/yoga-day' },
            { title: 'Yoga World Festival 2026', date: 'March 12-15, 2026', location: 'India', trackUrl: 'https://www.un.org/en/observances/yoga-day' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Lotus.svg',
        deals: [
            { title: 'CALIA Foam Yoga Block', price: '$14.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/22JLOUFMYGBLCKXXXEAC_Pure_Black?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/calia-foam-yoga-block-22clawyfmygblckxxwms/22clawyfmygblckxxwms' },
            { title: 'Manduka X Yoga Mat', price: '$72.00', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/17MDKUMNDKXYGMTXXEAC_Black?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/manduka-x-yoga-mat-18manumndkxmtxxxxacc/18manumndkxmtxxxxacc' },
            { title: 'GoFit Yoga Starter Kit', price: '$32.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/19GOFUYGKTXXXXXXXEAC_No_Color?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/gofit-yoga-starter-set-16gofyygstrtrstxxacc/16gofyygstrtrstxxacc' }
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
            { title: 'National Park Week 2026', date: 'April 18-26, 2026', location: 'USA', trackUrl: 'https://www.nps.gov/subjects/npscelebrates/national-park-week.htm' },
            { title: 'Great American Campout', date: 'June 27, 2026', location: 'USA', trackUrl: 'https://www.nps.gov/subjects/npscelebrates/national-park-week.htm' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/2/25/SymbolCamping.svg',
        deals: [
            { title: 'Coleman Cascade Camping Stove', price: '$129.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/22COLUCSCDCLSSCSTCAC_No_Color?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/coleman-cascade-classic-camping-stove-22colucsccclssccsstv/22colucsccclssccsstv' },
            { title: 'Coleman Montana 8-Person Tent', price: '$119.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/25COLUCAMPMNTN8PRSDJS_Green?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/coleman-montana-8-person-tent-with-hinged-door-22columntn8prsnflctp/22columntn8prsnflctp' },
            { title: 'Coleman Trailhead II Camp Cot', price: '$66.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/25COLUCAMPTRLHDCOTT_No_Color?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/coleman-trailhead-ii-camp-cot-15colutrlhdiicmpxxxod/15colutrlhdiicmpxxxod' }
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
            { title: 'National Trails Day 2026', date: 'June 6, 2026', location: 'USA', trackUrl: 'https://americanhiking.org/national-trails-day/' },
            { title: 'Mammoth March Series', date: 'May-July 2026', location: 'USA', trackUrl: 'https://americanhiking.org/national-trails-day/' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/HIKING.SVG',
        deals: [
            { title: 'Merrell Moab 3 WP Hiking Boots', price: '$149.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/22MRRMML3MIDWPRTFMNS_Walnut?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/merrell-mens-moab-3-mid-waterproof-hiking-boots-22mermmb3mdwpxxxxbrn/22mermmb3mdwpxxxxbrn' },
            { title: 'Merrell Speed Strike 2 Boots', price: '$109.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/24MRRMSPDSTRKMIDWMNS_Charcoal?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/merrell-mens-speed-strike-2-mid-leather-waterproof-hiking-boots-24mermspdstrk2mdlwp/24mermspdstrk2mdlwp' },
            { title: 'Merrell Moab 3 Hiking Shoes', price: '$139.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/22MRRMMB3WLNTXXXXFBO_Walnut?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/merrell-mens-moab-3-hiking-shoes-22mermmb3xxxxxbrn/22mermmb3xxxxxbrn' }
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
            { title: 'IPL 2026: Season Opener', date: 'March 28, 2026', location: 'India', trackUrl: 'https://www.iplt20.com/' },
            { title: 'IPL 2026: Grand Final', date: 'May 31, 2026', location: 'India', trackUrl: 'https://www.iplt20.com/' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Cricket_bat.svg',
        deals: [
            { title: 'NERF Foam Cricket Set', price: '$34.99', imageUrl: 'https://i5.walmartimages.com/asr/2c03531b-d9d1-419b-a328-98f9804e8d0e.03554471f4528206d2d3855523197603.jpeg', shopUrl: 'https://www.academy.com/p/nerf-cricket-set' },
            { title: 'EastPoint Deluxe Cricket Set', price: '$44.99', imageUrl: 'https://m.media-amazon.com/images/I/71Xm+9R6YML._AC_SL1500_.jpg', shopUrl: 'https://www.academy.com/p/eastpoint-sports-deluxe-cricket-set' },
            { title: 'Stiga Cricket Play Set', price: '$24.99', imageUrl: 'https://www.toysrus.com.au/media/catalog/product/S/T/ST633008_1.jpg', shopUrl: 'https://www.academy.com/p/stiga-cricket-set' }
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
            { title: 'Mutua Madrid Open', date: 'April 22-May 3', location: 'Madrid', trackUrl: 'https://www.mutuamadridopen.com/' },
            { title: 'Roland-Garros (French Open)', date: 'May 24-June 7', location: 'Paris', trackUrl: 'https://www.rolandgarros.com/' }
        ],
        heroImage: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Wikipedia-Tennis-logo-v3-raquet.svg',
        deals: [
            { title: 'Wilson Intrigue SE Tennis Racquet', price: '$99.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/24WILANTRGS2024XXTNN_Pink?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/wilson-intrigue-se-tennis-racquet-21wiluntrygsxxxxxxtnn/21wiluntrygsxxxxxxtnn' },
            { title: 'Tourna Fill-n-Drill Trainer', price: '$25.99', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/16touufllndrlltnntnn_No_Color?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/tourna-fill-n-drill-tennis-trainer-16truufllndrlltnnxxxx/16truufllndrlltnnxxxx' },
            { title: 'Penn Championship Tennis Balls', price: '$4.49', imageUrl: 'https://dks.scene7.com/is/image/GolfGalaxy/16penupnnchmpnshptnnx_No_Color?qlt=70&wid=780&hei=780&fmt=pjpeg&op_sharpen=1&fit=constrain', shopUrl: 'https://www.dickssportinggoods.com/p/penn-championship-extra-duty-tennis-balls-15pnuuchmpnshxxxxxtn/15pnuuchmpnshxxxxxtn' }
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
        try {
            const normalizedId = sportId.toLowerCase();
            // Try Firestore first
            const docRef = doc(db, 'sports_catalog', normalizedId);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                console.log(`[SportHub] Fetched ${normalizedId} from Firestore`);
                return snap.data() as SportKnowledge;
            }

            // Fallback to local data
            console.log(`[SportHub] Fallback to local data for ${normalizedId}`);
            return SPORTS_KNOWLEDGE[normalizedId] || null;
        } catch (error) {
            console.error(`[SportHub] Error fetching sport detail:`, error);
            return SPORTS_KNOWLEDGE[sportId.toLowerCase()] || null;
        }
    },

    async getAllSports(): Promise<SportKnowledge[]> {
        try {
            const querySnapshot = await getDocs(collection(db, 'sports_catalog'));
            if (!querySnapshot.empty) {
                console.log(`[SportHub] Fetched all sports from Firestore`);
                return querySnapshot.docs.map(doc => doc.data() as SportKnowledge);
            }
            return Object.values(SPORTS_KNOWLEDGE);
        } catch (error) {
            console.error(`[SportHub] Error fetching all sports:`, error);
            return Object.values(SPORTS_KNOWLEDGE);
        }
    },

    /**
     * Seed local data to Firestore. 
     * This is the first step for the Intelligence Engine.
     */
    async seedSportsData(): Promise<{ success: boolean; count: number }> {
        try {
            let count = 0;
            for (const [id, data] of Object.entries(SPORTS_KNOWLEDGE)) {
                await setDoc(doc(db, 'sports_catalog', id), data);
                count++;
            }
            console.log(`[SportHub] Seeded ${count} sports to Firestore`);
            return { success: true, count };
        } catch (error) {
            console.error(`[SportHub] Seeding failed:`, error);
            return { success: false, count: 0 };
        }
    },

    /**
     * Get global system configuration (Feature Toggles).
     */
    getSystemConfig: async (): Promise<{ multiTenancyEnabled: boolean; sportsHubEnabled: boolean }> => {
        const snap = await getDoc(doc(db, 'settings', 'system'));
        const data = snap.data();
        return {
            multiTenancyEnabled: data?.multiTenancyEnabled ?? true,
            sportsHubEnabled: data?.sportsHubEnabled ?? true
        };
    },

    /**
     * Trigger an on-demand refresh of the Sports Hub data.
     * Uses Cloud Functions to fetch latest from Serper and NewsAPI.
     */
    async refreshSportsHub(): Promise<{ success: boolean; count: number }> {
        try {
            const refreshFn = httpsCallable(functions, 'refreshSportsHubOnDemand');
            const result = await refreshFn();
            return result.data as { success: boolean; count: number };
        } catch (error) {
            console.error(`[SportHub] Refresh failed:`, error);
            return { success: false, count: 0 };
        }
    }
};
