import { router } from 'expo-router';
import React, { memo, useCallback, useEffect } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useFeedStore } from '@/stores/feedStore';
import { useProfileStore } from '@/stores/profileStore';
import type { FeedReport } from '@/types/tabs';

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
    accident: { icon: 'CAR', color: '#FF6B6B', label: 'Accident' },
    fire:     { icon: 'FIRE', color: '#FF9F43', label: 'Fire' },
    weather:  { icon: 'WX', color: '#54A0FF', label: 'Weather' },
    traffic:  { icon: 'ROAD', color: '#FECA57', label: 'Traffic' },
    other:    { icon: 'INFO', color: '#A0A0A0', label: 'Other' },
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

const ReportCard = memo(function ReportCard({ item }: { item: FeedReport }) {
    const meta = CATEGORY_META[item.category] ?? CATEGORY_META.other;
    const status = STATUS_META[item.status] ?? STATUS_META.active;

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: item.reportId } } as any)}
        >
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            <View style={[styles.categoryBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                <Text style={[styles.categoryBadgeText, { color: meta.color }]}>{meta.icon}</Text>
                <Text style={[styles.categoryBadgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.cardMeta}>
                    <Text style={styles.cardLocation}>{item.areaName ?? item.city}</Text>
                    <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
                </View>
                {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
                <View style={styles.cardFooter}>
                    <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={styles.tapHint}>Tap to view</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

function SkeletonList() {
    return (
        <View style={styles.list}>
            {[0, 1, 2].map((item) => (
                <View key={item} style={styles.skeletonCard}>
                    <View style={styles.skeletonImage} />
                    <View style={styles.skeletonLineWide} />
                    <View style={styles.skeletonLine} />
                </View>
            ))}
        </View>
    );
}

export default function HomeScreen() {
    const {
        reports,
        loading,
        refreshing,
        loadingMore,
        error,
        nextCursor,
        loadInitial,
        refresh,
        loadMore,
    } = useFeedStore();
    const { logoutUser } = useProfileStore();
    const { user } = useAuth();

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    const handleSignOut = useCallback(() => {
        Alert.alert('Sign Out', 'Are you sure?', [
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
    }, [logoutUser]);

    const renderItem = useCallback(({ item }: { item: FeedReport }) => <ReportCard item={item} />, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0] ?? 'there'}</Text>
                    <Text style={styles.headerTitle}>Live Feed</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(tabs)/alerts' as any)}>
                        <Text style={styles.headerBtnIcon}>AL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleSignOut}>
                        <Text style={styles.headerBtnIcon}>OUT</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && reports.length === 0 ? (
                <SkeletonList />
            ) : error && reports.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyTitle}>Feed unavailable</Text>
                    <Text style={styles.emptySubtitle}>{error}</Text>
                    <TouchableOpacity style={styles.reportCta} onPress={() => loadInitial(true)}>
                        <Text style={styles.reportCtaText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : reports.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyTitle}>No Reports Yet</Text>
                    <Text style={styles.emptySubtitle}>Be the first to report an incident in your area.</Text>
                    <TouchableOpacity style={styles.reportCta} onPress={() => router.push('/(tabs)/report' as any)}>
                        <Text style={styles.reportCtaText}>Create Report</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(report) => report.reportId}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => {
                        if (nextCursor) loadMore();
                    }}
                    onEndReachedThreshold={0.55}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color="#3A86FF" style={styles.footerLoader} /> : null}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#3A86FF" />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B132B' },
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
    greeting: { fontSize: 13, color: '#8892A4', marginBottom: 2 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', gap: 10 },
    headerBtn: {
        minWidth: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#141D35',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1E2D50',
        paddingHorizontal: 10,
    },
    headerBtnIcon: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },
    list: { padding: 16, gap: 14, paddingBottom: 100 },
    card: { backgroundColor: '#141D35', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2D50' },
    cardImage: { width: '100%', height: 180, backgroundColor: '#0F1929' },
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
    categoryBadgeText: { fontSize: 12, fontWeight: '700' },
    cardBody: { padding: 14, gap: 8 },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLocation: { fontSize: 13, color: '#C5C6C7', fontWeight: '600', flex: 1 },
    cardTime: { fontSize: 12, color: '#4A5568' },
    cardDesc: { fontSize: 14, color: '#8892A4', lineHeight: 20 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '700' },
    tapHint: { fontSize: 12, color: '#4A5568' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#8892A4', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    reportCta: { backgroundColor: '#3A86FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    reportCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    footerLoader: { paddingVertical: 20 },
    skeletonCard: { backgroundColor: '#141D35', borderRadius: 16, borderWidth: 1, borderColor: '#1E2D50', padding: 14 },
    skeletonImage: { height: 170, borderRadius: 12, backgroundColor: '#0F1929', marginBottom: 14 },
    skeletonLineWide: { height: 14, borderRadius: 7, backgroundColor: '#1E2D50', width: '75%', marginBottom: 10 },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#1E2D50', width: '48%' },
});
