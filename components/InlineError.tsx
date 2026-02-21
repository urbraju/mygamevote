import React from 'react';
import { View, Text, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface InlineErrorProps {
    message: string | null;
    type?: 'error' | 'warning' | 'info' | 'success';
    className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
    message,
    type = 'error',
    className = ''
}) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (message) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: Platform.OS !== 'web',
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [message]);

    if (!message) return null;

    const config = {
        error: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-500',
            icon: 'alert-circle' as const,
            iconColor: '#EF4444'
        },
        warning: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            text: 'text-amber-500',
            icon: 'alert' as const,
            iconColor: '#F59E0B'
        },
        info: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-400',
            icon: 'information' as const,
            iconColor: '#60A5FA'
        },
        success: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-500',
            icon: 'check-circle' as const,
            iconColor: '#10B981'
        }
    };

    const style = config[type];

    return (
        <Animated.View
            style={{ opacity: fadeAnim }}
            className={`flex-row items-center p-4 rounded-2xl border ${style.bg} ${style.border} ${className}`}
        >
            <MaterialCommunityIcons name={style.icon} size={20} color={style.iconColor} />
            <Text className={`flex-1 ml-3 font-bold text-sm leading-5 ${style.text}`}>
                {message}
            </Text>
        </Animated.View>
    );
};
