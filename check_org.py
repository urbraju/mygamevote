import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json

cred = credentials.Certificate('sa.json')
firebase_admin.initialize_app(cred)

db = firestore.client()
doc = db.collection('organizations').document('default').get()

if doc.exists:
    print(json.dumps(doc.to_dict(), indent=2))
else:
    print('Default org does not exist!')
