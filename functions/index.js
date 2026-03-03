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
 * Trigger: When a weekly slot document is updated.
 */
exports.sendVoteNotification = functions.firestore
    .document("weekly_slots/{weekId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        const newSlots = newValue.slots || [];
        const oldSlots = previousValue.slots || [];

        // Find users in newSlots that are not in oldSlots
        const addedUsers = newSlots.filter(
            (newUser) => !oldSlots.find((oldUser) => oldUser.userId === newUser.userId)
        );

        for (const user of addedUsers) {
            console.log(`New weekly vote detected: ${user.userName} (${user.userId})`);
            await notifyUserOfConfirmation(user.userId, `Slot Confirmed!`, `You have successfully voted for the game on ${newValue.weekId}.`);
        }
    });

/**
 * Trigger: When a multi-sport EVENT document is updated.
 */
exports.sendEventVoteNotification = functions.firestore
    .document("events/{eventId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        const newSlots = newValue.slots || [];
        const oldSlots = previousValue.slots || [];

        // Find users in newSlots that are not in oldSlots
        const addedUsers = newSlots.filter(
            (newUser) => !oldSlots.find((oldUser) => oldUser.userId === newUser.userId)
        );

        for (const user of addedUsers) {
            const sportName = newValue.sportName || "the event";
            const dateStr = newValue.eventDate ? new Date(newValue.eventDate).toLocaleDateString() : "upcoming date";

            console.log(`New event vote detected: ${user.userName} for ${sportName}`);
            await notifyUserOfConfirmation(
                user.userId,
                `${sportName} Slot Confirmed!`,
                `You're in! Your slot for ${sportName} on ${dateStr} is confirmed.`
            );
        }
    });

/**
 * Helper to handle both Email and Push Notifications
 */
async function notifyUserOfConfirmation(userId, title, body) {
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();

        // 1. Send Email if configured
        if (userData.email) {
            await sendEmail(userData.email, title, body);
        }

        // 2. Send Push Notification if token exists
        if (userData.pushToken) {
            await sendPushNotification(userData.pushToken, title, body);
        }
    } catch (error) {
        console.error(`Error notifying user ${userId}:`, error);
    }
}

/**
 * Trigger: Scheduled function to clean up old history.
 * Runs every Sunday at midnight.
 */
exports.cleanupHistory = functions.pubsub.schedule("every sunday 00:00").onRun(async (context) => {
    console.log("Cleanup function ran.");
    return null;
});

/**
 * Trigger: When a new user document is created.
 */
