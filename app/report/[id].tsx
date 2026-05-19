import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db, submitPollVoteFn } from '@/lib/firebase';

type Report = {
    reportId: string;
    userId: string;
    imageUrl: string;
    category: 'accident' | 'fire' | 'weather' | 'traffic' | 'other';
    description?: string;
    areaName?: string;
    city: string;
    timestamp: any;
    status: 'active' | 'expired' | 'resolved';
};

type Poll = {
    pollId: string;
    reportId: string;
    question: string;
    yesVotes: string[];
    noVotes: string[];
    createdAt: any;
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

export default function ReportDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [report, setReport] = useState<Report | null>(null);
    const [poll, setPoll] = useState<Poll | null>(null);
    const [loading, setLoading] = useState(true);
    const [votingYes, setVotingYes] = useState(false);
    const [votingNo, setVotingNo] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);

    const uid = auth.currentUser?.uid ?? '';

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                // Fetch report
                const reportDoc = await getDoc(doc(db, 'reports', id));
                if (reportDoc.exists()) {
                    setReport({ reportId: reportDoc.id, ...reportDoc.data() } as Report);
                }

                // Fetch associated poll (query polls where reportId == id)
                // Using a known convention: poll doc may be at polls/<reportId>
                const pollDoc = await getDoc(doc(db, 'polls', 'poll_' + id));
                if (pollDoc.exists()) {
                    const pollData = { pollId: pollDoc.id, ...pollDoc.data() } as Poll;
                    setPoll(pollData);
                    // Check if current user has already voted
                    if (uid && (pollData.yesVotes.includes(uid) || pollData.noVotes.includes(uid))) {
                        setHasVoted(true);
                    }
                }
            } catch (error: any) {
                Alert.alert('Error', error.message || 'Could not load report.');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, uid]);

    const handleVote = async (vote: 'yes' | 'no') => {
        if (!poll) return;
        if (vote === 'yes') setVotingYes(true);
        else setVotingNo(true);

        try {
            const submitVote = submitPollVoteFn();
            await submitVote({ pollId: poll.pollId, vote });

            // Optimistically update local state
            setPoll((prev) => {
                if (!prev) return prev;
                return vote === 'yes'
                    ? { ...prev, yesVotes: [...prev.yesVotes, uid] }
                    : { ...prev, noVotes: [...prev.noVotes, uid] };
            });
            setHasVoted(true);
        } catch (error: any) {
            if (error.code === 'already-exists') {
                setHasVoted(true);
                Alert.alert('Already Voted', 'You have already voted on this poll.');
            } else {
                Alert.alert('Error', error.message || 'Could not submit vote.');
            }
        } finally {
            setVotingYes(false);
            setVotingNo(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3A86FF" />
                <Text style={styles.loadingText}>Loading report...</Text>
            </View>
        );
    }

    if (!report) {
        return (
            <View style={styles.center}>
                <Text style={styles.notFoundIcon}>🔍</Text>
                <Text style={styles.notFoundText}>Report not found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>← Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const meta   = CATEGORY_META[report.category] ?? CATEGORY_META.other;
    const status = STATUS_META[report.status] ?? STATUS_META.active;
    const totalVotes = (poll?.yesVotes.length ?? 0) + (poll?.noVotes.length ?? 0);
    const yesPercent = totalVotes > 0 ? Math.round((poll!.yesVotes.length / totalVotes) * 100) : 0;
    const noPercent  = totalVotes > 0 ? Math.round((poll!.noVotes.length  / totalVotes) * 100) : 0;

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Back button */}
            <TouchableOpacity style={styles.topBack} onPress={() => router.back()}>
                <Text style={styles.topBackText}>← Back</Text>
            </TouchableOpacity>

            {/* Image */}
            <Image
                source={{ uri: report.imageUrl }}
                style={styles.image}
                resizeMode="cover"
            />

            {/* Category + Status row */}
            <View style={styles.badgeRow}>
                <View style={[styles.catBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                    <Text style={styles.catBadgeIcon}>{meta.icon}</Text>
                    <Text style={[styles.catBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            {/* Location & Time */}
            <View style={styles.metaRow}>
                <Text style={styles.metaLocation}>
                    📍 {report.areaName ?? report.city}
                </Text>
                <Text style={styles.metaTime}>{timeAgo(report.timestamp)}</Text>
            </View>

            {/* Description */}
            {report.description ? (
                <View style={styles.descCard}>
                    <Text style={styles.descLabel}>DESCRIPTION</Text>
                    <Text style={styles.descText}>{report.description}</Text>
                </View>
            ) : null}

            {/* Poll Widget */}
            {poll ? (
                <View style={styles.pollCard}>
                    <Text style={styles.pollLabel}>COMMUNITY POLL</Text>
                    <Text style={styles.pollQuestion}>{poll.question}</Text>

                    {/* Vote bars */}
                    <View style={styles.voteBar}>
                        <View style={[styles.voteBarFill, { width: `${yesPercent}%`, backgroundColor: '#4CAF50' }]} />
                    </View>
                    <View style={[styles.voteBar, { marginTop: 6 }]}>
                        <View style={[styles.voteBarFill, { width: `${noPercent}%`, backgroundColor: '#FF6B6B' }]} />
                    </View>

                    <View style={styles.voteStats}>
                        <Text style={styles.voteStatYes}>✅ Yes — {poll.yesVotes.length} ({yesPercent}%)</Text>
                        <Text style={styles.voteStatNo}>❌ No — {poll.noVotes.length} ({noPercent}%)</Text>
                    </View>

                    <Text style={styles.totalVotes}>{totalVotes} total vote{totalVotes !== 1 ? 's' : ''}</Text>

                    {!hasVoted ? (
                        <View style={styles.voteButtons}>
                            <TouchableOpacity
                                style={styles.voteBtnYes}
                                onPress={() => handleVote('yes')}
                                disabled={votingYes || votingNo}
                                activeOpacity={0.85}
                            >
                                {votingYes ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.voteBtnText}>✅  Still Active</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.voteBtnNo}
                                onPress={() => handleVote('no')}
                                disabled={votingYes || votingNo}
                                activeOpacity={0.85}
                            >
                                {votingNo ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.voteBtnText}>❌  No Longer</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.votedBadge}>
                            <Text style={styles.votedBadgeText}>You have already voted</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.noPollCard}>
                    <Text style={styles.noPollText}>No poll available for this report yet.</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#0B132B',
        paddingBottom: 100,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B132B',
        padding: 40,
    },
    loadingText: {
        color: '#8892A4',
        marginTop: 12,
        fontSize: 14,
    },
    notFoundIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    notFoundText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 20,
    },
    backBtn: {
        backgroundColor: '#141D35',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    backBtnText: {
        color: '#8892A4',
        fontWeight: '600',
        fontSize: 15,
    },
    topBack: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    topBackText: {
        color: '#3A86FF',
        fontSize: 16,
        fontWeight: '600',
    },
    image: {
        width: '100%',
        height: 260,
        backgroundColor: '#141D35',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        paddingBottom: 8,
    },
    catBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    catBadgeIcon: { fontSize: 14 },
    catBadgeText: { fontSize: 13, fontWeight: '700' },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 13, fontWeight: '700' },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    metaLocation: { fontSize: 14, color: '#C5C6C7', fontWeight: '600', flex: 1 },
    metaTime: { fontSize: 13, color: '#4A5568' },
    descCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#141D35',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    descLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3A86FF',
        letterSpacing: 2,
        marginBottom: 8,
    },
    descText: { fontSize: 15, color: '#C5C6C7', lineHeight: 22 },
    pollCard: {
        marginHorizontal: 16,
        backgroundColor: '#141D35',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    pollLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3A86FF',
        letterSpacing: 2,
        marginBottom: 10,
    },
    pollQuestion: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 16,
        lineHeight: 22,
    },
    voteBar: {
        height: 8,
        backgroundColor: '#1E2D50',
        borderRadius: 4,
        overflow: 'hidden',
    },
    voteBarFill: {
        height: '100%',
        borderRadius: 4,
        minWidth: 4,
    },
    voteStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    voteStatYes: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
    voteStatNo:  { fontSize: 13, color: '#FF6B6B', fontWeight: '600' },
    totalVotes: {
        fontSize: 12,
        color: '#4A5568',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    voteButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    voteBtnYes: {
        flex: 1,
        backgroundColor: '#4CAF50',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    voteBtnNo: {
        flex: 1,
        backgroundColor: '#FF6B6B',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    voteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    votedBadge: {
        backgroundColor: '#1E2D50',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    votedBadgeText: { color: '#8892A4', fontSize: 14, fontWeight: '600' },
    noPollCard: {
        marginHorizontal: 16,
        backgroundColor: '#141D35',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E2D50',
        alignItems: 'center',
    },
    noPollText: { color: '#4A5568', fontSize: 14 },
});
