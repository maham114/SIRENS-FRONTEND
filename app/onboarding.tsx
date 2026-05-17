import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { auth, db } from '../constants/firebase/config';

type Location = {
    area: string;
    coords: [number, number];
};

type OnboardingState = {
    role: string;
    city: string;
    district: string;
    homeLocation: Location;
    workLocation: Location;
    frequentAreas: Location[];
    preferences: {
        weather: boolean;
        traffic: boolean;
        highSeverityOnly: boolean;
    };
};

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [state, setState] = useState<OnboardingState>({
        role: '',
        city: '',
        district: '',
        homeLocation: { area: '', coords: [0, 0] },
        workLocation: { area: '', coords: [0, 0] },
        frequentAreas: [],
        preferences: {
            weather: true,
            traffic: true,
            highSeverityOnly: false,
        }
    });

    const lastAppliedKey = useRef<string>('');
    const params = useLocalSearchParams<{ lat?: string; lng?: string; type?: string }>();

    useEffect(() => {
        const { lat, lng, type } = params;

        if (!lat || !lng || !type) return;

        const key = `${lat}|${lng}|${type}`;
        if (lastAppliedKey.current === key) return;
        lastAppliedKey.current = key;

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (isNaN(parsedLat) || isNaN(parsedLng)) return;

        setState(prev => {
            if (type === 'home') {
                return {
                    ...prev,
                    homeLocation: { ...prev.homeLocation, coords: [parsedLat, parsedLng] },
                };
            }
            if (type === 'work') {
                return {
                    ...prev,
                    workLocation: { ...prev.workLocation, coords: [parsedLat, parsedLng] },
                };
            }
            if (type.startsWith('frequent-')) {
                const index = parseInt(type.split('-')[1], 10);
                if (isNaN(index) || index < 0 || index >= prev.frequentAreas.length) return prev;
                return {
                    ...prev,
                    frequentAreas: prev.frequentAreas.map((a, i) =>
                        i === index
                            ? { ...a, coords: [parsedLat, parsedLng] as [number, number] }
                            : a
                    ),
                };
            }
            return prev;
        });
    }, [params.lat, params.lng, params.type]);

    const progressWidth = useSharedValue(100 / TOTAL_STEPS);

    const updateState = (key: keyof OnboardingState, value: any) => {
        setState(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (!validateStep()) return;
        if (step < TOTAL_STEPS) {
            setStep(prev => prev + 1);
            progressWidth.value = withTiming(((step + 1) / TOTAL_STEPS) * 100);
        } else {
            submitData();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
            progressWidth.value = withTiming(((step - 1) / TOTAL_STEPS) * 100);
        }
    };

    const validateStep = () => {
        switch (step) {
            case 1:
                if (!state.role) {
                    Alert.alert('Required', 'Please select a role.');
                    return false;
                }
                break;
            case 2:
                if (!state.city.trim() || !state.district.trim()) {
                    Alert.alert('Required', 'Please enter both city and district.');
                    return false;
                }
                break;
            case 3:
                if (!state.homeLocation.area.trim()) {
                    Alert.alert('Required', 'Please enter your home area name.');
                    return false;
                }
                if (state.homeLocation.coords[0] === 0 && state.homeLocation.coords[1] === 0) {
                    Alert.alert('Required', 'Please pick your home location on the map.');
                    return false;
                }
                break;
            case 4:
                if (!state.workLocation.area.trim()) {
                    Alert.alert('Required', 'Please enter your work area name.');
                    return false;
                }
                if (state.workLocation.coords[0] === 0 && state.workLocation.coords[1] === 0) {
                    Alert.alert('Required', 'Please pick your work location on the map.');
                    return false;
                }
                break;
        }
        return true;
    };

    const submitData = async () => {
        if (!auth.currentUser) {
            Alert.alert('Error', 'User not authenticated. Please log in again.');
            return;
        }
        setIsLoading(true);
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                email: auth.currentUser.email,
                role: state.role,
                city: state.city,
                district: state.district,
                homeLocation: state.homeLocation,
                workLocation: state.workLocation,
                frequentAreas: state.frequentAreas,
                preferences: state.preferences,
                onboardingComplete: true
            }, { merge: true });
            Alert.alert('Success', 'Profile setup complete!');
            router.replace('/(tabs)/home');
        } catch (error: any) {
            Alert.alert('Error saving data', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const renderStep1 = () => (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Your Role</Text>
            <Text style={styles.stepSubtitle}>How will you be using SIRENS?</Text>
            {['citizen', 'official', 'field_agent'].map((roleOp) => (
                <TouchableOpacity
                    key={roleOp}
                    style={[styles.roleCard, state.role === roleOp && styles.roleCardActive]}
                    onPress={() => updateState('role', roleOp)}
                >
                    <Ionicons
                        name={roleOp === 'citizen' ? 'person' : roleOp === 'official' ? 'briefcase' : 'shield'}
                        size={32}
                        color={state.role === roleOp ? '#3A86FF' : '#6C7A9C'}
                    />
                    <Text style={[styles.roleText, state.role === roleOp && styles.roleTextActive]}>
                        {roleOp.replace('_', ' ').toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </Animated.View>
    );

    const renderStep2 = () => (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Location Details</Text>
            <Text style={styles.stepSubtitle}>Where are you primarily based?</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. New York"
                    placeholderTextColor="#6C7A9C"
                    value={state.city}
                    onChangeText={(val) => updateState('city', val)}
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>District / Borough</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Manhattan"
                    placeholderTextColor="#6C7A9C"
                    value={state.district}
                    onChangeText={(val) => updateState('district', val)}
                />
            </View>
        </Animated.View>
    );

    const renderLocationInput = (
        title: string,
        subtitle: string,
        locState: Location,
        setLocState: (l: Location) => void,
        type: string
    ) => (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepSubtitle}>{subtitle}</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Area Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. Downtown Apartment"
                    placeholderTextColor="#6C7A9C"
                    value={locState.area}
                    onChangeText={(val) => setLocState({ ...locState, area: val })}
                />
            </View>
            <Text style={styles.label}>Coordinates</Text>
            {locState.coords[0] !== 0 || locState.coords[1] !== 0 ? (
                <View style={styles.locationBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#00D26A" style={{ marginRight: 8 }} />
                    <View>
                        <Text style={styles.locationBadgeTitle}>Location Selected ✓</Text>
                        <Text style={styles.locationBadgeCoords}>
                            {locState.coords[0].toFixed(4)}, {locState.coords[1].toFixed(4)}
                        </Text>
                    </View>
                </View>
            ) : null}
            <TouchableOpacity
                style={styles.mapButton}
                onPress={() => router.push(`/map-picker?type=${type}` as any)}
            >
                <Ionicons name="map-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.mapButtonText}>Pick on Map</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderStep5 = () => {
        const addArea = () =>
            updateState('frequentAreas', [...state.frequentAreas, { area: '', coords: [0, 0] }]);

        const updateArea = (index: number, field: keyof Location, value: any) => {
            const newAreas = state.frequentAreas.map((a, i) =>
                i === index ? { ...a, [field]: value } : a
            );
            updateState('frequentAreas', newAreas);
        };

        const removeArea = (index: number) =>
            updateState('frequentAreas', state.frequentAreas.filter((_, i) => i !== index));

        return (
            <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Frequent Areas</Text>
                <Text style={styles.stepSubtitle}>Add places you visit often (Optional)</Text>
                {state.frequentAreas.map((area, index) => (
                    <View key={index} style={styles.dynamicCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.label}>Area {index + 1}</Text>
                            <TouchableOpacity onPress={() => removeArea(index)}>
                                <Ionicons name="trash-outline" size={20} color="#FF3A3A" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.input, { marginBottom: 8 }]}
                            placeholder="Area Name"
                            placeholderTextColor="#6C7A9C"
                            value={area.area}
                            onChangeText={(val) => updateArea(index, 'area', val)}
                        />
                        {area.coords[0] !== 0 || area.coords[1] !== 0 ? (
                            <View style={styles.locationBadgeSmall}>
                                <Ionicons name="checkmark-circle" size={18} color="#00D26A" style={{ marginRight: 6 }} />
                                <Text style={styles.locationBadgeCoordsSmall}>
                                    {area.coords[0].toFixed(4)}, {area.coords[1].toFixed(4)}
                                </Text>
                            </View>
                        ) : null}
                        <TouchableOpacity
                            style={styles.mapButtonSmall}
                            onPress={() => router.push(`/map-picker?type=frequent-${index}` as any)}
                        >
                            <Ionicons name="map-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.mapButtonTextSmall}>Pick on Map</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addArea}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add Area</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderStep6 = () => (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Preferences</Text>
            <Text style={styles.stepSubtitle}>Customize your alerts</Text>
            <View style={styles.switchRow}>
                <View>
                    <Text style={styles.switchLabel}>Weather Alerts</Text>
                    <Text style={styles.switchSub}>Receive natural disaster warnings</Text>
                </View>
                <Switch
                    value={state.preferences.weather}
                    onValueChange={(val) => updateState('preferences', { ...state.preferences, weather: val })}
                    trackColor={{ false: "#1E2A47", true: "#3A86FF" }}
                    thumbColor="#FFFFFF"
                />
            </View>
            <View style={styles.switchRow}>
                <View>
                    <Text style={styles.switchLabel}>Traffic Alerts</Text>
                    <Text style={styles.switchSub}>Receive evacuation route updates</Text>
                </View>
                <Switch
                    value={state.preferences.traffic}
                    onValueChange={(val) => updateState('preferences', { ...state.preferences, traffic: val })}
                    trackColor={{ false: "#1E2A47", true: "#3A86FF" }}
                    thumbColor="#FFFFFF"
                />
            </View>
            <View style={styles.switchRow}>
                <View>
                    <Text style={styles.switchLabel}>High Severity Only</Text>
                    <Text style={styles.switchSub}>Mute minor incident notifications</Text>
                </View>
                <Switch
                    value={state.preferences.highSeverityOnly}
                    onValueChange={(val) => updateState('preferences', { ...state.preferences, highSeverityOnly: val })}
                    trackColor={{ false: "#1E2A47", true: "#3A86FF" }}
                    thumbColor="#FFFFFF"
                />
            </View>
        </Animated.View>
    );

    const renderStep7 = () => (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review & Confirm</Text>
            <Text style={styles.stepSubtitle}>Does everything look correct?</Text>
            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Role:</Text>
                    <Text style={styles.summaryValue}>{state.role}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Location:</Text>
                    <Text style={styles.summaryValue}>{state.city}, {state.district}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Home Area:</Text>
                    <Text style={styles.summaryValue}>{state.homeLocation.area}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Work Area:</Text>
                    <Text style={styles.summaryValue}>{state.workLocation.area}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Frequent Areas:</Text>
                    <Text style={styles.summaryValue}>{state.frequentAreas.length} added</Text>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                {step > 1 ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : <View style={styles.placeholder} />}
                <Text style={styles.headerTitle}>Step {step} of {TOTAL_STEPS}</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.progressContainer}>
                <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderLocationInput('Home Location', 'Where do you live?', state.homeLocation, (l) => updateState('homeLocation', l), 'home')}
                {step === 4 && renderLocationInput('Work Location', 'Where do you work?', state.workLocation, (l) => updateState('workLocation', l), 'work')}
                {step === 5 && renderStep5()}
                {step === 6 && renderStep6()}
                {step === 7 && renderStep7()}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleNext}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>
                            {step === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B132B',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 40,
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#1E2A47',
        width: '100%',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3A86FF',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    stepContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        color: '#8A9BAE',
        marginBottom: 32,
    },
    roleCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    roleCardActive: {
        borderColor: '#3A86FF',
        backgroundColor: 'rgba(58, 134, 255, 0.1)',
    },
    roleText: {
        color: '#8A9BAE',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 12,
    },
    roleTextActive: {
        color: '#3A86FF',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        color: '#FFFFFF',
        fontSize: 16,
    },
    dynamicCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#3A86FF',
        borderStyle: 'dashed',
        borderRadius: 12,
        marginTop: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    switchLabel: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    switchSub: {
        color: '#8A9BAE',
        fontSize: 14,
    },
    summaryCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 24,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    summaryLabel: {
        color: '#8A9BAE',
        fontSize: 16,
    },
    summaryValue: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: '#0B132B',
    },
    button: {
        backgroundColor: '#3A86FF',
        borderRadius: 16,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3A86FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(58, 134, 255, 0.2)',
        borderWidth: 1,
        borderColor: '#3A86FF',
        borderRadius: 12,
        marginTop: 8,
    },
    mapButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 210, 106, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 106, 0.3)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    locationBadgeTitle: {
        color: '#00D26A',
        fontSize: 14,
        fontWeight: 'bold',
    },
    locationBadgeCoords: {
        color: '#C5C6C7',
        fontSize: 12,
        marginTop: 2,
    },
    mapButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: 'rgba(58, 134, 255, 0.2)',
        borderWidth: 1,
        borderColor: '#3A86FF',
        borderRadius: 10,
        marginTop: 4,
    },
    mapButtonTextSmall: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    locationBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 210, 106, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 210, 106, 0.3)',
        borderRadius: 10,
        padding: 8,
        marginBottom: 12,
    },
    locationBadgeCoordsSmall: {
        color: '#00D26A',
        fontSize: 12,
        fontWeight: '500',
    },
});
