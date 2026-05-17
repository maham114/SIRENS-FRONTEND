import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { LocationTarget, OnboardingLocation } from '@/stores/onboardingStore';
import { locationTargetToParam } from '@/utils/onboardingLocation';

type Props = {
  title: string;
  subtitle: string;
  location: OnboardingLocation;
  target: LocationTarget;
  mode: 'setup' | 'edit';
  onChange: (location: OnboardingLocation) => void;
};

export function LocationPickerField({ title, subtitle, location, target, mode, onChange }: Props) {
  const coords = location.coords;

  return (
    <View style={styles.container}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Area Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Downtown Apartment"
          placeholderTextColor="#6C7A9C"
          value={location.area}
          onChangeText={(area) => onChange({ ...location, area })}
        />
      </View>
      <Text style={styles.label}>Coordinates</Text>
      {coords ? (
        <View style={styles.locationBadge}>
          <Ionicons name="checkmark-circle" size={24} color="#00D26A" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.locationBadgeTitle}>Location Selected</Text>
            <Text style={styles.locationBadgeCoords}>
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </Text>
          </View>
        </View>
      ) : null}
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() =>
          router.push({
            pathname: '/map-picker',
            params: { target: locationTargetToParam(target), mode },
          } as any)
        }
      >
        <Ionicons name="map-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.mapButtonText}>Pick on Map</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
