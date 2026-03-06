import urllib.request
import urllib.error
import urllib.parse
import json
import base64

# Define service account path
SA_PATH = './sa.json'
PROJECT_ID = 'mygameslot-324a5'
RULES_PATH = './firestore.rules'

# 1. Read JSON and get client email / private key
with open(SA_PATH, 'r') as f:
    sa_data = json.load(f)

# 2. Get OAuth token using Google's metadata server or simple JWT
# Note: Google requires a JWT signed by the service account to get an access token
import time
import math
import hmac
import hashlib

def base64url_encode(payload):
    if not isinstance(payload, bytes):
        payload = payload.encode('utf-8')
    encode = base64.urlsafe_b64encode(payload)
    return encode.decode('utf-8').rstrip('=')

# Header
header = {"alg": "RS256", "typ": "JWT"}
header_enc = base64url_encode(json.dumps(header))

# Payload
now = int(time.time())
payload = {
    "iss": sa_data['client_email'],
    "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600,
    "iat": now
}
payload_enc = base64url_encode(json.dumps(payload))

# Create Signature
message = f"{header_enc}.{payload_enc}"

# Use openssl for the RSA SHA256 signature since we avoid pip
import subprocess
with open('/tmp/msg.txt', 'w') as f:
    f.write(message)
with open('/tmp/key.pem', 'w') as f:
    f.write(sa_data['private_key'])

# Sign
sign_cmd = ["openssl", "dgst", "-sha256", "-sign", "/tmp/key.pem", "-out", "/tmp/sig.bin", "/tmp/msg.txt"]
subprocess.run(sign_cmd, check=True)

with open('/tmp/sig.bin', 'rb') as f:
    sig_bytes = f.read()
    
# Clean up
import os
os.remove('/tmp/msg.txt')
os.remove('/tmp/key.pem')
os.remove('/tmp/sig.bin')

signature_enc = base64url_encode(sig_bytes)
jwt = f"{message}.{signature_enc}"

# Request access token
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
        token_data = json.loads(response.read().decode())
        access_token = token_data['access_token']
except urllib.error.HTTPError as e:
    print(f"Error getting token: {e.read().decode()}")
    exit(1)

# 3. Read rules content
with open(RULES_PATH, 'r') as f:
    rules_content = f.read()

# 4. Create Ruleset
ruleset_payload = {
    "source": {
        "files": [
            {
                "name": "firestore.rules",
                "content": rules_content
            }
        ]
    }
}

req_ruleset = urllib.request.Request(
    f'https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/rulesets',
    data=json.dumps(ruleset_payload).encode(),
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req_ruleset) as response:
        ruleset_response = json.loads(response.read().decode())
        ruleset_name = ruleset_response['name']
        print(f"Created ruleset: {ruleset_name}")
except urllib.error.HTTPError as e:
    print(f"Error creating ruleset: {e.read().decode()}")
    exit(1)

# 5. Release Ruleset to cloud.firestore
release_payload = {
    "name": f"projects/{PROJECT_ID}/releases/cloud.firestore",
    "rulesetName": ruleset_name
}

req_release = urllib.request.Request(
    f'https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases/cloud.firestore',
    data=json.dumps(release_payload).encode(),
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    },
    method='PATCH'
)

try:
    with urllib.request.urlopen(req_release) as response:
        print("Successfully deployed firestore rules!")
except urllib.error.HTTPError as e:
    # If PATCH fails, try POST (creation vs update)
    if e.code == 404:
        req_release_post = urllib.request.Request(
            f'https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases',
            data=json.dumps(release_payload).encode(),
            headers={
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            },
            method='POST'
        )
        try:
            with urllib.request.urlopen(req_release_post) as response:
                print("Successfully created and deployed firestore rules release!")
        except urllib.error.HTTPError as e2:
            print(f"Error creating release: {e2.read().decode()}")
    else:
        print(f"Error updating release: {e.read().decode()}")

