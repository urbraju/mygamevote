# 🚀 MyGameVote Deployment Workflow & Guide

This document is the official reference for the project's development, testing, and deployment lifecycle across all platforms.

---

## 📍 Environment Overview

| Environment | Branch | URL Access | Deployment Trigger |
| :--- | :--- | :--- | :--- |
| **Production** | `main` | [www.mygamevote.com](https://www.mygamevote.com) | Automatic on push to `main` |
| **Development**| `dev` | [Staging Preview](https://mygamevote--dev-jtgz2dlt.web.app) | Automatic on push to `dev` |

---

## 💻 Local Development

### 1. Setup
```bash
npm install --legacy-peer-deps
```

### 2. Run Applications
- **Web**: `npx expo start --web` (Available at `http://localhost:8081`)
- **iOS**: `npx expo run:ios`
- **Android**: `npx expo run:android`

---

## 🛠️ Daily Development Workflow (on `dev`)

Always work on the `dev` branch to keep the production site safe.

### 1. Update and Switch to Dev
```bash
git checkout dev
git pull origin dev
```

### 2. Make Changes & Push
```bash
# After making your code changes
git add .
git commit -m "feat: your new feature description"
git push origin dev
```
> [!NOTE]
> Pushing to `dev` triggers **Build & Smoke Tests** and updates the **Staging Preview URL**. It will **NOT** update the live site or Cloud Functions.

---

## 🚢 Releasing to Production (to `main`)

Once you have verified your changes on the Staging Preview URL, move them to the live site.

### 1. Merge Dev into Main
```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

### 2. Verify on GitHub Actions
Go to [GitHub Actions](https://github.com/urbraju/mygamevote/actions) and ensure the "Deploy" job turns green. This updates:
- ✅ Web Application ([www.mygamevote.com](https://www.mygamevote.com))
- ✅ Firebase Hosting & Rules
- ✅ Cloud Functions & Scheduler Jobs
- ✅ Expo OTA Updates (Mobile)

---

## 📱 Mobile Updates (iOS & Android)

We use **Expo EAS** for Over-The-Air (OTA) updates and builds.

### 1. Automated OTA Updates
Every push to `main` automatically publishes an OTA update to the `production` branch in Expo.

### 2. Native App Store Builds
Required if you add new native plugins or change `app.json`:
```bash
eas build --platform ios
eas build --platform android
```

---

## 🧪 Testing & Quality Gates

### 1. Pipeline Smoke Tests
The GitHub Action uses **Playwright** to perform real-world login tests on the production site after every deployment to ensure it renders and functions correctly.

### 2. Running E2E Tests Locally
```bash
export TEST_USER_EMAIL="gg@test.com"
export TEST_ADMIN_EMAIL="tladmin@test.com"
export TEST_PASSWORD="YourTestPassword"
npm run test:e2e
```

---

## 🆘 Emergency Manual Deployment
If GitHub Actions is down, you can deploy Hosting live from your terminal:
```bash
git checkout main
npx expo export -p web && npx firebase deploy --only hosting
```

---
> [!IMPORTANT]
> **Production Protection**: The `dev` branch skips Cloud Function deployments and Production Hosting updates to prevent accidental breakages. Always use `main` for final releases.
