import urllib.request, urllib.error, urllib.parse, json, base64, time, os, subprocess

SA_PATH = '/Users/budapudi/Documents/Dev/GameSlot/serviceAccountKey.json'
PROJECT_ID = 'mygameslot-324a5'

with open(SA_PATH) as f:
    sa = json.load(f)

def b64url(data):
    if not isinstance(data, bytes): data = data.encode()
    return base64.urlsafe_b64encode(data).decode().rstrip('=')

now = int(time.time())
header = b64url(json.dumps({'alg':'RS256','typ':'JWT'}))
payload = b64url(json.dumps({
    'iss': sa['client_email'],
    'scope': 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
    'aud': 'https://oauth2.googleapis.com/token',
    'exp': now + 3600,
    'iat': now
}))
msg = f'{header}.{payload}'

with open('/tmp/k.pem','w') as f: f.write(sa['private_key'])
with open('/tmp/m.txt','w') as f: f.write(msg)
subprocess.run(['openssl','dgst','-sha256','-sign','/tmp/k.pem','-out','/tmp/s.bin','/tmp/m.txt'],check=True)
with open('/tmp/s.bin','rb') as f: sig = f.read()
os.remove('/tmp/k.pem'); os.remove('/tmp/m.txt'); os.remove('/tmp/s.bin')
jwt = f'{msg}.{b64url(sig)}'

r = urllib.request.Request('https://oauth2.googleapis.com/token',data=urllib.parse.urlencode({'grant_type':'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion':jwt}).encode(),headers={'Content-Type':'application/x-www-form-urlencoded'})
with urllib.request.urlopen(r) as resp:
    token = json.loads(resp.read())['access_token']

def convert_val(v):
    if v is None: return {'nullValue': None}
    if isinstance(v, str): return {'stringValue': v}
    if isinstance(v, bool): return {'booleanValue': v}
    if isinstance(v, (int, float)): return {'doubleValue': v}
    if isinstance(v, list):
        return {'arrayValue': {'values': [convert_val(i) for i in v]}}
    if isinstance(v, dict):
        return {'mapValue': {'fields': {ik: convert_val(iv) for ik, iv in v.items()}}}
    return {'nullValue': None}

