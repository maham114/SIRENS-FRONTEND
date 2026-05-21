import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LocationPickerField } from './LocationPickerField';
import { StepFrame } from './StepFrame';
import type {
  AlertPreferences,
  AuthorityContact,
  OnboardingLocation,
  OnboardingRole,
} from '@/stores/onboardingStore';

type StepProps = {
  role: OnboardingRole;
  city: string;
  district: string;
  homeLocation: OnboardingLocation;
  workLocation: OnboardingLocation;
  frequentAreas: OnboardingLocation[];
  preferences: AlertPreferences;
  mode: 'setup' | 'edit';
  authorityRoles?: AuthorityContact[];
  setRole: (role: OnboardingRole) => void;
  setCity: (city: string) => void;
  setDistrict: (district: string) => void;
  setHomeLocation: (location: OnboardingLocation) => void;
  setWorkLocation: (location: OnboardingLocation) => void;
  addFrequentArea: () => void;
  updateFrequentArea: (index: number, location: Partial<OnboardingLocation>) => void;
  removeFrequentArea: (index: number) => void;
  setPreferences: (preferences: AlertPreferences) => void;
};

export function RoleStep({ role, setRole, authorityRoles }: Pick<StepProps, 'role' | 'setRole' | 'authorityRoles'>) {
  const roles = authorityRoles ?? [];

  return (
    <StepFrame>
      <Text style={styles.stepTitle}>Select Your Role</Text>
      <Text style={styles.stepSubtitle}>How will you be using SIRENS?</Text>

      <TouchableOpacity
        style={[styles.roleCard, role === 'citizen' && styles.roleCardActive]}
        onPress={() => setRole('citizen')}
      >
        <Ionicons name="person" size={32} color={role === 'citizen' ? '#3A86FF' : '#6C7A9C'} />
        <Text style={[styles.roleText, role === 'citizen' && styles.roleTextActive]}>
          CITIZEN
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Authority Roles</Text>
      {roles.map((auth) => {
        const roleKey = `${auth.crisisType}_auth` as OnboardingRole;
        const isSelected = role === roleKey;
        return (
          <TouchableOpacity
            key={auth.crisisType}
            style={[styles.roleCard, styles.roleCardRow, isSelected && styles.roleCardActive]}
            onPress={() => setRole(roleKey)}
          >
            <Ionicons name="shield" size={32} color={isSelected ? '#3A86FF' : '#6C7A9C'} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.roleText, isSelected && styles.roleTextActive]}>
                {auth.name}
              </Text>
              <Text style={styles.roleSubtext}>{auth.crisisType} • {auth.contact}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </StepFrame>
  );
}

export function LocationDetailsStep({ city, district, setCity, setDistrict }: Pick<StepProps, 'city' | 'district' | 'setCity' | 'setDistrict'>) {
  return (
    <StepFrame>
      <Text style={styles.stepTitle}>Location Details</Text>
      <Text style={styles.stepSubtitle}>Where are you primarily based?</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. New York"
          placeholderTextColor="#6C7A9C"
          value={city}
          onChangeText={setCity}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>District / Borough</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Manhattan"
          placeholderTextColor="#6C7A9C"
          value={district}
          onChangeText={setDistrict}
        />
      </View>
    </StepFrame>
  );
}

export function HomeLocationStep({ homeLocation, mode, setHomeLocation }: Pick<StepProps, 'homeLocation' | 'mode' | 'setHomeLocation'>) {
  return (
    <StepFrame>
      <LocationPickerField
        title="Home Location"
        subtitle="Where do you live?"
        location={homeLocation}
        target={{ kind: 'home' }}
        mode={mode}
        onChange={setHomeLocation}
      />
    </StepFrame>
  );
}

export function WorkLocationStep({ workLocation, mode, setWorkLocation }: Pick<StepProps, 'workLocation' | 'mode' | 'setWorkLocation'>) {
  return (
    <StepFrame>
      <LocationPickerField
        title="Work Location"
        subtitle="Where do you work?"
        location={workLocation}
        target={{ kind: 'work' }}
        mode={mode}
        onChange={setWorkLocation}
      />
    </StepFrame>
  );
}

export function FrequentAreasStep({
  frequentAreas,
  mode,
  addFrequentArea,
  updateFrequentArea,
  removeFrequentArea,
}: Pick<StepProps, 'frequentAreas' | 'mode' | 'addFrequentArea' | 'updateFrequentArea' | 'removeFrequentArea'>) {
  return (
    <StepFrame>
      <Text style={styles.stepTitle}>Frequent Areas</Text>
      <Text style={styles.stepSubtitle}>Add places you visit often (Optional)</Text>
      {frequentAreas.map((area, index) => (
        <View key={index} style={styles.dynamicCard}>
          <View style={styles.dynamicHeader}>
            <Text style={styles.label}>Area {index + 1}</Text>
            <TouchableOpacity onPress={() => removeFrequentArea(index)}>
              <Ionicons name="trash-outline" size={20} color="#FF3A3A" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="Area Name"
            placeholderTextColor="#6C7A9C"
            value={area.area}
            onChangeText={(value) => updateFrequentArea(index, { area: value })}
          />
          {area.coords ? (
            <View style={styles.locationBadgeSmall}>
              <Ionicons name="checkmark-circle" size={18} color="#00D26A" style={{ marginRight: 6 }} />
              <Text style={styles.locationBadgeCoordsSmall}>
                {area.coords.latitude.toFixed(4)}, {area.coords.longitude.toFixed(4)}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.mapButtonSmall}
            onPress={() => router.push({
              pathname: '/map-picker',
              params: { target: `frequent-${index}`, mode },
            } as any)}
          >
            <Ionicons name="map-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.mapButtonTextSmall}>Pick on Map</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={addFrequentArea}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Area</Text>
      </TouchableOpacity>
    </StepFrame>
  );
}

export function PreferencesStep({ preferences, setPreferences }: Pick<StepProps, 'preferences' | 'setPreferences'>) {
  return (
    <StepFrame>
      <Text style={styles.stepTitle}>Preferences</Text>
      <Text style={styles.stepSubtitle}>Customize your alerts</Text>
      <SwitchRow
        label="Weather Alerts"
        subtitle="Receive natural disaster warnings"
        value={preferences.weather}
        onValueChange={(weather) => setPreferences({ ...preferences, weather })}
      />
      <SwitchRow
        label="Traffic Alerts"
        subtitle="Receive evacuation route updates"
        value={preferences.traffic}
        onValueChange={(traffic) => setPreferences({ ...preferences, traffic })}
      />
      <SwitchRow
        label="High Severity Only"
        subtitle="Mute minor incident notifications"
        value={preferences.highSeverityOnly}
        onValueChange={(highSeverityOnly) => setPreferences({ ...preferences, highSeverityOnly })}
      />
    </StepFrame>
  );
}

function SwitchRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#1E2A47', true: '#3A86FF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function ReviewStep({ role, city, district, homeLocation, workLocation, frequentAreas }: Pick<StepProps, 'role' | 'city' | 'district' | 'homeLocation' | 'workLocation' | 'frequentAreas'>) {
  return (
    <StepFrame>
      <Text style={styles.stepTitle}>Review & Confirm</Text>
      <Text style={styles.stepSubtitle}>Does everything look correct?</Text>
      <View style={styles.summaryCard}>
        <SummaryRow label="Role:" value={role} />
        <SummaryRow label="Location:" value={`${city}, ${district}`} />
        <SummaryRow label="Home Area:" value={homeLocation.area} />
        <SummaryRow label="Work Area:" value={workLocation.area} />
        <SummaryRow label="Frequent Areas:" value={`${frequentAreas.length} added`} />
      </View>
    </StepFrame>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  roleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  roleSubtext: {
    color: '#8A9BAE',
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
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
  dynamicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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