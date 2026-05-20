import * as Location from 'expo-location';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db, getPersonalizedFeedFn, triggerSOSFn, submitPollVoteFn } from '../../firebaseConfig';

type Report = {
    reportId: string;
    imageUrl: string;
    category: 'accident' | 'crime' | 'fire' | 'medical' | 'traffic' | 'weather' | 'infrastructure' | 'emergency' | 'other';
    description?: string;
    areaName?: string;
    city: string;
    timestamp: any;
    status: 'active' | 'expired' | 'resolved';
};

type OfficialAlert = {
    alertId: string;
    title: string;
    message: string;
    city: string;
    severity: 'low' | 'medium' | 'high';
    active: boolean;
    timestamp: any;
};

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
    accident:       { icon: '🚗', color: '#FF3B30', label: 'Accident' },
    crime:          { icon: '🚨', color: '#FF3B30', label: 'Crime' },
    fire:           { icon: '🔥', color: '#FF9500', label: 'Fire' },
    medical:        { icon: '🩺', color: '#34C759', label: 'Medical' },
    traffic:        { icon: '🚦', color: '#FFCC00', label: 'Traffic' },
    weather:        { icon: '⛈️', color: '#5AC8FA', label: 'Weather' },
    infrastructure: { icon: '🚧', color: '#AF52DE', label: 'Infrastructure' },
    emergency:      { icon: '🆘', color: '#FF2D55', label: 'Emergency' },
    other:          { icon: '📌', color: '#8E8E93', label: 'Other' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
    active:   { color: '#4CAF50', label: 'Active' },
    expired:  { color: '#9E9E9E', label: 'Expired' },
    resolved: { color: '#3A86FF', label: 'Resolved' },
};

const SEVERITY_COLOR: Record<string, string> = {
    low:    '#FECA57',
    medium: '#FF9F43',
    high:   '#FF6B6B',
};

function timeAgo(ts: any): string {
    try {
        const date = ts?.toDate ? ts.toDate() : new Date(ts);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    } catch { return ''; }
}

// ── SOS Button — hold 3 seconds to trigger ───────────────────────────────────
function SOSButton() {
    const [sosLoading, setSosLoading] = useState(false);
    const [holding, setHolding] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const startHold = () => {
        setHolding(true);
        Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 3000,
            useNativeDriver: true,
        }).start();
        holdTimer.current = setTimeout(() => {
            setHolding(false);
            scaleAnim.setValue(1);
            setShowModal(true);
        }, 3000);
    };

    const cancelHold = () => {
        setHolding(false);
        scaleAnim.setValue(1);
        if (holdTimer.current) clearTimeout(holdTimer.current);
    };

    const confirmSOS = async () => {
        setShowModal(false);
        setSosLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let coords = { latitude: 0, longitude: 0 };
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            }
            const triggerSOS = triggerSOSFn();
            await triggerSOS({ location: coords });
            Alert.alert('🚨 SOS Sent', 'Emergency services have been notified of your location.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Could not send SOS.');
        } finally {
            setSosLoading(false);
        }
    };

    return (
        <>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[styles.sosButton, holding && styles.sosButtonHolding]}
                    onPressIn={startHold}
                    onPressOut={cancelHold}
                    activeOpacity={0.9}
                    disabled={sosLoading}
                >
                    {sosLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.sosText}>SOS</Text>
                            <Text style={styles.sosSubtext}>
                                {holding ? 'Keep holding...' : 'Hold 3s'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* Confirm Modal */}
            <Modal visible={showModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalIcon}>🚨</Text>
                        <Text style={styles.modalTitle}>Send SOS Alert?</Text>
                        <Text style={styles.modalSubtitle}>
                            This will notify emergency services with your live location.
                        </Text>
                        <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmSOS}>
                            <Text style={styles.modalConfirmText}>Yes, Send SOS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setShowModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ── Official Alert Banner ─────────────────────────────────────────────────────
