const functions = require("firebase-functions");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { subWeeks } = require("date-fns");

admin.initializeApp();
const db = admin.firestore();

// --- Modern Configuration (Define strings for future-proofing) ---
const GMAIL_EMAIL = defineString('GMAIL_EMAIL');
const GMAIL_PASSWORD = defineString('GMAIL_PASSWORD');
const TWILIO_SID = defineString('TWILIO_SID');
const TWILIO_TOKEN = defineString('TWILIO_TOKEN');
const TWILIO_PHONE = defineString('TWILIO_PHONE');
const SERPER_KEY = defineString('SERPER_KEY');
const NEWS_KEY = defineString('NEWS_KEY');

// --- Email Transporter (Initialized lazily to avoid top-level param.value() failure) ---
let mailTransport = null;
function getMailTransport() {
    if (mailTransport) return mailTransport;
    const email = GMAIL_EMAIL.value();
    const password = GMAIL_PASSWORD.value();
    
    if (email && password) {
        mailTransport = nodemailer.createTransport({
            service: "gmail",
            auth: { user: email, pass: password },
        });
    }
    return mailTransport;
}

// --- SMS Client (Initialized lazily) ---
let twilioClient = null;
function getTwilioClient() {
    if (twilioClient) return twilioClient;
    const sid = TWILIO_SID.value();
    const token = TWILIO_TOKEN.value();
    if (sid && token) {
        twilioClient = twilio(sid, token);
    }
    return twilioClient;
}

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

            const adminEmail = GMAIL_EMAIL.value() || "urbraju@gmail.com";
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
                // Verify the target user actually belongs to this organization, OR is currently unassigned
                const targetUserDoc = await db.collection('users').doc(uid).get();
                if (targetUserDoc.exists) {
                    const targetUserData = targetUserDoc.data();
                    const userOrgs = targetUserData.orgIds || [];
                    const isMemberOfOrg = userOrgs.includes(orgId);
                    const isUnassigned = userOrgs.length === 0;

                    if (isMemberOfOrg || isUnassigned || (orgId === 'default' && !userOrgs.includes('default'))) {
                        console.log(`[deleteAuthUser] Org Admin authorized for deletion. Member=${isMemberOfOrg}, Unassigned=${isUnassigned}, DefaultFallback=${orgId === 'default'}`);
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
    const transport = getMailTransport();
    if (!transport) {
        console.log("Email config missing. Mock sending to:", to);
        return;
    }
    const mailOptions = {
        from: `MyGameVote <${GMAIL_EMAIL.value()}>`,
        to: to,
        subject: subject,
        text: text,
    };
    try {
        await transport.sendMail(mailOptions);
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
                weeklyGamesEnabled: true,
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
/**
 * Shared Helper: The core Intelligence Engine update loop.
 */
async function performSportsHubRefresh() {
    const serperKey = SERPER_KEY.value();
    const newsKey = NEWS_KEY.value();

    if (!serperKey || !newsKey) {
        console.warn("[Refresh] API keys missing (SERPER_KEY or NEWS_KEY). Skipping external discovery.");
        return { success: false, error: "API keys missing" };
    }

    const sportsSnap = await db.collection("sports_catalog").get();
    let updatedCount = 0;

    for (const sportDoc of sportsSnap.docs) {
        const sportId = sportDoc.id;
        const sportData = sportDoc.data();
        const sportName = sportData.name;

        console.log(`[Refresh] Processing ${sportName}...`);

        try {
            // 1. Fetch Events from Serper
            const events = await fetchEventsFromSerper(sportName, serperKey);

            // 2. Fetch News from NewsAPI
            const news = await fetchNewsFromNewsAPI(sportName, newsKey);

            // 3. Fetch Deals/Shopping results
            const deals = await fetchDealsFromSerper(sportName, serperKey);

            // 4. Update Firestore
            await sportDoc.ref.update({
                events: events.length > 0 ? events : sportData.events,
                news: news.length > 0 ? news : sportData.news,
                deals: deals.length > 0 ? deals : sportData.deals,
                lastAutoRefresh: admin.firestore.FieldValue.serverTimestamp()
            });

            updatedCount++;
            console.log(`[Refresh] Successfully updated ${sportName}: ${events.length} events, ${news.length} news, ${deals.length} deals.`);
        } catch (sportError) {
            console.error(`[Refresh] Error processing ${sportName}:`, sportError.message);
        }
    }
    return updatedCount;
}

/**
 * Automated Sports Hub Refresh
 * Scheduled to run on the 1st of every month at midnight.
 */
exports.refreshSportsHub = functions.pubsub.schedule("0 0 1 * *").onRun(async (context) => {
    try {
        const count = await performSportsHubRefresh();
        console.log(`[Refresh] Scheduled run complete. Updated ${count} sports.`);
    } catch (e) {
        console.error("[Refresh] Scheduled run failed:", e.message);
    }
    return null;
});

/**
 * On-Demand Sports Hub Refresh
 * Callable by Super Admins only.
 */
exports.refreshSportsHubOnDemand = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    }

    const superAdmins = ['urbraju@gmail.com', 'brutechgyan@gmail.com', 'support@mygamevote.com'];
    const isSuper = context.auth.token.email && superAdmins.includes(context.auth.token.email.toLowerCase());

    if (!isSuper) {
        throw new functions.https.HttpsError('permission-denied', 'Super Admin access required.');
    }

    try {
        const count = await performSportsHubRefresh();
        return { success: true, count };
    } catch (error) {
        console.error("[Refresh] On-demand failed:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Callable: Perform an on-demand "Smart Search" for gear
 * Returns top 3 shopping results from Serper.
 */
exports.searchSportGear = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    }

    const { query, sportName } = data;
    if (!query) {
        throw new functions.https.HttpsError('invalid-argument', 'Search query is required.');
    }

    const serperKey = SERPER_KEY.value();

    if (!serperKey) {
        console.warn(`[SmartSearch] Serper key missing. Returning stable search fallback for "${query}"`);
        // Fallback: Return a single "high quality" guess using Dick's search
        const qSafe = encodeURIComponent(sportName ? `${sportName} ${query}` : query);
        return {
            success: true,
            isFallback: true,
            amazonSearchUrl: `https://www.amazon.com/s?k=${qSafe}`,
            googleSearchUrl: `https://www.google.com/search?q=${qSafe}`,
            results: [{
                title: `Search for ${query} Gear`,
                price: "See Retailer",
                shopUrl: `https://www.dickssportinggoods.com/search/SearchDisplay?searchTerm=${qSafe}`,
                imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c64b52d3?w=100&h=100&fit=crop', // generic sport placeholder
                stableSearchUrl: `https://www.dickssportinggoods.com/search/SearchDisplay?searchTerm=${qSafe}`
            }]
        };
    }

    try {
        console.log(`[SmartSearch] Searching for "${query}" in sport "${sportName || 'general'}"`);
        const fullQuery = sportName ? `${sportName} ${query}` : query;
        const results = await fetchDealsFromSerper(fullQuery, serperKey);
        
        const qSafe = encodeURIComponent(sportName ? `${sportName} ${query}` : query);
        return { 
            success: true, 
            amazonSearchUrl: `https://www.amazon.com/s?k=${qSafe}`,
            googleSearchUrl: `https://www.google.com/search?q=${qSafe}`,
            results: results.slice(0, 3) 
        };
    } catch (error) {
        console.error("[SmartSearch] Search failed:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Helper: Fetch upcoming sports events via Serper Google Search
 */
async function fetchEventsFromSerper(sportName, apiKey) {
    const query = `${sportName} major tournaments 2026 schedule events`;
    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query, gl: "us", hl: "en" })
        });

        const data = await response.json();
        const organic = data.organic || [];

        return organic.slice(0, 3).map(res => ({
            title: res.title,
            date: "Check schedule",
            location: "Global / TBD",
            trackUrl: res.link
        }));
    } catch (error) {
        console.error(`[Serper] Failed for ${sportName}:`, error.message);
        return [];
    }
}

/**
 * Helper: Fetch gear deals via Serper Google Shopping/Search
 */
async function fetchDealsFromSerper(sportName, apiKey) {
    const query = `${sportName} gear deals`;
    try {
        const response = await fetch("https://google.serper.dev/shopping", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query, gl: "us", hl: "en" })
        });
 
        const data = await response.json();
        const shopping = data.shopping || [];
 
        return shopping.slice(0, 3).map(res => ({
            title: res.title,
            price: res.price || "Check Site",
            shopUrl: res.link,
            imageUrl: res.imageUrl || ""
        }));
    } catch (error) {
        console.error(`[Deals] Failed for ${sportName}:`, error.message);
        return [];
    }
}

/**
 * Helper: Fetch latest sports news via NewsAPI
 */
async function fetchNewsFromNewsAPI(sportName, apiKey) {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(sportName + " sport news")}&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "ok") return [];

        return (data.articles || []).map(article => ({
            title: article.title,
            source: article.source.name,
            url: article.url,
            date: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recent"
        }));
    } catch (error) {
        console.error(`[NewsAPI] Failed for ${sportName}:`, error.message);
        return [];
    }
}
