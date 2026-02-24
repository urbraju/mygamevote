# Product Requirements & Features 📋

This document tracks all functional and technical requirements implemented in the MyGameVote platform.

## 1. Core User Features
- **Authentication**: Secure email/password login and signup with Google and Facebook OAuth integration.
- **Profile Management**: Initial-based avatar generation, display name, and mandatory sport interest selection for all users.
- **Real-time Voting**: One-tap voting for game slots with instant reactive updates across devices.
- **Waitlist & Promotion Logic**: 
  - Automatic confirmed status for the first 14 players (default).
  - Subsequent players placed on a reactive waitlist.
  - **Auto-Promotion**: When a confirmed player leaves, the next waitlisted player is instantly promoted.
  - **Notification**: Users receive success toasts and alerts on confirmation.

## 2. Multi-Tenancy (Multi-Org Architecture)
- **Organization Lifecycle**: Users can create their own "Squads" (Organizations), becoming the owner/admin.
- **Invitation & Access**: Join groups via unique Invitation Codes; strictly enforced via Firestore Security Rules.
- **Admin Onboarding**: New organizations receive a guided "Match Setup" flow to define their sport, day, and time.
- **Org Switching**: Seamlessly toggle between multiple active organization memberships.
- **Safety Toggle**: "Simple Mode" supports single-org communities (Masti) with reduced UI friction.

## 3. Administrative Capabilities
- **Operational Dashboard**: Real-time management of active game slots, player statuses, and paid flags.
- **Match Lifecycle Management**:
  - Automatically generate and initialize weekly recurring matches.
  - Post-match rollover (24h window) for upcoming games.
  - CRUD operations for one-off custom events and polls.
- **Member Management**: 
  - Pending member approval flow with bulk approval actions.
  - User deletion/cleanup (Auth + Firestore sync).
- **Financial Dashboard**: Track total revenue per match and toggle payment method selection (Zelle/PayPal).

## 4. Discovery & Infrastructure
- **Cross-Platform**: Full parity between Web (Production at www.mygamevote.com) and Native (iOS/Android) via Expo.
- **Security**: Granular Rule-based isolation (`firestore.rules`) and safe authentication state handling in `AuthContext`.
- **Search Engine Discovery**: Live `sitemap.xml` and `robots.txt` for Google Search Console indexing.
- **Performance**: Sub-second synchronization using Firestore Real-time Snapshots.
- **Caching**: Aggressive browser cache invalidation on deployment to ensure users always have the latest bundle.
