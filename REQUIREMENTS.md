# Product Requirements & Features 📋

This document tracks all functional and technical requirements implemented in the MyGameVote platform.

## 1. Core User Features
- **Authentication**: Secure email/password login and signup with seamless Google and Facebook OAuth integration across Web and Native platforms.
- **Profile Management**: Initial-based avatar generation, display name, skill level tracking (1-5 stars per sport), and personal voting history/audit trail.
- **Real-time Voting**: One-tap voting for game slots with instant reactive updates. Includes **Multi-Click Prevention** (immediate button disabling and loading state) to handle rapid tapping and ensure transaction integrity.
- **Waitlist & Promotion Logic**: 
  - Automatic confirmed status for the first 14 players (default).
  - Subsequent players placed on a reactive waitlist.
  - **Auto-Promotion**: When a confirmed player leaves, the next waitlisted player is instantly promoted.
  - **Notification**: Users receive success toasts and alerts on confirmation.

## 2. Multi-Tenancy (Multi-Org Architecture)
- **Organization Lifecycle**: Users can create their own "Squads" (Organizations), becoming the owner/admin.
- **Immediate Admin Rights**: Guaranteed instant access to organizational management features after squad creation via robust Firestore state synchronization.
- **Invitation & Access**: Join groups via unique Invitation Codes; strictly enforced via Firestore Security Rules.
- **Admin Onboarding**: New organizations receive a guided "Match Setup" flow to define their sport, day, and time.
- **Squad Deletion**: Organization Owners and Power Users can permanently delete/close a squad, with automatic session cleanup and redirection to onboarding.
- **Org Switching**: Seamlessly toggle between multiple active organization memberships.
- **Content Isolation**: Content filtering ensures that squads are isolated from default/legacy matches (e.g., Masti Volleyball) unless explicitly configured.

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

## 4. Activity Hub & Auditing 🛡️
- **Searchable Activity Log**: Admins have a real-time, searchable, and filterable audit trail of all critical user actions (available in Admin dashboard).
- **Audit Filtering**: Search by User Email, Name, or specific Log Detail; filter by time range (Today, This Week, All Time).
- **Multi-Click Prevention**: Actively prevents redundant vote attempts by immediately disabling the interface and showing a spinning state upon the first interaction.
- **Granular Transparency**: Every vote interaction is logged in two stages:
  - **Join Started (Spinning)**: Recorded immediately when the user taps.
  - **Slot Secured (Confirmed)**: Recorded when the Firestore transaction successfully completes.
- **Improved Logging**: Captures precise button visibility states and technical time-sync offsets (Sync/Skew) for every interaction.

## 5. Personal User Experience 👤
- **My Voting History**: Self-service access for regular users to view their own personal voting audit trail via the Profile screen.
- **Transparency**: Users can see exactly when they clicked, when buttons appeared, and when their vote was successfully recorded.
- **Privacy-First**: Strictly limited to the authenticated user's own data via Firestore Security Rules; regular users cannot see others' activity.

## 6. Discovery & Infrastructure
- **Cross-Platform**: Full parity between Web (Production at www.mygamevote.com) and Native (iOS/Android) via Expo.
- **Security**: Granular Rule-based isolation (`firestore.rules`) and safe authentication state handling in `AuthContext`.
- **Search Engine Discovery**: Live `sitemap.xml` and `robots.txt` for Google Search Console indexing.
- **Performance**: Sub-second synchronization using Firestore Real-time Snapshots.
- **Caching**: Aggressive browser cache invalidation on deployment.
- **Administrative Oversight**: Global administrators have unrestricted access to all organizational Sports Hub modules (bypassing personal interest filters) to ensure system visibility and test stability.

## 5. Technology Stack
- **Frontend Framework**: React Native (via Expo Router v3).
- **Web Bundler**: Metro & Webpack (for unified cross-platform compiling).
- **Styling**: NativeWind (Tailwind CSS for React Native) paired with Global CSS.
- **Backend & Database**: Firebase Firestore (NoSQL Document Store).
- **Authentication**: Firebase Auth (Email/Password, Google OAuth).
- **Hosting**: Firebase Hosting (`mygamevote.web.app`).
- **Icons**: Expo Vector Icons (`MaterialCommunityIcons`).

## 6. QA Validation
- **End-To-End Workflows**: Fully validated UI testing for Player Onboarding, Interest Modifications, and Admin Dashboard Approvals (via Browser Subagents).
- **Service-Level Integration**: Automated test suite for high-risk squad flows, including Signup, Creation, Deletion, and content filtering logic.
- **Security**: Rigorously tested `firestore.rules` preventing unauthorized user edits, and ensuring robust isolation between Multi-Tenant Organizations.
