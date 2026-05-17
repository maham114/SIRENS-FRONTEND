import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStore } from '@/stores/profileStore';

export default function ProfileScreen() {
    const { user, profile, refreshProfile } = useAuth();
    const { saving, loggingOut, error, saveDisplayName, saveProfileFields, logoutUser } = useProfileStore();
    const [displayName, setDisplayName] = useState(user?.displayName ?? '');
    const [city, setCity] = useState(typeof profile?.city === 'string' ? profile.city : '');
    const [district, setDistrict] = useState(typeof profile?.district === 'string' ? profile.district : '');
    const [editingName, setEditingName] = useState(false);
    const [editingLocation, setEditingLocation] = useState(false);

    useEffect(() => {
        setDisplayName(user?.displayName ?? '');
    }, [user?.displayName]);

    useEffect(() => {
        setCity(typeof profile?.city === 'string' ? profile.city : '');
        setDistrict(typeof profile?.district === 'string' ? profile.district : '');
    }, [profile?.city, profile?.district]);

    const initials = (user?.displayName ?? user?.email ?? '?')
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleSaveName = async () => {
        if (!displayName.trim()) return;
        const saved = await saveDisplayName(displayName);
        if (saved) {
            setEditingName(false);
            await user?.reload();
            Alert.alert('Updated', 'Display name saved.');
        }
    };

    const handleSaveLocation = async () => {
        const saved = await saveProfileFields({ city, district });
        if (saved) {
            setEditingLocation(false);
            await refreshProfile();
            Alert.alert('Updated', 'Profile location saved.');
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await logoutUser();
                    router.replace('/login');
                },
            },
        ]);
    };

    const handleEditLocations = () => {
        router.push({ pathname: '/onboarding', params: { mode: 'edit' } });
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.userName}>{user?.displayName ?? 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>ACCOUNT DETAILS</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Display Name</Text>
                        {editingName ? (
                            <View style={styles.editRow}>
                                <TextInput
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    style={styles.nameInput}
                                    autoFocus
                                    placeholderTextColor="#4A5568"
                                />
                                <TouchableOpacity onPress={handleSaveName} style={styles.saveNameBtn} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveNameText}>Save</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDisplayName(user?.displayName ?? '');
                                        setEditingName(false);
                                    }}
                                    style={styles.cancelNameBtn}
                                >
                                    <Text style={styles.cancelNameText}>X</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.editRow}>
                                <Text style={styles.infoValue}>{user?.displayName ?? '-'}</Text>
                                <TouchableOpacity onPress={() => setEditingName(true)}>
                                    <Text style={styles.editLink}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />
                    <DetailRow label="Email" value={user?.email ?? '-'} />
                    <View style={styles.divider} />
                    <DetailRow label="Email Verified" value={user?.emailVerified ? 'Verified' : 'Not verified'} />
                    <View style={styles.divider} />
                    <DetailRow label="User ID" value={`${user?.uid?.slice(0, 16) ?? ''}...`} mono />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>PROFILE LOCATION</Text>
                    {editingLocation ? (
                        <>
                            <TextInput
                                style={styles.nameInput}
                                value={city}
                                onChangeText={setCity}
                                placeholder="City"
                                placeholderTextColor="#4A5568"
                            />
                            <TextInput
                                style={[styles.nameInput, { marginTop: 10 }]}
                                value={district}
                                onChangeText={setDistrict}
                                placeholder="District"
                                placeholderTextColor="#4A5568"
                            />
                            <TouchableOpacity onPress={handleSaveLocation} style={[styles.saveNameBtn, { marginTop: 12 }]} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveNameText}>Save Location</Text>}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <DetailRow label="City" value={city || '-'} />
                            <View style={styles.divider} />
                            <DetailRow label="District" value={district || '-'} />
                            <TouchableOpacity style={styles.inlineAction} onPress={() => setEditingLocation(true)}>
                                <Text style={styles.inlineActionText}>Edit city and district</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>SETTINGS</Text>
                    <SettingsRow label="Alert Preferences" value="Open" onPress={() => router.push('/(tabs)/alerts' as any)} />
                    <View style={styles.divider} />
                    <SettingsRow label="Update My Locations" value="Open" onPress={handleEditLocations} />
                </View>

                <TouchableOpacity
                    style={[styles.signOutBtn, loggingOut && styles.signOutBtnDisabled]}
                    onPress={handleSignOut}
                    activeOpacity={0.85}
                    disabled={loggingOut}
                >
                    {loggingOut ? <ActivityIndicator color="#FF6B6B" /> : <Text style={styles.signOutText}>Sign Out</Text>}
                </TouchableOpacity>

                <Text style={styles.version}>SIRENS v1.0.0</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={1}>{value}</Text>
        </View>
    );
}

function SettingsRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.settingsLabel}>{label}</Text>
            <Text style={styles.chevron}>{value}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B132B' },
    container: { flexGrow: 1, backgroundColor: '#0B132B', padding: 20, paddingTop: 60, paddingBottom: 100 },
    header: { marginBottom: 28 },
    title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#3A86FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#3A86FF', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    avatarText: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
    userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    userEmail: { fontSize: 13, color: '#8892A4' },
    card: { backgroundColor: '#141D35', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#1E2D50' },
    cardTitle: { fontSize: 11, fontWeight: '700', color: '#3A86FF', letterSpacing: 2, marginBottom: 16 },
    divider: { height: 1, backgroundColor: '#1E2D50', marginVertical: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    infoLabel: { fontSize: 13, color: '#8892A4', fontWeight: '500' },
    infoValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '600', flexShrink: 1 },
    mono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12, color: '#8892A4' },
    editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
    nameInput: { flex: 1, backgroundColor: '#0B132B', color: '#FFFFFF', padding: 10, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#3A86FF' },
    saveNameBtn: { backgroundColor: '#3A86FF', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
    saveNameText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    cancelNameBtn: { padding: 6 },
    cancelNameText: { color: '#FF6B6B', fontWeight: '700', fontSize: 14 },
    editLink: { color: '#3A86FF', fontSize: 13, fontWeight: '600' },
    settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingsLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    chevron: { fontSize: 13, color: '#3A86FF', fontWeight: '800' },
    inlineAction: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: 'rgba(58, 134, 255, 0.12)', alignItems: 'center' },
    inlineActionText: { color: '#3A86FF', fontWeight: '800' },
    signOutBtn: { backgroundColor: 'transparent', padding: 17, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B6B', marginTop: 8 },
    signOutBtnDisabled: { opacity: 0.6 },
    signOutText: { color: '#FF6B6B', fontSize: 16, fontWeight: '700' },
    version: { textAlign: 'center', color: '#2A3A5C', fontSize: 12, marginTop: 24, letterSpacing: 1.5 },
    errorText: { color: '#FFB4B4', textAlign: 'center', marginBottom: 12 },
});
