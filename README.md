MyGameVote is a professional-grade React Native application for managing high-frequency sports communities. It provides a seamless experience for booking slots, managing waitlists, and coordinating multiple organizations.

---

## 📚 Documentation Hub
For detailed information, please refer to the specialized guides below:

*   **[User Guide](USER_GUIDE.md)**: How to use the app as a Player or Admin.
*   **[Requirement List](REQUIREMENTS.md)**: Full list of implemented features and technical specs.
*   **[Multi-Tenancy Guide](MULTI_TENANCY.md)**: Deep dive into the architecture and data isolation.

---

## 🚀 Core Features

*   **Real-time Voting**: Users can vote for a slot in the upcoming game. Slots update instantly across all devices.
*   **Automatic Waitlist**: The first 14 votes get a confirmed slot; subsequent votes are automatically placed on a waitlist.
*   **Admin Dashboard**: Admins can manage game settings (max slots, fees), remove users, and toggle payment requirements.
*   **Payments**: Integrated deep links for Zelle and PayPal payments.
*   **Authentication**: Secure login and signup via Firebase Auth.
*   **Cross-Platform**: Runs on iOS, Android, and Web.

## Tech Stack

*   **Framework**: [Expo](https://expo.dev) (React Native)
*   **Language**: TypeScript
*   **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)
*   **Backend**: Firebase (Firestore, Auth)
*   **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
*   **Testing**: Jest, React Native Testing Library

## Getting Started

### Prerequisites

*   Node.js (LTS recommended)
*   npm or yarn
*   [Expo Go](https://expo.dev/client) app on your mobile device (or iOS Simulator / Android Emulator)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/gameslot.git
    cd gameslot
    ```

## � Deployment

### Web App (Firebase Hosting)
To deploy the web version to production:
1.  Build the static files:
    ```bash
    npx expo export --platform web
    ```
2.  Deploy to Firebase:
    ```bash
    npx firebase deploy --only hosting
    ```
**URL:** [https://vbmastigameslot.web.app](https://vbmastigameslot.web.app)


### Mobile App (EAS Build)

## �🔒 Security

### Firestore Rules
Security rules are defined in `firestore.rules`. Deploy them using the Firebase CLI:
```bash
npx firebase deploy --only firestore:rules
```

### API Key Restrictions
To prevent unauthorized use of your Firebase API Key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Select your project.
3. Edit the **Browser key** (auto-created by Firebase).
4. **Application restrictions**:
   *   **Android apps**: 
       *   Package name: `com.masti.gameslot`
       *   SHA-1 fingerprint: `39:9D:7E:0E:72:06:F5:DE:75:31:28:F3:80:0A:F6:FA:E8:BF:80:D1` (Debug Key)
   *   **iOS apps**: 
       *   Bundle ID: `com.masti.gameslot`
   *   **Websites (HTTP referrers)**:
       *   `localhost` (for development)
       *   `127.0.0.1` (for development)
       *   `vbmastigameslot.web.app` (your production URL)
       *   `vbmastigameslot.firebaseapp.com` (your production URL)

   - Identity Toolkit API (this is Firebase Authentication)
   - Cloud Firestore API
   - Cloud Storage API
   - Firebase Installations API

## ⚡️ Cloud Functions (Backend)

The `functions/` directory contains Firebase Cloud Functions for Notifications and History cleanup.

### Setup

0.  **Log in to Firebase:**
    ```bash
    # Use npx to run the locally installed firebase-tools
    npx firebase login
    ```

1.  Navigate to the functions folder:
    ```bash
    cd functions
    npm install
    ```
2.  Set configuration variables (replace with your keys):
    ```bash
    npx firebase functions:config:set gmail.email="your-email@gmail.com" gmail.password="your-app-password"
    npx firebase functions:config:set twilio.sid="AC..." twilio.token="..." twilio.phone="+123..."
    ```

3.  Deploy functions:
    ```bash
    npx firebase deploy --only functions
    ```

## 📱 Build & Deploy

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up Firebase:
    *   Create a Firebase project.
    *   Enable **Authentication** (Email/Password).
    *   Enable **Firestore Database**.
    *   Copy your Firebase configuration into `firebaseConfig.ts` (or set up environment variables).

### Running the App

Start the development server:

```bash
npm start
```

*   Press `i` to run on iOS Simulator.
*   Press `a` to run on Android Emulator.
*   Scan the QR code with Expo Go to run on a physical device.

## Testing

Run unit and integration tests:

```bash
npm test
```

## Project Structure

```
/app              # Expo Router pages (screens)
  /(app)          # Protected routes (Home, Admin)
/components       # Reusable UI components
/context          # React Context (Auth)
/services         # Business logic & Firebase interactions
/utils            # Helper functions (Dates, Formatting)
/__tests__        # Unit and Integration tests
/tests/scripts    # E2E, Load, and UI Automation test scripts
```

## 🛠 Admin Utilities
Additional utility scripts for data management are located in `/scripts`.
- `seed_sports.js`: Initialize sports collection
- `cleanup_user.js`: Remove users via CLI
- `find_uid.js`: Look up User IDs
```

## 💰 Cost & Free Tier Information

This project is designed to run completely **FREE** for development and small-scale use, leveraging Firebase's generous free tiers.

*   **Cloud Functions**: The first **2,000,000 invocations per month** are free. You are required to be on the "Blaze" plan to deploy, but you will not be charged unless you exceed this massive limit.
*   **Firestore**: **50,000 reads/day** and **20,000 writes/day** are free.
*   **Authentication**: Free for unlimited email/password logins.
*   **Hosting** (if used): Generous free limits.

**Recommendation**: Set up a **Budget Alert** in the Google Cloud Console to notify you if you ever accidentally incur a charge (e.g., set a limit of $1).

### 🔔 Setting up a Budget Alert
1.  Go to the [Google Cloud Billing Console](https://console.cloud.google.com/billing).
2.  Select your project (`mygameslot-...`).
3.  In the left menu, click **Budgets & alerts**.
4.  Click **Create Budget**.
5.  **Name**: "Safety Alert".
6.  **Amount**: Select "Specified amount" and enter **$1.00**.
7.  **Actions**: Ensure "Email alerts to billing admins" is checked.
8.  Click **Finish**.

Now, if your usage ever exceeds $0.50 (50%), you'll get an email immediately!

## License

MIT
