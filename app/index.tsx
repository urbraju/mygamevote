/**
 * Login/Landing Screen
 * 
 * This is the entry point of the app. It handles user authentication (Login/Signup)
 * using Firebase Auth. It redirects to the main app flow upon successful login.
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Linking,
    Alert,
    ScrollView,
    KeyboardAvoidingView
} from 'react-native';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import SignupForm from '../components/SignupForm';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { organizationService } from '../services/organizationService';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

// Helper to map Firebase errors to user-friendly messages
const getFriendlyErrorMessage = (error: any) => {
    const msg = error.message || error.toString();
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        return "Invalid email or password.";
    }
    if (msg.includes('auth/email-already-in-use')) {
        return "This email is already registered. Please login instead.";
    }
    if (msg.includes('auth/invalid-email')) {
        return "Please enter a valid email address.";
    }
    if (msg.includes('auth/weak-password')) {
        return "Password is too weak. Must be 4-8 chars with 1 uppercase.";
    }
    if (msg.includes('Account pending approval')) {
        return "Your account is pending admin approval. You will be able to login once approved.";
    }

    return "Something went wrong. Please try again.";
};

// Password Validation Helper
const validatePassword = (pass: string) => {
    // 4-8 characters, no special characters, at least 1 uppercase letter
    const regex = /^(?=.*[A-Z])[A-Za-z0-9]{4,8}$/;
    return regex.test(pass);
};

export default function LoginScreen() {
    const { user, isApproved, organizations, multiTenancyEnabled, sportsInterests, activeOrgId, isAdmin, isOrgAdmin, refreshAuthContext, loading: authLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Forgot Password & Flow State
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetStatus, setResetStatus] = useState({ message: '', type: '' }); // 'success' or 'error'

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [orgName, setOrgName] = useState('');
    const [joining, setJoining] = useState(false);
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    // Native Google Sign-In Hook
    const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'dummy-ios-client-id.apps.googleusercontent.com',
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'dummy-android-client-id.apps.googleusercontent.com',
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'dummy-web-client-id.apps.googleusercontent.com',
    });

    React.useEffect(() => {
        if (googleResponse?.type === 'success') {
            setLoading(true);
            const { id_token, access_token } = googleResponse.params;
            authService.signInWithGoogleNative(id_token || null, access_token || null)
                .catch(err => {
                    setErrorMsg(getFriendlyErrorMessage(err));
                    setLoading(false);
                });
        }
    }, [googleResponse]);

    const handleAction = async () => {
        if (!email || !password) {
            setErrorMsg('Please enter email and password');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            if (isLogin) {
                const credential = await authService.signIn(email, password);

                const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
                if (userDoc.exists()) {
                    const profile = userDoc.data();
                    const approved = profile.isApproved !== false;
                    if (!approved) return;
                }
            } else {
                console.error("Should be handled by SignupForm now");
            }
        } catch (error: any) {
            setErrorMsg(getFriendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail) {
            setResetStatus({ message: 'Please enter your email address', type: 'error' });
            return;
        }

        setResetStatus({ message: 'Sending...', type: 'info' });

        try {
            console.log('Attempting password reset for:', resetEmail);
            await authService.resetPassword(resetEmail);
            console.log('Password reset email sent successfully');
            setResetStatus({ message: 'Success! Check your email for the reset link.', type: 'success' });
            setTimeout(() => setShowForgot(false), 3000);
        } catch (error: any) {
            console.error('Password Reset Error:', error);
            setResetStatus({ message: getFriendlyErrorMessage(error), type: 'error' });
        }
    };

    const handleJoinOrg = async () => {
        if (!inviteCode.trim()) {
            setErrorMsg('Please enter an invite code');
            return;
        }

        console.log('[index] handleJoinOrg started. Code:', inviteCode);
        setJoining(true);
        setErrorMsg('');
        try {
            const orgId = await organizationService.joinByInviteCode(inviteCode, user!.uid);
            console.log('[index] Join success. OrgId:', orgId);
            // SYNC: Update activeOrgId immediately to trigger Admin rights in AuthContext
            await updateDoc(doc(db, 'users', user!.uid), { activeOrgId: orgId });
            if (refreshAuthContext) await refreshAuthContext();
        } catch (error: any) {
            console.error('[index] Join Org Error:', error);
            setErrorMsg(error.message || 'Invalid invite code');
        } finally {
            setJoining(false);
        }
    };

    const handleCreateOrg = async () => {
        if (!orgName.trim()) {
            setErrorMsg('Please enter a squad name');
            return;
        }

        console.log('[index] handleCreateOrg started. Name:', orgName);
        setJoining(true);
        setErrorMsg('');
        try {
            const orgId = await organizationService.createOrganizationFromOnboarding(orgName, user!.uid);
            console.log('[index] Create success. OrgId:', orgId);
            // SYNC: Update activeOrgId immediately to trigger Admin rights in AuthContext
            await updateDoc(doc(db, 'users', user!.uid), { activeOrgId: orgId });
            if (refreshAuthContext) await refreshAuthContext();
        } catch (error: any) {
            console.error('[index] Create Org Error:', error);
            setErrorMsg(error.message || 'Failed to create squad');
        } finally {
            setJoining(false);
        }
    };

    if (!isLogin) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-background"
                style={{ minHeight: 0 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                    className="w-full"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="w-full items-center p-[clamp(1rem,5vw,2.5rem)]">
                        <View
                            style={{ width: '95%', maxWidth: 440 }}
                            className="bg-surface p-[clamp(1.5rem,5vw,2rem)] rounded-3xl shadow-2xl"
                        >
                            <SignupForm
                                onBack={() => {
                                    setIsLogin(true);
                                    setErrorMsg('');
                                }}
                                onSuccess={() => {
                                    console.log('Signup success');
                                    Alert.alert('Success', 'Account created successfully!');
                                    setIsLogin(true);
                                }}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // Onboarding decision logic:
    const hasRealOrg = organizations.length > 0;
    const isActuallyApproved = isApproved === true;

    // 1. If user is logged in but has NO interests -> show interests screen (Even for Admins/Google sign-in)
    const showInterests = user && sportsInterests.length === 0;
    const showJoinOrg = user && multiTenancyEnabled && !hasRealOrg && !isAdmin && !isOrgAdmin && !showInterests;
    const showPending = user && multiTenancyEnabled && hasRealOrg && !isActuallyApproved && !isAdmin && !isOrgAdmin;

    if (authLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
            style={{ minHeight: 0 }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                className="w-full"
                showsVerticalScrollIndicator={false}
            >
                <View className="w-full items-center p-[clamp(1rem,5vw,2.5rem)]">
                    <View
                        style={{ width: '95%', maxWidth: 440 }}
                        className="bg-surface p-[clamp(1.5rem,5vw,2rem)] rounded-3xl shadow-2xl"
                    >
                        <Text className="text-4xl font-extrabold text-primary mb-2 text-center">MyGameVote</Text>
                        <Text className="text-gray-500 mb-8 text-center font-medium">Join the Squad. Secure your spot.</Text>

                        {errorMsg ? <Text className="text-red-500 text-center mb-4">{errorMsg}</Text> : null}

                        {/* Condition-based Rendering Content */}
                        {user && isApproved === false ? (
                            <View className="items-center w-full">
                                <Text className="text-xl font-bold text-yellow-600 mb-2 text-center">⏳ Approval Pending</Text>
                                <Text className="text-gray-600 text-center mb-6">
                                    Your account is waiting for administrator approval. You will NOT be able to access the game until approved.
                                </Text>

                                <View className="w-full gap-y-3">
                                    <TouchableOpacity
                                        className="w-full bg-blue-100 p-4 rounded-xl items-center"
                                        onPress={() => {
                                            if (typeof window !== 'undefined') window.location.reload();
                                        }}
                                    >
                                        <Text className="text-blue-700 font-bold">🔄 Check Status</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className="w-full bg-red-50 p-4 rounded-xl items-center border border-red-100"
                                        onPress={() => authService.signOut()}
                                    >
                                        <Text className="text-red-600 font-bold">Sign Out</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : showInterests ? (
                            <View className="items-center w-full">
                                <SignupForm
                                    onBack={() => authService.signOut()}
                                    onSuccess={() => {
                                        console.log('[index] Interests selected successfully');
                                        Alert.alert('Success', 'Interests saved successfully!');
                                    }}
                                    initialStep={2}
                                />
                            </View>
                        ) : showPending ? (
                            <View className="items-center w-full">
                                <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
                                    <MaterialCommunityIcons name="clock-outline" size={32} color="#D97706" />
                                </View>
                                <Text className="text-xl font-bold mb-2 text-center text-white">Pending Approval</Text>
                                <Text className="text-center mb-6 text-sm text-gray-400">
                                    Your request to join <Text className="font-bold text-white">{organizations.find(o => o.id === activeOrgId)?.name || 'Squad'}</Text> is waiting for administrator approval.
                                </Text>

                                <View className="w-full gap-y-3">
                                    <TouchableOpacity
                                        className="w-full bg-blue-50 p-4 rounded-xl items-center"
                                        onPress={() => authService.signOut()}
                                    >
                                        <Text className="text-blue-600 font-bold">Sign Out</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            /* Normal Login Form OR Join/Create Org */
                            <View className="w-full">
                                {showJoinOrg ? (
                                    <View className="items-center w-full">
                                        <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                                            <MaterialCommunityIcons name="office-building" size={32} color="#2563EB" />
                                        </View>

                                        {isCreatingOrg ? (
                                            <>
                                                <Text className="text-xl font-bold mb-2 text-center text-white">Create an Organization</Text>
                                                <Text className="text-center mb-6 text-sm text-gray-400">
                                                    Start a new squad and invite your members.
                                                </Text>

                                                {errorMsg ? <Text className="text-red-500 text-center mb-4 text-xs">{errorMsg}</Text> : null}

                                                <TextInput
                                                    className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 text-gray-800 text-center font-bold tracking-[2px]"
                                                    placeholder="SQUAD NAME"
                                                    placeholderTextColor="#9CA3AF"
                                                    value={orgName}
                                                    onChangeText={setOrgName}
                                                    autoCapitalize="words"
                                                    maxLength={30}
                                                />

                                                {joining ? (
                                                    <ActivityIndicator size="large" color="#2563EB" />
                                                ) : (
                                                    <View className="w-full gap-y-3">
                                                        <TouchableOpacity
                                                            className={`w-full p-4 rounded-xl items-center shadow-md ${joining ? 'bg-primary/50' : 'bg-primary'} active:opacity-90`}
                                                            onPress={handleCreateOrg}
                                                            disabled={joining}
                                                        >
                                                            <Text className="text-white font-bold text-lg">CREATE SQUAD</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            className="w-full p-4 items-center"
                                                            onPress={() => { setIsCreatingOrg(false); setErrorMsg(''); setOrgName(''); }}
                                                        >
                                                            <Text className="text-gray-400 font-bold">Have an invite code? Join instead</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Text className="text-xl font-bold mb-2 text-center text-white">Join an Organization</Text>
                                                <Text className="text-center mb-6 text-sm text-gray-400">
                                                    Enter the invite code provided by your administrator to join your squad.
                                                </Text>

                                                {errorMsg ? <Text className="text-red-500 text-center mb-4 text-xs">{errorMsg}</Text> : null}

                                                <TextInput
                                                    className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 text-gray-800 text-center font-bold tracking-[4px]"
                                                    placeholder="INVITE CODE"
                                                    placeholderTextColor="#9CA3AF"
                                                    value={inviteCode}
                                                    onChangeText={(text) => setInviteCode(text.toUpperCase())}
                                                    autoCapitalize="characters"
                                                    maxLength={8}
                                                />

                                                {joining ? (
                                                    <ActivityIndicator size="large" color="#2563EB" />
                                                ) : (
                                                    <View className="w-full gap-y-3">
                                                        <TouchableOpacity
                                                            className={`w-full p-4 rounded-xl items-center shadow-md ${joining ? 'bg-primary/50' : 'bg-primary'} active:opacity-90`}
                                                            onPress={handleJoinOrg}
                                                            disabled={joining}
                                                        >
                                                            <Text className="text-white font-bold text-lg">JOIN SQUAD</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            className="w-full p-4 items-center"
                                                            onPress={() => { setIsCreatingOrg(true); setErrorMsg(''); setInviteCode(''); }}
                                                        >
                                                            <Text className="text-blue-400 font-bold">Or create your own Squad</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </>
                                        )}

                                        <TouchableOpacity
                                            className="w-full p-3 items-center mt-2 border-t border-gray-800"
                                            onPress={() => authService.signOut()}
                                        >
                                            <Text className="text-red-400 font-bold text-sm">Sign Out</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : user ? (
                                    <View className="items-center py-10">
                                        <ActivityIndicator color="#2563EB" />
                                        <Text className="text-gray-500 mt-4 font-bold">Redirecting to Squad...</Text>
                                    </View>
                                ) : (
                                    <>
                                        <TextInput
                                            className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 text-gray-800"
                                            placeholder="Email"
                                            placeholderTextColor="#9CA3AF"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            onSubmitEditing={handleAction}
                                            returnKeyType="next"
                                        />

                                        <View className="w-full relative mb-2" style={{ minHeight: 56, justifyContent: 'center' }}>
                                            <TextInput
                                                className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-800 pr-14"
                                                placeholder="Password"
                                                placeholderTextColor="#9CA3AF"
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry={!showPassword}
                                                onSubmitEditing={handleAction}
                                                returnKeyType="done"
                                                style={{ height: 56, textAlignVertical: 'center' }}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute',
                                                    right: 4,
                                                    width: 44,
                                                    height: 56,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    zIndex: 2,
                                                    top: 0
                                                }}
                                            >
                                                <MaterialCommunityIcons
                                                    name={showPassword ? "eye-off" : "eye"}
                                                    size={20}
                                                    color="#9CA3AF"
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        {isLogin && (
                                            <TouchableOpacity onPress={() => { setShowForgot(true); setResetStatus({ message: '', type: '' }); }} className="self-end mb-6">
                                                <Text className="text-blue-500 text-sm font-semibold">Forgot Password?</Text>
                                            </TouchableOpacity>
                                        )}
                                        {!isLogin && <View className="mb-6" />}

                                        {loading ? (
                                            <ActivityIndicator size="large" color="#2563EB" />
                                        ) : (
                                            <View className="gap-y-4">
                                                <TouchableOpacity
                                                    className="w-full bg-primary p-4 rounded-xl items-center shadow-md active:opacity-90"
                                                    onPress={handleAction}
                                                    role="button"
                                                    accessibilityLabel="LOGIN"
                                                >
                                                    <Text className="text-white font-bold text-lg tracking-wide">LOGIN</Text>
                                                </TouchableOpacity>

                                                <View className="flex-row items-center my-2">
                                                    <View className="flex-1 h-[1px] bg-gray-200" />
                                                    <Text className="mx-4 text-gray-400 text-xs font-bold">OR CONTINUE WITH</Text>
                                                    <View className="flex-1 h-[1px] bg-gray-200" />
                                                </View>

                                                <View className="mb-2">
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            if (Platform.OS === 'web') {
                                                                authService.signInWithGoogle().catch(err => setErrorMsg(getFriendlyErrorMessage(err)));
                                                            } else {
                                                                promptGoogleAsync();
                                                            }
                                                        }}
                                                        className="w-full flex-row items-center justify-center bg-white border border-gray-200 p-4 rounded-xl active:bg-gray-50 shadow-sm"
                                                    >
                                                        <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                                                        <Text className="ml-3 text-gray-700 font-bold text-base">Sign in with Google</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                <TouchableOpacity
                                                    className="w-full items-center active:opacity-70"
                                                    onPress={() => {
                                                        setIsLogin(false);
                                                        setErrorMsg('');
                                                    }}
                                                >
                                                    <Text className="text-gray-600">
                                                        Don't have an account? <Text className="text-primary font-bold">Sign Up</Text>
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Support Footer */}
                <View className="mt-8 mb-8 items-center">
                    <TouchableOpacity onPress={() => Linking.openURL('mailto:support@mygamevote.com?subject=MyGameVote%20Issue:%20Login/Registration%20Form')} className="items-center">
                        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-[2px] mb-1">
                            Support & Feedback
                        </Text>
                        <Text className="text-gray-500 font-medium text-xs underline">
                            support@mygamevote.com
                        </Text>
                    </TouchableOpacity>

                    <View className="mt-6 opacity-60">
                        <Text className="text-gray-600 text-[9px] font-bold tracking-[4px] uppercase text-center">
                            Developed by BRUTECHGYAN
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Forgot Password Modal (Simple Overlay) */}
            {showForgot && (
                <View className="absolute inset-0 bg-black/60 items-center justify-center p-6" style={{ zIndex: 100 }}>
                    <View
                        style={{ width: '95%', maxWidth: 420 }}
                        className="bg-surface p-8 rounded-3xl shadow-2xl"
                    >
                        <Text className="text-2xl font-bold mb-2">Reset Password</Text>
                        <Text className="text-gray-500 mb-6">Enter your email and we'll send you a reset link.</Text>

                        {resetStatus.message ? (
                            <View className={`p-4 rounded-xl mb-6 ${resetStatus.type === 'error' ? 'bg-red-50 border border-red-100' :
                                resetStatus.type === 'success' ? 'bg-green-50 border border-green-100' :
                                    'bg-blue-50 border border-blue-100'
                                }`}>
                                <Text className={`text-sm text-center font-medium ${resetStatus.type === 'error' ? 'text-red-600' :
                                    resetStatus.type === 'success' ? 'text-green-600' :
                                        'text-blue-600'
                                    }`}>
                                    {resetStatus.message}
                                </Text>
                            </View>
                        ) : null}

                        <TextInput
                            className="w-full bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200"
                            placeholder="Email address"
                            placeholderTextColor="#9CA3AF"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <View className="gap-y-3">
                            <TouchableOpacity
                                className="w-full bg-primary p-4 rounded-xl items-center active:opacity-90"
                                onPress={handleResetPassword}
                            >
                                <Text className="text-white font-bold text-lg">Send Link</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-full p-4 items-center"
                                onPress={() => { setShowForgot(false); setResetStatus({ message: '', type: '' }); }}
                            >
                                <Text className="text-gray-500 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
};
