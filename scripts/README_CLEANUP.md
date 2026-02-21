# Quick User Cleanup Guide

Since you're having authentication issues with Firebase Console and CLI, here's the **easiest approach** using your existing web app:

## Option 1: Use the Web App Admin Panel (Recommended)

1. **Start the web server:**
   ```bash
   npm run web
   ```

2. **Login as admin** at http://localhost:8081

3. **Go to Admin Panel** and manually review/delete users

## Option 2: Use Firebase Console (If you can access it)

1. Make sure you're logged into Firebase Console with the correct Google account
2. Go to: https://console.firebase.google.com/
3. Find and select the `mygamevote` project
4. Navigate to: **Firestore Database** → **users** collection
5. Manually delete non-admin users

## Option 3: Re-authenticate Firebase CLI

If you want to use the automated script:

```bash
# Re-authenticate
npx firebase login --reauth

# Verify access
npx firebase projects:list

# Then run the cleanup script
DRY_RUN=true node scripts/cleanupUsersViaCLI.js
```

## Option 4: Direct Firestore Access

If you have access to Firebase Console:
1. Go to Firestore Database
2. Click on the `users` collection
3. Filter or manually select non-admin users
4. Delete them one by one or in batches

---

**Recommendation:** The web app admin panel is the simplest approach since you're already authenticated there. Just login as admin and manage users directly from the UI.
