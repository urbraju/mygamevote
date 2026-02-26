import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import { sportsService, Sport } from '../services/sportsService';
import { COUNTRY_CODES } from '../constants/countryCodes';

interface SignupFormProps {
    onBack: () => void;
    onSuccess: () => void;
    initialStep?: number;
}

export default function SignupForm({ onBack, onSuccess, initialStep = 1 }: SignupFormProps) {
    const [step, setStep] = useState(initialStep);
    const [loading, setLoading] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);

    // Sports State
    const [featuredSports, setFeaturedSports] = useState<Sport[]>([]);
    const [otherSports, setOtherSports] = useState<Sport[]>([]);
    const [loadingSports, setLoadingSports] = useState(false);
    const [showOtherSportsModal, setShowOtherSportsModal] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [selectedSports, setSelectedSports] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);

    // Validation Errors
    const [errors, setErrors] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        general: ''
    });

    useEffect(() => {
        // Fetch sports when component mounts
        const fetchSports = async () => {
            setLoadingSports(true);
            try {
                const [all, featuredIds] = await Promise.all([
                    sportsService.getAllSports(),
                    sportsService.getFeaturedSportIds()
                ]);

                const featured = all.filter(s => featuredIds.includes(s.id));
                const others = all.filter(s => !featuredIds.includes(s.id));

                setFeaturedSports(featured);
                setOtherSports(others);
            } catch (err) {
                console.error("Failed to load sports", err);
            } finally {
                setLoadingSports(false);
            }
        };
        fetchSports();
    }, []);

    const toggleSport = (sportId: string) => {
        if (selectedSports.includes(sportId)) {
            setSelectedSports(selectedSports.filter(id => id !== sportId));
        } else {
            setSelectedSports([...selectedSports, sportId]);
        }
    };

    const validateStep1 = () => {
        let isValid = true;
        const newErrors = { firstName: '', lastName: '', email: '', phone: '', password: '', general: '' };

        if (!firstName.trim()) {
            newErrors.firstName = 'First Name is required';
            isValid = false;
        }
        if (!lastName.trim()) {
            newErrors.lastName = 'Last Name is required';
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            newErrors.email = 'Please enter a valid email address';
            isValid = false;
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits && phoneDigits.length !== 10) {
            newErrors.phone = 'Phone number must be exactly 10 digits';
            isValid = false;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(password)) {
            newErrors.password = 'Password must be at least 6 chars, 1 Uppercase, 1 Number';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSignup = async () => {
        if (selectedSports.length === 0) {
            setErrors({ ...errors, general: 'Please select at least one sport/interest to continue.' });
            return;
        }

        setLoading(true);
        setErrors({ ...errors, general: '' });
        try {
            if (initialStep === 2) {
                // We are already logged in, just updating interests
                const { auth } = await import('../firebaseConfig');
                if (auth.currentUser) {
                    await authService.updateUserProfile(auth.currentUser.uid, {
                        sportsInterests: selectedSports
                    });
                }
            } else {
                const fullPhoneNumber = phone ? `${countryCode} ${phone}` : undefined;
                await authService.signUp(email, password, firstName, lastName, selectedSports, fullPhoneNumber);
            }
            onSuccess();
        } catch (error: any) {
            console.error("[SignupForm] handleSignup Error:", error);
            setErrors(prev => ({ ...prev, general: error.message }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 w-full">
            <View className="flex-row items-center mb-6">
                <TouchableOpacity onPress={step === 1 ? onBack : () => setStep(1)} className="p-2 bg-white/10 rounded-full mr-4">
                    <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white text-2xl font-bold">
                    {step === 1 ? 'Create Account' : 'Customize Profile'}
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {step === 1 ? (
                    <View>
                        <View className="mb-4">
                            <TextInput
                                className={`bg-white/10 p-4 rounded-xl text-white border ${errors.firstName ? 'border-red-500' : 'border-white/20'}`}
                                placeholder="First Name"
                                placeholderTextColor="#9CA3AF"
                                value={firstName}
                                onChangeText={(text) => { setFirstName(text); setErrors({ ...errors, firstName: '' }); }}
                            />
                            {errors.firstName ? <Text className="text-red-500 text-xs mt-1 ml-1">{errors.firstName}</Text> : null}
                        </View>

                        <View className="mb-4">
                            <TextInput
                                className={`bg-white/10 p-4 rounded-xl text-white border ${errors.lastName ? 'border-red-500' : 'border-white/20'}`}
                                placeholder="Last Name"
                                placeholderTextColor="#9CA3AF"
                                value={lastName}
                                onChangeText={(text) => { setLastName(text); setErrors({ ...errors, lastName: '' }); }}
                            />
                            {errors.lastName ? <Text className="text-red-500 text-xs mt-1 ml-1">{errors.lastName}</Text> : null}
                        </View>

                        <View className="mb-4">
                            <TextInput
                                className={`bg-white/10 p-4 rounded-xl text-white border ${errors.email ? 'border-red-500' : 'border-white/20'}`}
                                placeholder="Email"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: '' }); }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            {errors.email ? <Text className="text-red-500 text-xs mt-1 ml-1">{errors.email}</Text> : null}
                        </View>

                        <View className="mb-4">
                            <View className="flex-row">
                                <TouchableOpacity
                                    className="bg-white/10 p-4 rounded-xl border border-white/20 mr-2 justify-center"
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text className="text-white font-bold">{countryCode}</Text>
                                </TouchableOpacity>
                                <TextInput
                                    className={`flex-1 bg-white/10 p-4 rounded-xl text-white border ${errors.phone ? 'border-red-500' : 'border-white/20'}`}
                                    placeholder="Phone Number (Optional)"
                                    placeholderTextColor="#9CA3AF"
                                    value={phone}
                                    onChangeText={(text) => {
                                        const sanitized = text.replace(/\D/g, '').slice(0, 10);
                                        setPhone(sanitized);
                                        setErrors({ ...errors, phone: '' });
                                    }}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            {errors.phone ? <Text className="text-red-500 text-xs mt-1 ml-1">{errors.phone}</Text> : null}
                        </View>

                        <View className="mb-6 relative" style={{ minHeight: 56, justifyContent: 'center' }}>
                            <TextInput
                                className={`bg-white/10 p-4 rounded-xl text-white border pr-14 ${errors.password ? 'border-red-500' : 'border-white/20'}`}
                                placeholder="Password"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
                                secureTextEntry={!showPassword}
                                style={{ height: 56, textAlignVertical: 'center' }}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 4,
                                    width: 44,
                                    height: 56, // Fixed height to match input
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
                            {errors.password ? (
                                <Text className="text-red-500 text-xs mt-1 ml-1">{errors.password}</Text>
                            ) : (
                                <Text className="text-gray-500 text-xs mt-1 ml-1">Min 6 chars, 1 Uppercase, 1 Number</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={async () => {
                                if (validateStep1()) {
                                    setCheckingEmail(true);
                                    try {
                                        const available = await authService.isEmailAvailable(email);
                                        if (!available) {
                                            setErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
                                        } else {
                                            setStep(2);
                                        }
                                    } catch (err: any) {
                                        console.error("[SignupForm] isEmailAvailable Error:", err);
                                        setErrors(prev => ({ ...prev, general: 'Failed to verify email. Please try again.' }));
                                    } finally {
                                        setCheckingEmail(false);
                                    }
                                }
                            }}
                            disabled={checkingEmail}
                            className={`bg-primary py-4 rounded-xl items-center shadow-lg shadow-primary/30 ${checkingEmail ? 'opacity-70' : ''}`}
                        >
                            {checkingEmail ? (
                                <ActivityIndicator size="small" color="black" />
                            ) : (
                                <Text className="text-black font-bold text-lg">Next: Select Interests</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <Text className="text-gray-300 mb-[clamp(0.5rem,2vw,1rem)] text-base">
                            Select the sports and events you are interested in. You will only see polls for these activities.
                        </Text>

                        {loadingSports ? (
                            <ActivityIndicator size="large" color="#00E5FF" className="mb-4" />
                        ) : featuredSports.length === 0 ? (
                            <Text className="text-gray-400 italic mb-4 text-center">No featured sports available. Try "More Interests".</Text>
                        ) : (
                            <View className="flex-row flex-wrap justify-between gap-y-3">
                                {featuredSports.map((sport) => {
                                    const isSelected = selectedSports.includes(sport.id);
                                    return (
                                        <TouchableOpacity
                                            key={sport.id}
                                            onPress={() => toggleSport(sport.id)}
                                            style={{ width: '48.5%', minHeight: 70 }}
                                            className={`mb-1 p-[clamp(0.75rem,3vw,1.25rem)] rounded-2xl border-2 flex-row items-center ${isSelected
                                                ? 'bg-primary/20 border-primary'
                                                : 'bg-white/5 border-white/10'
                                                }`}
                                        >
                                            <MaterialCommunityIcons
                                                name={sport.icon as any}
                                                size={24}
                                                color={isSelected ? '#00E5FF' : '#9CA3AF'}
                                            />
                                            <Text className={`ml-3 font-bold flex-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                                {sport.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {otherSports.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setShowOtherSportsModal(true)}
                                className="flex-row items-center justify-center p-4 bg-white/5 rounded-xl border border-dashed border-white/20 my-4"
                            >
                                <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#00E5FF" />
                                <Text className="text-primary font-bold ml-2">More Interests...</Text>
                                {selectedSports.filter(id => otherSports.some(os => os.id === id)).length > 0 && (
                                    <View className="ml-2 bg-primary px-2 rounded-full">
                                        <Text className="text-black text-[10px] font-bold">
                                            {selectedSports.filter(id => otherSports.some(os => os.id === id)).length}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}

                        {loading ? (
                            <ActivityIndicator size="large" color="#00E5FF" className="mt-6" />
                        ) : (
                            <TouchableOpacity
                                onPress={handleSignup}
                                className="bg-primary py-4 rounded-xl items-center mt-4 shadow-lg shadow-primary/30"
                            >
                                <Text className="text-black font-bold text-lg">
                                    {initialStep === 2 ? 'Save Interests' : 'Complete Sign Up'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {errors.general ? (
                    <Text className="text-red-500 text-center my-4 px-4 font-bold">{errors.general}</Text>
                ) : null}
            </ScrollView>

            {/* Other Sports Picker Modal */}
            <Modal
                visible={showOtherSportsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowOtherSportsModal(false)}
            >
                <View className="flex-1 justify-end bg-black/60">
                    <View
                        style={{ height: '70%' }}
                        className="bg-surface p-[clamp(1.5rem,5vw,2rem)] rounded-t-[40px] shadow-2xl"
                    >
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white text-xl font-bold">All Interests</Text>
                            <TouchableOpacity onPress={() => setShowOtherSportsModal(false)} className="p-2">
                                <MaterialCommunityIcons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={otherSports}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const isSelected = selectedSports.includes(item.id);
                                return (
                                    <TouchableOpacity
                                        className={`p-4 mb-2 rounded-xl flex-row items-center border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-white/5 border-transparent'
                                            }`}
                                        onPress={() => toggleSport(item.id)}
                                    >
                                        <MaterialCommunityIcons
                                            name={item.icon as any}
                                            size={24}
                                            color={isSelected ? '#00E5FF' : '#9CA3AF'}
                                        />
                                        <Text className={`ml-4 text-lg font-bold flex-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                            {item.name}
                                        </Text>
                                        {isSelected && <MaterialCommunityIcons name="check" size={24} color="#00E5FF" />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <TouchableOpacity
                            onPress={() => setShowOtherSportsModal(false)}
                            className="bg-primary py-4 rounded-xl items-center mt-4"
                        >
                            <Text className="text-black font-bold">Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Country Code Picker Modal */}
            <Modal
                visible={showCountryPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <View className="flex-1 justify-end bg-black/60">
                    <View
                        style={{ height: '50%' }}
                        className="bg-surface p-[clamp(1.5rem,5vw,2rem)] rounded-t-[40px] shadow-2xl"
                    >
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-white text-xl font-bold">Select Country Code</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={COUNTRY_CODES}
                            keyExtractor={(item) => `${item.code}-${item.country}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="p-4 border-b border-white/10 flex-row justify-between"
                                    onPress={() => {
                                        setCountryCode(item.code);
                                        setShowCountryPicker(false);
                                    }}
                                >
                                    <Text className="text-white text-lg font-bold">{item.code}</Text>
                                    <Text className="text-gray-400 text-lg">{item.country}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
