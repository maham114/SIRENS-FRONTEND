import React, { useState, useEffect, useMemo } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert,
    RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db, submitPollVoteFn } from '../firebaseConfig';

interface PollItem {
    id: string;
    question: string;
    yesVotes: string[];
    noVotes: string[];
    reportId: string;
    createdAt?: any;
}

export default function PollsScreen() {
    const [polls, setPolls] = useState<PollItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingId, setVotingId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const uid = auth.currentUser?.uid ?? '';

    // Listen to polls collection in real-time
    useEffect(() => {
        const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: PollItem[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    question: data.question || 'Is this emergency active?',
                    yesVotes: data.yesVotes || [],
                    noVotes: data.noVotes || [],
                    reportId: data.reportId || '',
                    createdAt: data.createdAt
                });
            });
            setPolls(list);
            setLoading(false);
            setRefreshing(false);
        }, (err) => {
            console.error("Polls listener error:", err);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsub();
    }, []);

    const handleVote = async (pollId: string, vote: 'yes' | 'no') => {
        if (!uid) {
            Alert.alert('Authentication Required', 'Please sign in to vote on community reports.');
            return;
        }
        setVotingId(pollId);
        try {
            const submitVote = submitPollVoteFn();
            await submitVote({ pollId, vote });
            Alert.alert('✅ Vote Registered', 'Thank you for verifying this emergency incident!');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not register vote.');
        } finally {
            setVotingId(null);
        }
    };

    // Calculate user's voting contribution stats
    const stats = useMemo(() => {
        let contributed = 0;
        polls.forEach(p => {
            if (p.yesVotes.includes(uid) || p.noVotes.includes(uid)) {
                contributed++;
            }
        });
        return {
            total: polls.length,
            contributed
        };
    }, [polls, uid]);

    return (
        <View style={styles.outerContainer}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Text style={styles.backText}>◀ Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Civic Polling</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                        }}
                        tintColor="#3A86FF"
                    />
                }
            >
                {/* Intro Card */}
                <View style={styles.introCard}>
                    <Text style={styles.introTitle}>📊 COMMUNITY DECISION GRID</Text>
                    <Text style={styles.introDesc}>
                        SIRENS utilizes consensus algorithms. Your votes directly verify reports to guide responder routing paths and dispatch priorities.
                    </Text>
                    
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statVal}>{stats.total}</Text>
                            <Text style={styles.statLabel}>Active Polls</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statVal, { color: '#30D158' }]}>{stats.contributed}</Text>
                            <Text style={styles.statLabel}>Your Votes</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>⚡ LIVE INCIDENT VERIFICATION POLLS</Text>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#3A86FF" />
                        <Text style={styles.loadingText}>Fetching active polls...</Text>
                    </View>
                ) : polls.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🍃</Text>
                        <Text style={styles.emptyTitle}>No Active Polls</Text>
                        <Text style={styles.emptySubtitle}>All reported incidents are currently verified by community consensus.</Text>
                    </View>
                ) : (
                    polls.map((poll) => {
                        const hasVoted = poll.yesVotes.includes(uid) || poll.noVotes.includes(uid);
                        const totalVotes = poll.yesVotes.length + poll.noVotes.length;
                        const yesPercent = totalVotes > 0 ? Math.round((poll.yesVotes.length / totalVotes) * 100) : 0;
                        const noPercent = totalVotes > 0 ? Math.round((poll.noVotes.length / totalVotes) * 100) : 0;

                        return (
                            <View key={poll.id} style={[styles.pollCard, hasVoted && styles.pollCardVoted]}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>📢 COMMUNITY ALERT</Text>
                                    </View>
                                    <Text style={styles.voteCountText}>{totalVotes} votes cast</Text>
                                </View>

                                <Text style={styles.questionText}>{poll.question}</Text>

                                {hasVoted ? (
                                    <View style={styles.resultsContainer}>
                                        <Text style={styles.resultsLabel}>Current Consensus Results:</Text>
                                        
                                        {/* Yes Bar */}
                                        <View style={styles.resultRow}>
                                            <View style={styles.barLabelRow}>
                                                <Text style={styles.barLabel}>✅ YES</Text>
                                                <Text style={styles.barVal}>{poll.yesVotes.length} ({yesPercent}%)</Text>
                                            </View>
                                            <View style={styles.barBg}>
                                                <View style={[styles.barFill, { width: `${yesPercent}%`, backgroundColor: '#30D158' }]} />
                                            </View>
                                        </View>

                                        {/* No Bar */}
                                        <View style={styles.resultRow}>
                                            <View style={styles.barLabelRow}>
                                                <Text style={styles.barLabel}>❌ NO</Text>
                                                <Text style={styles.barVal}>{poll.noVotes.length} ({noPercent}%)</Text>
                                            </View>
                                            <View style={styles.barBg}>
                                                <View style={[styles.barFill, { width: `${noPercent}%`, backgroundColor: '#FF3B30' }]} />
                                            </View>
                                        </View>
                                        
                                        <View style={styles.votedBadge}>
                                            <Text style={styles.votedBadgeText}>✓ Your Vote Recorded</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.actionRow}>
                                        {votingId === poll.id ? (
                                            <ActivityIndicator color="#3A86FF" style={{ flex: 1, marginVertical: 8 }} />
                                        ) : (
                                            <>
                                                <TouchableOpacity 
                                                    style={[styles.voteBtn, styles.yesBtn]} 
                                                    onPress={() => handleVote(poll.id, 'yes')}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.voteBtnText}>✅ YES</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity 
                                                    style={[styles.voteBtn, styles.noBtn]} 
                                                    onPress={() => handleVote(poll.id, 'no')}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.voteBtnText}>❌ NO</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, backgroundColor: '#0B132B' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingTop: 55, 
        paddingBottom: 15, 
        paddingHorizontal: 16, 
        backgroundColor: '#0D1526', 
        borderBottomWidth: 1, 
        borderBottomColor: '#1E2D50' 
    },
    backBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
    backText: { color: '#8892A4', fontSize: 13, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    container: { padding: 20, paddingBottom: 60 },
    
    // Intro Card
    introCard: { backgroundColor: '#141D35', borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: '#1E2D50' },
    introTitle: { fontSize: 11, fontWeight: '800', color: '#3A86FF', letterSpacing: 2, marginBottom: 8 },
    introDesc: { fontSize: 12, color: '#8892A4', lineHeight: 17, marginBottom: 16 },
    statsContainer: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, backgroundColor: 'rgba(7, 12, 30, 0.4)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E2D50' },
    statVal: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
    statLabel: { fontSize: 10, color: '#8892A4', fontWeight: '700' },

    sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8892A4', letterSpacing: 2, marginBottom: 14 },
    
    // Poll Card
    pollCard: { backgroundColor: '#141D35', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1E2D50' },
    pollCardVoted: { borderColor: '#1E2D50', backgroundColor: '#10172B' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badge: { backgroundColor: 'rgba(58, 134, 255, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: '#3A86FF', fontSize: 9, fontWeight: '800' },
    voteCountText: { fontSize: 10, color: '#8892A4', fontWeight: '600' },
    questionText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', lineHeight: 20, marginBottom: 16 },

    // Action Row
    actionRow: { flexDirection: 'row', gap: 12 },
    voteBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    yesBtn: { backgroundColor: 'rgba(48, 209, 88, 0.15)', borderWidth: 1, borderColor: 'rgba(48, 209, 88, 0.3)' },
    noBtn: { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' },
    voteBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

    // Results
    resultsContainer: { gap: 10 },
    resultsLabel: { fontSize: 11, fontWeight: '700', color: '#8892A4', marginBottom: 2 },
    resultRow: { gap: 4 },
    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    barLabel: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
    barVal: { fontSize: 11, fontWeight: '700', color: '#8892A4' },
    barBg: { height: 8, backgroundColor: '#070C1E', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    votedBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(48, 209, 88, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(48, 209, 88, 0.2)' },
    votedBadgeText: { color: '#30D158', fontSize: 9, fontWeight: '700' },

    center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#8892A4', marginTop: 12, fontSize: 13 },
    
    emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141D35', borderRadius: 16, borderWidth: 1, borderColor: '#1E2D50' },
    emptyEmoji: { fontSize: 32, marginBottom: 12 },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    emptySubtitle: { fontSize: 12, color: '#8892A4', textAlign: 'center', lineHeight: 17 }
});
