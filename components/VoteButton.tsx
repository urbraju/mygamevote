import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface VoteButtonProps {
    onVote: () => void;
    onLeave?: () => void;
    disabled: boolean;
    loading: boolean;
    hasVoted: boolean;
    isOpen: boolean;
    status?: string;
}

export default function VoteButton({ onVote, onLeave, disabled, loading, hasVoted, isOpen, status }: VoteButtonProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePress = () => {
        scale.value = withSequence(withSpring(0.95), withSpring(1));
        onVote();
    };

    if (!isOpen && !hasVoted) {
        return (
            <View className="bg-white/10 py-5 px-8 rounded-2xl border border-white/10 w-full items-center flex-row justify-center">
                <MaterialCommunityIcons name="lock-outline" size={20} color="#4B5563" style={{ marginRight: 10 }} />
                <Text className="text-gray-500 font-black text-lg uppercase italic tracking-widest">Voting Locked</Text>
            </View>
        );
    }

    if (hasVoted) {
        const isConfirmed = status?.toLowerCase() === 'confirmed';
        return (
            <View className="space-y-3">
                {/* Status Display */}
                <View className={`py-5 px-8 rounded-2xl border w-full items-center flex-row justify-center space-x-3 ${isConfirmed ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/20' : 'bg-accent/10 border-accent/30 shadow-lg shadow-accent/20'}`}>
                    <MaterialCommunityIcons
                        name={isConfirmed ? "check-decagram" : "timer-sand-complete"}
                        size={24}
                        color={isConfirmed ? "#00E5FF" : "#39FF14"}
                        style={{ marginRight: 10 }}
                    />
                    <Text className={`font-black text-lg uppercase italic tracking-tighter ${isConfirmed ? 'text-primary' : 'text-accent'}`}>
                        {isConfirmed ? "Slot Secured" : "On Waitlist"}
                    </Text>
                </View>

                {/* Leave Match Button */}
                {onLeave && (
                    <TouchableOpacity
                        onPress={onLeave}
                        className="py-3 px-6 rounded-xl border border-red-500/30 bg-red-500/10"
                    >
                        <View className="flex-row items-center justify-center">
                            <MaterialCommunityIcons name="exit-to-app" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                            <Text className="text-red-400 font-black text-sm uppercase tracking-wider">Leave Match</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <Animated.View style={[animatedStyle, { width: '100%' }]}>
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled || loading}
                className={`py-6 px-8 rounded-2xl shadow-2xl items-center justify-center w-full relative overflow-hidden ${disabled ? 'bg-white/10 border border-white/10' : 'bg-primary border border-primary'}`}
                activeOpacity={0.9}
            >
                {/* Visual Accent */}
                {!disabled && (
                    <View className="absolute top-0 right-0 w-20 h-full bg-white opacity-10 rotate-12 -mr-10" />
                )}

                {loading ? (
                    <ActivityIndicator color={disabled ? "#4B5563" : "black"} />
                ) : (
                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="lightning-bolt" size={24} color="black" style={{ marginRight: 12 }} />
                        <Text className="text-black font-black text-2xl tracking-[4px] uppercase italic">
                            {disabled ? 'Processing...' : 'Secure Slot'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}
