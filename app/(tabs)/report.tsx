import * as ImagePicker from 'expo-image-picker';
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

const CATEGORIES: { key: ReportCategory; label: string; hint: string }[] = [
    { key: 'accident', label: 'Accident', hint: 'Road collision or injury' },
    { key: 'fire', label: 'Fire', hint: 'Smoke, flames, hazard' },
    { key: 'weather', label: 'Weather', hint: 'Flood, storm, heat' },
    { key: 'traffic', label: 'Traffic', hint: 'Blocked route or jam' },
    { key: 'other', label: 'Other', hint: 'Anything urgent' },
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

    const progressText = useMemo(() => {
        if (stage === 'uploading') return `Uploading photo ${Math.round(progress * 100)}%`;
        if (stage === 'submitting') return 'Submitting report...';
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
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    const handleSubmit = async () => {
        const success = await submit();
        if (success) {
            Alert.alert('Report Submitted', 'Thanks. Your report has been sent for processing.');
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

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>REPORT TYPE</Text>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((category) => {
                            const active = draft.category === category.key;
                            return (
                                <TouchableOpacity
                                    key={category.key}
                                    style={[styles.categoryButton, active && styles.categoryButtonActive]}
                                    onPress={() => setCategory(category.key)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{category.label}</Text>
                                    <Text style={styles.categoryHint}>{category.hint}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>PHOTO</Text>
                    {draft.imageUri ? (
                        <Image source={{ uri: draft.imageUri }} style={styles.preview} />
                    ) : (
                        <View style={styles.photoEmpty}>
                            <Text style={styles.photoEmptyText}>No photo selected</Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage} disabled={picking || submitting}>
                        {picking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.secondaryButtonText}>{draft.imageUri ? 'Change Photo' : 'Add Photo'}</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>LOCATION</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="City"
                        placeholderTextColor="#4A5568"
                        value={draft.city}
                        onChangeText={(value) => setField('city', value)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Area name"
                        placeholderTextColor="#4A5568"
                        value={draft.areaName}
                        onChangeText={(value) => setField('areaName', value)}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>DETAILS</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="What happened?"
                        placeholderTextColor="#4A5568"
                        value={draft.description}
                        onChangeText={(value) => setField('description', value)}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {progressText ? <Text style={styles.progressText}>{progressText}</Text> : null}

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                >
                    {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Submit Report</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetButton} onPress={reset} disabled={submitting}>
                    <Text style={styles.resetButtonText}>Clear Form</Text>
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
    categoryGrid: { gap: 10 },
    categoryButton: { borderRadius: 12, borderWidth: 1, borderColor: '#1E2D50', padding: 14, backgroundColor: '#0D1526' },
    categoryButtonActive: { borderColor: '#3A86FF', backgroundColor: 'rgba(58, 134, 255, 0.12)' },
    categoryLabel: { color: '#8892A4', fontSize: 15, fontWeight: '800', marginBottom: 3 },
    categoryLabelActive: { color: '#FFFFFF' },
    categoryHint: { color: '#4A5568', fontSize: 12 },
    preview: { width: '100%', height: 210, borderRadius: 12, backgroundColor: '#0D1526', marginBottom: 12 },
    photoEmpty: { height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#1E2D50', backgroundColor: '#0D1526', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    photoEmptyText: { color: '#4A5568', fontWeight: '700' },
    secondaryButton: { backgroundColor: 'rgba(58, 134, 255, 0.2)', borderWidth: 1, borderColor: '#3A86FF', borderRadius: 12, padding: 14, alignItems: 'center' },
    secondaryButtonText: { color: '#FFFFFF', fontWeight: '800' },
    input: { backgroundColor: '#0D1526', borderWidth: 1.5, borderColor: '#1A2540', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16, marginBottom: 12 },
    textArea: { minHeight: 130, lineHeight: 22 },
    errorText: { color: '#FFB4B4', textAlign: 'center', marginBottom: 12 },
    progressText: { color: '#8A9BAE', textAlign: 'center', marginBottom: 12 },
    submitButton: { backgroundColor: '#3A86FF', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', shadowColor: '#3A86FF', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    submitButtonDisabled: { opacity: 0.65 },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    resetButton: { padding: 16, alignItems: 'center' },
    resetButtonText: { color: '#8892A4', fontWeight: '700' },
});
