import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useReportStore } from '@/stores/reportStore';
import type { ReportCategory } from '@/types/tabs';

const CATEGORIES: { key: ReportCategory; label: string; hint: string; icon: string; color: string }[] = [
    { key: 'traffic', label: 'Traffic', hint: 'Accidents, blocks, massive delays', icon: '🚦', color: '#FECA57' },
    { key: 'weather', label: 'Weather', hint: 'Floods, storm damage, heavy rains', icon: '⛈️', color: '#54A0FF' },
    { key: 'fire', label: 'Fire', hint: 'Active fires, smoke, hazards', icon: '🔥', color: '#FF9F43' },
    { key: 'crime', label: 'Crime', hint: 'Theft, robbery, vandalism, assaults', icon: '🚨', color: '#FF6B6B' },
    { key: 'medical', label: 'Medical', hint: 'Injuries, severe health emergencies', icon: '🏥', color: '#FF6B8B' },
    { key: 'infrastructure', label: 'Infrastructure', hint: 'Broken pipes, road damage, outages', icon: '🚧', color: '#FECA57' },
    { key: 'emergency', label: 'Emergency', hint: 'Immediate danger, natural disasters', icon: '⚠️', color: '#FF4757' },
    { key: 'other', label: 'Other', hint: 'General issues or uncategorized events', icon: '📌', color: '#A0A0A0' },
];

const SEVERITY_LEVELS: { key: 'low' | 'medium' | 'high' | 'critical'; label: string; color: string; desc: string }[] = [
    { key: 'low', label: 'Low', color: '#54A0FF', desc: 'Minor issue, no immediate threat' },
    { key: 'medium', label: 'Medium', color: '#FECA57', desc: 'Moderate impact, caution advised' },
    { key: 'high', label: 'High', color: '#FF9F43', desc: 'Significant threat, avoid the area' },
    { key: 'critical', label: 'Critical', color: '#FF6B6B', desc: 'Extreme danger, immediate action' },
];

