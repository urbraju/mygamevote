// Simulated Firebase Server Validation Logic
// This replicates the exact logic inside "votingService.ts"

function validateVote(simulatedServerNow, opensAt, closesAt = 0) {
    if (simulatedServerNow < opensAt) {
        return `❌ FAILED: "Voting is not open yet!" (Tried to vote ${opensAt - simulatedServerNow}ms too early)`;
    }
    if (closesAt > 0 && simulatedServerNow > closesAt) {
        return `❌ FAILED: "Voting has ended!"`;
    }
    return `✅ SUCCESS: Server accepts vote!`;
}

console.log("==================================================");
console.log("   TESTING FAIRNESS QUEUE (MOCK SERVER LOGIC)    ");
console.log("==================================================\n");

// Scenario Setup
const REAL_SERVER_TIME = 10000;
const OPENS_AT = 15000; // Opens in exactly 5 seconds

console.log(`Event Officially Opens At: ${OPENS_AT}\n`);

// 1. FAST CLOCK (User 2)
// This user's phone clock is 2 seconds FAST. Their phone thinks it's 15000, but the server is only at 13000.
// They bypassed the UI button lock and sent a raw API request.
const fastUserClickTime = 13000; // True Server Time when they clicked early
console.log("[Attempt 1: FAST CLOCK / EARLY CLICKER]");
console.log(`User clicked 2 seconds early. Sending request...`);
console.log(validateVote(fastUserClickTime, OPENS_AT));


// 2. PERFECT CLOCK (User 1)
// This user waited until the true server time hit 15000. They click at exactly 15005.
console.log("\n[Attempt 2: PERFECT CLOCK / EXACT QUEUE SYNC]");
const perfectUserClickTime = 15005; // True Server Time when they clicked
console.log(`User clicked right as the event opened. Sending request...`);
console.log(validateVote(perfectUserClickTime, OPENS_AT));

console.log("\n==================================================");
