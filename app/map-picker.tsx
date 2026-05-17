import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapPicker() {

    const params = useLocalSearchParams<{ type?: string }>();

    const [region, setRegion] = useState({
        latitude: 24.8607,
        longitude: 67.0011,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const [selectedLocation, setSelectedLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    useEffect(() => {
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({});
        setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        });
    };

    const handleMapPress = (event: any) => {
        setSelectedLocation(event.nativeEvent.coordinate);
    };

    const handleConfirm = () => {
        if (!selectedLocation) return;

        // ✅ FIX: router.navigate() goes BACK to the existing onboarding screen
        //    in the stack and passes params to it — the screen is NOT remounted,
        //    so all step state is preserved.
        //
        // ❌ router.replace() was the bug — it destroyed the onboarding screen
        //    and created a fresh one, resetting step back to 1 every time.
        router.navigate({
            pathname: '/onboarding',
            params: {
                lat: selectedLocation.latitude.toString(),
                lng: selectedLocation.longitude.toString(),
                type: params.type,
            },
        });
    };

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

            {/* Instruction hint */}
            <View style={styles.hint}>
                <Text style={styles.hintText}>
                    {selectedLocation ? '✓ Location selected — tap Confirm' : 'Tap anywhere on the map to pin your location'}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.button, !selectedLocation && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={!selectedLocation}
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
        backgroundColor: 'rgba(7, 13, 31, 0.85)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    hintText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
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