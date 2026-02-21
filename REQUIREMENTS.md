# Product Requirements & Features 📋

This document tracks all functional and technical requirements implemented in the MyGameVote platform.

## 1. Core User Features
- **Authentication**: Secure email/password login and signup.
- **Profile Management**: Profile picture (initials-based), display name, and sport interests.
- **Real-time Voting**: One-tap voting for game slots with instant updates across all clients.
- **Waitlist Logic**: 
  - Automatic confirmed status for the first 14 players.
  - Automatic waitlist placement for subsequent players.
  - **Auto-Promotion**: When a confirmed player leaves, the first person on the waitlist is automatically promoted to confirmed status.

## 2. Multi-Tenancy (Public Groups)
- **Organization Creation**: Users can create their own groups (Organizations).
- **Invitation System**: Join groups via unique Invitation Codes.
- **Org Switching**: Admins and users can switch between multiple organizations.
- **Safety Toggle**: "Simple Mode" allows the platform to function for a single community (Masti) without the complexity of organization selection.
- **Data Isolation**: Firestore security rules ensure that data between groups is never shared or leaked.

## 3. Administrative Capabilities
- **Operational Dashboard**: Real-time view of current game slots and player statuses.
- **Event Management**: Schedule recurring or one-off games with specific sports, dates, and times.
- **Member Management**: 
  - Role-based access (User vs. Organization Admin).
  - Manual user approval/activation flow.
  - Ability to remove users from games or groups.
- **Sports Management**: Define custom sports with names and icons scoped to specific organizations.
- **Financial Dashboard**: Track total revenue, paid vs. unpaid users, and toggle payment requirements (Zelle/PayPal links).

## 4. Communication & Notifications
- **Push Notifications**: Real-time alerts via Firebase Cloud Messaging (FCM).
- **Email Triggers**: Automated emails for user activation and system alerts.
- **In-App Alerts**: Error handling and success confirmations via toast messages and modals.

## 5. Technical Requirements
- **Cross-Platform**: Parity between Web, iOS, and Android using Expo.
- **Performance**: Sub-second synchronization using Firestore Real-time Snapshots.
- **Efficiency**: Optimized queries with composite indexing for multi-tenant scalability.
- **Security**: Granular Firestore Security Rules based on authentication and organization membership.
