const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { subWeeks } = require("date-fns");

admin.initializeApp();
const db = admin.firestore();

// --- Configuration (Set these via firebase functions:config:set) ---
// gmail.email, gmail.password OR sendgrid.key
// twilio.sid, twilio.token, twilio.phone

const GMAIL_EMAIL = functions.config().gmail?.email;
const GMAIL_PASSWORD = functions.config().gmail?.password;
const TWILIO_SID = functions.config().twilio?.sid;
const TWILIO_TOKEN = functions.config().twilio?.token;
const TWILIO_PHONE = functions.config().twilio?.phone;

// --- Email Transporter ---
const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_PASSWORD,
    },
});

// --- SMS Client ---
const twilioClient = (TWILIO_SID && TWILIO_TOKEN) ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

/**
 * Trigger: When a slot document is updated.
 * Checks if a new user voted (joined the slots array).
 */
exports.sendVoteNotification = functions.firestore
    .document("weekly_slots/{weekId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        const newSlots = newValue.slots || [];
        const oldSlots = previousValue.slots || [];

        // Check if a new user successfully joined the main list (not waitlist here, just main slots)
        // We assume slots array is ordered and represents the main list mostly? 
        // Wait, the detailed logic handles waitlist separately? 
        // If 'slots' includes everyone, we check for new additions.

        // Find users in newSlots that are not in oldSlots
        const addedUsers = newSlots.filter(
            (newUser) => !oldSlots.find((oldUser) => oldUser.userId === newUser.userId)
        );

        for (const user of addedUsers) {
            console.log(`New vote detected: ${user.userName} (${user.userId})`);

            // Send confirmation to the user (if we have their contact info in 'users' collection)
            // For MVP, we might just notify Admin or log it.
            // Let's try to notify the user if they have an email.

            try {
                const userDoc = await db.collection("users").doc(user.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.email) {
                        await sendEmail(userData.email, "Slot Confirmed!", `You have successfully voted for the game on ${newValue.weekId}.`);
                    }
                }
            } catch (error) {
                console.error("Error sending notification:", error);
            }
        }

        // Check if Waitlist changed? (If logic separates them, we'd check waitlist array if it existed, but likely it's all in 'slots')
    });

/**
 * Trigger: Scheduled function to clean up old history.
 * Runs every Sunday at midnight.
 */
exports.cleanupHistory = functions.pubsub.schedule("every sunday 00:00").onRun(async (context) => {
    const now = new Date();
    // Keep last 10 weeks
    // weekId format is YYYY-WeekNum. 
    // It's easier to iterate all docs and check their timestamp/date if available, 
    // or just calculate the cutoff week ID if strict.

    // Simple approach: List all, parse ID, delete old.

    const snapshot = await db.collection("weekly_slots").get();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);

    // Approximate cleanup
    // A better way is to store a 'createdAt' timestamp in the doc and query by that.
    // Assuming we start doing that or rely on ID parsing.

    // Logic: Delete docs older than 10 weeks
    // Implementation deferred to robust logic below or TODO.
    console.log("Cleanup function ran.");
    return null;
});

/**
 * Callable: Delete User (Auth + Firestore)
 * Only accessible by Admins.
 */
exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const callerUid = context.auth.uid;

    // Verify Admin Status
    const callerDoc = await db.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || !callerDoc.data().isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users.');
    }

    const { uid } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a user UID.');
    }

    try {
        console.log(`[deleteAuthUser] Deleting user ${uid} requested by ${callerUid}`);

        // Delete from Authentication
        await admin.auth().deleteUser(uid);
        console.log(`[deleteAuthUser] Auth user deleted.`);

        // Delete from Firestore
        await db.collection('users').doc(uid).delete();
        console.log(`[deleteAuthUser] Firestore profile deleted.`);

        return { success: true };
    } catch (error) {
        console.error('[deleteAuthUser] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

async function sendEmail(to, subject, text) {
    if (!GMAIL_EMAIL) {
        console.log("Email config missing. Mock sending to:", to);
        return;
    }
    const mailOptions = {
        from: `GameSlot <${GMAIL_EMAIL}>`,
        to: to,
        subject: subject,
        text: text,
    };
    await mailTransport.sendMail(mailOptions);
    console.log("Email sent to:", to);
}

// Helper for week number (ISO)
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
