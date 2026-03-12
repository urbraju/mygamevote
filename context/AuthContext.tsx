/**
 * Auth Context
 * 
 * Manages the global authentication state of the application.
 * - Provides `user`, `loading`, and `isAdmin` states to the app.
 * - Wraps Firebase Auth state change listener.
 * - Exposes generic `signIn`, `signUp`, and `logout` wrappers.
 */
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { useRouter, useSegments } from 'expo-router';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Platform, Alert, View, Text, ActivityIndicator } from 'react-native';
import { Organization, organizationService } from '../services/organizationService';
import { adminService } from '../services/adminService';
import { validateEnv } from '../utils/envValidation';

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
    sportsHubEnabled: boolean;
    sportsInterests: string[];
    refreshAuthContext: () => Promise<void>;
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
    sportsHubEnabled: true,
    sportsInterests: [],
    refreshAuthContext: async () => { }
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
    const [sportsHubEnabled, setSportsHubEnabled] = useState(true);
    const [sportsInterests, setSportsInterests] = useState<string[]>([]);

    // Refs to track current state for snapshot listeners (avoiding closure issues)
    const isAdminRef = useRef(false);
    const isApprovedRef = useRef<boolean | null>(null);
    const lastAdminPromote = useRef(0);
    const refreshRef = useRef<(() => Promise<void>) | null>(null);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        validateEnv();
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
                        console.log('[AuthContext] No Firestore profile found. Waiting for explicit creation...');
                        setIsApproved(null);
                        setLoading(false);
                        return;
                    }

                    // 2. Read Profile Data
                    const data = userDoc.data();
                    console.log('[AuthContext] sync - sportsInterests count:', (data.sportsInterests || []).length);
                    setSportsInterests(data.sportsInterests || []);

                    // Admin Check
                    const isManualAdmin = ['urbraju@gmail.com', 'brutechgyan@gmail.com'].includes(authUser.email || '');
                    const isFirestoreAdmin = data.isAdmin === true;
                    const finalIsAdmin = isFirestoreAdmin || isManualAdmin;

                    if (isAdminRef.current !== finalIsAdmin) {
                        isAdminRef.current = finalIsAdmin;
                        console.log('[AuthContext] Setting isAdmin:', finalIsAdmin);
                        setIsAdmin(finalIsAdmin);
                    }

                    if (isManualAdmin && !isFirestoreAdmin && (Date.now() - lastAdminPromote.current > 10000)) {
                        lastAdminPromote.current = Date.now();
                        const userRefPromote = doc(db, 'users', authUser.uid);
                        updateDoc(userRefPromote, { isAdmin: true }).catch(console.error);
                    }

                    const loadOrgData = async (uid: string) => {
                        try {
                            /**
                             * BUGFIX: Bypass stale closure data by explicitly fetching the latest 
                             * user profile document from Firestore. This prevents "bouncer" effects 
                             * where UI briefly reverts to the 'default' organization during rapid navigation.
                             */
                            const [orgConfigs, sysConfig, freshProfileDoc] = await Promise.all([
                                organizationService.getUserOrganizations(uid),
                                adminService.getSystemConfig(),
                                getDoc(doc(db, 'users', uid))
                            ]);

                            const freshProfileData = freshProfileDoc.data() || {};
                            const currentOrgId = freshProfileData.activeOrgId || 'default';
                            console.log(`[AuthContext] loadOrgData - UID: ${uid} | Fresh activeOrgId: ${currentOrgId}`);

                            /**
                             * SYNC: Handle Firestore Indexing Lag.
                             * If the newly created/joined activeOrgId is not yet reflected in the 
                             * list of organizations found by the query, fetch the specific group 
                             * document explicitly to guarantee immediate admin rights.
                             */
                            if (currentOrgId !== 'default' && !orgConfigs.some(o => o.id === currentOrgId)) {
                                console.log(`[AuthContext] activeOrgId ${currentOrgId} not in search results (index lag). Fetching explicitly...`);
                                const explicitOrg = await organizationService.getOrganization(currentOrgId);
                                if (explicitOrg) {
                                    orgConfigs.push(explicitOrg);
                                }
                            }

                            setOrganizations(orgConfigs);
                            setMultiTenancyEnabled(sysConfig.multiTenancyEnabled);
                            setSportsHubEnabled(sysConfig.sportsHubEnabled);

                            // If not enabled, always force 'default'
                            const effectiveOrgId = sysConfig.multiTenancyEnabled ? currentOrgId : 'default';
                            console.log(`[AuthContext] Setting Effective activeOrgId: ${effectiveOrgId}`);
                            setActiveOrgId(effectiveOrgId);

                            return { orgConfigs, effectiveOrgId, sysConfig };
                        } catch (err) {
                            console.error('[AuthContext] Multi-tenancy Load Error:', err);
                            // Fallback to minimal state
                            setActiveOrgId('default');
                            setOrganizations([]);
                            return null;
                        }
                    };

                    const checkApprovals = (uid: string, orgConfigs: Organization[], effectiveOrgId: string) => {
                        // Determine if Org Admin
                        const activeOrg = orgConfigs.find(o => o.id === effectiveOrgId);
                        const isOrgAdm = activeOrg?.admins?.includes(uid) || !!isFirestoreAdmin || isManualAdmin;
                        console.log('[AuthContext] checkApprovals - isOrgAdmin:', isOrgAdm, 'activeOrgId:', effectiveOrgId);
                        setIsOrgAdmin(isOrgAdm);

                        // --- Organization-Specific Approval Logic ---
                        let approved = false;

                        if (orgConfigs.length === 0) {
                            // 1. Onboarding State (No Orgs yet)
                            approved = true;
                        } else {
                            // 2. Joined state - strictly check membership in active organization
                            if (activeOrg) {
                                const isConfirmedMember = (activeOrg.members || []).includes(uid);
                                if (isConfirmedMember) {
                                    approved = true;
                                } else {
                                    approved = false;
                                }
                            } else {
                                approved = true;
                            }
                        }

                        // Global Admins are always approved
                        if (isFirestoreAdmin || isManualAdmin) approved = true;

                        if (isApprovedRef.current !== approved || isApproved === null) {
                            console.log('[AuthContext] Setting isApproved (Org-Specific):', approved);
                            isApprovedRef.current = approved;
                            setIsApproved(approved);
                        }
                    };

                    // Execute initial load
                    const memData = await loadOrgData(authUser.uid);
                    if (memData) checkApprovals(authUser.uid, memData.orgConfigs, memData.effectiveOrgId);
                    else {
                        setIsOrgAdmin(!!isFirestoreAdmin || isManualAdmin);
                    }

                    // Attach refresh function
                    refreshRef.current = async () => {
                        console.log('[AuthContext] Manual refresh triggered');
                        const freshData = await loadOrgData(authUser.uid);
                        if (freshData) checkApprovals(authUser.uid, freshData.orgConfigs, freshData.effectiveOrgId);
                    };

                    setLoading(false); // Enable UI
                }, (error: any) => {
                    if (error.code === 'permission-denied') {
                        console.warn('[AuthContext] Profile Snapshot dropped (expected during logout).');
                    } else {
                        console.error('[AuthContext] Profile Snapshot Error:', error);
                    }
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
                setOrganizations([]);
                setActiveOrgId('default');
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
        if (loading) return;

        // If logged in, but approval status unknown, WAIT.
        if (user && isApproved === null) {
            console.log('[AuthContext] User present but approval unknown. Waiting...');
            return;
        }

        const inAuthGroup = segments[0] === '(app)';
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

    const updateActiveOrgId = async (orgId: string) => {
        if (!user) return;
        console.log(`[AuthContext] setActiveOrgId requested: ${orgId}. Updating Firestore...`);
        try {
            await updateDoc(doc(db, 'users', user.uid), { activeOrgId: orgId });
            setActiveOrgId(orgId);
            // After manual switch, refresh metrics
            if (refreshRef.current) await refreshRef.current();
        } catch (err) {
            console.error('[AuthContext] Failed to persist activeOrgId', err);
            // Optimistic update anyway? No, keep sync.
        }
    };

    const contextValue = useMemo(() => ({
        user,
        loading,
        isAdmin,
        isOrgAdmin,
        isApproved,
        activeOrgId,
        setActiveOrgId: updateActiveOrgId,
        organizations,
        multiTenancyEnabled,
        sportsHubEnabled,
        sportsInterests,
        refreshAuthContext: async () => {
            if (refreshRef.current) await refreshRef.current();
        }
    }), [user, loading, isAdmin, isOrgAdmin, isApproved, activeOrgId, organizations, multiTenancyEnabled, sportsHubEnabled, sportsInterests]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
