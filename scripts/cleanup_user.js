const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // I need to check if this exists or use default

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Try default first
    projectId: "mygameslot-324a5"
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function deleteUserByEmail(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`Found user with UID: ${uid}`);

    // Delete from Firestore
    await db.collection("users").doc(uid).delete();
    console.log("Deleted from Firestore 'users' collection.");

    // Delete from Auth
    await auth.deleteUser(uid);
    console.log("Deleted from Firebase Authentication.");
    
    // Check if in any slots? (Optional but good)
    // For now core delete is enough.
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
        console.log("User not found in Auth. Checking Firestore only...");
        // Fallback: search firestore by email
        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (snapshot.empty) {
            console.log("No user found in Firestore either.");
        } else {
            for (const doc of snapshot.docs) {
                await doc.ref.delete();
                console.log(`Deleted Firestore doc: ${doc.id}`);
            }
        }
    } else {
        console.error("Error:", error);
    }
  }
}

deleteUserByEmail("deals2raj@gmail.com");