exports.onUserCreate = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
        const newValue = change.after.data();
        if (!change.before.exists && newValue && newValue.isApproved === false) {
            console.log(`New user needs approval: ${newValue.email}`);

            const adminEmail = GMAIL_EMAIL || "urbraju@gmail.com";
            const subject = "New User Pending Approval - MyGameVote";
            const body = `A new user has signed up and is waiting for approval:\n\n` +
                `Email: ${newValue.email}\n` +
                `Name: ${newValue.firstName || ''} ${newValue.lastName || ''}\n\n` +
                `Please log in to the Admin Dashboard to review and approve: https://mygamevote.web.app/admin`;

            await sendEmail(adminEmail, subject, body);
        }
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
    const { uid, orgId } = data; // uid: target user to delete, orgId: optional for org-admin check

    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a user UID.');
    }

    // Verify Admin Status
    const superAdmins = ['urbraju@gmail.com', 'brutechgyan@gmail.com'];
    const callerDoc = await db.collection('users').doc(callerUid).get();

    // 1. Check if user is Global Admin OR hardcoded Super-Admin
    const isCallerGlobalAdmin = callerDoc.exists && callerDoc.data().isAdmin;
    const isCallerSuper = context.auth.token.email && superAdmins.includes(context.auth.token.email.toLowerCase());

    let isAuthorized = isCallerGlobalAdmin || isCallerSuper;

    // 2. If not a Global Admin, check if they are an Org Admin for the specific org
    if (!isAuthorized && orgId) {
        console.log(`[deleteAuthUser] Checking Org Admin status for ${callerUid} in org ${orgId}`);
        const orgDoc = await db.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
            const orgData = orgDoc.data();
            const isAdminOfThisOrg = (orgData.admins || []).includes(callerUid);

            if (isAdminOfThisOrg) {
                // Verify the target user actually belongs to this organization
                const targetUserDoc = await db.collection('users').doc(uid).get();
                if (targetUserDoc.exists) {
                    const targetUserData = targetUserDoc.data();
                    const isMemberOfOrg = (targetUserData.orgIds || []).includes(orgId);

                    if (isMemberOfOrg) {
                        console.log(`[deleteAuthUser] Org Admin authorized for deletion.`);
                        isAuthorized = true;
                    } else {
                        console.warn(`[deleteAuthUser] Security: Org Admin ${callerUid} tried to delete user ${uid} who is NOT in org ${orgId}`);
                    }
                }
            }
        }
    }

    if (!isAuthorized) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users.');
    }

    try {
        console.log(`[deleteAuthUser] Deleting user ${uid} requested by ${callerUid}`);

        // 1. Delete from Authentication (Gracefully handle if already gone)
        try {
            await admin.auth().deleteUser(uid);
            console.log(`[deleteAuthUser] Auth user deleted.`);
        } catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                console.log(`[deleteAuthUser] Auth user already missing/deleted. Proceeding to Firestore cleanup.`);
            } else {
                throw authError; // Re-throw other unexpected auth errors
            }
        }

        // 2. Delete from Firestore (Always attempt cleanup)
        await db.collection('users').doc(uid).delete();
        console.log(`[deleteAuthUser] Firestore profile deleted.`);

        return { success: true };
    } catch (error) {
        console.error('[deleteAuthUser] Error:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

async function sendEmail(to, subject, text) {
    if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
        console.log("Email config missing. Mock sending to:", to);
        return;
    }
    const mailOptions = {
        from: `MyGameVote <${GMAIL_EMAIL}>`,
        to: to,
        subject: subject,
        text: text,
    };
    try {
        await mailTransport.sendMail(mailOptions);
        console.log("Email sent to:", to);
    } catch (e) {
        console.error("Failed to send email:", e.message);
    }
}

async function sendPushNotification(token, title, body) {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: token,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Push notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

// Helper for week number (ISO)
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * Callable: Securely join an organization via invite code
 */
exports.joinOrganizationByCode = functions.https.onCall(async (data, context) => {
    // 1. Verify Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to join an organization.');
    }

    const { inviteCode } = data;
    if (!inviteCode || typeof inviteCode !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'A valid invite code is required.');
    }

    const userId = context.auth.uid;
    const code = inviteCode.trim().toUpperCase();

    try {
        console.log(`[joinOrg] User ${userId} attempting to join with code: ${code}`);

        // 2. Find Organization by Invite Code
        const orgsSnapshot = await db.collection('organizations').where('inviteCode', '==', code).get();
        if (orgsSnapshot.empty) {
            console.warn(`[joinOrg] Invalid invite code: ${code}`);
            throw new functions.https.HttpsError('not-found', 'Invalid invite code.');
        }

        const orgDoc = orgsSnapshot.docs[0];
        const orgId = orgDoc.id;
        const orgData = orgDoc.data();

        // 3. User check - avoid redundant updates
        const isMember = (orgData.members || []).includes(userId);
        const isPending = (orgData.pendingMembers || []).includes(userId);

        if (isMember || isPending) {
            console.log(`[joinOrg] User ${userId} is already a member or pending in ${orgId}.`);
            return { orgId, status: isMember ? 'member' : 'pending' };
        }

        // 4. Determine Approval Requirement
        let requireApproval = orgData.settings?.requireApproval;

        // If default org or setting missing, check global setting
        if (orgId === 'default' || requireApproval === undefined) {
            const generalSettingsDoc = await db.collection('settings').doc('general').get();
            if (generalSettingsDoc.exists) {
                requireApproval = generalSettingsDoc.data().requireApproval ?? false;
            } else {
                requireApproval = false;
            }
        }

        console.log(`[joinOrg] Adding user ${userId} to ${orgId}. RequireApproval: ${requireApproval}`);

        const orgRef = db.collection('organizations').doc(orgId);
        const userRef = db.collection('users').doc(userId);

        // 5. Securely execute writes using Admin SDK (bypasses security rules)
        if (requireApproval) {
            await orgRef.update({
                pendingMembers: admin.firestore.FieldValue.arrayUnion(userId)
            });
            // Ensure global profile reflects pending status
            await userRef.update({ isApproved: false });
            return { orgId, status: 'pending' };
        } else {
            // Auto-Approve workflow
            await orgRef.update({
                members: admin.firestore.FieldValue.arrayUnion(userId)
            });

            await userRef.update({
                isApproved: true,
                orgIds: admin.firestore.FieldValue.arrayUnion(orgId),
                activeOrgId: orgId
            });
            return { orgId, status: 'approved' };
        }

    } catch (error) {
        console.error('[joinOrganizationByCode] Error:', error);
        // Throw proper https error if we haven't already
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', 'An error occurred while joining the organization.');
    }
});

/**
 * Callable: Securely create a new organization and make the caller an org admin
 */
exports.createOrganization = functions.https.onCall(async (data, context) => {
    // 1. Verify Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to create an organization.');
    }

    const { orgName } = data;
    if (!orgName || typeof orgName !== 'string' || orgName.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'A valid organization name is required.');
    }

    const userId = context.auth.uid;
    const cleanOrgName = orgName.trim();

    try {
        console.log(`[createOrg] User ${userId} creating organization: ${cleanOrgName}`);

        // 2. Generate secure slugs and invite codes
        const baseSlug = cleanOrgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const orgId = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let inviteCode = '';
        for (let i = 0; i < 6; i++) {
            inviteCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const newOrg = {
            name: cleanOrgName,
            ownerId: userId,
            createdAt: Date.now(),
            inviteCode: inviteCode,
            settings: {
                requireApproval: true,
                allowPublicVoting: false,
                currency: 'USD',
            },
            members: [userId],
            pendingMembers: [],
            admins: [userId],
        };

        // 3. Securely execute writes using Admin SDK (bypasses security rules)
        const orgRef = db.collection('organizations').doc(orgId);
        const userRef = db.collection('users').doc(userId);

        await orgRef.set(newOrg);

        // 4. Update the user profile (NOTE: we deliberately DO NOT grant global isAdmin here)
        await userRef.update({
            orgIds: admin.firestore.FieldValue.arrayUnion(orgId),
            activeOrgId: orgId,
            isApproved: true
        });

        console.log(`[createOrg] Success! OrgId: ${orgId}, Invite Code: ${inviteCode}`);
        return { orgId, inviteCode };

    } catch (error) {
        console.error('[createOrganization] Error:', error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', 'An error occurred while creating the organization.');
    }
});
