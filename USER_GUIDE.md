# User Guide 📖

Welcome to MyGameVote! This guide explains how to use the platform as a Player and as an Organization Administrator.

---

## 🙋‍♂️ For Players

### 1. Account Setup
- **Sign Up**: Create an account with your email and a strong password. You can also securely use Native Google Sign-In on your mobile device.
- **Organization Join**: If you are joining a specific group (like Masti), ask your admin for the **Invitation Code**.
- **Join Code**: Go to the "Join Group" screen and enter the 6-character code to link your account. 
  - *Note: For security, your account will be placed in an "Approval Pending" state until the Organization Admin reviews and accepts your request.*

### 2. Voting for games
- **Home Screen**: View upcoming games for the week.
- **Vote/Join**: Tap the "Join" or "Vote" button on a game card to book your slot.
- **Confirmed vs. Waitlist**: 
  - If you are among the first **14 players**, you are **Confirmed**.
  - Otherwise, you are placed on the **Waitlist**.
  - **Auto-Promotion**: If a confirmed player leaves, the system automatically moves the first person from the waitlist to the confirmed group.

### 3. Your Profile
- Tap the **Settings** icon to update your display name and choose the sports you are interested in. This helps the app show you relevant games.
- **Interest Requests**: To maintain community integrity, modifying your Sports Interests submits an 'Interest Request'. Your profile will display a yellow banner while the request is pending Admin approval.

---

## 👑 For Organization Administrators

### 1. Accessing the Dashboard
- If you have admin rights, an **Admin** icon will appear in your bottom navigation bar.

### 2. Managing Events
- **Create Event**: Use the "Manage Events" section to schedule new games. Set the sport, location, total slots, and voting times.
- **Automated Voting**: You can set a specific date and time for when voting opens to ensure fairness for all players.

### 3. Sports & Groups
- **Custom Sports**: Add new sports (e.g., Pickleball, Cricket) with custom icons under "Manage Sports".
- **Org Settings**: Update your organization's name, currency, and whether you want to require manual approval for new members.

### 4. Financials & Payments
- Use the **Financial Dashboard** to monitor who has paid for the current game.
- You can toggle payment requirements and provide Zelle/PayPal links for easy collection.

### 5. Managing Users
- **Approve Users**: If "Require Approval" is ON, go to the "Registered Members" tab to efficiently activate new sign-ups with the "OK" or "Approve All" buttons.
- **Approve Interests**: Check the new "Pending Interests" section to review and Approve/Reject requests from users wanting to play new sports.
- **Inline Editing**: You can directly manage a user's sports by clicking the "Interests" button next to their name in the Registered Members list to open a quick dropdown editor.
- **Remove Players**: Admins have the authority to remove players from a game slot or the organization if necessary.

---

## 🛠 Tech Stack (Developer Info)

MyGameVote is built with a modern, high-performance stack:
- **Frontend**: React Native (Expo) - Universal UI for iOS, Android, and Web.
- **Styling**: NativeWind (Tailwind CSS) for responsive, themeable designs.
- **Navigation**: Expo Router (File-based routing).
- **Database**: Firebase Firestore (NoSQL Real-time DB).
- **Backend Logic**: Firebase Cloud Functions (Node.js).
- **Authentication**: Firebase Auth (JWT-based).
- **Notifications**: Firebase Cloud Messaging (FCM).

### Running Locally
1. `npm install`
2. `npm run web` (for web development)
3. `npx expo start` (for iOS/Android debugging)
