import {
    collection,
    onSnapshot,
    orderBy,
    query,
    where,
    type Unsubscribe,
} from 'firebase/firestore';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../lib/firebase';

type Insight = {
    id: string;
    crisisType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    credibilityScore: number;
    description: string;   // Firestore field: human-readable summary
    explanation: string;   // Firestore field: deeper reasoning in extended card
    status: string;
    timestamp: any;
};

function timeAgo(ts: any): string {
    try {
        const date = ts?.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(date.getTime())) return '⏳ Not yet started';
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    } catch {
        return '⏳ Not yet started';
    }
}

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    fire:          { icon: '🔥', color: '#FF3B30', label: 'Fire' },
    weather:       { icon: '⛈️', color: '#5AC8FA', label: 'Weather' },
    flood:         { icon: '🌊', color: '#5AC8FA', label: 'Flood' },
    infrastructure:{ icon: '🏗️', color: '#AF52DE', label: 'Infrastructure' },
    road_block:    { icon: '🚧', color: '#FF9500', label: 'Road Block' },
    crime:         { icon: '🚨', color: '#FF3B30', label: 'Crime' },
    accident:      { icon: '🚗', color: '#FF6B6B', label: 'Accident' },
    medical:       { icon: '🩺', color: '#34C759', label: 'Medical' },
    traffic:       { icon: '🚦', color: '#FECA57', label: 'Traffic' },
    emergency:     { icon: '🆘', color: '#FF2D55', label: 'Emergency' },
    default:       { icon: '⚠️', color: '#FF9500', label: 'Crisis' },
};

function getTypeMeta(type: string) {
    return TYPE_META[type] || TYPE_META.default;
}