function AlertBanner({
    alert,
    onDismiss,
}: {
    alert: OfficialAlert;
    onDismiss: () => void;
}) {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const color = SEVERITY_COLOR[alert.severity] ?? '#FECA57';

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.alertBanner,
                { borderLeftColor: color, transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.alertBannerLeft}>
                <Text style={styles.alertBannerIcon}>
                    {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟠' : '🟡'}
                </Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.alertBannerTitle} numberOfLines={1}>
                        {alert.title}
                    </Text>
                    <Text style={styles.alertBannerMsg} numberOfLines={2}>
                        {alert.message}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.alertBannerClose}>
                <Text style={styles.alertBannerCloseText}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ item }: { item: Report }) {
    const meta   = CATEGORY_META[item.category] ?? CATEGORY_META.other;
    const status = STATUS_META[item.status]     ?? STATUS_META.active;

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() =>
                router.push({ pathname: '/report/[id]', params: { id: item.reportId } })
            }
        >
            <Image
                source={{ uri: item.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
            />
            <View
                style={[
                    styles.categoryBadge,
                    { backgroundColor: meta.color + '22', borderColor: meta.color },
                ]}
            >
                <Text style={styles.categoryBadgeIcon}>{meta.icon}</Text>
                <Text style={[styles.categoryBadgeText, { color: meta.color }]}>
                    {meta.label}
                </Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.cardMeta}>
                    <Text style={styles.cardLocation} numberOfLines={1}>
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
                        <Text style={[styles.statusText, { color: status.color }]}>
                            {status.label}
                        </Text>
                    </View>
                    <Text style={styles.tapHint}>Tap to view →</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

type VerificationRequest = {
    requestId: string;
    crisisId: string;
    description: string;
    status: string;
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const [reports, setReports]           = useState<Report[]>([]);
    const [loading, setLoading]           = useState(true);
    const [refreshing, setRefreshing]     = useState(false);
    const [userCity, setUserCity]         = useState('');
    const [activeAlerts, setActiveAlerts] = useState<OfficialAlert[]>([]);
    const [dismissed, setDismissed]       = useState<Set<string>>(new Set());
    const user = auth.currentUser;

    const [activeVerification, setActiveVerification] = useState<VerificationRequest | null>(null);
    const [votingLoading, setVotingLoading] = useState(false);

    // Subscribe to Active Verification Requests from Firestore
    useEffect(() => {
        const q = query(
            collection(db, 'verification_requests'),
            where('status', 'in', ['active', 'awaiting_citizen_input'])
        );
        const unsub = onSnapshot(q, async (snap) => {
            let activeReq: VerificationRequest | null = null;
            const uid = user?.uid ?? '';
            
            for (const docSnap of snap.docs) {
                const data = docSnap.data();
                const reqId = docSnap.id;
                
                try {
                    // Check if current user has already voted on this request's poll
                    const pollDoc = await getDoc(doc(db, 'polls', reqId));
                    if (pollDoc.exists()) {
                        const pData = pollDoc.data();
                        const yesVotes = pData.yesVotes || [];
                        const noVotes = pData.noVotes || [];
                        if (uid && (yesVotes.includes(uid) || noVotes.includes(uid))) {
                            // Already voted, skip showing popup
                            continue;
                        }
                    }
                } catch (e) {
                    console.log("Error checking verification request poll:", e);
                }

                activeReq = {
                    requestId: reqId,
                    crisisId: data.crisisId || '',
                    description: data.description || '',
                    status: data.status || 'active',
                };
                break;
            }
            setActiveVerification(activeReq);
        }, (err) => {
            console.log("Verification requests subscription error:", err);
        });
        return () => unsub();
    }, [user]);

    // Validation handler calling backend submitPollVote Cloud Function
    const handleVote = async (vote: 'yes' | 'no') => {
        if (!activeVerification) return;
        setVotingLoading(true);
        try {
            const submitVote = submitPollVoteFn();
            await submitVote({ pollId: activeVerification.requestId, vote });
            Alert.alert(
                '✅ Validation Recorded', 
                'Thank you! Your direct input has been submitted to guide the AI responder dispatch pipeline.'
            );
            setActiveVerification(null);
        } catch (err: any) {
            console.log("Cloud function vote failed, attempting direct verification request fallback update:", err.message);
            try {
                // Direct Firestore fallback for legacy verification requests
                const ref = doc(db, 'verification_requests', activeVerification.requestId);
                const reqDoc = await getDoc(ref);
                if (reqDoc.exists()) {
                    const data = reqDoc.data();
                    const field = vote === 'yes' ? 'yesVotes' : 'noVotes';
                    const currentCount = Number(data[field] || 0);
                    await updateDoc(ref, {
                        [field]: currentCount + 1,
                        status: 'resolved' // Mark it resolved so it dismisses cleanly
                    });
                    Alert.alert(
                        '✅ Validation Recorded', 
                        'Thank you! Your direct input has been recorded.'
                    );
                    setActiveVerification(null);
                    return;
                }
            } catch (fallbackErr) {
                console.log("Direct fallback also failed:", fallbackErr);
            }
            Alert.alert('Error', err.message || 'Could not register validation.');
        } finally {
            setVotingLoading(false);
        }
    };

    // Fetch user profile to enable official city-level alerts
    useEffect(() => {
        if (!user) return;
        const fetchUserProfile = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data?.city) {
                        setUserCity(data.city);
                    }
                }
            } catch (err) {
                console.log("Error loading user profile for city alerts:", err);
            }
        };
        fetchUserProfile();
    }, [user]);

    // Fetch personalized feed with direct Firestore query fallback
    const fetchFeed = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const getFeed = getPersonalizedFeedFn();
            const result  = await getFeed();
            const data    = result.data as { reports: Report[] };
            setReports(data.reports ?? []);
        } catch (error: any) {
            if (error.code === 'not-found') {
                router.replace('/onboarding');
                return;
            }

            console.log("Personalized feed Cloud Function failed. Falling back to direct Firestore fetch:", error.message);
            try {
                const q = query(
                    collection(db, 'reports'),
                    orderBy('timestamp', 'desc'),
                    limit(50)
                );
                const querySnapshot = await getDocs(q);
                const fetchedReports: Report[] = [];
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    fetchedReports.push({
                        reportId: docSnap.id,
                        imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800',
                        category: data.category || 'other',
                        description: data.description || '',
                        areaName: data.areaName || '',
                        city: data.city || '',
                        timestamp: data.timestamp,
                        status: data.status || 'active',
                    });
                });
                setReports(fetchedReports);
            } catch (fallbackError: any) {
                Alert.alert('Error', fallbackError.message || 'Could not load feed.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchFeed(); }, [fetchFeed]);

    // Real-time official alerts via Firestore onSnapshot
    useEffect(() => {
        if (!userCity) return;
        const q = query(
            collection(db, 'alerts'),
            where('city', '==', userCity),
            where('active', '==', true)
        );
        const unsub = onSnapshot(q, (snap) => {
            const fetched: OfficialAlert[] = snap.docs.map(
                (d) => ({ alertId: d.id, ...d.data() } as OfficialAlert)
            );
            setActiveAlerts(fetched);
        });
        return () => unsub();
    }, [userCity]);

    const visibleAlerts = activeAlerts.filter((a) => !dismissed.has(a.alertId));

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
                        onPress={() => router.push('/polls')}
                    >
                        <Text style={styles.headerBtnIcon}>📊</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/(tabs)/alerts')}
                    >
                        <Text style={styles.headerBtnIcon}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleSignOut}>
                        <Text style={styles.headerBtnIcon}>⎋</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Glowing Active Polls Quick Action Card Banner */}
            <TouchableOpacity 
                style={styles.pollsBannerCard} 
                onPress={() => router.push('/polls')}
                activeOpacity={0.85}
            >
                <View style={styles.pollsBannerContent}>
                    <Text style={styles.pollsBannerEmoji}>📊</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.pollsBannerTitle}>Civic Decision Grid Active</Text>
                        <Text style={styles.pollsBannerSubtitle}>Tap to verify local emergency reports & earn trust points!</Text>
                    </View>
                    <Text style={styles.pollsBannerArrow}>▶</Text>
                </View>
            </TouchableOpacity>

            {/* Official Alert Banners — slide in from top */}
            {visibleAlerts.map((alert) => (
                <AlertBanner
                    key={alert.alertId}
                    alert={alert}
                    onDismiss={() =>
                        setDismissed((prev) => new Set([...prev, alert.alertId]))
                    }
                />
            ))}

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
                        onPress={() => router.push('/(tabs)/report')}
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

            {/* Floating SOS Button */}
            <View style={styles.sosContainer}>
                <SOSButton />
            </View>

            {/* Real-time Verification Request Modal popup */}
            {activeVerification && (
                <Modal visible={!!activeVerification} transparent animationType="slide">
                    <View style={styles.verifyOverlay}>
                        <View style={styles.verifyCard}>
                            <View style={styles.verifyHeader}>
                                <Text style={styles.verifyIcon}>📢</Text>
                                <Text style={styles.verifyHeaderTitle}>AI Community Validation</Text>
                            </View>
                            <Text style={styles.verifySubtitle}>
                                Our AI system has detected a potential emergency in your immediate area:
                            </Text>
                            <View style={styles.verifyDetailsBox}>
                                <Text style={styles.verifyDescription}>&quot;{activeVerification.description}&quot;</Text>
                            </View>
                            <Text style={styles.verifyQuestion}>Can you confirm if this is currently happening?</Text>
                            
                            {votingLoading ? (
                                <ActivityIndicator size="large" color="#3A86FF" style={{ marginVertical: 20 }} />
                            ) : (
                                <View style={styles.verifyActions}>
                                    <TouchableOpacity 
                                        style={[styles.verifyBtn, styles.confirmBtn]}
                                        onPress={() => handleVote('yes')}
                                    >
                                        <Text style={styles.verifyBtnText}>🟢 YES, I CONFIRM</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.verifyBtn, styles.rejectBtn]}
                                        onPress={() => handleVote('no')}
                                    >
                                        <Text style={styles.verifyBtnText}>🔴 NO, FALSE ALERT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.closeVerifyBtn}
                                        onPress={() => setActiveVerification(null)}
                                    >
                                        <Text style={styles.closeVerifyText}>Dismiss Request</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B132B' },

    // Header
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
    greeting:      { fontSize: 13, color: '#8892A4', marginBottom: 2 },
    headerTitle:   { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', gap: 10 },
    headerBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#141D35',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#1E2D50',
    },
    headerBtnIcon: { fontSize: 16 },

    // Alert Banner
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#141D35',
        borderLeftWidth: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    alertBannerLeft:      { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    alertBannerIcon:      { fontSize: 20 },
    alertBannerTitle:     { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
    alertBannerMsg:       { fontSize: 12, color: '#8892A4', lineHeight: 16 },
    alertBannerClose:     { paddingLeft: 10 },
    alertBannerCloseText: { color: '#4A5568', fontSize: 16, fontWeight: '700' },

    // Feed
    list: { padding: 16, gap: 14, paddingBottom: 160 },
    card: {
        backgroundColor: '#141D35',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    cardImage: { width: '100%', height: 180, backgroundColor: '#0F1929' },
    categoryBadge: {
        position: 'absolute', top: 12, left: 12,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, borderWidth: 1,
    },
    categoryBadgeIcon: { fontSize: 12 },
    categoryBadgeText: { fontSize: 12, fontWeight: '700' },
    cardBody:   { padding: 14, gap: 8 },
    cardMeta:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLocation: { fontSize: 13, color: '#C5C6C7', fontWeight: '600', flex: 1 },
    cardTime:   { fontSize: 12, color: '#4A5568' },
    cardDesc:   { fontSize: 14, color: '#8892A4', lineHeight: 20 },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 4,
    },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    statusDot:  { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '700' },
    tapHint:    { fontSize: 12, color: '#4A5568' },

    // Empty / Loading
    center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText:   { color: '#8892A4', marginTop: 12, fontSize: 14 },
    emptyIcon:     { fontSize: 48, marginBottom: 16 },
    emptyTitle:    { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
    emptySubtitle: {
        fontSize: 14, color: '#8892A4', textAlign: 'center',
        lineHeight: 20, marginBottom: 24,
    },
    reportCta:     { backgroundColor: '#3A86FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    reportCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // SOS Floating Button
    sosContainer: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
    },
    sosButton: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#FF3B30',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#FF3B30',
        shadowOpacity: 0.6,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
    },
    sosButtonHolding: {
        backgroundColor: '#CC2200',
    },
    sosText:    { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    sosSubtext: { color: 'rgba(255,255,255,0.75)', fontSize: 9, marginTop: 2 },

    // SOS Confirm Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    modalCard: {
        backgroundColor: '#141D35',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    modalIcon:        { fontSize: 48, marginBottom: 12 },
    modalTitle:       { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    modalSubtitle: {
        fontSize: 14, color: '#8892A4', textAlign: 'center',
        lineHeight: 20, marginBottom: 24,
    },
    modalConfirmBtn: {
        backgroundColor: '#FF3B30',
        paddingVertical: 14, paddingHorizontal: 32,
        borderRadius: 12, width: '100%',
        alignItems: 'center', marginBottom: 10,
    },
    modalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    modalCancelBtn:   { paddingVertical: 12, width: '100%', alignItems: 'center' },
    modalCancelText:  { color: '#8892A4', fontSize: 15 },

    insightsToggleText: {
        color: '#3A86FF',
        fontSize: 12,
        fontWeight: '700',
    },
    insightsBox: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#1E2D50',
        gap: 8,
    },
    confidenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confidenceLabel: {
        color: '#8892A4',
        fontSize: 12,
        fontWeight: '600',
    },
    confidenceVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
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
    insightsExplanation: {
        color: '#8892A4',
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
    },

    // Verification Modal Styling
    verifyOverlay: {
        flex: 1,
        backgroundColor: 'rgba(7, 12, 30, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    verifyCard: {
        backgroundColor: '#141D35',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: '#3A86FF',
        shadowColor: '#3A86FF',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        gap: 16,
    },
    verifyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    verifyIcon: {
        fontSize: 32,
    },
    verifyHeaderTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    verifySubtitle: {
        color: '#8892A4',
        fontSize: 13,
        lineHeight: 18,
    },
    verifyDetailsBox: {
        backgroundColor: '#0D1526',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    verifyDescription: {
        color: '#FECA57',
        fontSize: 14,
        fontWeight: '600',
        fontStyle: 'italic',
        lineHeight: 20,
        textAlign: 'center',
    },
    verifyQuestion: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    verifyActions: {
        gap: 10,
    },
    verifyBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtn: {
        backgroundColor: 'rgba(48, 209, 88, 0.2)',
        borderWidth: 1,
        borderColor: '#30D158',
    },
    rejectBtn: {
        backgroundColor: 'rgba(255, 59, 48, 0.2)',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    verifyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    closeVerifyBtn: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    closeVerifyText: {
        color: '#8892A4',
        fontSize: 13,
        fontWeight: '600',
    },
    pollsBannerCard: {
        backgroundColor: '#141D35',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(58, 134, 255, 0.3)',
        shadowColor: '#3A86FF',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    pollsBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    pollsBannerEmoji: {
        fontSize: 24,
    },
    pollsBannerTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    pollsBannerSubtitle: {
        fontSize: 11,
        color: '#8892A4',
        lineHeight: 15,
    },
    pollsBannerArrow: {
        fontSize: 12,
        color: '#3A86FF',
        fontWeight: 'bold',
    },
});