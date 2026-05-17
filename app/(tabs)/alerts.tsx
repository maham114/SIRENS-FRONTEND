import React, { useEffect, useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAlertsStore } from '@/stores/alertsStore';
import type { AlertChannel, AlertPreferences } from '@/types/tabs';

const CHANNELS: { key: AlertChannel; icon: string; label: string; desc: string }[] = [
    { key: 'push',  icon: 'PUSH', label: 'Push Notification', desc: 'Instant alerts on your device' },
    { key: 'email', icon: 'MAIL', label: 'Email', desc: 'Alerts sent to your inbox' },
    { key: 'sms',   icon: 'SMS', label: 'SMS', desc: 'Text message alerts' },
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
    onValueChange: (value: boolean) => void;
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
    const {
        preferences,
        alerts,
        loading,
        saving,
        saved,
        error,
        start,
        stop,
        updatePreferences,
        save,
    } = useAlertsStore();

    useEffect(() => {
        start();
        return stop;
    }, [start, stop]);

    const groupedAlerts = useMemo(() => ({
        critical: alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high'),
        routine: alerts.filter((alert) => alert.severity !== 'critical' && alert.severity !== 'high'),
    }), [alerts]);

    const setPref = <K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) => {
        updatePreferences({ ...preferences, [key]: value });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Alert Preferences</Text>
                <Text style={styles.subtitle}>Control which alerts you receive and how</Text>
            </View>

            {error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={start}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {loading ? (
                <View style={styles.loadingCard}>
                    <ActivityIndicator color="#3A86FF" />
                    <Text style={styles.loadingText}>Loading alert settings...</Text>
                </View>
            ) : null}

            <View style={styles.card}>
                <Text style={styles.cardTitle}>ALERT TYPES</Text>
                <ToggleRow
                    icon="WX"
                    label="Weather Alerts"
                    subtitle="Storms, floods, extreme conditions"
                    value={preferences.weather}
                    onValueChange={(value) => setPref('weather', value)}
                />
                <View style={styles.divider} />
                <ToggleRow
                    icon="RD"
                    label="Traffic Alerts"
                    subtitle="Congestion, road closures, accidents"
                    value={preferences.traffic}
                    onValueChange={(value) => setPref('traffic', value)}
                />
                <View style={styles.divider} />
                <ToggleRow
                    icon="HI"
                    label="High Severity Only"
                    subtitle="Only receive critical emergency alerts"
                    value={preferences.highSeverityOnly}
                    onValueChange={(value) => setPref('highSeverityOnly', value)}
                />
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>NOTIFICATION CHANNEL</Text>
                <Text style={styles.cardSubtitle}>Choose how you receive alerts</Text>
                {CHANNELS.map((channel, index) => (
                    <TouchableOpacity
                        key={channel.key}
                        style={[
                            styles.channelRow,
                            preferences.notificationChannel === channel.key && styles.channelRowActive,
                            index > 0 && { marginTop: 10 },
                        ]}
                        onPress={() => setPref('notificationChannel', channel.key)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.channelIcon}>{channel.icon}</Text>
                        <View style={styles.channelText}>
                            <Text style={[
                                styles.channelLabel,
                                preferences.notificationChannel === channel.key && styles.channelLabelActive,
                            ]}>
                                {channel.label}
                            </Text>
                            <Text style={styles.channelDesc}>{channel.desc}</Text>
                        </View>
                        <View style={[
                            styles.radio,
                            preferences.notificationChannel === channel.key && styles.radioActive,
                        ]}>
                            {preferences.notificationChannel === channel.key ? <View style={styles.radioDot} /> : null}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>LIVE ALERTS</Text>
                {alerts.length === 0 ? (
                    <Text style={styles.emptyAlerts}>No alerts are active right now.</Text>
                ) : (
                    <>
                        <AlertGroup title="Critical" count={groupedAlerts.critical.length} />
                        <AlertGroup title="Routine" count={groupedAlerts.routine.length} />
                    </>
                )}
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, (saving || saved) && styles.saveBtnActive]}
                onPress={save}
                disabled={saving}
                activeOpacity={0.85}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : saved ? (
                    <Text style={styles.saveBtnText}>Preferences Saved</Text>
                ) : (
                    <Text style={styles.saveBtnText}>Save Preferences</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function AlertGroup({ title, count }: { title: string; count: number }) {
    return (
        <View style={styles.alertGroup}>
            <Text style={styles.alertGroupTitle}>{title}</Text>
            <Text style={styles.alertGroupCount}>{count}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#0B132B', padding: 20, paddingTop: 60, paddingBottom: 100 },
    header: { marginBottom: 28 },
    title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#8892A4' },
    card: { backgroundColor: '#141D35', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#1E2D50' },
    cardTitle: { fontSize: 11, fontWeight: '700', color: '#3A86FF', letterSpacing: 2, marginBottom: 16 },
    cardSubtitle: { fontSize: 13, color: '#8892A4', marginBottom: 14, marginTop: -10 },
    divider: { height: 1, backgroundColor: '#1E2D50', marginVertical: 12 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    toggleIcon: { fontSize: 12, width: 34, color: '#3A86FF', fontWeight: '900', textAlign: 'center' },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
    toggleSubtitle: { fontSize: 12, color: '#8892A4' },
    channelRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E2D50', gap: 12 },
    channelRowActive: { borderColor: '#3A86FF', backgroundColor: 'rgba(58,134,255,0.08)' },
    channelIcon: { fontSize: 11, width: 34, color: '#3A86FF', fontWeight: '900', textAlign: 'center' },
    channelText: { flex: 1 },
    channelLabel: { fontSize: 15, fontWeight: '600', color: '#8892A4', marginBottom: 2 },
    channelLabelActive: { color: '#FFFFFF' },
    channelDesc: { fontSize: 12, color: '#4A5568' },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#4A5568', alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: '#3A86FF' },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3A86FF' },
    saveBtn: { backgroundColor: '#3A86FF', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowColor: '#3A86FF', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    saveBtnActive: { backgroundColor: '#2563EB' },
    saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    errorCard: { backgroundColor: 'rgba(255, 58, 58, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 58, 58, 0.3)', borderRadius: 12, padding: 14, marginBottom: 16 },
    errorText: { color: '#FFB4B4', fontSize: 13, marginBottom: 10 },
    retryBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3A86FF' },
    retryText: { color: '#FFFFFF', fontWeight: '800' },
    loadingCard: { backgroundColor: '#141D35', borderRadius: 16, padding: 18, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E2D50' },
    loadingText: { color: '#8892A4', marginTop: 10 },
    emptyAlerts: { color: '#8892A4', fontSize: 14 },
    alertGroup: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E2D50' },
    alertGroupTitle: { color: '#FFFFFF', fontWeight: '700' },
    alertGroupCount: { color: '#3A86FF', fontWeight: '900' },
});
