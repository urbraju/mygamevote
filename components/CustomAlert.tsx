import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
    onDismiss?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    title,
    message,
    buttons = [{ text: 'OK' }],
    onDismiss
}) => {
    const handleButtonPress = (button: AlertButton) => {
        if (button.onPress) {
            button.onPress();
        }
        if (onDismiss) {
            onDismiss();
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View className="flex-1 bg-black/70 items-center justify-center p-6">
                <View
                    className="bg-surface rounded-3xl p-6 w-full max-w-sm border border-white/10"
                    style={Platform.OS === 'web' ? { boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.5)' } : { elevation: 12 }}
                >
                    {/* Icon */}
                    <View className="items-center mb-4">
                        <View className="bg-amber-500/20 rounded-full p-4">
                            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#F59E0B" />
                        </View>
                    </View>

                    {/* Title */}
                    <Text className="text-white font-black text-xl text-center mb-3">
                        {title}
                    </Text>

                    {/* Message */}
                    <Text className="text-white text-sm text-center mb-6 leading-5">
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View className="space-y-3">
                        {buttons.map((button, index) => {
                            const isCancel = button.style === 'cancel';
                            const isDestructive = button.style === 'destructive';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleButtonPress(button)}
                                    className={`py-3 px-6 rounded-xl ${isCancel
                                        ? 'bg-white/10 border border-white/20'
                                        : isDestructive
                                            ? 'bg-red-500'
                                            : 'bg-primary'
                                        }`}
                                >
                                    <Text className={`text-center font-black text-sm ${isCancel ? 'text-white' : isDestructive ? 'text-white' : 'text-black'
                                        }`}>
                                        {button.text.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
};
