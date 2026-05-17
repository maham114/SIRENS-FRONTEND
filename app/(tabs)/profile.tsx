import { router } from 'expo-router';
import { signOut, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../../firebaseConfig';

export default function ProfileScreen() {
    const user = auth.currentUser;
    const [displayName, setDisplayName] = useState(user?.displayName ?? '');
    const [editingName, setEditingName] = useState(false);
    const [saving, setSaving] = useState(false);

    const initials = (user?.displayName ?? user?.email ?? '?')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleSaveName = async () => {
        if (!displayName.trim()) return;
        setSaving(true);
        try {
            if (user) await updateProfile(user, { displayName: displayName.trim() });
            setEditingName(false);
            Alert.alert('✅ Updated', 'Display name saved.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut(auth);
                    router.replace('/login');
                },
            },
        ]);
    };

    const handleResetOnboarding = () => {
        Alert.alert(
            'Reset Onboarding',
            'This will take you back through the onboarding setup. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Continue', onPress: () => router.push('/onboarding') },
            ]
        );
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Profile</Text>
            </View>

            {/* Avatar */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.userName}>{user?.displayName ?? 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Account Info */}
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
                            <TouchableOpacity
                                onPress={handleSaveName}
                                style={styles.saveNameBtn}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.saveNameText}>Save</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setDisplayName(user?.displayName ?? '');
                                    setEditingName(false);
                                }}
                                style={styles.cancelNameBtn}
                            >
                                <Text style={styles.cancelNameText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.editRow}>
                            <Text style={styles.infoValue}>{user?.displayName ?? '—'}</Text>
                            <TouchableOpacity onPress={() => setEditingName(true)}>
                                <Text style={styles.editLink}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User ID</Text>
                    <Text style={[styles.infoValue, styles.mono]} numberOfLines={1}>
                        {user?.uid?.slice(0, 16)}…
                    </Text>
                </View>
            </View>

            {/* Settings */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>SETTINGS</Text>

                <TouchableOpacity
                    style={styles.settingsRow}
                    onPress={() => router.push('/(tabs)/alerts' as any)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.settingsIcon}>🔔</Text>
                    <Text style={styles.settingsLabel}>Alert Preferences</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.settingsRow}
                    onPress={handleResetOnboarding}
                    activeOpacity={0.8}
                >
                    <Text style={styles.settingsIcon}>🗺️</Text>
                    <Text style={styles.settingsLabel}>Update My Locations</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Sign Out */}
            <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.85}
            >
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>SIRENS v1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#0B132B',
        padding: 20,
        paddingTop: 60,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 28,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#3A86FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#3A86FF',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    avatarText: {
        fontSize: 30,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 13,
        color: '#8892A4',
    },
    card: {
        backgroundColor: '#141D35',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3A86FF',
        letterSpacing: 2,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#1E2D50',
        marginVertical: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    infoLabel: {
        fontSize: 13,
        color: '#8892A4',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
        flexShrink: 1,
    },
    mono: {
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 12,
        color: '#8892A4',
    },
    editRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    nameInput: {
        flex: 1,
        backgroundColor: '#0B132B',
        color: '#FFFFFF',
        padding: 8,
        borderRadius: 8,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#3A86FF',
    },
    saveNameBtn: {
        backgroundColor: '#3A86FF',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
    },
    saveNameText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    cancelNameBtn: {
        padding: 6,
    },
    cancelNameText: {
        color: '#FF6B6B',
        fontWeight: '700',
        fontSize: 14,
    },
    editLink: {
        color: '#3A86FF',
        fontSize: 13,
        fontWeight: '600',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsIcon: {
        fontSize: 20,
        width: 28,
        textAlign: 'center',
    },
    settingsLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    chevron: {
        fontSize: 22,
        color: '#4A5568',
    },
    signOutBtn: {
        backgroundColor: 'transparent',
        padding: 17,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF6B6B',
        marginTop: 8,
    },
    signOutText: {
        color: '#FF6B6B',
        fontSize: 16,
        fontWeight: '700',
    },
    version: {
        textAlign: 'center',
        color: '#2A3A5C',
        fontSize: 12,
        marginTop: 24,
        letterSpacing: 1.5,
    },
});

// Platform import needed for mono font
import { Platform } from 'react-native';
