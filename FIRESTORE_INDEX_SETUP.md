# Firestore Index Setup Instructions

## Required Index for "My Matches" Feature

The "My Matches" tab requires a composite index in Firestore. Follow these steps to create it:

### Option 1: Click the Auto-Generated Link (Easiest)

When you see the error in the browser console, click the Firebase Console link provided. It will look like:
```
https://console.firebase.google.com/v1/r/project/mygameslot-324a5/firestore/indexes?create_composite=...
```

This link will automatically configure the index for you.

### Option 2: Manual Creation via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `mygameslot-324a5`
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure the index:
   - **Collection ID**: `events`
   - **Fields to index**:
     - Field: `participantIds` | Type: **Array-contains**
     - Field: `eventDate` | Type: **Ascending**
   - **Query scope**: Collection
6. Click **Create**

### Index Build Time

- The index typically takes **2-5 minutes** to build
- You'll see a "Building" status in the Firebase Console
- Once it shows "Enabled", refresh your app

### Verification

After the index is built:
1. Refresh your browser
2. The error should disappear
3. The "My Matches" tab should work correctly

## Alternative: Use npx (if firebase-tools is not globally installed)

```bash
npx firebase-tools deploy --only firestore:indexes
```

Note: This requires authentication with Firebase CLI.
