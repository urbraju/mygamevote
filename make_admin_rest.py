import urllib.request
import urllib.error
import urllib.parse
import json
import base64
import time
import subprocess
import os

SA_PATH = './serviceAccountKey.json'
PROJECT_ID = 'mygameslot-324a5'

with open(SA_PATH, 'r') as f:
    sa_data = json.load(f)

def base64url_encode(payload):
    if not isinstance(payload, bytes):
        payload = payload.encode('utf-8')
    encode = base64.urlsafe_b64encode(payload)
    return encode.decode('utf-8').rstrip('=')

header = {"alg": "RS256", "typ": "JWT"}
header_enc = base64url_encode(json.dumps(header))

now = int(time.time())
payload = {
    "iss": sa_data['client_email'],
    "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600,
    "iat": now
}
payload_enc = base64url_encode(json.dumps(payload))

message = f"{header_enc}.{payload_enc}"

with open('/tmp/msg.txt', 'w') as f:
    f.write(message)
with open('/tmp/key.pem', 'w') as f:
    f.write(sa_data['private_key'])

sign_cmd = ["openssl", "dgst", "-sha256", "-sign", "/tmp/key.pem", "-out", "/tmp/sig.bin", "/tmp/msg.txt"]
subprocess.run(sign_cmd, check=True)

with open('/tmp/sig.bin', 'rb') as f:
    sig_bytes = f.read()

os.remove('/tmp/msg.txt')
os.remove('/tmp/key.pem')
os.remove('/tmp/sig.bin')

signature_enc = base64url_encode(sig_bytes)
jwt = f"{message}.{signature_enc}"

req = urllib.request.Request(
    'https://oauth2.googleapis.com/token',
    data=urllib.parse.urlencode({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': jwt
    }).encode(),
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

try:
    with urllib.request.urlopen(req) as response:
        access_token = json.loads(response.read().decode())['access_token']
except urllib.error.HTTPError as e:
    print(f"Error getting token: {e.read().decode()}")
    exit(1)

# Step 2: Query user
query_payload = {
    "structuredQuery": {
        "from": [{"collectionId": "users"}],
        "where": {
            "fieldFilter": {
                "field": {"fieldPath": "email"},
                "op": "EQUAL",
                "value": {"stringValue": "tladmin@test.com"}
            }
        },
        "limit": 1
    }
}
req_query = urllib.request.Request(
    f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:runQuery',
    data=json.dumps(query_payload).encode(),
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req_query) as response:
        result = json.loads(response.read().decode())
        if not result or 'document' not in result[0]:
            print("User tladmin@test.com not found")
            exit(1)
        doc_name = result[0]['document']['name']
        print(f"Found user doc: {doc_name}")
except urllib.error.HTTPError as e:
    print(f"Error querying: {e.read().decode()}")
    exit(1)

# Step 3: Patch document fields
patch_payload = {
    "fields": {
        "isAdmin": {"booleanValue": True},
        "superAdmin": {"booleanValue": True},
        "orgId": {"stringValue": "default"},
        "status": {"stringValue": "approved"}
    }
}
update_mask = "updateMask.fieldPaths=isAdmin&updateMask.fieldPaths=superAdmin&updateMask.fieldPaths=orgId&updateMask.fieldPaths=status"
req_patch = urllib.request.Request(
    f'https://firestore.googleapis.com/v1/{doc_name}?{update_mask}',
    data=json.dumps(patch_payload).encode(),
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    },
    method='PATCH'
)

try:
    with urllib.request.urlopen(req_patch) as response:
        print("Successfully updated user to Admin!")
except urllib.error.HTTPError as e:
    print(f"Error patching user: {e.read().decode()}")
    exit(1)
