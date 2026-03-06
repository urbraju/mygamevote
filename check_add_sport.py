import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate('sa.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

try:
    doc = db.collection('sports').document('test_sport_auto').get()
    print('Testing query sports collection...')
    for sport in db.collection('sports').limit(1).get():
        print(f"Read sport: {sport.id}")
except Exception as e:
    print(f"Error reading: {e}")
