const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "mygameslot-324a5"
  });
}

const db = admin.firestore();
const uid = "axQj127BDKaPxiVbS4zE4KblTp62";

async function run() {
  try {
    await db.collection("users").doc(uid).delete();
    console.log("SUCCESS: Firestore user deleted.");
  } catch (e) {
    console.error("ERROR:", e);
  }
}

run();
