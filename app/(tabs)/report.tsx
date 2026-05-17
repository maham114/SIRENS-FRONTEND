import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { setAlertPrefsFn } from '../../firebaseConfig';

type Channel = 'push' | 'email' | 'sms';

type Prefs = {
    weather: boolean;
    traffic: boolean;
    highSeverityOnly: boolean;
    notificationChannel: Channel;
};

const CHANNELS: { key: Channel; icon: string; label: string; desc: string }[] = [
    { key: 'push',  icon: '📲', label: 'Push Notification', desc: 'Instant alerts on your device' },
    { key: 'email', icon: '✉️', label: 'Email',             desc: 'Alerts sent to your inbox' },
    { key: 'sms',   icon: '💬', label: 'SMS',               desc: 'Text message alerts' },
];

function ToggleRow({
    icon,
    label,
    subtitle,
    value,
    onValueChange,
}: {
    icon: string;
    label: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
}) {
    return (
        <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>{icon}</Text>
                <View>
                    <Text style={styles.toggleLabel}>{label}</Text>
                    {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#1E2D50', true: '#3A86FF' }}
                thumbColor={value ? '#FFFFFF' : '#8892A4'}
                ios_backgroundColor="#1E2D50"
            />
        </View>
    );
}

export default function AlertsScreen() {
    const [prefs, setPrefs] = useState<Prefs>({
        weather: true,
        traffic: true,
        highSeverityOnly: false,
        notificationChannel: 'push',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const setPrefsCall = setAlertPrefsFn();
            await setPrefsCall({ preferences: prefs });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Could not save preferences.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Alert Preferences</Text>
                <Text style={styles.subtitle}>Control which alerts you receive and how</Text>
            </View>

            {/* Alert Types */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>ALERT TYPES</Text>

                <ToggleRow
                    icon="⛈️"
                    label="Weather Alerts"
                    subtitle="Storms, floods, extreme conditions"
                    value={prefs.weather}
                    onValueChange={(v) => setPrefs((p) => ({ ...p, weather: v }))}
                />
                <View style={styles.divider} />
                <ToggleRow
                    icon="🚦"
                    label="Traffic Alerts"
                    subtitle="Congestion, road closures, accidents"
                    value={prefs.traffic}
                    onValueChange={(v) => setPrefs((p) => ({ ...p, traffic: v }))}
                />
                <View style={styles.divider} />
                <ToggleRow
                    icon="🔴"
                    label="High Severity Only"
                    subtitle="Only receive critical emergency alerts"
                    value={prefs.highSeverityOnly}
                    onValueChange={(v) => setPrefs((p) => ({ ...p, highSeverityOnly: v }))}
                />
            </View>

            {/* Notification Channel */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>NOTIFICATION CHANNEL</Text>
                <Text style={styles.cardSubtitle}>Choose how you receive alerts</Text>

                {CHANNELS.map((ch, idx) => (
                    <TouchableOpacity
                        key={ch.key}
                        style={[
                            styles.channelRow,
                            prefs.notificationChannel === ch.key && styles.channelRowActive,
                            idx > 0 && { marginTop: 10 },
                        ]}
                        onPress={() => setPrefs((p) => ({ ...p, notificationChannel: ch.key }))}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.channelIcon}>{ch.icon}</Text>
                        <View style={styles.channelText}>
                            <Text
                                style={[
                                    styles.channelLabel,
                                    prefs.notificationChannel === ch.key && styles.channelLabelActive,
                                ]}
                            >
                                {ch.label}
                            </Text>
                            <Text style={styles.channelDesc}>{ch.desc}</Text>
                        </View>
                        <View
                            style={[
                                styles.radio,
                                prefs.notificationChannel === ch.key && styles.radioActive,
                            ]}
                        >
                            {prefs.notificationChannel === ch.key && (
                                <View style={styles.radioDot} />
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Save */}
            <TouchableOpacity
                style={[styles.saveBtn, (saving || saved) && styles.saveBtnActive]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : saved ? (
                    <Text style={styles.saveBtnText}>✅ Preferences Saved!</Text>
                ) : (
                    <Text style={styles.saveBtnText}>Save Preferences</Text>
                )}
            </TouchableOpacity>
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
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
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
    cardSubtitle: {
        fontSize: 13,
        color: '#8892A4',
        marginBottom: 14,
        marginTop: -10,
    },
    divider: {
        height: 1,
        backgroundColor: '#1E2D50',
        marginVertical: 12,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    toggleIcon: {
        fontSize: 22,
        width: 30,
        textAlign: 'center',
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    toggleSubtitle: {
        fontSize: 12,
        color: '#8892A4',
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E2D50',
        gap: 12,
    },
    channelRowActive: {
        borderColor: '#3A86FF',
        backgroundColor: 'rgba(58,134,255,0.08)',
    },
    channelIcon: {
        fontSize: 22,
        width: 30,
        textAlign: 'center',
    },
    channelText: {
        flex: 1,
    },
    channelLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#8892A4',
        marginBottom: 2,
    },
    channelLabelActive: {
        color: '#FFFFFF',
    },
    channelDesc: {
        fontSize: 12,
        color: '#4A5568',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#4A5568',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioActive: {
        borderColor: '#3A86FF',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3A86FF',
    },
    saveBtn: {
        backgroundColor: '#3A86FF',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#3A86FF',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    saveBtnActive: {
        backgroundColor: '#2563EB',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});