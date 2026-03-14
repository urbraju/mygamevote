# User Guide 📖

Welcome to MyGameVote! This guide explains how to use the platform as a Player and as an Organization Administrator.

---

## 🙋‍♂️ For Players

### 1. Account Setup
- **Sign Up**: Create an account with your email and a strong password. You can also securely use Google or Facebook Sign-In for a faster onboarding experience.
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

### 3. Sports Hub & Smart Search
- **Explore Hub**: Tap the "Explore" tab to access the **Sports Hub**. Here you can find expert-curated knowledge for various sports (Soccer, Tennis, Cricket, and more).
- **Knowledge Base**: Each sport detail page includes:
  - **Master the Basics**: Key rules and terminology.
  - **Smart Gear Search**: Use the search bar to find the best deals on equipment (e.g., "Shin Guards", "Rackets"). The AI fetches real-time results from major retailers.
  - **Latest News**: Stay updated with the most recent articles and community buzz for your favorite sports.
  - **Upcoming Events**: View major tournaments and local match schedules.
- **Your Profile**: Tap the **Settings** icon...

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
- **Close Group**: Owners and Power Users can permanently delete a squad from the "Danger Zone" in Settings. 
  - *Warning: This action is destructive and cannot be undone.*
  - *Post-Deletion: You will be automatically redirected to the onboarding screen to join or create a new squad.*

### 4. Financials & Payments
- Use the **Financial Dashboard** to monitor who has paid for the current game.
- You can toggle payment requirements and provide Zelle/PayPal links for easy collection.

### 6. Backend Intelligence Configuration (Modern Standand)
To enable the **Smart Gear Search** and **Automated Data Refresh** (AI Intelligence), you should configure your API keys using the modern Firebase **Params** system (replaces the deprecated `functions:config`):

1. **Serper API (Gear Search):** Get a key from [serper.dev](https://serper.dev).
2. **NewsAPI (Latest News):** Get a key from [newsapi.org](https://newsapi.org).
3. **Configure via `.env`:** 
   - Navigate to the `functions/` directory.
   - Open or create the `.env` file.
   - Add your keys:
     ```bash
     SERPER_KEY="YOUR_SERPER_KEY"
     NEWS_KEY="YOUR_NEWS_KEY"
     ```
4. **Deploy Changes:** The settings will take effect on your next push to the `sportsHub` or `main` branch, or you can deploy manually:
   ```bash
   cd functions && npm install
   cd ..
   npx firebase deploy --only functions
   ```
   *Note: This modern approach is future-proofed for 2027 and resolves all deprecation warnings.*

### 7. Managing Users
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
- **Authentication**: Firebase Auth (JWT-based) with Email/Password, Google OAuth, and Facebook OAuth integrations.
- **Notifications**: Firebase Cloud Messaging (FCM).

### Running Locally
1. `npm install`
2. `npm run web` (for web development)
3. `npx expo start` (for iOS/Android debugging)
