# Testing Sports Interest Validation

## How to Test

To verify that the sports interest validation is working correctly, follow these steps:

### Step 1: Check Current State
1. Open the browser console (F12 or Cmd+Option+I)
2. Look for logs starting with `[Home]` when you click "Secure Slot"
3. Check if you see the amber warning banner at the top of the Home screen

### Step 2: Test Without Interests
To properly test the validation:

1. **Go to Profile page**
2. **Remove all sports interests** (uncheck all sports)
3. **Save changes**
4. **Return to Home page**
5. **Try to vote** by clicking "Secure Slot"

### Expected Behavior

**If you have NO sports interests:**
- ✅ Amber warning banner appears at top of Home screen
- ✅ Clicking "Secure Slot" shows alert: "No Sports Interests"
- ✅ Alert has two buttons: "Cancel" and "Set Interests"
- ✅ Console shows: `[Home] Checking sports interests. Count: 0`
- ✅ Console shows: `[Home] No sports interests - showing alert`

**If you HAVE sports interests:**
- ❌ No warning banner
- ❌ Clicking "Secure Slot" proceeds with voting (or shows voting-related errors)
- ✅ Console shows: `[Home] Checking sports interests. Count: X` (where X > 0)

### Troubleshooting

If the alert doesn't appear on web but console logs show the validation is running:
- This is a known limitation of React Native's `Alert.alert()` on web
- The warning banner should still be visible
- Consider using a custom modal component for better web support

## Current User Status

Based on the console logs, the user `urbraju@gmail.com` is:
- ✅ Logged in
- ✅ Admin
- ✅ Approved
- ❓ Sports interests status: Unknown (need to check profile)
