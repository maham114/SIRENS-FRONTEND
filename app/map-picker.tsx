import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { useOnboardingStore, type Coordinates } from '@/stores/onboardingStore';
import { useReportStore } from '@/stores/reportStore';
import { parseLocationTarget } from '@/utils/onboardingLocation';

const FALLBACK_REGION: Region = {
    latitude: 24.8607,
    longitude: 67.0011,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function MapPicker() {
    const params = useLocalSearchParams<{ target?: string; mode?: string }>();
    const parsedTarget = useMemo(() => parseLocationTarget(params.target), [params.target]);
    const { setLocationCoords, setMode } = useOnboardingStore();

    const [region, setRegion] = useState<Region>(FALLBACK_REGION);
    const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMode(params.mode === 'edit' ? 'edit' : 'setup');
    }, [params.mode, setMode]);

    const getCurrentLocation = async () => {
        setLoadingLocation(true);
        setError(null);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setPermissionDenied(true);
                return;
            }

            setPermissionDenied(false);
            const location = await Location.getCurrentPositionAsync({});
            setRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });
        } catch (locationError: any) {
            setError(locationError.message || 'Could not load your current location.');
        } finally {
            setLoadingLocation(false);
        }
    };

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const handleMapPress = (event: MapPressEvent) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        setSelectedLocation({ latitude, longitude });
    };

    const handleConfirm = () => {
        if (!selectedLocation || !parsedTarget) return;
        if (parsedTarget.kind === 'report') {
            useReportStore.getState().setField('coords', selectedLocation);
            router.replace('/(tabs)/report');
        } else {
            setLocationCoords(parsedTarget, selectedLocation);
            router.replace({
                pathname: '/onboarding',
                params: { mode: params.mode === 'edit' ? 'edit' : 'setup' },
            });
        }
    };

    const goBackToOnboarding = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        if (parsedTarget?.kind === 'report') {
            router.replace('/(tabs)/report');
            return;
        }

        router.replace({
            pathname: '/onboarding',
            params: { mode: params.mode === 'edit' ? 'edit' : 'setup' },
        });
    };

    const hint = useMemo(() => {
        if (!parsedTarget) return 'Choose a valid onboarding location field first.';
        if (loadingLocation) return 'Finding your current area...';
        if (permissionDenied) return 'Location permission is off. You can still tap the map manually.';
        if (selectedLocation) return 'Location selected - tap Confirm';
        return 'Tap anywhere on the map to pin your location';
    }, [loadingLocation, parsedTarget, permissionDenied, selectedLocation]);

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={region}
                onPress={handleMapPress}
            >
                {selectedLocation && (
                    <Marker coordinate={selectedLocation} />
                )}
            </MapView>

            <View style={styles.hint}>
                {loadingLocation ? <ActivityIndicator color="#3A86FF" size="small" style={styles.hintLoader} /> : null}
                <Text style={styles.hintText}>{hint}</Text>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity onPress={goBackToOnboarding} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>

            {(permissionDenied || error) ? (
                <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation} activeOpacity={0.85}>
                    <Text style={styles.retryText}>Retry Current Location</Text>
                </TouchableOpacity>
            ) : null}

            <TouchableOpacity
                style={[styles.button, (!selectedLocation || !parsedTarget) && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={!selectedLocation || !parsedTarget}
                activeOpacity={0.85}
            >
                <Text style={styles.buttonText}>Confirm Location</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    hint: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(7, 13, 31, 0.88)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    hintLoader: {
        marginBottom: 6,
    },
    hintText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    errorText: {
        color: '#FFB4B4',
        fontSize: 12,
        marginTop: 6,
        textAlign: 'center',
    },
    cancelButton: {
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1E2A47',
    },
    cancelText: {
        color: '#8A9BAE',
        fontSize: 13,
        fontWeight: '700',
    },
    retryButton: {
        position: 'absolute',
        bottom: 112,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(13, 24, 41, 0.92)',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E2A47',
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    button: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: '#3A86FF',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#3A86FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonDisabled: {
        backgroundColor: '#1E2A47',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
