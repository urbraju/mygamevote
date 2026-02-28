# Automated CI/CD Setup Guide (Remaining Tasks)

We have already committed the GitHub Action workflow files (`.github/workflows/deploy-web.yml` and `publish-mobile.yml`) to the repository. The automation is running! 

However, the initial run failed because GitHub does not have the necessary security tokens to actually deploy the code yet.

When you return, you just need to generate three specific tokens and save them as GitHub "Repository Secrets". 

Once you complete these steps, GitHub will automatically handle all future deployments for you!

---

## 📍 Where to Add Secrets
For all the steps below, you will need to paste the generated secrets into this exact GitHub page:
👉 **[https://github.com/urbraju/mygamevote/settings/secrets/actions](https://github.com/urbraju/mygamevote/settings/secrets/actions)**

On that page, click the green **New repository secret** button.

### Secret 1: EXPO_TOKEN (For Mobile App Updates)
1. Go to: [https://expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Click **Create token** and copy the string.
3. In your GitHub Secrets page, add a new secret:
   - **Name:** `EXPO_TOKEN`
   - **Secret:** *(Paste the Expo string here)*

### Secret 2: FIREBASE_SERVICE_ACCOUNT (For Web App Deployments)
Because the automated CLI tool threw a 404 error, we must generate this manual Firebase Key:
1. Go to: [https://console.firebase.google.com/project/mygameslot-324a5/settings/serviceaccounts/adminsdk](https://console.firebase.google.com/project/mygameslot-324a5/settings/serviceaccounts/adminsdk)
2. Scroll to the bottom and click **Generate new private key**.
3. It will download a `.json` file to your Mac. Open that file and copy *all* of the text inside.
4. In your GitHub Secrets page, add a new secret:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_MYGAMESLOT_324A5`
   - **Secret:** *(Paste the entire JSON text here)*

### Secret 3: Google Client ID (For Web Login)
The web bundler needs the Google Client ID to compile successfully.
1. In your GitHub Secrets page, add a new secret:
   - **Name:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **Secret:** `1007954153926-t7n8pbnllms4igegshj6p7m3omtd423e.apps.googleusercontent.com`

---

## ✅ Final Step: Run it Again!
Once you have saved all three of those secrets cleanly on the GitHub page:
1. Go to the Actions tab on your repository: [https://github.com/urbraju/mygamevote/actions](https://github.com/urbraju/mygamevote/actions)
2. Click on the failed workflow: `chore: test GitHub Actions CI/CD deployment pipeline`
3. Click the **Re-run all jobs** button in the top right corner.

Watch the terminal process turn green. You are officially done!
