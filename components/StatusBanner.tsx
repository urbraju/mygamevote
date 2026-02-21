import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatusBannerProps {
    message: string | null;
    type?: 'error' | 'warning' | 'info' | 'success';
    className?: string;
    autoDismiss?: boolean;
    onDismiss?: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
    message,
    type = 'error',
    className = '',
    autoDismiss = true,
    onDismiss
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        if (message) {
            // Show animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: Platform.OS !== 'web',
                })
            ]).start();

            // Auto-dismiss logic
            if (autoDismiss && (type === 'success' || type === 'info')) {
                const timer = setTimeout(() => {
                    handleDismiss();
                }, 4000);
                return () => clearTimeout(timer);
            }
        } else {
            fadeAnim.setValue(0);
            translateY.setValue(-20);
        }
    }, [message, type]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(translateY, {
                toValue: -10,
                duration: 300,
                useNativeDriver: Platform.OS !== 'web',
            })
        ]).start(() => {
            if (onDismiss) onDismiss();
        });
    };

    if (!message) return null;

    const config = {
        error: {
            bg: 'rgba(239, 68, 68, 0.15)',
            border: 'rgba(239, 68, 68, 0.3)',
            text: '#F87171',
            icon: 'alert-decagram' as const,
            iconColor: '#EF4444',
            label: 'System Error'
        },
        warning: {
            bg: 'rgba(245, 158, 11, 0.15)',
            border: 'rgba(245, 158, 11, 0.3)',
            text: '#FBBF24',
            icon: 'alert-outline' as const,
            iconColor: '#F59E0B',
            label: 'Warning'
        },
        info: {
            bg: 'rgba(59, 130, 246, 0.15)',
            border: 'rgba(59, 130, 246, 0.3)',
            text: '#60A5FA',
            icon: 'information-outline' as const,
            iconColor: '#3B82F6',
            label: 'Notice'
        },
        success: {
            bg: 'rgba(16, 185, 129, 0.15)',
            border: 'rgba(16, 185, 129, 0.3)',
            text: '#34D399',
            icon: 'check-decagram' as const,
            iconColor: '#10B981',
            label: 'Success'
        }
    };

    const style = config[type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                    backgroundColor: style.bg,
                    borderColor: style.border
                }
            ]}
            className={className}
        >
            <View className="flex-row items-center">
                <View className="mr-3">
                    <MaterialCommunityIcons name={style.icon} size={24} color={style.iconColor} />
                </View>
                <View className="flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: style.iconColor }}>
                        {style.label}
                    </Text>
                    <Text className="text-sm font-bold leading-5" style={{ color: style.text }}>
                        {message}
                    </Text>
                </View>
                {type !== 'success' && (
                    <TouchableOpacity onPress={handleDismiss} className="ml-2 p-1">
                        <MaterialCommunityIcons name="close" size={16} color={style.text} style={{ opacity: 0.5 }} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginVertical: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
            web: {
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
        })
    }
});
