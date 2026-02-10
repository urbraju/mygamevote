/**
 * VoteButton Component
 * 
 * The primary action button for joining the game. It handles:
 * - Voting state (Loading, Disabled, Voted).
 * - Animations on press.
 * - Visual feedback based on voting availability.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence } from 'react-native-reanimated';

interface VoteButtonProps {
    onVote: () => void;
    disabled: boolean;
    loading: boolean;
    hasVoted: boolean;
    isOpen: boolean;
}

export default function VoteButton({ onVote, disabled, loading, hasVoted, isOpen }: VoteButtonProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePress = () => {
        scale.value = withSequence(withSpring(0.9), withSpring(1));
        onVote();
    };

    if (!isOpen) {
        return (
            <View className="bg-gray-400 py-4 px-8 rounded-full shadow-sm opacity-80 w-full items-center">
                <Text className="text-white font-bold text-lg">VOTING CLOSED</Text>
            </View>
        );
    }

    if (hasVoted) {
        return (
            <View className="bg-success py-4 px-8 rounded-full shadow-md w-full items-center flex-row justify-center space-x-2">
                <Text className="text-white font-bold text-lg">✅ YOU'RE IN / WAITLISTED</Text>
            </View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, { width: '100%' }]}>
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled || loading}
                className={`py-5 px-8 rounded-full shadow-lg items-center justify-center w-full ${disabled ? 'bg-gray-300' : 'bg-primary'
                    }`}
                activeOpacity={0.9}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-extrabold text-2xl tracking-widest uppercase">
                        TAP TO JOIN
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}
