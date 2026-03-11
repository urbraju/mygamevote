import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

users_ref = db.collection('users')
query = users_ref.where('email', '==', 'tladmin@test.com').limit(1).get()

if not query:
    print('User not found')
else:
    for doc in query:
        print(f"Updating user: {doc.id}")
        users_ref.document(doc.id).update({
            'isAdmin': True,
            'superAdmin': True,
            'orgId': 'default',
            'status': 'approved'
        })
        print('Successfully updated user to Admin')
