# 🚀 MyGameVote Deployment Guide

This guide explains how to manage and deploy MyGameVote across Local, Staging, and Production environments for both Web and Mobile (iOS/Android).

---

## 💻 Local Development

Before running the app locally, ensure you have installed dependencies:
```bash
npm install --legacy-peer-deps
```

### 1. Web (Local)
Run the local development server:
```bash
npx expo start --web
```
- Your app will be available at `http://localhost:8081`.

### 2. Mobile (Local)
Run the app on iOS or Android simulators:
```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```
Alternatively, use the **Expo Go** app on your physical device by scanning the QR code from `npx expo start`.

---

## 🌐 Production Deployment (Web)

We use **GitHub Actions** for fully automated Web deployments.

### How to Deploy to Production
1.  **Commit your changes** to your local branch.
2.  **Push to the `main` branch**:
    ```bash
    git push origin main
    ```
3.  **Monitor the Pipeline**: Go to the [GitHub Actions tab](https://github.com/urbraju/mygamevote/actions).
    - GitHub will bond, build, and deploy the code to `https://mygamevote.com` automatically.
    - A **Smoke Test** will run automatically after deployment to verify the site is online.

### Manual Web Deployment (Emergency Only)
If you need to bypass GitHub, you can deploy manually from your Mac:
```bash
npm run build:web
npx firebase deploy --only hosting
```

---

## 📱 Mobile Updates (iOS & Android)

We use **Expo EAS (Application Services)** for Over-The-Air (OTA) updates. This allows you to push bug fixes and UI changes to users' phones *without* Resubmitting to the App Store.

### 1. Automated OTA Updates (Recommended)
Every time you push to the `main` branch, GitHub Actions automatically publishes an update to the `production` branch in Expo.
- Users will receive the update the next time they open or restart the app.

### 2. Manual OTA Updates
If you want to push an update manually from your terminal:
```bash
eas update --branch production --message "Describe your changes here"
```

### 3. Native App Store Builds (New Versions)
If you change the `app.json` (e.g., app name, icon, splash screen) or add new native plugins, you must create a new build for the App Store/Play Store:
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

---

## 🧪 Pipeline Smoke Tests

Our GitHub Actions pipeline includes a **Success Validation** step:
- **Web Health Check**: After every deployment, GitHub pings `https://mygamevote.com` to ensure it returns a `200 OK` status and contains the "MyGameVote" title.
- If this test fails, the GitHub Action will show a **Red X**, alerting you that the deployment might have been broken even if the upload "succeeded."

---

## 🔢 Versioning Strategy

We follow **Semantic Versioning (SemVer)**. Update your `package.json` and `app.json` accordingly:

- **Patch (1.0.1)**: Small bug fixes.
- **Minor (1.1.0)**: New features (e.g., adding a new screen).
- **Major (2.0.0)**: Major overhauls or breaking changes.

To update the version, simply change the `"version"` field in `package.json` and `app.json` before pushing to `main`.
