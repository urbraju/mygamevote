import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TermsOfServiceScreen() {
    const router = useRouter();

    return (
        <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 24 }}>
            <View className="max-w-3xl mx-auto w-full">
                <TouchableOpacity onPress={() => router.replace('/')} className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#D1D5DB" />
                    <Text className="text-gray-300 ml-2 font-bold">Back to Home</Text>
                </TouchableOpacity>

                <View className="bg-surface p-8 rounded-3xl shadow-xl">
                    <Text className="text-3xl font-extrabold text-white mb-2">Terms of Service</Text>
                    <Text className="text-gray-400 mb-8">Last Updated: February 2026</Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">1. Acceptance of Terms</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        By accessing and using MyGameVote, you accept and agree to be bound by the terms and provision of this agreement.
                    </Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">2. Description of Service</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        MyGameVote provides a platform for sports organizations and clubs to manage event scheduling, player voting, and administrative approvals. Access to organization-specific data is restricted to approved members.
                    </Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">3. User Conduct</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        You agree to use the Service only for purposes that are permitted by these Terms and any applicable law, regulation, or generally accepted practices or guidelines in the relevant jurisdictions.
                    </Text>
                    <View className="ml-4 mb-4">
                        <Text className="text-gray-300 mb-2">• You will not engage in any activity that interferes with or disrupts the Service.</Text>
                        <Text className="text-gray-300 mb-2">• You will not attempt to access the Service using a method other than the interface and instructions that we provide.</Text>
                    </View>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">4. Intellectual Property</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        The Service and its original content, features, and functionality are and will remain the exclusive property of MyGameVote and its licensors.
                    </Text>

                    <Text className="text-xl font-bold text-white mb-4 mt-6">5. Contact Us</Text>
                    <Text className="text-gray-300 mb-4 leading-relaxed">
                        If you have any questions about these Terms, please contact us at:
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL('mailto:support@mygamevote.com')}>
                        <Text className="text-primary font-bold">support@mygamevote.com</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