def set_doc(doc_id, data):
    fields = {k: convert_val(v) for k, v in data.items()}
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/sports_catalog/{doc_id}'
    req = urllib.request.Request(url, data=json.dumps({'fields': fields}).encode(), headers={'Authorization':f'Bearer {token}','Content-Type':'application/json'}, method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            print(f'✅ Restored: {doc_id}')
    except urllib.error.HTTPError as e:
        print(f'❌ Failed {doc_id}: {e.read().decode()}')

SPORTS_DATA = {
    "volleyball": {
        "id": "volleyball",
        "name": "Volleyball",
        "description": "A fast-paced team sport played on a court divided by a net.",
        "icon": "volleyball",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Volleyball_Nations_League_Logo.svg",
        "howToPlay": {
            "title": "Master the Basics",
            "steps": [
                {"title": "The Serve", "description": "Begin the rally by hitting the ball over the net.", "icon": "arrow-up-bold"},
                {"title": "The Pass", "description": "Use your forearms to control the ball (Bump).", "icon": "hand-back-right"},
                {"title": "The Set", "description": "Position the ball perfectly for an attack.", "icon": "hands-pray"},
                {"title": "The Spike", "description": "Powerfully hit the ball into the opponent court.", "icon": "flash"}
            ]
        },
        "rules": [
            {"title": "FIVB Official Rules", "content": "Explore the complete 2024-2028 official rules of indoor volleyball.", "sourceUrl": "https://www.fivb.com/en/volleyball/thegame_glossary/officialrulesofthegames"},
            {"title": "Scoring System", "content": "Rally scoring to 25 points, win by 2. Best of 5 sets.", "sourceUrl": "https://en.wikipedia.org/wiki/Volleyball"}
        ],
        "tutorials": [
            {"title": "Passing Fundamentals (Bump)", "videoId": "gOgfoEGUDCA", "difficulty": "Beginner", "duration": "8:45"},
            {"title": "How to Set Correctly", "videoId": "lEkr3qgIDlI", "difficulty": "Intermediate", "duration": "10:15"},
            {"title": "Spiking Arm Swing Tech", "videoId": "u-WhjYYocBs", "difficulty": "Advanced", "duration": "12:30"}
        ],
        "events": [
            {"title": "Volleyball Nations League (Women)", "date": "June 3, 2026", "location": "Global", "trackUrl": "https://en.volleyballworld.com/volleyball/competitions/volleyball-nations-league/schedule/"}
        ],
        "deals": [
            {"title": "Wilson Rhythm Indoor Volleyball", "price": "$29.99", "imageUrl": "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/wilson-rhythm-indoor-volleyball-18wilurhythmvbxxxvll/18wilurhythmvbxxxvll"}
        ],
        "news": [
            {"title": "VNL 2026 Host Cities and Pools Announced", "source": "Volleyball World", "url": "https://en.volleyballworld.com/", "date": "Jan 2026"}
        ]
    },
    "soccer": {
        "id": "soccer",
        "name": "Soccer",
        "description": "The world's most popular sport played with a spherical ball.",
        "icon": "soccer",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/e/e5/2026_FIFA_World_Cup_emblem_%28without_trophy%29.svg",
        "howToPlay": {
            "title": "Essential Skills",
            "steps": [
                {"title": "Dribbling", "description": "Control the ball at your feet while moving.", "icon": "run"},
                {"title": "Passing", "description": "Accurately transfer the ball to teammates.", "icon": "arrow-right-bold"},
                {"title": "Shooting", "description": "Kick the ball into the net to score.", "icon": "goal"}
            ]
        },
        "rules": [
            {"title": "IFAB Laws of the Game", "content": "The official laws of association football updated for 2025.", "sourceUrl": "https://www.theifab.com/en/laws-of-the-game/"}
        ],
        "tutorials": [
            {"title": "How to Dribble Perfectly", "videoId": "bb6jlHgj7tc", "difficulty": "Beginner", "duration": "6:20"}
        ],
        "events": [
            {"title": "Champions League Final", "date": "May 30, 2026", "location": "Budapest", "trackUrl": "https://www.uefa.com/uefachampionsleague/"}
        ],
        "deals": [
            {"title": "adidas FIFA World Cup 2026 Training Ball", "price": "$32.00", "imageUrl": "https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/adidas-fifa-world-cup-2026-trionda-training-soccer-ball-25adiusoccwc26trnnbff/25adiusoccwc26trnnbff"}
        ],
        "news": [
            {"title": "Jan 2026 Transfer Window Summaries", "source": "ESPN Soccer", "url": "https://www.espn.com/soccer/", "date": "Jan 2026"}
        ]
    },
    "pickleball": {
        "id": "pickleball",
        "name": "Pickleball",
        "description": "A fun sport that combines elements of tennis, badminton and ping-pong.",
        "icon": "table-tennis",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/1/1f/Pickleball_logo.svg",
        "howToPlay": {
            "title": "Learn the Game",
            "steps": [
                {"title": "The Serve", "description": "Must be underhand and hit the ball into the diagonal court.", "icon": "arrow-up-right"},
                {"title": "The Kitchen", "description": "Stay out of the non-volley zone unless the ball bounces.", "icon": "home-variant"}
            ]
        },
        "rules": [
            {"title": "USA Pickleball Rulebook", "content": "Official playing rules for the fastest growing sport.", "sourceUrl": "https://usapickleball.org/docs/ifp/Pickleball-Rulebook.pdf"}
        ],
        "tutorials": [
            {"title": "Improve as a Beginner", "videoId": "28gfmQEzOxI", "difficulty": "Beginner", "duration": "11:40"}
        ],
        "events": [
            {"title": "PPA Sacramento Open", "date": "April 13-19, 2026", "location": "Sacramento, CA", "trackUrl": "https://ppatour.com/schedule/"}
        ],
        "deals": [
            {"title": "JOOLA Tundra Pickleball Paddle Set", "price": "$67.46", "imageUrl": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/joola-tundra-pickleball-paddle-set-23jooutndrpcklblltnn/23jooutndrpcklblltnn"}
        ],
        "news": [
            {"title": "Major League Pickleball 2026 Expanded Schedule", "source": "MLP", "url": "https://www.majorleaguepickleball.net/", "date": "Feb 2026"}
        ]
    },
    "yoga": {
        "id": "yoga",
        "name": "Yoga",
        "description": "A practice that focuses on breath, flexibility, and strength.",
        "icon": "human-handsup",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Lotus.svg",
        "howToPlay": {
            "title": "Foundations of Yoga",
            "steps": [
                {"title": "Mountain Pose", "description": "Stand tall with feet together and arms at your sides.", "icon": "human-male"},
                {"title": "Cat-Cow", "description": "Archer your back and drop your belly on all fours.", "icon": "animal-variant"}
            ]
        },
        "rules": [
            {"title": "Yoga Alliance Standards", "content": "Explore the professional standards for yoga practice.", "sourceUrl": "https://yogaalliance.org/About_Yoga/Our_Standards"}
        ],
        "tutorials": [
            {"title": "Yoga For Beginners", "videoId": "v7AYKMP6rOE", "difficulty": "Beginner", "duration": "20:00"}
        ],
        "events": [
            {"title": "International Day of Yoga", "date": "June 21, 2026", "location": "Global", "trackUrl": "https://www.un.org/en/observances/yoga-day"}
        ],
        "deals": [
            {"title": "CALIA Foam Yoga Block", "price": "$14.99", "imageUrl": "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/calia-foam-yoga-block-22clawyfmygblckxxwms/22clawyfmygblckxxwms"}
        ],
        "news": [
            {"title": "Yoga Trends for 2026", "source": "Yoga Journal", "url": "https://www.yogajournal.com/news/", "date": "Feb 2026"}
        ]
    },
    "camping": {
        "id": "camping",
        "name": "Camping",
        "description": "Overnight stays in the wilderness using tents or shelters.",
        "icon": "tent",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/2/25/SymbolCamping.svg",
        "howToPlay": {
            "title": "Camping Essentials",
            "steps": [
                {"title": "Research & Plan", "description": "Check weather and campsite fire restrictions.", "icon": "map-search"},
                {"title": "Gear Prep", "description": "Test your tent and stove before leaving.", "icon": "toolbox"}
            ]
        },
        "rules": [
            {"title": "NPS Safety Guidelines", "content": "Official safety and conduct rules for camping in National Parks.", "sourceUrl": "https://www.nps.gov/subjects/camping/staying-safe.htm"}
        ],
        "tutorials": [
            {"title": "Pitch a Tent for Beginners", "videoId": "R9Z_wosM76Q", "difficulty": "Beginner", "duration": "5:30"}
        ],
        "events": [
            {"title": "National Park Week 2026", "date": "April 18-26, 2026", "location": "USA", "trackUrl": "https://www.nps.gov/subjects/npscelebrates/national-park-week.htm"}
        ],
        "deals": [
            {"title": "Coleman Cascade Camping Stove", "price": "$129.99", "imageUrl": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/coleman-cascade-classic-camping-stove-22colucsccclssccsstv/22colucsccclssccsstv"}
        ],
        "news": [
            {"title": "New Campsite Booking Trends", "source": "Outside Online", "url": "https://www.outsideonline.com/category/adventure/camping/", "date": "Feb 2026"}
        ]
    },
    "hiking": {
        "id": "hiking",
        "name": "Hiking",
        "description": "Vigorous walks on trails in the countryside or wilderness.",
        "icon": "hiking",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/8/8d/HIKING.SVG",
        "howToPlay": {
            "title": "Hiking Fundamentals",
            "steps": [
                {"title": "Select a Trail", "description": "Match the trail to your fitness level.", "icon": "map-marker"},
                {"title": "Pack Essentials", "description": "Carry water, food, and first aid.", "icon": "bag-personal"}
            ]
        },
        "rules": [
            {"title": "Safety Resources", "content": "Preparation is key to a safe and enjoyable hike.", "sourceUrl": "https://americanhiking.org/hiking-resources/hiking-safety/"}
        ],
        "tutorials": [
            {"title": "Pack a Hiking Backpack", "videoId": "Fj2F5xN_WnE", "difficulty": "Beginner", "duration": "9:15"}
        ],
        "events": [
            {"title": "National Trails Day 2026", "date": "June 6, 2026", "location": "USA", "trackUrl": "https://americanhiking.org/national-trails-day/"}
        ],
        "deals": [
            {"title": "Merrell Moab 3 Mid WP Hiking Boots", "price": "$149.99", "imageUrl": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/merrell-mens-moab-3-mid-waterproof-hiking-boots-22mermmb3mdwpxxxxbrn/22mermmb3mdwpxxxxbrn"}
        ],
        "news": [
            {"title": "Restoring Historic Trails", "source": "AHS Trail News", "url": "https://americanhiking.org/trail-news/", "date": "Feb 2026"}
        ]
    },
    "cricket": {
        "id": "cricket",
        "name": "Cricket",
        "description": "A bat-and-ball game played between two teams of eleven players.",
        "icon": "cricket",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Cricket_bat.svg",
        "howToPlay": {
            "title": "Master the Game",
            "steps": [
                {"title": "Batting Stance", "description": "Feet shoulder-width apart, knees slightly bent.", "icon": "human-handsdown"},
                {"title": "Bowling Action", "description": "Grip along the seam and follow through.", "icon": "arm-flex"}
            ]
        },
        "rules": [
            {"title": "ICC Conditions", "content": "Official playing conditions for international matches.", "sourceUrl": "https://www.icc-cricket.com/about/rules-and-regulations/playing-conditions"}
        ],
        "tutorials": [
            {"title": "Batting Masterclass", "videoId": "F3S29-y9V1k", "difficulty": "Beginner", "duration": "14:20"}
        ],
        "events": [
            {"title": "IPL 2026: Season Opener", "date": "March 28, 2026", "location": "India", "trackUrl": "https://www.iplt20.com/"}
        ],
        "deals": [
            {"title": "Cricket Bat & Ball Set", "price": "$34.99", "imageUrl": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.academy.com/search?text=cricket+set"}
        ],
        "news": [
            {"title": "World Cup 2026 Groupings", "source": "Cricinfo", "url": "https://www.espncricinfo.com/", "date": "Feb 2026"}
        ]
    },
    "tennis": {
        "id": "tennis",
        "name": "Tennis",
        "description": "A racket sport for individuals or teams of two.",
        "icon": "tennis",
        "heroImage": "https://upload.wikimedia.org/wikipedia/commons/4/47/Wikipedia-Tennis-logo-v3-raquet.svg",
        "howToPlay": {
            "title": "Court Fundamentals",
            "steps": [
                {"title": "The Serve", "description": "Strike at peak flight into the diagonal court.", "icon": "arrow-up-right"},
                {"title": "Forehand Power", "description": "Swing low to high with a firm wrist.", "icon": "arm-flex-outline"}
            ]
        },
        "rules": [
            {"title": "ITF Rules of Tennis", "content": "Official international rules and regulations.", "sourceUrl": "https://www.itftennis.com/en/about-us/governance/rules-and-regulations/"}
        ],
        "tutorials": [
            {"title": "Beginner Tennis Lesson", "videoId": "kbmsyOGR6Cc", "difficulty": "Beginner", "duration": "12:30"}
        ],
        "events": [
            {"title": "Mutua Madrid Open", "date": "April 22-May 3", "location": "Madrid", "trackUrl": "https://www.mutuamadridopen.com/"}
        ],
        "deals": [
            {"title": "Wilson Roland Garros Triumph Tennis Racquet", "price": "$99.99", "imageUrl": "https://images.unsplash.com/photo-1617083934555-ac7b3bd48ece?w=400&h=400&fit=crop&auto=format", "shopUrl": "https://www.dickssportinggoods.com/p/wilson-roland-garros-triumph-tennis-racquet-22wilurlndgrrstrmxxtnn/22wilurlndgrrstrmxxtnn"}
        ],
        "news": [
            {"title": "Grand Slam Schedule 2026", "source": "ATP Tour", "url": "https://www.atptour.com/en/news", "date": "Jan 2026"}
        ]
    }
}

for sid, sdata in SPORTS_DATA.items():
    set_doc(sid, sdata)
