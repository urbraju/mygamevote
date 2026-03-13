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
    # NO updateMask = full document restore
    url = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/sports_catalog/{doc_id}'
    req = urllib.request.Request(url, data=json.dumps({'fields': fields}).encode(), headers={'Authorization':f'Bearer {token}','Content-Type':'application/json'}, method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            print(f'✅ Fully Restored: {doc_id}')
    except urllib.error.HTTPError as e:
        print(f'❌ Failed {doc_id}: {e.read().decode()}')

SPORTS_KNOWLEDGE = {
    'volleyball': {
        'id': 'volleyball',
        'name': 'Volleyball',
        'description': 'A fast-paced team sport played on a court divided by a net.',
        'icon': 'volleyball',
        'heroImage': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Volleyball_Nations_League_Logo.svg',
        'deals': [
            {'title': 'Wilson Rhythm Indoor Volleyball', 'price': '$29.99', 'imageUrl': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/wilson-rhythm-indoor-volleyball-18wilurhythmvbxxxvll/18wilurhythmvbxxxvll'},
            {'title': 'Molten Camp Recreational Volleyball', 'price': '$11.97', 'imageUrl': 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/molten-camp-recreational-volleyball-16mltumltncmpvxxxxvll/16mltumltncmpvxxxxvll'},
            {'title': 'Mizuno LR6 Volleyball Knee Pads', 'price': '$34.99', 'imageUrl': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.academy.com/search?text=mizuno+volleyball+knee+pads'}
        ]
    },
    'soccer': {
        'id': 'soccer',
        'name': 'Soccer',
        'description': 'The world\'s most popular sport played with a spherical ball.',
        'icon': 'soccer',
        'deals': [
            {'title': 'adidas FIFA World Cup 2026 Training Ball', 'price': '$32.00', 'imageUrl': 'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/adidas-fifa-world-cup-2026-trionda-training-soccer-ball-25adiusoccwc26trnnbff/25adiusoccwc26trnnbff'},
            {'title': 'Lotto 6\' x 4\' Practice Youth Goal', 'price': '$55.00', 'imageUrl': 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/lotto-6-x-4-practice-youth-soccer-goal-24lotultt6x4ythglsct/24lotultt6x4ythglsct'},
            {'title': 'Nike Mercurial Lite Shin Guards', 'price': '$26.00', 'imageUrl': 'https://images.unsplash.com/photo-1556816213-7571e807347d?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/nike-mercurial-lite-soccer-shin-guards-22nikumrcltgrdwtbscs/22nikumrcltgrdwtbscs'}
        ]
    },
    'pickleball': {
        'id': 'pickleball',
        'name': 'Pickleball',
        'description': 'A fun sport that combines elements of tennis, badminton and ping-pong.',
        'icon': 'table-tennis',
        'deals': [
            {'title': 'JOOLA Tundra Pickleball Paddle Set', 'price': '$67.46', 'imageUrl': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/joola-tundra-pickleball-paddle-set-23jooutndrpcklblltnn/23jooutndrpcklblltnn'},
            {'title': 'Onix Z5 Graphite Pickleball Paddle', 'price': '$89.99', 'imageUrl': 'https://images.unsplash.com/photo-1588731234537-5571a5e0a4da?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/onix-z5-graphite-pickleball-paddle-16onxunxz5grptxxxpck/16onxunxz5grptxxxpck'},
            {'title': 'Franklin Aluminum Jet Pickleball Set', 'price': '$29.98', 'imageUrl': 'https://images.unsplash.com/photo-1599474924187-334a4ae5149f?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/franklin-pickleball-jet-paddle-and-ball-set-24fraujtstsmxxxxxtnn/24fraujtstsmxxxxxtnn'}
        ]
    },
    'yoga': {
        'id': 'yoga',
        'name': 'Yoga',
        'description': 'A practice that focuses on breath, flexibility, and strength.',
        'icon': 'human-handsup',
        'deals': [
            {'title': 'CALIA Foam Yoga Block', 'price': '$14.99', 'imageUrl': 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/calia-foam-yoga-block-22clawyfmygblckxxwms/22clawyfmygblckxxwms'},
            {'title': 'Manduka X Yoga Mat (5mm)', 'price': '$72.00', 'imageUrl': 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/manduka-x-yoga-mat-18manumndkxmtxxxxacc/18manumndkxmtxxxxacc'},
            {'title': 'GoFit Yoga Starter Kit', 'price': '$32.99', 'imageUrl': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/gofit-yoga-starter-set-16gofyygstrtrstxxacc/16gofyygstrtrstxxacc'}
        ]
    },
    'camping': {
        'id': 'camping',
        'name': 'Camping',
        'description': 'Overnight stays in the wilderness using tents or shelters.',
        'icon': 'tent',
        'deals': [
            {'title': 'Coleman Cascade Camping Stove', 'price': '$129.99', 'imageUrl': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/coleman-cascade-classic-camping-stove-22colucsccclssccsstv/22colucsccclssccsstv'},
            {'title': 'Coleman Montana 8-Person Tent', 'price': '$119.99', 'imageUrl': 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/coleman-montana-8-person-tent-with-hinged-door-22columntn8prsnflctp/22columntn8prsnflctp'},
            {'title': 'Coleman Trailhead II Camp Cot', 'price': '$66.99', 'imageUrl': 'https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/coleman-trailhead-ii-camp-cot-15colutrlhdiicmpxxxod/15colutrlhdiicmpxxxod'}
        ]
    },
    'hiking': {
        'id': 'hiking',
        'name': 'Hiking',
        'description': 'Vigorous walks on trails in the countryside or wilderness.',
        'icon': 'hiking',
        'deals': [
            {'title': 'Merrell Moab 3 Mid WP Hiking Boots', 'price': '$149.99', 'imageUrl': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/merrell-mens-moab-3-mid-waterproof-hiking-boots-22mermmb3mdwpxxxxbrn/22mermmb3mdwpxxxxbrn'},
            {'title': 'Merrell Speed Strike 2 Boots', 'price': '$109.99', 'imageUrl': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/merrell-mens-speed-strike-2-mid-leather-waterproof-hiking-boots-24mermspdstrk2mdlwp/24mermspdstrk2mdlwp'},
            {'title': 'Merrell Moab 3 Hiking Shoes', 'price': '$139.99', 'imageUrl': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/merrell-mens-moab-3-hiking-shoes-22mermmb3xxxxxbrn/22mermmb3xxxxxbrn'}
        ]
    },
    'cricket': {
        'id': 'cricket',
        'name': 'Cricket',
        'description': 'A bat-and-ball game played between two teams of eleven players.',
        'icon': 'cricket',
        'deals': [
            {'title': 'Cricket Bat & Ball Set', 'price': '$34.99', 'imageUrl': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.academy.com/search?text=cricket+set'},
            {'title': 'Cricket Protective Gear Set', 'price': '$44.99', 'imageUrl': 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/search?query=cricket+set'},
            {'title': 'Cricket Training Kit', 'price': '$24.99', 'imageUrl': 'https://images.unsplash.com/photo-1540747913346-19212a4b4a53?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.amazon.com/s?k=cricket+training+kit'}
        ]
    },
    'tennis': {
        'id': 'tennis',
        'name': 'Tennis',
        'description': 'A racket sport for individuals or teams of two.',
        'icon': 'tennis',
        'deals': [
            {'title': 'Wilson Roland Garros Triumph Tennis Racquet', 'price': '$99.99', 'imageUrl': 'https://images.unsplash.com/photo-1617083934555-ac7b3bd48ece?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/wilson-roland-garros-triumph-tennis-racquet-22wilurlndgrrstrmxxtnn/22wilurlndgrrstrmxxtnn'},
            {'title': 'Tourna Fill-n-Drill Tennis Trainer', 'price': '$25.99', 'imageUrl': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/tourna-fill-n-drill-tennis-trainer-16truufllndrlltnnxxxx/16truufllndrlltnnxxxx'},
            {'title': 'Penn Championship Extra Duty Tennis Balls', 'price': '$4.49', 'imageUrl': 'https://images.unsplash.com/photo-1602028945870-8ebe46be9e8e?w=400&h=400&fit=crop&auto=format', 'shopUrl': 'https://www.dickssportinggoods.com/p/penn-championship-extra-duty-tennis-balls-15pnuuchmpnshxxxxxtn/15pnuuchmpnshxxxxxtn'}
        ]
    }
}

for sid, sdata in SPORTS_KNOWLEDGE.items():
    set_doc(sid, sdata)
