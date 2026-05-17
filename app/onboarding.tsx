import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
    FrequentAreasStep,
    HomeLocationStep,
    LocationDetailsStep,
    PreferencesStep,
    ReviewStep,
    RoleStep,
    WorkLocationStep,
} from '@/components/onboarding/OnboardingSteps';
import { useAuth } from '@/hooks/useAuth';
import { updateOnboardingFn } from '@/lib/firebase';
import { TOTAL_STEPS, useOnboardingStore } from '@/stores/onboardingStore';
import type { AlertPreferences } from '@/stores/onboardingStore';
import { normalizeLocation, toBackendLocation } from '@/utils/onboardingLocation';
import { validateOnboardingStep } from '@/utils/onboardingValidation';

export default function OnboardingScreen() {
    const { profile, refreshProfile } = useAuth();
    const { mode } = useLocalSearchParams<{ mode?: string }>();
    const progressWidth = useSharedValue(100 / TOTAL_STEPS);

    const {
        role,
        city,
        district,
        homeLocation,
        workLocation,
        frequentAreas,
        preferences,
        step,
        mode: storeMode,
        loading,
        error,
        setRole,
        setCity,
        setDistrict,
        setHomeLocation,
        setWorkLocation,
        addFrequentArea,
        updateFrequentArea,
        removeFrequentArea,
        setPreferences,
        nextStep,
        previousStep,
        setMode,
        setLoading,
        setError,
        hydrateDraft,
        clearDraft,
    } = useOnboardingStore();

    useEffect(() => {
        setMode(mode === 'edit' ? 'edit' : 'setup');
    }, [mode, setMode]);

    useEffect(() => {
        if (mode !== 'edit' || !profile) return;
        if (city || homeLocation.area || workLocation.area) return;

        hydrateDraft({
            city: typeof profile.city === 'string' ? profile.city : '',
            district: typeof profile.district === 'string' ? profile.district : '',
            homeLocation: normalizeLocation(profile.homeLocation),
            workLocation: normalizeLocation(profile.workLocation),
            frequentAreas: Array.isArray(profile.frequentAreas)
                ? profile.frequentAreas.map(normalizeLocation)
                : [],
            preferences: typeof profile.preferences === 'object' && profile.preferences !== null
                ? profile.preferences as AlertPreferences
                : preferences,
        });
    }, [city, homeLocation.area, hydrateDraft, mode, preferences, profile, workLocation.area]);

    useEffect(() => {
        progressWidth.value = withTiming((step / TOTAL_STEPS) * 100);
    }, [progressWidth, step]);

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const validateCurrentStep = () => {
        const message = validateOnboardingStep({
            step,
            role,
            city,
            district,
            homeLocation,
            workLocation,
            frequentAreas,
        });

        if (message) {
            Alert.alert('Required', message);
            setError(message);
            return false;
        }

        setError(null);
        return true;
    };

    const submitData = async () => {
        for (let candidateStep = 1; candidateStep <= 5; candidateStep += 1) {
            const message = validateOnboardingStep({
                step: candidateStep,
                role,
                city,
                district,
                homeLocation,
                workLocation,
                frequentAreas,
            });
            if (message) {
                setError(message);
                Alert.alert('Required', message);
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            const submitOnboarding = updateOnboardingFn();
            const onboardingData = {
                role: 'citizen',
                city: city.trim(),
                district: district.trim(),
                homeLocation: toBackendLocation(homeLocation),
                workLocation: toBackendLocation(workLocation),
                frequentAreas: frequentAreas.map(toBackendLocation),
                preferences,
            };

            await submitOnboarding(onboardingData);

            await refreshProfile();
            clearDraft();
            Alert.alert('Success', storeMode === 'edit' ? 'Locations updated.' : 'Profile setup complete!');
            router.replace('/(tabs)/home');
        } catch (submitError: any) {
            const message = submitError.message || 'Could not save onboarding data. Please try again.';
            setError(message);
            Alert.alert('Error saving data', message);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        if (step < TOTAL_STEPS) {
            nextStep();
            return;
        }
        submitData();
    };

    const renderStep = () => {
        const commonProps = {
            role,
            city,
            district,
            homeLocation,
            workLocation,
            frequentAreas,
            preferences,
            mode: storeMode,
            setRole,
            setCity,
            setDistrict,
            setHomeLocation,
            setWorkLocation,
            addFrequentArea,
            updateFrequentArea,
            removeFrequentArea,
            setPreferences,
        };

        switch (step) {
            case 1:
                return <RoleStep {...commonProps} />;
            case 2:
                return <LocationDetailsStep {...commonProps} />;
            case 3:
                return <HomeLocationStep {...commonProps} />;
            case 4:
                return <WorkLocationStep {...commonProps} />;
            case 5:
                return <FrequentAreasStep {...commonProps} />;
            case 6:
                return <PreferencesStep {...commonProps} />;
            case 7:
                return <ReviewStep {...commonProps} />;
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                {step > 1 ? (
                    <TouchableOpacity onPress={previousStep} style={styles.backBtn} disabled={loading}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : <View style={styles.placeholder} />}
                <Text style={styles.headerTitle}>Step {step} of {TOTAL_STEPS}</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.progressContainer}>
                <Animated.View style={[styles.progressBar, animatedProgressStyle]} />
            </View>

            {error ? (
                <TouchableOpacity style={styles.errorBanner} onPress={() => setError(null)}>
                    <Text style={styles.errorText}>{error}</Text>
                </TouchableOpacity>
            ) : null}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {renderStep()}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={loading}
                >
                    {loading ? (
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
    errorBanner: {
        backgroundColor: 'rgba(255, 58, 58, 0.14)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 58, 58, 0.3)',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    errorText: {
        color: '#FFB4B4',
        fontSize: 13,
        textAlign: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
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
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
