/**
 * Auth Context
 * 
 * Manages the global authentication state of the application.
 * - Provides `user`, `loading`, and `isAdmin` states to the app.
 * - Wraps Firebase Auth state change listener.
 * - Exposes generic `signIn`, `signUp`, and `logout` wrappers.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { useRouter, useSegments } from 'expo-router';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Platform, Alert, View, Text, ActivityIndicator } from 'react-native';
import { useRef } from 'react';
import { Organization, organizationService } from '../services/organizationService';
import { adminService } from '../services/adminService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isOrgAdmin: boolean;
    isApproved: boolean | null;
    activeOrgId: string;
    setActiveOrgId: (orgId: string) => void;
    organizations: Organization[];
    multiTenancyEnabled: boolean;
    sportsInterests: string[];
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    isOrgAdmin: false,
    isApproved: null,
    activeOrgId: 'default',
    setActiveOrgId: () => { },
    organizations: [],
    multiTenancyEnabled: true,
    sportsInterests: []
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isApproved, setIsApproved] = useState<boolean | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [activeOrgId, setActiveOrgId] = useState('default');
    const [isOrgAdmin, setIsOrgAdmin] = useState(false);
    const [multiTenancyEnabled, setMultiTenancyEnabled] = useState(true);
    const [sportsInterests, setSportsInterests] = useState<string[]>([]);

    // Refs to track current state for snapshot listeners (avoiding closure issues)
    const isAdminRef = useRef(false);
    const isApprovedRef = useRef<boolean | null>(null);
    const lastAdminPromote = useRef(0);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        console.log('[AuthContext] v1.2 - Realtime Snapshot & No-Auto-Logout');
        console.log('[AuthContext] Setting up onAuthStateChanged listener...');
        let profileUnsubscribe: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            console.log('[AuthContext] Auth state changed:', authUser?.email || 'Logged Out');

            // Clean up previous listener if any
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (authUser) {
                setUser(authUser);
                // Keep loading true until profile flows in
                setLoading(true);

                // Subscribe to Profile Changes
                const userRef = doc(db, 'users', authUser.uid);

                profileUnsubscribe = onSnapshot(userRef, async (userDoc) => {
                    console.log('[AuthContext] Profile Update:', userDoc.exists() ? 'Exists' : 'Missing');

                    // 1. Handle Missing Profile (Race condition with SignUp or Zombie User)
                    if (!userDoc.exists()) {
                        console.log('[AuthContext] No Firestore profile found. Waiting 2s before creation (Race Condition Protection)...');

                        // Wait 2 seconds to allow AuthService.signUp to write the profile first
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Check again after delay
                        const doubleCheckSnap = await getDoc(userRef);
                        if (doubleCheckSnap.exists()) {
                            console.log('[AuthContext] Profile appeared after delay. Handling as normal update.');
                            // The listener will fire again automatically for this update, so we can just return.
                            return;
                        }

                        console.log('[AuthContext] Profile still missing after delay. checking settings before creating default...');

                        // CHECK SETTINGS (Race Condition Fix)
                        // DEFAULT: PENDING (Safety First).
                        // If we can't verify settings, we assume approval is required.
                        let shouldBeApproved = false;
                        try {
                            const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
                            if (settingsSnap.exists()) {
                                const settings = settingsSnap.data();
                                // Only approve if EXPLICITLY not required
                                if (!settings.requireApproval) {
                                    shouldBeApproved = true;
                                    console.log('[AuthContext] requireApproval is OFF. Auto-approving.');
                                } else {
                                    console.log('[AuthContext] requireApproval is ON. Defaulting to PENDING.');
                                }
                            } else {
                                console.log('[AuthContext] No settings doc. Defaulting to PENDING.');
                            }
                        } catch (err) {
                            console.warn("[AuthContext] Error reading settings (defaulting to PENDING):", err);
                        }

                        // Create profile
                        // This write will trigger another snapshot update!
                        try {
                            await setDoc(userRef, {
                                uid: authUser.uid,
                                email: authUser.email,
                                createdAt: Date.now(),
                                isAdmin: false,
                                isApproved: shouldBeApproved,
                                displayName: authUser.displayName || '',
                            });
                            console.log('[AuthContext] Default profile created. Approved:', shouldBeApproved);
                        } catch (e) {
                            console.error('[AuthContext] Error creating profile:', e);
                        }
                        setIsApproved(null); // Reset while loading to prevent stale state jumps
                        return;
                    }

                    // 2. Read Profile Data
                    const data = userDoc.data();
                    setSportsInterests(data.sportsInterests || []);

                    // Admin Check
                    const isManualAdmin = ['urbraju@gmail.com', 'brutechgyan@gmail.com'].includes(authUser.email || '');
                    const isFirestoreAdmin = data.isAdmin === true;
                    const finalIsAdmin = isFirestoreAdmin || isManualAdmin;

                    if (isAdminRef.current !== finalIsAdmin) {
                        console.log('[AuthContext] Setting isAdmin:', finalIsAdmin);
                        isAdminRef.current = finalIsAdmin;
                        setIsAdmin(finalIsAdmin);
                    }

                    if (isManualAdmin && !isFirestoreAdmin && (Date.now() - lastAdminPromote.current > 10000)) {
                        console.log('[AuthContext] Manual Admin detected, promoting...');
                        lastAdminPromote.current = Date.now();
                        const userRefPromote = doc(db, 'users', authUser.uid);
                        updateDoc(userRefPromote, { isAdmin: true }).catch(console.error);
                    }

                    // 3. Multi-Tenancy Logic & Approval Mapping
                    try {
                        const [orgConfigs, sysConfig] = await Promise.all([
                            organizationService.getUserOrganizations(authUser.uid),
                            adminService.getSystemConfig()
                        ]);

                        setOrganizations(orgConfigs);
                        setMultiTenancyEnabled(sysConfig.multiTenancyEnabled);

                        // If not enabled, always force 'default'
                        const effectiveOrgId = sysConfig.multiTenancyEnabled ? (data.activeOrgId || 'default') : 'default';
                        setActiveOrgId(effectiveOrgId);

                        // Determine if Org Admin
                        const activeOrg = orgConfigs.find(o => o.id === effectiveOrgId);
                        const isOrgAdm = activeOrg?.admins?.includes(authUser.uid) || !!isFirestoreAdmin || isManualAdmin;
                        setIsOrgAdmin(isOrgAdm);

                        // --- Organization-Specific Approval Logic ---
                        let approved = false;

                        if (orgConfigs.length === 0) {
                            // 1. Onboarding State (No Orgs yet)
                            // We allow them to be "approved" at the UI level so they can see the "Join Org" or "Select Interests" screens
                            approved = true;
                            console.log('[AuthContext] Onboarding state (No Orgs) - Derived approved=true');
                        } else {
                            // 2. Joined state - strictly check membership in active organization
                            const activeOrg = orgConfigs.find(o => o.id === effectiveOrgId);
                            if (activeOrg) {
                                // Important: Check the 'members' array explicitly
                                const isConfirmedMember = (activeOrg.members || []).includes(authUser.uid);
                                if (isConfirmedMember) {
                                    approved = true;
                                    console.log(`[AuthContext] Confirmed member of ${effectiveOrgId} - Derived approved=true`);
                                } else {
                                    approved = false;
                                    console.log(`[AuthContext] Pending or not found in ${effectiveOrgId} - Derived approved=false`);
                                }
                            } else {
                                // Joined something, but it's not the active one? Fallback to onboarding UI
                                approved = true;
                                console.log('[AuthContext] Joined org not active - Derived approved=true for UI');
                            }
                        }

                        // Global Admins are always approved
                        if (isFirestoreAdmin || isManualAdmin) approved = true;

                        console.log(`[AuthContext] Approval derived for ${authUser.email}: approved=${approved}, activeOrg=${activeOrg?.id}`);

                        if (isApprovedRef.current !== approved || isApproved === null) {
                            console.log('[AuthContext] Setting isApproved (Org-Specific):', approved);
                            isApprovedRef.current = approved;
                            setIsApproved(approved);
                        }

                    } catch (err) {
                        console.error('[AuthContext] Multi-tenancy Load Error:', err);
                        // Fallback to minimal state
                        setActiveOrgId('default');
                        setIsOrgAdmin(!!isFirestoreAdmin || isManualAdmin);
                    }

                    setLoading(false); // Enable UI
                }, (error) => {
                    console.error('[AuthContext] Profile Snapshot Error:', error);
                    setLoading(false);
                    // Fallback to safe defaults to prevent lockout? 
                    // Or keep loading? let's allow access for safety if DB fails.
                    setIsApproved(true);
                });

            } else {
                // Logged Out
                console.log('[AuthContext] Cleaning up state (Logout)');
                setUser(null);
                setIsAdmin(false);
                setIsApproved(null);
                isAdminRef.current = false;
                isApprovedRef.current = null;
                setSportsInterests([]);
                setLoading(false);
            }
        });

        return () => {
            if (profileUnsubscribe) profileUnsubscribe();
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        // Wait for auth load OR approval check (if user is present)
        // If user is null, isApproved is null, but that's fine, we handle !user case below.
        // If user is present, isApproved MUST be boolean determined before we redirect.

        if (loading) return;

        // If logged in, but approval status unknown, WAIT.
        if (user && isApproved === null) {
            console.log('[AuthContext] User present but approval unknown. Waiting...');
            return;
        }

        const inAuthGroup = segments[0] === '(app)';
        // Fix TS error: segments is sometimes inferred as tuple
        const segs = segments as string[];
        const inAdminRoute = segs.length > 1 && segs[1] === 'admin';

        const hasRealOrg = organizations.length > 0;
        const isManualAdmin = ['urbraju@gmail.com', 'brutechgyan@gmail.com'].includes(user?.email || '');
        const effectiveIsAdmin = isAdmin || isManualAdmin;

        console.log(`[AuthContext] Nav Check - User: ${user?.email} Appvd: ${isApproved} Admin: ${effectiveIsAdmin} OrgAdmin: ${isOrgAdmin} Orgs: ${organizations.length} hasRealOrg: ${hasRealOrg} Segs:`, segments);

        if (!user && inAuthGroup) {
            console.log('[AuthContext] Redirecting to / (No User in App Group)');
            if (segments.length > 0) setTimeout(() => router.replace('/'), 100);
        } else if (user && !inAuthGroup) {
            console.log('[AuthContext] Guest Route check - Appvd:', isApproved, 'HasOrg:', hasRealOrg, 'MT:', multiTenancyEnabled, 'Admin:', effectiveIsAdmin);
            if (isApproved === true && (hasRealOrg || !multiTenancyEnabled || effectiveIsAdmin || isOrgAdmin)) {
                console.log('[AuthContext] Redirecting to /home (Admin or Has Org)');
                setTimeout(() => router.replace('/home'), 100);
            } else if (isApproved === true && !hasRealOrg && multiTenancyEnabled) {
                console.log('[AuthContext] Approved but no real org. Staying on onboarding.');
            } else {
                console.log('[AuthContext] User NOT approved. Showing Pending Screen.');
            }
        } else if (user && inAuthGroup && isApproved === false) {
            console.log('[AuthContext] User lost approval. Redirecting to Login.');
            setTimeout(() => router.replace('/'), 100);
        } else if (user && inAdminRoute && !effectiveIsAdmin && !isOrgAdmin) {
            console.log('[AuthContext] Non-admin tried to access admin route. Redirecting home.');
            setTimeout(() => router.replace('/home'), 100);
        }
    }, [user, loading, segments, isAdmin, isOrgAdmin, isApproved, organizations]);

    // Blocking UI Logic to prevent "Home Page Flash"
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    // We REMOVED the blocking "Pending" screen here.
    // Instead, individual screens (like LoginScreen) will handle the "Pending" state inline.

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin,
            isOrgAdmin,
            isApproved,
            activeOrgId,
            setActiveOrgId,
            organizations,
            multiTenancyEnabled,
            sportsInterests
        }}>
            {children}
        </AuthContext.Provider>
    );
};
