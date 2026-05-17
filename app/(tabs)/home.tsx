import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, getPersonalizedFeedFn } from '../../firebaseConfig';

type Report = {
    reportId: string;
    imageUrl: string;
    category: 'accident' | 'fire' | 'weather' | 'traffic' | 'other';
    description?: string;
    areaName?: string;
    city: string;
    timestamp: any;
    status: 'active' | 'expired' | 'resolved';
};

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
    accident: { icon: '🚗', color: '#FF6B6B', label: 'Accident' },
    fire:     { icon: '🔥', color: '#FF9F43', label: 'Fire' },
    weather:  { icon: '⛈️', color: '#54A0FF', label: 'Weather' },
    traffic:  { icon: '🚦', color: '#FECA57', label: 'Traffic' },
    other:    { icon: '📌', color: '#A0A0A0', label: 'Other' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
    active:   { color: '#4CAF50', label: 'Active' },
    expired:  { color: '#9E9E9E', label: 'Expired' },
    resolved: { color: '#3A86FF', label: 'Resolved' },
};

function timeAgo(ts: any): string {
    try {
        const date = ts?.toDate ? ts.toDate() : new Date(ts);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    } catch {
        return '';
    }
}

function ReportCard({ item }: { item: Report }) {
    const meta = CATEGORY_META[item.category] ?? CATEGORY_META.other;
    const status = STATUS_META[item.status] ?? STATUS_META.active;

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: item.reportId } } as any)}
        >
            {/* Image */}
            <Image
                source={{ uri: item.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
            />

            {/* Category Badge */}
            <View style={[styles.categoryBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                <Text style={styles.categoryBadgeIcon}>{meta.icon}</Text>
                <Text style={[styles.categoryBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
                <View style={styles.cardMeta}>
                    <Text style={styles.cardLocation}>
                        📍 {item.areaName ?? item.city}
                    </Text>
                    <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
                </View>

                {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                <View style={styles.cardFooter}>
                    <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={styles.tapHint}>Tap to view →</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const user = auth.currentUser;

    const fetchFeed = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const getFeed = getPersonalizedFeedFn();
            const result = await getFeed();
            const data = result.data as { reports: Report[] };
            setReports(data.reports ?? []);
        } catch (error: any) {
            if (error.code === 'not-found') {
                // Onboarding not complete
                router.replace('/onboarding');
            } else {
                Alert.alert('Error', error.message || 'Could not load feed.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure?', [
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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>
                        Hello, {user?.displayName?.split(' ')[0] ?? 'there'} 👋
                    </Text>
                    <Text style={styles.headerTitle}>Live Feed</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/(tabs)/alerts' as any)}
                    >
                        <Text style={styles.headerBtnIcon}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleSignOut}>
                        <Text style={styles.headerBtnIcon}>⎋</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3A86FF" />
                    <Text style={styles.loadingText}>Loading feed...</Text>
                </View>
            ) : reports.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyTitle}>No Reports Yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Be the first to report an incident in your area.
                    </Text>
                    <TouchableOpacity
                        style={styles.reportCta}
                        onPress={() => router.push('/(tabs)/report' as any)}
                    >
                        <Text style={styles.reportCtaText}>Create Report</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(r) => r.reportId}
                    renderItem={({ item }) => <ReportCard item={item} />}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchFeed(true);
                            }}
                            tintColor="#3A86FF"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B132B',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2D50',
    },
    greeting: {
        fontSize: 13,
        color: '#8892A4',
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#141D35',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    headerBtnIcon: {
        fontSize: 16,
    },
    list: {
        padding: 16,
        gap: 14,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#141D35',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    cardImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#0F1929',
    },
    categoryBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryBadgeIcon: {
        fontSize: 12,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardBody: {
        padding: 14,
        gap: 8,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLocation: {
        fontSize: 13,
        color: '#C5C6C7',
        fontWeight: '600',
        flex: 1,
    },
    cardTime: {
        fontSize: 12,
        color: '#4A5568',
    },
    cardDesc: {
        fontSize: 14,
        color: '#8892A4',
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    tapHint: {
        fontSize: 12,
        color: '#4A5568',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        color: '#8892A4',
        marginTop: 12,
        fontSize: 14,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8892A4',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    reportCta: {
        backgroundColor: '#3A86FF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    reportCtaText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});