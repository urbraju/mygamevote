# Multi-Tenancy Technical Overview 🏢

This document outlines the architecture, security model, and performance considerations for the multi-tenancy implementation in MyGameVote.

## 1. Architecture: Logical Isolation
The application uses a **Shared Database, Shared Schema** model. This means all organizations (tenants) share the same Firestore collections, but their data is logically separated.

### The `orgId` Identifier
Every document in the following collections is "stamped" with an `orgId`:
- `events`
- `sports`
- `weekly_slots`
- `invitations`

The `default` organization ID is preserved for the primary "Masti" group to ensure backwards compatibility.

## 2. Security Model
Data isolation is enforced at the **Database Layer** using Firestore Security Rules. This ensures that even if the frontend code is compromised, a user cannot access data from an organization they don't belong to.

### Security Rule Logic
```javascript
function isMemberOf(orgId) {
  return isAuthenticated() && (
    isAdmin() || // Global admin bypass
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
     orgId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.orgIds)
  );
}
```

### Key Security Principles:
1. **User Profile**: Each user document contains an `orgIds` array.
2. **Read Enforcement**: Every `allow read` rule checks if the document's `orgId` matches one of the user's `orgIds`.
3. **Write Enforcement**: Admins can only create or update documents within their own organization.

## 3. Data Ownership
- All data resides within the **Platform Owner's Firebase Project** (`mygameslot-324a5`).
- Users and Organization owners are "tenants" on your platform.
- You (the developer) have ultimate access to all data via the Firebase Console or Admin SDK.

## 4. Performance & Scaling
Firestore is designed to scale horizontally across tenants.
- **Index-Based Performance**: We use a composite index on `orgId`. Query performance is determined by the size of the result set (e.g., how many events *one* group has), not by how many total groups exist in the system.
- **Noisy Neighbors**: High activity in one organization will not impact the query performance of another.
- **Limits**: Organizations should be aware of the 1 write-per-second limit on a single document (relevant if hundreds of users try to join the same slot at the exact same millisecond).

## 5. Long-Term Considerations & Risks
### ⚠️ Security Rule Maintenance
The integrity of the multi-tenancy system relies entirely on `firestore.rules`.
- **Action**: Always run the automated security rule tests after any modification to the database schema.
- **Risk**: Deleting the `orgId` check from a rule will immediately make that data public to all authenticated users.

### ⚠️ Data Portability
If an organization grows and decides to move to their own dedicated app:
- **Challenge**: Extracting their specific data is a manual process requiring a migration script filtered by their `orgId`.
- **Strategy**: Maintain clean data structures to facilitate future exports if requested.

### ⚠️ Centralized Failure
As the platform owner, your Firebase account is a single point of failure for all tenants.
- **Action**: Ensure billing is current and automated backups (via Google Cloud Storage) are enabled for the Firestore database.

## 6. Project "Simple Mode"
For the primary Masti community, the app supports a **Safety Toggle** (managed in System Settings).
- When `multiTenancyEnabled` is `false`, the UI hides all organization-switching logic.
- New users are automatically routed to the `default` organization.
- This minimizes UX friction for the core group while the infrastructure remains multi-tenant ready.
