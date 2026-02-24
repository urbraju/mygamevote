# Technical Specification: MyGameVote 🏗️

This document provides a comprehensive technical overview of the MyGameVote platform architecture, data models, and infrastructure.

## 1. Technology Stack
- **Frontend Framework**: [Expo](https://expo.dev/) (React Native) with [Expo Router](https://docs.expo.dev/routing/introduction/) for cross-platform navigation.
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native).
- **Backend Services**: [Firebase](https://firebase.google.com/)
  - **Firestore**: Real-time NoSQL database.
  - **Authentication**: Email/Password, Google, and Facebook OAuth.
  - **Hosting**: Static web hosting for the production build.
  - **Functions**: Node.js 22 cloud functions for notifications and administrative cleanup.
  - **Storage**: Rule-protected cloud storage for user assets.
- **Deployment**: [GitHub Actions](https://github.com/features/actions) (optional) / Firebase CLI for production synchronized deployments.

## 2. Architecture: Multi-Tenant Model
The platform utilizes a **Shared Database, Shared Schema** architecture for multi-tenancy.
- **Tenant Isolation**: Every tenant (Organization) is identified by a unique `orgId`.
- **Security Enforcement**: Firestore Security Rules strictly filter all reads and writes based on the user's `orgIds` list in their profile.
- **Backward Compatibility**: The `default` organization ID represents the legacy "Masti" group.

## 3. Core Data Models (Firestore)

### `/users/{uid}`
- `email`: User's primary email.
- `displayName`: User's full name.
- `isAdmin`: Global admin flag (Super Admin).
- `isApproved`: Global approval status.
- `orgIds`: Array of organization IDs the user belongs to.
- `interests`: Array of sports the user is interested in.

### `/organizations/{orgId}`
- `name`: Organization display name.
- `ownerId`: User UID of the creator.
- `settings`: Configuration for sport name, match day, time, and location.
- `members` / `admins` / `pendingMembers`: Arrays of user UIDs.

### `/events/{eventId}`
- `orgId`: Owner organization.
- `sportName`: Name of the sport.
- `eventDate`: ISO timestamp of the match.
- `slots`: Array of `{userId, userName, status, paid}` objects.
- `isCancelled`: Boolean status flag.

## 4. Operational Flows

### Registration & Onboarding
1. **Signup**: Firebase Auth validates email/password.
2. **Interests**: User selects sports before joining any organization.
3. **Join/Create**: User creates a new Organization (becoming Admin) or joins an existing one via Invite Code.
4. **Approval**: Organization Admins approve pending members before they can access the Home dashboard.

### Match Lifecycle
1. **Initialization**: Weekly Saturday games are initialized automatically (or via Admin trigger).
2. **Voting**: Players join or leave the slot. Confirmed (1-14) vs. Waitlist (15+) logic is enforced reactive to Firestore snapshots.
3. **Rollover**: Games remain live for 24 hours post-match before rolling over to the next week's schedule.

## 5. Security Architecture
- **JWT-Based Auth**: Firebase Authentication handles identity.
- **Granular Rules**: `firestore.rules` prevents cross-tenant data leakage and ensures only owners/admins can modify configuration.
- **Environment Hardening**: Production Hosting enforces strict caching headers (`no-cache`) to ensure users always receive the latest SPA bundle.

## 6. Infrastructure & SEO
- **Custom Domains**: Pointed to `www.mygamevote.com` via Firebase Hosting.
- **Indexing**: `sitemap.xml` and `robots.txt` are served from the root to facilitate Google Search Console indexing.