export default function ReportScreen() {
    const {
        draft,
        stage,
        progress,
        error,
        submitting,
        setCategory,
        setField,
        setImage,
        reset,
        submit,
    } = useReportStore();
    const [picking, setPicking] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);

    const progressText = useMemo(() => {
        if (stage === 'uploading') return `Uploading photo ${Math.round(progress * 100)}%`;
        if (stage === 'submitting') return 'Saving to community feed...';
        return null;
    }, [progress, stage]);

    const handlePickImage = async () => {
        setPicking(true);
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission Required', 'Allow photo access to attach report evidence.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                quality: 0.82,
            });

            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0];
            setImage({
                uri: asset.uri,
                mimeType: asset.mimeType,
                fileName: asset.fileName ?? `report-${Date.now()}.jpg`,
            });
        } catch (pickError: any) {
            Alert.alert('Photo Error', pickError.message || 'Could not select photo.');
        } finally {
            setPicking(false);
        }
    };

    const handleUseCurrentLocation = async () => {
        setFetchingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'GPS location permission is required.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setField('coords', {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            Alert.alert('Location Attached', 'Coordinates retrieved successfully from GPS.');
        } catch (err: any) {
            Alert.alert('Location Error', err.message || 'Could not fetch current position.');
        } finally {
            setFetchingLocation(false);
        }
    };

    const handleSubmit = async () => {
        const success = await submit();
        if (success) {
            Alert.alert('Report Submitted', 'Thank you. Your community report has been broadcast successfully.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Create Report</Text>
                    <Text style={styles.subtitle}>Share a verified incident with your community</Text>
                </View>

                {/* 1. Category Selection */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>REPORT TYPE</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((category) => {
                            const active = draft.category === category.key;
                            return (
                                <TouchableOpacity
                                    key={category.key}
                                    style={[
                                        styles.categoryButton,
                                        active && { borderColor: category.color, backgroundColor: category.color + '18' }
                                    ]}
                                    onPress={() => setCategory(category.key)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.categoryHeader}>
                                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                                        <Text style={[styles.categoryLabel, active && { color: '#FFFFFF' }]}>{category.label}</Text>
                                    </View>
                                    <Text style={styles.categoryHint}>{category.hint}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* 2. Title & Details */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>REPORT DETAILS</Text>
                    
                    <Text style={styles.fieldLabel}>TITLE</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="E.g., Major flooding on main crossing"
                        placeholderTextColor="#4A5568"
                        value={draft.title}
                        onChangeText={(value) => setField('title', value)}
                        maxLength={60}
                    />

                    <Text style={styles.fieldLabel}>DESCRIPTION</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe the incident. What is blocked? Any safety advice?"
                        placeholderTextColor="#4A5568"
                        value={draft.description}
                        onChangeText={(value) => setField('description', value)}
                        multiline
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>
                        {draft.description.trim().length} / 10 minimum characters
                    </Text>
                </View>

                {/* 3. Severity Level Selection */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>SEVERITY LEVEL</Text>
                    <View style={styles.severityGrid}>
                        {SEVERITY_LEVELS.map((level) => {
                            const active = draft.severity === level.key;
                            return (
                                <TouchableOpacity
                                    key={level.key}
                                    style={[
                                        styles.severityButton,
                                        active && { borderColor: level.color, backgroundColor: level.color + '15' }
                                    ]}
                                    onPress={() => setField('severity', level.key)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.severityDot, { backgroundColor: level.color }]} />
                                    <View style={styles.severityTextContainer}>
                                        <Text style={[styles.severityLabel, active && { color: '#FFFFFF' }]}>{level.label}</Text>
                                        <Text style={styles.severityDesc}>{level.desc}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* 4. Location Details */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>LOCATION</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="City (e.g. Karachi)"
                        placeholderTextColor="#4A5568"
                        value={draft.city}
                        onChangeText={(value) => setField('city', value)}
                    />
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Area name (e.g. Civic Center)"
                        placeholderTextColor="#4A5568"
                        value={draft.areaName}
                        onChangeText={(value) => setField('areaName', value)}
                    />

                    {/* Coordinates Picker Row */}
                    <View style={styles.locationButtonRow}>
                        <TouchableOpacity
                            style={styles.locationActionBtn}
                            onPress={() => router.push({
                                pathname: '/map-picker',
                                params: { target: 'report' },
                            })}
                            disabled={submitting}
                        >
                            <Text style={styles.locationActionText}>🗺️ Pick on Map</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.locationActionBtn}
                            onPress={handleUseCurrentLocation}
                            disabled={fetchingLocation || submitting}
                        >
                            {fetchingLocation ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.locationActionText}>📱 GPS Locate</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {draft.coords ? (
                        <View style={styles.coordsBadge}>
                            <Text style={styles.coordsText}>
                                📍 Attached Coords: {draft.coords.latitude.toFixed(5)}, {draft.coords.longitude.toFixed(5)}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.coordsMissing}>
                            <Text style={styles.coordsMissingText}>⚠️ No coordinates attached yet</Text>
                        </View>
                    )}
                </View>

                {/* 5. Photo Upload (Optional) */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>EVIDENCE PHOTO (OPTIONAL)</Text>
                    {draft.imageUri ? (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: draft.imageUri }} style={styles.preview} />
                            <TouchableOpacity
                                style={styles.removePhotoBtn}
                                onPress={() => {
                                    setField('imageUri', null);
                                    setField('imageMimeType', undefined);
                                    setField('imageName', undefined);
                                }}
                            >
                                <Text style={styles.removePhotoText}>✕ Remove Photo</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.photoEmpty}>
                            <Text style={styles.photoEmptyText}>No photo selected (Optional)</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handlePickImage}
                        disabled={picking || submitting}
                    >
                        {picking ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.secondaryButtonText}>
                                {draft.imageUri ? 'Change Photo' : 'Add Photo'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {progressText ? <Text style={styles.progressText}>{progressText}</Text> : null}

                {/* Action Buttons */}
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                >
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit Incident Report</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetButton} onPress={reset} disabled={submitting}>
                    <Text style={styles.resetButtonText}>Clear Draft Form</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B132B' },
    container: { flexGrow: 1, backgroundColor: '#0B132B', padding: 20, paddingTop: 60, paddingBottom: 110 },
    header: { marginBottom: 28 },
    title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#8892A4' },
    card: { backgroundColor: '#141D35', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#1E2D50' },
    cardTitle: { fontSize: 11, fontWeight: '700', color: '#3A86FF', letterSpacing: 2, marginBottom: 16 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8892A4', marginBottom: 8, marginTop: 4 },
    categoryGrid: { gap: 10 },
    categoryButton: { borderRadius: 12, borderWidth: 1, borderColor: '#1E2D50', padding: 14, backgroundColor: '#0D1526' },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
    categoryIcon: { fontSize: 18 },
    categoryLabel: { color: '#8892A4', fontSize: 15, fontWeight: '800' },
    categoryHint: { color: '#4A5568', fontSize: 12, marginLeft: 28 },
    input: { backgroundColor: '#0D1526', borderWidth: 1.5, borderColor: '#1A2540', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16, marginBottom: 12 },
    textArea: { minHeight: 110, lineHeight: 22 },
    charCount: { fontSize: 12, color: '#4A5568', textAlign: 'right', marginTop: -4, marginBottom: 8 },
    severityGrid: { gap: 8 },
    severityButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#1E2D50', padding: 12, backgroundColor: '#0D1526' },
    severityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    severityTextContainer: { flex: 1 },
    severityLabel: { color: '#8892A4', fontSize: 14, fontWeight: '800', marginBottom: 1 },
    severityDesc: { color: '#4A5568', fontSize: 11 },
    locationButtonRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    locationActionBtn: { flex: 1, backgroundColor: 'rgba(58, 134, 255, 0.1)', borderWidth: 1, borderColor: '#3A86FF', borderRadius: 12, padding: 12, alignItems: 'center' },
    locationActionText: { color: '#3A86FF', fontWeight: '800', fontSize: 14 },
    coordsBadge: { backgroundColor: '#0D1526', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1E2D50' },
    coordsText: { color: '#4CAF50', fontWeight: '700', fontSize: 13 },
    coordsMissing: { backgroundColor: '#0D1526', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1E2D50' },
    coordsMissingText: { color: '#FECA57', fontWeight: '700', fontSize: 13 },
    previewContainer: { position: 'relative', width: '100%', height: 210, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
    preview: { width: '100%', height: '100%', backgroundColor: '#0D1526' },
    removePhotoBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(7, 13, 31, 0.82)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    removePhotoText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },
    photoEmpty: { height: 120, borderRadius: 12, borderWidth: 1, borderColor: '#1E2D50', backgroundColor: '#0D1526', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    photoEmptyText: { color: '#4A5568', fontWeight: '700' },
    secondaryButton: { backgroundColor: 'rgba(58, 134, 255, 0.2)', borderWidth: 1, borderColor: '#3A86FF', borderRadius: 12, padding: 14, alignItems: 'center' },
    secondaryButtonText: { color: '#FFFFFF', fontWeight: '800' },
    errorText: { color: '#FFB4B4', textAlign: 'center', marginBottom: 12 },
    progressText: { color: '#8A9BAE', textAlign: 'center', marginBottom: 12 },
    submitButton: { backgroundColor: '#3A86FF', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', shadowColor: '#3A86FF', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    submitButtonDisabled: { opacity: 0.65 },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    resetButton: { padding: 16, alignItems: 'center' },
    resetButtonText: { color: '#8892A4', fontWeight: '700' },
});