export default function AIInsightsScreen() {
    const [insights, setInsights]       = useState<Insight[]>([]);
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);
    const [expandedId, setExpandedId]   = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'crises'),
            where('status', 'in', ['active', 'executing']),
        );
        const unsub: Unsubscribe = onSnapshot(q, (snap) => {
            const all: Insight[] = [];
            snap.forEach((docSnap) => {
                const d = docSnap.data();
                all.push({
                    id:             docSnap.id,
                    crisisType:     d.crisisType  || 'unknown',
                    severity:       d.severity    || 'medium',
                    credibilityScore: d.credibilityScore ?? 0,
                    description:    d.description || '',
                    explanation:    d.explanation || '',
                    status:         d.status      || '',
                    timestamp:      d.timestamp,
                });
            });
            setInsights(
                all
                    .sort((a, b) => {
                        // Executing first, then active
                        const sa = a.status === 'executing' ? 0 : 1;
                        const sb = b.status === 'executing' ? 0 : 1;
                        if (sa !== sb) return sa - sb;
                        // Then by timestamp (newest first)
                        const ta = a.timestamp?.toDate?.()?.getTime() ?? 0;
                        const tb = b.timestamp?.toDate?.()?.getTime() ?? 0;
                        return tb - ta;
                    }),
            );
            setLoading(false);
            setRefreshing(false);
        }, () => {
            setLoading(false);
            setRefreshing(false);
        });
        return () => unsub();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // onSnapshot pushes the latest automatically; flag just resets spinner
    }, []);

    function pct(v: number) {
        // Accept both scales: 0-1 (decimal) and 0-100 (percent already)
        if (v > 1.0) return Math.min(100, Math.round(v));
        return Math.min(100, Math.round(v * 100));
    }

    function severityColor(s: string) {
        if (s === 'high' || s === 'critical') return '#FF3B30';
        if (s === 'medium') return '#FF9500';
        return '#30D158';
    }

    function statusPill(s: string) {
        if (s === 'executing') return { text: '🔵 ANALYZING', color: '#007AFF' };
        if (s === 'active')    return { text: '✅ ACTIVE',     color: '#30D158' };
        return { text: s.toUpperCase(), color: '#8892A4' };
    }

    const renderItem = ({ item }: { item: Insight }) => {
        const meta = getTypeMeta(item.crisisType);
        const pill = statusPill(item.status);
        const isExpanded = expandedId === item.id;
        const hasExplanation = item.explanation.trim().length > 0;

        return (
            <View style={styles.card}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>{meta.icon}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                            {meta.label} / {item.severity.toUpperCase()}
                        </Text>
                        <Text style={styles.cardSub}>
                            {timeAgo(item.timestamp)}
                        </Text>
                    </View>
                    <View style={[styles.statusPill, { borderColor: pill.color + '55' }]}>
                        <Text style={[styles.statusPillText, { color: pill.color }]}>
                            {pill.text}
                        </Text>
                    </View>
                </View>

                {/* Credibility */}
                <View style={styles.confidenceRow}>
                    <Text style={styles.confidenceLabel}>AI Confidence</Text>
                    <Text style={styles.confidenceVal}>{pct(item.credibilityScore)}%</Text>
                </View>
                <View style={styles.meterBg}>
                    <View
                        style={[
                            styles.meterFill,
                            {
                                width: `${pct(item.credibilityScore)}%`,
                                backgroundColor: (item.credibilityScore ?? 0) >= 0.8 ? '#30D158' : '#FF9500',
                            },
                        ]}
                    />
                </View>

                {/* Description — always visible when available */}
                {(item.description || item.explanation) && (
                    <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionLabel}>Description</Text>
                        <Text style={styles.descriptionText}>
                            {item.description || item.explanation}
                        </Text>
                    </View>
                )}

                {/* Reasoning toggle */}
                {hasExplanation && (
                    <TouchableOpacity
                        style={styles.insightsToggle}
                        onPress={() => setExpandedId(isExpanded ? null : item.id)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.insightsToggleText}>
                            {isExpanded ? '▲ Hide AI Reasoning' : '▼ View AI Reasoning'}
                        </Text>
                    </TouchableOpacity>
                )}

                {isExpanded && hasExplanation && (
                    <View style={styles.reasoningBox}>
                        <Text style={styles.reasoningLabel}>Reasoning</Text>
                        <Text style={styles.reasoningText}>{item.explanation}</Text>
                    </View>
                )}

                {/* Executing placeholder — show whatever data is available */}
                {!hasExplanation && item.status === 'executing' && (
                    <View style={[styles.reasoningBox, styles.reasoningPlaceholder]}>
                        <View style={styles.placeholderHeader}>
                            <Text style={styles.placeholderIcon}>🤖</Text>
                            <Text style={styles.placeholderTitle}>AI Agent Still Working</Text>
                        </View>

                        <View style={styles.placeholderRow}>
                            <Text style={styles.placeholderKey}>Crisis Type</Text>
                            <Text style={styles.placeholderVal}>
                                {TYPE_META[item.crisisType]?.icon || '⚠️'} {' '}
                                {TYPE_META[item.crisisType]?.label || item.crisisType}
                            </Text>
                        </View>

                        <View style={styles.placeholderRow}>
                            <Text style={styles.placeholderKey}>Severity</Text>
                            <Text style={[styles.placeholderVal, { color: severityColor(item.severity) }]}>
                                {item.severity.toUpperCase()}
                            </Text>
                        </View>

                        <View style={styles.placeholderRow}>
                            <Text style={styles.placeholderKey}>AI Confidence</Text>
                            <Text style={styles.placeholderVal}>{pct(item.credibilityScore)}%</Text>
                        </View>

                        <View style={styles.placeholderRow}>
                            <Text style={styles.placeholderKey}>Status</Text>
                            <Text style={styles.placeholderVal}>
                                {item.timestamp
                                    ? `Started ${timeAgo(item.timestamp)}`
                                    : 'Initializing…'}
                            </Text>
                        </View>

                        <View style={styles.placeholderNote}>
                            <Text style={styles.placeholderNoteText}>
                                💡 Explanation and community verification will appear here once the agent finishes reasoning.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Document ID badge */}
                <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>{item.id}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🧠 AI Insights</Text>
                <Text style={styles.headerSub}>Live Firestore · `crises` collection</Text>
            </View>

            {/* Counter row */}
            {!loading && (
                <View style={styles.counterRow}>
                    <Text style={styles.counterText}>
                        {insights.length} insight{insights.length !== 1 ? 's' : ''} in view
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3A86FF" />
                    <Text style={styles.loadingText}>Polling AI agents…</Text>
                </View>
            ) : insights.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyIcon}>🧠</Text>
                    <Text style={styles.emptyTitle}>No Insights Yet</Text>
                    <Text style={styles.emptySub}>
                        Active and executing crisis documents will appear here
                        as AI agents publish them to Firestore.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={insights}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#3A86FF"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B132B' },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2D50',
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    headerSub:    { fontSize: 12, color: '#8892A4', marginTop: 2 },

    // ── Counter ───────────────────────────────────────────────────────────────
    counterRow: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#0F1929',
        borderBottomWidth: 1,
        borderBottomColor: '#1E2D50',
    },
    counterText: { fontSize: 13, fontWeight: '600', color: '#3A86FF' },

    // ── List ─────────────────────────────────────────────────────────────────
    list: { padding: 16, gap: 12, paddingBottom: 40 },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
        backgroundColor: '#141D35',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E2D50',
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardIcon:  { fontSize: 28 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    cardSub:   { fontSize: 12, color: '#8892A4', marginTop: 2 },

    // ── Status pill ───────────────────────────────────────────────────────────
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    statusPillText: { fontSize: 11, fontWeight: '700' },

    // ── Confidence row ────────────────────────────────────────────────────────
    confidenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confidenceLabel: { fontSize: 12, fontWeight: '600', color: '#8892A4' },
    confidenceVal:   { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
    meterBg: {
        height: 6,
        backgroundColor: '#1E2D50',
        borderRadius: 3,
        overflow: 'hidden',
    },
    meterFill: {
        height: '100%',
        borderRadius: 3,
    },

    // ── Description ──────────────────────────────────────────────────────────────
    descriptionBox: {
        marginTop: 4,
        padding: 12,
        backgroundColor: '#0F1929',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    descriptionLabel: {
        fontSize: 11, fontWeight: '800', color: '#3A86FF',
        marginBottom: 4, letterSpacing: 0.4,
    },
    descriptionText: {
        fontSize: 13, color: '#C5C6C7', lineHeight: 19,
    },

    // ── Reasoning ─────────────────────────────────────────────────────────────
    insightsToggle: {
        backgroundColor: 'rgba(58, 134, 255, 0.12)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    insightsToggleText: { color: '#3A86FF', fontSize: 12, fontWeight: '700' },
    reasoningBox: {
        marginTop: 4,
        padding: 12,
        backgroundColor: '#0D1526',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    reasoningLabel:    { fontSize: 12, fontWeight: '800', color: '#3A86FF', marginBottom: 6, letterSpacing: 0.4 },
    reasoningText:     { fontSize: 13, color: '#C5C6C7', lineHeight: 19 },

    reasoningPlaceholder: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderStyle: 'dashed',
        borderColor: '#1E2D50',
    },
    reasoningPlaceholderText: {
        fontSize: 12, color: '#4A5568', fontStyle: 'italic', textAlign: 'center',
    },
    placeholderHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    placeholderIcon:  { fontSize: 20 },
    placeholderTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    placeholderRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 4,
    },
    placeholderKey: { fontSize: 12, fontWeight: '600', color: '#8892A4' },
    placeholderVal: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    placeholderNote: {
        marginTop: 10, padding: 10, backgroundColor: 'rgba(58, 134, 255, 0.08)',
        borderRadius: 8, borderWidth: 1, borderColor: 'rgba(58, 134, 255, 0.2)',
    },
    placeholderNoteText: {
        fontSize: 11, color: '#8892A4', lineHeight: 16, textAlign: 'center',
    },

    // ── Doc ID badge ──────────────────────────────────────────────────────────
    idBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    idBadgeText: { fontSize: 10, color: '#4A5568', fontFamily: 'monospace' },

    // ── States ────────────────────────────────────────────────────────────────
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    loadingText: { fontSize: 14, color: '#8892A4' },
    emptyIcon:  { fontSize: 48 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    emptySub: {
        fontSize: 13, color: '#8892A4', textAlign: 'center',
        lineHeight: 20,
    },
});
