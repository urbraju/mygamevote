# MyGameSlot Implementation Plan

## Goal Description
Build a hybrid mobile and web application called "MyGameSlot" that allows users to vote for a weekly Saturday game slot (14 slots available). The app handles real-time ordering, waitlisting, admin management, and multi-channel notifications.

## Proposed Changes

### Tech Stack
-   **Framework**: React Native with Expo (Managed Workflow)
-   **Web Support**: Expo Web (React Native Web)
-   **Styling**: NativeWind (Tailwind CSS)
-   **Backend/DB**: Firebase (Auth, Firestore, Cloud Functions)
-   **State Management**: React Context / Zustand
-   **Notifications**: Firebase Cloud Functions triggered by Firestore events
-   **Payments**: Deep Linking to Zelle/PayPal/Banking Apps (Simple & Secure)

### Architecture

#### [NEW] /
-   `app/`: Expo Router pages
    -   `index.tsx`: Login/Landing page
    -   `(app)/home.tsx`: Main voting screen
    -   `(app)/payment.tsx`: Payment details & actions
    -   `(app)/admin.tsx`: Admin controls
    -   `_layout.tsx`: Root layout and providers
-   `components/`: Reusable UI components
    -   `SlotList.tsx`: Displays the list of voted users
    -   `VoteButton.tsx`: The main action button with timer logic
    -   `PaymentModal.tsx`: Zelle/PayPal integration options
    -   `Header.tsx`: Sporty header
-   `firebaseConfig.ts`: Firebase initialization
-   `services/`:
    -   `votingService.ts`: Handles voting transactions
    -   `adminService.ts`: Handles member management

### Data Model (Firestore)
-   **Collection: `weekly_slots`** (Document ID: `YYYY-WeekNumber`)
    -   `slots`: Array of objects `{ userId, userName, timestamp, status }`
    -   `isOpen`: boolean
    -   `maxSlots`: number (default: 14)
    -   `maxWaitlist`: number (default: 4)
    -   **[NEW]** `votingOpensAt`: number (timestamp)
    -   `paymentEnabled`: boolean (default: false)
    -   `paymentDetails`: Object (admin defined Zelle/PayPal info)
    -   `fees`: number (default: 0)
    -   **Retention**: Keep last 10 weeks of history.
-   **Collection: `weekly_slots` -> Subcollection `payments`**
    -   `userId`: string
    -   `amount`: number
    -   `method`: "Zelle" | "PayPal" | "Cash" | "Other"
    -   `status`: "pending" | "verified"
-   **Collection: `users`**
    -   `uid`: string
    -   `email`: string
    -   `phone`: string
    -   `isAdmin`: boolean

## Testing Strategy
-   **Unit Tests**: Jest for utility functions (`dateUtils`) and isolated service logic.
-   **Integration Tests**: React Native Testing Library (RNTL) for component interactions and screen flows.
-   **Mocks**: Manual mocks for Firebase Authentication and Firestore to avoid hitting the live DB during tests.

## Security Strategy
-   **Dependency Scanning**: Regular `npm audit` runs to catch vulnerable packages.
-   **Database Security**: Firestore Security Rules to ensure:
    -   Only authenticated users can read/write slots.
    -   Only Admins can change configuration (maxSlots, paymentEnabled).
    -   Data validation (types, limits) at the database level.
    -   **[NEW]** Server-Side Timestamp validation (`request.time`) to prevent manipulating voting order.
-   **Input Validation**: Clean inputs to prevent injection (though less critical in NoSQL/React Native, still good practice).

## Verification Plan

### Automated Tests
-   Unit tests for voting logic (if extracted to pure functions).

### Manual Verification
-   **Voting Flow**: User clicks vote -> appears in list immediately.
-   **Waitlist**: 15th user clicks vote -> appears in waitlist.
-   **Admin**: Admin removes user -> list updates, waitlist user moves up.
-   **Time Constraints**: Verify voting is only allowed at scheduled times.
