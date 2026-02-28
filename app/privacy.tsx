import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
            <View className="max-w-3xl mx-auto w-full">
                <TouchableOpacity onPress={() => router.replace('/')} className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#D1D5DB" />
                    <Text className="text-gray-300 ml-2 font-bold">Back to Home</Text>
                </TouchableOpacity>

                <View className="bg-surface p-8 rounded-3xl shadow-xl">
                    <Text className="text-3xl font-extrabold text-white mb-2">Privacy Policy</Text>
                    <Text className="text-gray-400 mb-8">Last Updated: February 2026</Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">1. Information We Collect</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        When you use MyGameVote, particularly when logging in via third-party services like Facebook, Google, or Apple, we collect your basic profile information. This includes your name, email address, and profile picture. We use your email address as a unique identifier to securely manage your account and organization memberships.
                    </Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">2. How We Use Your Information</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        We use the information we collect to:
                    </Text>
                    <View className="ml-4 mb-4">
                        <Text className="text-gray-300 mb-2">• Authenticate your identity and maintain your session.</Text>
                        <Text className="text-gray-300 mb-2">• Allow administrators of your sports organization to approve your membership.</Text>
                        <Text className="text-gray-300 mb-2">• Personalize your experience based on your sports interests.</Text>
                        <Text className="text-gray-300 mb-2">• Provide access to secure voting and event scheduling features.</Text>
                    </View>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">3. Data Sharing and Disclosure</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        We do not sell your personal data. Your basic profile information (Name and Email) is securely stored in our database and is only visible to the administrators of the specific organizations you choose to join within the platform.
                    </Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">4. Data Deletion</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        You have the right to request the deletion of your personal data. If you wish to delete your MyGameVote account and all associated data, please contact our support team.
                    </Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">5. Contact Us</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        If you have any questions or concerns about this Privacy Policy, please contact us at:
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL('mailto:support@mygamevote.com')}>
                        <Text className="text-primary font-bold">support@mygamevote.com</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
