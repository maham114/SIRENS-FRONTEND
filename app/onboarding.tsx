<<<<<<< HEAD
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
=======
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
>>>>>>> 7a80fb7 (frontend almost done)
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
<<<<<<< HEAD
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
=======
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { updateOnboardingFn } from '../firebaseConfig';

type LocationEntry = { area: string; coords: { latitude: number; longitude: number } };

const STEPS = ['City & District', 'Home Location', 'Work Location', 'Frequent Areas'];

export default function OnboardingScreen() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);

    // Step 0
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');

    // Step 1 – Home
    const [homeArea, setHomeArea] = useState('');
    const [homeCoords, setHomeCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    // Step 2 – Work
    const [workArea, setWorkArea] = useState('');
    const [workCoords, setWorkCoords] = useState<{ latitude: number; longitude: number } | null>(null);

    // Step 3 – Frequent areas
    const [freqInput, setFreqInput] = useState('');
    const [frequentAreas, setFrequentAreas] = useState<LocationEntry[]>([]);

    const detectLocation = async (
        setArea: (a: string) => void,
        setCoords: (c: { latitude: number; longitude: number }) => void
    ) => {
        setLocLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access is required.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;
            setCoords({ latitude, longitude });

            // Reverse geocode to get area name
            const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
            const areaName = [place.name, place.street, place.district, place.city]
                .filter(Boolean)
                .join(', ');
            setArea(areaName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
            Alert.alert('Error', 'Could not detect location. Please enter manually.');
        } finally {
            setLocLoading(false);
        }
    };

    const addFrequentArea = () => {
        if (!freqInput.trim()) return;
        // Use placeholder coords — in production, geocode the area name
        const entry: LocationEntry = {
            area: freqInput.trim(),
            coords: { latitude: 0, longitude: 0 },
        };
        setFrequentAreas((prev) => [...prev, entry]);
        setFreqInput('');
    };

    const removeFreqArea = (idx: number) => {
        setFrequentAreas((prev) => prev.filter((_, i) => i !== idx));
    };

    const canProceed = () => {
        if (step === 0) return city.trim() && district.trim();
        if (step === 1) return homeArea.trim() && homeCoords;
        if (step === 2) return true; // work is optional
        return true;
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep((s) => s + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const updateOnboarding = updateOnboardingFn();
            await updateOnboarding({
                city,
                district,
                homeLocation: {
                    area: homeArea,
                    coords: homeCoords ?? { latitude: 0, longitude: 0 },
                },
                workLocation: {
                    area: workArea,
                    coords: workCoords ?? { latitude: 0, longitude: 0 },
                },
                frequentAreas,
                onboardingComplete: true,
            });
            router.replace('/(tabs)/home');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save onboarding data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* Progress */}
                <View style={styles.progressRow}>
                    {STEPS.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.progressDot, i <= step && styles.progressDotActive]}
                        />
                    ))}
                </View>

                <Text style={styles.stepLabel}>STEP {step + 1} OF {STEPS.length}</Text>
                <Text style={styles.title}>{STEPS[step]}</Text>

                {/* ── Step 0: City & District ── */}
                {step === 0 && (
                    <View style={styles.form}>
                        <Text style={styles.hint}>
                            We use this to show you relevant local alerts and reports.
                        </Text>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>CITY</Text>
                            <TextInput
                                placeholder="e.g. Karachi"
                                placeholderTextColor="#4A5568"
                                style={styles.input}
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>DISTRICT / AREA</Text>
                            <TextInput
                                placeholder="e.g. Gulshan-e-Iqbal"
                                placeholderTextColor="#4A5568"
                                style={styles.input}
                                value={district}
                                onChangeText={setDistrict}
                            />
                        </View>
                    </View>
                )}

                {/* ── Step 1: Home Location ── */}
                {step === 1 && (
                    <View style={styles.form}>
                        <Text style={styles.hint}>
                            Your home location helps us send you hyper-local alerts.
                        </Text>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>HOME AREA NAME</Text>
                            <TextInput
                                placeholder="e.g. Main St & 5th Ave"
                                placeholderTextColor="#4A5568"
                                style={styles.input}
                                value={homeArea}
                                onChangeText={setHomeArea}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.detectBtn}
                            onPress={() => detectLocation(setHomeArea, setHomeCoords)}
                            disabled={locLoading}
                        >
                            {locLoading ? (
                                <ActivityIndicator color="#3A86FF" size="small" />
                            ) : (
                                <Text style={styles.detectBtnText}>📍 Detect My Location</Text>
                            )}
                        </TouchableOpacity>
                        {homeCoords && (
                            <Text style={styles.coordsLabel}>
                                ✅ {homeCoords.latitude.toFixed(5)}, {homeCoords.longitude.toFixed(5)}
                            </Text>
                        )}
                    </View>
                )}

                {/* ── Step 2: Work Location ── */}
                {step === 2 && (
                    <View style={styles.form}>
                        <Text style={styles.hint}>
                            Optional — skip if not applicable.
                        </Text>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>WORK AREA NAME</Text>
                            <TextInput
                                placeholder="e.g. Business District"
                                placeholderTextColor="#4A5568"
                                style={styles.input}
                                value={workArea}
                                onChangeText={setWorkArea}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.detectBtn}
                            onPress={() => detectLocation(setWorkArea, setWorkCoords)}
                            disabled={locLoading}
                        >
                            {locLoading ? (
                                <ActivityIndicator color="#3A86FF" size="small" />
                            ) : (
                                <Text style={styles.detectBtnText}>📍 Detect Work Location</Text>
                            )}
                        </TouchableOpacity>
                        {workCoords && (
                            <Text style={styles.coordsLabel}>
                                ✅ {workCoords.latitude.toFixed(5)}, {workCoords.longitude.toFixed(5)}
                            </Text>
                        )}
                    </View>
                )}

                {/* ── Step 3: Frequent Areas ── */}
                {step === 3 && (
                    <View style={styles.form}>
                        <Text style={styles.hint}>
                            Add areas you visit often (market, gym, school). Tap + to add.
                        </Text>
                        <View style={styles.addRow}>
                            <TextInput
                                placeholder="Area name"
                                placeholderTextColor="#4A5568"
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={freqInput}
                                onChangeText={setFreqInput}
                                onSubmitEditing={addFrequentArea}
                            />
                            <TouchableOpacity style={styles.addBtn} onPress={addFrequentArea}>
                                <Text style={styles.addBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                        {frequentAreas.map((a, i) => (
                            <View key={i} style={styles.tagRow}>
                                <Text style={styles.tagText}>📌 {a.area}</Text>
                                <TouchableOpacity onPress={() => removeFreqArea(i)}>
                                    <Text style={styles.removeText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {frequentAreas.length === 0 && (
                            <Text style={styles.emptyHint}>No areas added yet</Text>
                        )}
                    </View>
                )}

                {/* Navigation */}
                <View style={styles.navRow}>
                    {step > 0 && (
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => setStep((s) => s - 1)}
                        >
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.nextBtn,
                            !canProceed() && styles.nextBtnDisabled,
                            step === 0 && { flex: 1 },
                        ]}
                        onPress={handleNext}
                        disabled={!canProceed() || loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.nextBtnText}>
                                {step === STEPS.length - 1 ? 'Finish Setup →' : 'Next →'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {step === 3 && (
                    <TouchableOpacity style={styles.skipBtn} onPress={handleSubmit}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
>>>>>>> 7a80fb7 (frontend almost done)
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
<<<<<<< HEAD
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
=======
        flexGrow: 1,
        padding: 28,
        paddingTop: 64,
        backgroundColor: '#0B132B',
    },
    progressRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    progressDot: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#1E2D50',
    },
    progressDotActive: {
        backgroundColor: '#3A86FF',
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3A86FF',
        letterSpacing: 2,
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 32,
    },
    hint: {
        fontSize: 14,
        color: '#8892A4',
        lineHeight: 20,
        marginBottom: 24,
    },
    form: {
        gap: 4,
        marginBottom: 32,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3A86FF',
        letterSpacing: 2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#141D35',
        color: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#1E2D50',
        marginBottom: 0,
    },
    detectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3A86FF',
        marginTop: 8,
    },
    detectBtnText: {
        color: '#3A86FF',
        fontWeight: '600',
        fontSize: 15,
    },
    coordsLabel: {
        color: '#4CAF50',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    addRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    addBtn: {
        backgroundColor: '#3A86FF',
        width: 48,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '300',
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#141D35',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    tagText: {
        color: '#C5C6C7',
        fontSize: 14,
    },
    removeText: {
        color: '#FF6B6B',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyHint: {
        color: '#4A5568',
        textAlign: 'center',
        marginTop: 12,
        fontSize: 13,
    },
    navRow: {
        flexDirection: 'row',
        gap: 12,
    },
    backBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E2D50',
        alignItems: 'center',
    },
    backBtnText: {
        color: '#8892A4',
        fontWeight: '600',
        fontSize: 15,
    },
    nextBtn: {
        flex: 2,
        backgroundColor: '#3A86FF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#3A86FF',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    nextBtnDisabled: {
        opacity: 0.4,
    },
    nextBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    skipBtn: {
        alignItems: 'center',
        marginTop: 16,
    },
    skipText: {
        color: '#4A5568',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
});
>>>>>>> 7a80fb7 (frontend almost done)
