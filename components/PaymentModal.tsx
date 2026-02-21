/**
 * PaymentModal Component
 * 
 * A modal that presents payment options (Zelle, PayPal) to the user.
 * It handles deep linking to payment apps and allows users to manually
 * mark their slot as "PAID" after completing the transaction.
 */
import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, Image, Share, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrencySymbol } from '../utils/currencyUtils';

interface PaymentModalProps {
    visible: boolean;
    onClose: () => void;
    paymentDetails: any;
    onMarkPaid: () => void;
    amount?: number;
    currency?: string;
}

export default function PaymentModal({ visible, onClose, paymentDetails, onMarkPaid, amount, currency }: PaymentModalProps) {

    const openApp = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                console.log("Don't know how to open URI: " + url);
            }
        } catch (error) {
            console.error("An error occurred", error);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-2xl font-extrabold text-gray-800">Payment Options</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle" size={30} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    {amount && amount > 0 && (
                        <View className="bg-blue-50 p-4 rounded-xl mb-6 items-center border border-blue-100">
                            <Text className="text-gray-500 font-medium uppercase text-xs tracking-wider">Amount Due</Text>
                            <Text className="text-4xl font-extrabold text-primary">{getCurrencySymbol(currency)}{amount}</Text>
                        </View>
                    )}

                    <Text className="text-gray-600 mb-6">
                        Please use one of the methods below to pay for your slot.
                        Once completed, mark your slot as PAID.
                    </Text>

                    {/* Zelle Option */}
                    <TouchableOpacity
                        className="flex-row items-center bg-purple-100 p-4 rounded-xl mb-4"
                        onPress={async () => {
                            if (paymentDetails?.zelle) {
                                const message = `Zelle Payment Details for Game Slot:\n${paymentDetails.zelle}`;

                                if (Platform.OS === 'web') {
                                    // On web, try clipboard or fallback to alert
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                        await navigator.clipboard.writeText(paymentDetails.zelle);
                                        alert("Zelle details copied to clipboard!");
                                    } else {
                                        alert(message);
                                    }
                                } else {
                                    // On native, use Share
                                    try {
                                        await Share.share({
                                            message,
                                            title: 'Zelle Payment Details'
                                        });
                                    } catch (error) {
                                        alert(message);
                                    }
                                }
                            } else {
                                alert("No Zelle details available.");
                            }
                        }}
                    >
                        <View className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center mr-4">
                            <Text className="text-white font-bold">Z</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900">Zelle</Text>
                            <Text className="text-gray-600">{paymentDetails?.zelle || 'Contact Admin'}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* PayPal Option */}
                    <TouchableOpacity
                        className="flex-row items-center bg-blue-100 p-4 rounded-xl mb-6"
                        onPress={() => {
                            if (paymentDetails?.paypal) {
                                let url = paymentDetails.paypal;
                                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                    url = 'https://' + url;
                                }
                                Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
                            } else {
                                alert("No PayPal link available.");
                            }
                        }}
                    >
                        <View className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center mr-4">
                            <Text className="text-white font-bold">P</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900">PayPal</Text>
                            <Text className="text-gray-600">{paymentDetails?.paypal ? 'Tap to Pay' : 'Contact Admin'}</Text>
                        </View>
                    </TouchableOpacity>


                    <TouchableOpacity
                        className="bg-green-600 p-4 rounded-xl items-center shadow-lg"
                        onPress={onMarkPaid}
                    >
                        <Text className="text-white text-lg font-bold">I Have Paid</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
}
