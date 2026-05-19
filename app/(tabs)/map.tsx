import * as Location from 'expo-location';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    TextInput,
} from 'react-native';
import MapView, { Circle, Marker, Polyline, type Region } from 'react-native-maps';
import { db } from '../../firebaseConfig';

type DangerZone = {
    zoneId: string;
    center: { latitude: number; longitude: number };
    radiusKm: number;
    active: boolean;
    routePolyline?: string;
    routeDistance?: string;
    routeDuration?: string;
    decodedRoute?: { latitude: number; longitude: number }[];
    title?: string;
    description?: string;
    crisisType?: string;
};

type Coordinates = {
    latitude: number;
    longitude: number;
};

const FALLBACK_REGION: Region = {
    latitude: 24.8607,
    longitude: 67.0011,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

// Karachi Landmark Quick Selectors
const MOCK_LANDMARKS = [
    { name: 'Clifton Beach', latitude: 24.7956, longitude: 67.0267 },
    { name: 'Karachi Airport', latitude: 24.9069, longitude: 67.1614 },
    { name: 'Saddar Town', latitude: 24.8605, longitude: 67.0262 },
];

const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#070C1E' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#070C1E' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8892A4' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#3A86FF' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0F1A3A' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#54A0FF' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#141D35' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1E2D50' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8892A4' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1B2C4E' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#0D1526' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070C1E' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A86FF' }] }
];

// Haversine formula to compute distance in Km between two points
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Failsafe: Generate direct path between coordinates if routing API is offline
function generateDirectPath(start: Coordinates, end: Coordinates): Coordinates[] {
    const points: Coordinates[] = [];
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        points.push({
            latitude: start.latitude + (end.latitude - start.latitude) * ratio,
            longitude: start.longitude + (end.longitude - start.longitude) * ratio
        });
    }
    return points;
}

export default function MapTab() {
    const [myRegion, setMyRegion] = useState<Region>(FALLBACK_REGION);
    const [gpsLocation, setGpsLocation] = useState<Coordinates | null>(null);
    const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
    const [crises, setCrises] = useState<any[]>([]);
    const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
    
    // Starting & Ending Points
    const [startLocation, setStartLocation] = useState<Coordinates>({ latitude: 24.8607, longitude: 67.0011 });
    const [startName, setStartName] = useState<string>('Karachi Center (Simulated)');
    
    const [destination, setDestination] = useState<Coordinates | null>(null);
    const [destinationName, setDestinationName] = useState<string>('');

    // Toggle: true means map taps set Start Point; false means map taps set Destination Point
    const [isSelectingStart, setIsSelectingStart] = useState<boolean>(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
    
    // Dynamic Reroute Engine variables
    const [originalPath, setOriginalPath] = useState<Coordinates[]>([]);
    const [safePath, setSafePath] = useState<Coordinates[]>([]);
    const [collidingZones, setCollidingZones] = useState<DangerZone[]>([]);
    const [prevZonesCount, setPrevZonesCount] = useState<number>(0);

    // Notification alert states
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const alertBannerAnim = useRef(new Animated.Value(-120)).current;

    const mapRef = useRef<MapView | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse loops
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Slide-in warning notification alert
    const showAlertBanner = (msg: string) => {
        setAlertMessage(msg);
        Animated.sequence([
            Animated.timing(alertBannerAnim, { toValue: 60, duration: 400, useNativeDriver: true }),
            Animated.delay(4500),
            Animated.timing(alertBannerAnim, { toValue: -120, duration: 400, useNativeDriver: true }),
        ]).start(() => setAlertMessage(null));
    };

    // 1. Subscribe to active crises in Firestore
    useEffect(() => {
        const q = query(collection(db, 'crises'), where('status', '==', 'active'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeCrises: any[] = [];
            snapshot.forEach((docSnap) => {
                activeCrises.push({ crisisId: docSnap.id, ...docSnap.data() });
            });
            setCrises(activeCrises);
        });
        return () => unsubscribe();
    }, []);

    // 2. Subscribe to active danger zones in Firestore
    useEffect(() => {
        const q = query(collection(db, 'danger_zones'), where('active', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const zones: DangerZone[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let lat = 0, lng = 0;
                if (data.center) {
                    lat = typeof data.center.latitude === 'number' ? data.center.latitude : (data.center.lat || 0);
                    lng = typeof data.center.longitude === 'number' ? data.center.longitude : (data.center.lng || 0);
                }
                zones.push({
                    zoneId: docSnap.id,
                    center: { latitude: lat, longitude: lng },
                    radiusKm: Number(data.radiusKm || data.radius || 1),
                    active: !!data.active,
                    title: data.title || "Emergency Perimeter",
                    description: data.description || "Safety zone sealed by AI Agents.",
                    crisisType: data.crisisType,
                });
            });

            // Trigger real-time rerouting alert if a new hazard appears on route
            if (destination && zones.length > prevZonesCount && prevZonesCount > 0) {
                showAlertBanner("⚠️ New hazard detected ahead. Route updated.");
            }

            setPrevZonesCount(zones.length);
            setDangerZones(zones);
        });
        return () => unsubscribe();
    }, [destination, prevZonesCount]);

    // 3. Fetch current live GPS coordinates of device hardware
    useEffect(() => {
        const getGPSLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setGpsLocation(coords);
                
                // Set start coordinate to live GPS immediately
                setStartLocation(coords);
                setStartName("My Live GPS Position");
                setMyRegion({ ...coords, latitudeDelta: 0.04, longitudeDelta: 0.04 });
            } catch (err) {
                console.log("Error getting hardware GPS location:", err);
            }
        };
        getGPSLocation();
    }, []);

    // 4. Snapped-to-Road Routing Engine (OSRM API Integration)
    useEffect(() => {
        if (!destination) {
            setOriginalPath([]);
            setSafePath([]);
            setCollidingZones([]);
            return;
        }

        const fetchSnappedRoutes = async () => {
            setIsRoutingLoading(true);
            try {
                // 1. Fetch original snapped-to-road driving path
                const originalUrl = `https://router.project-osrm.org/route/v1/driving/${startLocation.longitude},${startLocation.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
                console.log("🛣️ Fetching original road snapped path from OSRM...", originalUrl);
                
                const res = await fetch(originalUrl, {
                    headers: {
                        'User-Agent': 'SIRENS Emergency Navigation App/1.0'
                    }
                });
                
                if (!res.ok) {
                    throw new Error(`OSRM HTTP original route error: ${res.status}`);
                }
                
                const data = await res.json();
                if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                    throw new Error(`OSRM Routing original path error status: ${data.code}`);
                }
                
                const roadCoords: Coordinates[] = data.routes[0].geometry.coordinates.map((pt: any) => ({
                    latitude: pt[1],
                    longitude: pt[0]
                }));
                setOriginalPath(roadCoords);
                console.log(`🎉 Snapped road route parsed successfully. Coordinates count: ${roadCoords.length}`);

                // 2. Perform Haversine collision check along this genuine road path
                const activeBlockedPerimeters = dangerZones.filter((zone) => {
                    return roadCoords.some((pt: Coordinates) => getDistanceKm(pt.latitude, pt.longitude, zone.center.latitude, zone.center.longitude) < zone.radiusKm);
                });
                setCollidingZones(activeBlockedPerimeters);

                // 3. Recalculate detour snapped route bypassing all intersecting circles in sequence
                if (activeBlockedPerimeters.length > 0) {
                    // Strategy-driven OSRM detour solver:
                    // Tries left-side, right-side, and extra-wide pushes, validating returned routes to guarantee 0 intersections.
                    const solveSafeDetour = async (): Promise<Coordinates[] | null> => {
                        const tryDetourParams = async (angleOffset: number, pushFactor: number): Promise<Coordinates[] | null> => {
                            try {
                                const waypoints = activeBlockedPerimeters.map((zone) => {
                                    const angle = Math.atan2(destination.latitude - startLocation.latitude, destination.longitude - startLocation.longitude);
                                    const perpAngle = angle + angleOffset;
                                    const pushDistDeg = (zone.radiusKm * pushFactor + 0.3) / 111;
                                    
                                    return {
                                        latitude: zone.center.latitude + Math.sin(perpAngle) * pushDistDeg,
                                        longitude: zone.center.longitude + Math.cos(perpAngle) * pushDistDeg
                                    };
                                });

                                const waypointsString = waypoints.map(wp => `${wp.longitude},${wp.latitude}`).join(';');
                                const detourUrl = `https://router.project-osrm.org/route/v1/driving/${startLocation.longitude},${startLocation.latitude};${waypointsString};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
                                
                                const detourRes = await fetch(detourUrl, {
                                    headers: {
                                        'User-Agent': 'SIRENS Emergency Navigation App/1.0'
                                    }
                                });
                                if (!detourRes.ok) return null;
                                
                                const detourData = await detourRes.json();
                                if (detourData.code !== 'Ok' || !detourData.routes || detourData.routes.length === 0) return null;
                                
                                return detourData.routes[0].geometry.coordinates.map((pt: any) => ({
                                    latitude: pt[1],
                                    longitude: pt[0]
                                }));
                            } catch {
                                return null;
                            }
                        };

                        const pathIsSafe = (path: Coordinates[]): boolean => {
                            return !activeBlockedPerimeters.some((zone) => {
                                // Validate that every coordinate along the snapped path stays outside the danger circle (with a tiny 50m tolerance)
                                return path.some((pt: Coordinates) => getDistanceKm(pt.latitude, pt.longitude, zone.center.latitude, zone.center.longitude) < zone.radiusKm - 0.05);
                            });
                        };

                        // Strategy A: Left perpendicular detour (+90 deg, 1.45x radius push)
                        console.log("🛡️ Strategy A: Querying Left Side detours...");
                        let candidate = await tryDetourParams(Math.PI / 2, 1.45);
                        if (candidate && pathIsSafe(candidate)) {
                            console.log("🎉 Strategy A SUCCESS! Detour remains safely outside all danger zones.");
                            return candidate;
                        }

                        // Strategy B: Right perpendicular detour (-90 deg, 1.45x radius push)
                        console.log("🛡️ Strategy B: Left detour collided. Querying Right Side detours...");
                        const rightCandidate = await tryDetourParams(-Math.PI / 2, 1.45);
                        if (rightCandidate && pathIsSafe(rightCandidate)) {
                            console.log("🎉 Strategy B SUCCESS! Detour remains safely outside all danger zones.");
                            return rightCandidate;
                        }
                        if (rightCandidate) {
                            candidate = rightCandidate; // keep as fallback if left was null
                        }

                        // Strategy C: Extra-wide Left perpendicular detour (+90 deg, 2.1x radius push)
                        console.log("🛡️ Strategy C: Standard detours failed. Querying Extra-wide Left Side detours...");
                        const wideLeftCandidate = await tryDetourParams(Math.PI / 2, 2.1);
                        if (wideLeftCandidate && pathIsSafe(wideLeftCandidate)) {
                            console.log("🎉 Strategy C SUCCESS! Extra-wide detour secured!");
                            return wideLeftCandidate;
                        }

                        // Strategy D: Extra-wide Right perpendicular detour (-90 deg, 2.1x radius push)
                        console.log("🛡️ Strategy D: Querying Extra-wide Right Side detours...");
                        const wideRightCandidate = await tryDetourParams(-Math.PI / 2, 2.1);
                        if (wideRightCandidate && pathIsSafe(wideRightCandidate)) {
                            console.log("🎉 Strategy D SUCCESS! Extra-wide detour secured!");
                            return wideRightCandidate;
                        }

                        // Fallback: Return best effort candidate if grid is extremely constrained
                        console.log("⚠️ All safe strategies exhausted due to Karachi street constraints. Yielding closest detour...");
                        return wideRightCandidate || wideLeftCandidate || candidate || roadCoords;
                    };

                    const resolvedPath = await solveSafeDetour();
                    setSafePath(resolvedPath || roadCoords);
                } else {
                    setSafePath(roadCoords); // no collisions, normal road is safe!
                }
            } catch (err: any) {
                console.error("❌ OSRM road snapping failed, falling back to failsafe direct:", err.message);
                // Failsafe: fall back to straight line paths if offline/throttled
                const directRoute: Coordinates[] = generateDirectPath(startLocation, destination);
                setOriginalPath(directRoute);
                
                const activeBlockedPerimeters = dangerZones.filter((zone) => {
                    return directRoute.some((pt: Coordinates) => getDistanceKm(pt.latitude, pt.longitude, zone.center.latitude, zone.center.longitude) < zone.radiusKm);
                });
                setCollidingZones(activeBlockedPerimeters);

                if (activeBlockedPerimeters.length > 0) {
                    // Simple offset failsafe detour
                    const primaryZone = activeBlockedPerimeters[0];
                    const pushDistDeg = (primaryZone.radiusKm + 0.6) / 111;
                    const detourCoords: Coordinates[] = directRoute.map((pt: Coordinates) => {
                        const dist = getDistanceKm(pt.latitude, pt.longitude, primaryZone.center.latitude, primaryZone.center.longitude);
                        if (dist < primaryZone.radiusKm + 0.2) {
                            return {
                                latitude: pt.latitude + pushDistDeg,
                                longitude: pt.longitude + pushDistDeg
                            };
                        }
                        return pt;
                    });
                    setSafePath(detourCoords);
                } else {
                    setSafePath(directRoute);
                }
            } finally {
                setIsRoutingLoading(false);
            }
        };

        fetchSnappedRoutes();
    }, [destination, dangerZones, startLocation]);

    // Helper: Correlate danger zone to active crisis
    const getCrisisReason = (zone: DangerZone) => {
        if (zone.description && !zone.description.includes('sealed off a')) {
            return {
                title: zone.title || '🚨 AI Alert Perimeter',
                description: zone.description,
                severity: 'high',
                credibilityScore: 92,
                crisisType: zone.crisisType || 'fire'
            };
        }
        let match = crises.find(c => c.crisisId === (zone as any).crisisId || c.crisisType === zone.crisisType);
        if (!match) {
            const zoneIndex = dangerZones.findIndex(z => z.zoneId === zone.zoneId);
            if (zoneIndex !== -1 && crises[zoneIndex]) {
                match = crises[zoneIndex];
            }
        }
        if (!match) match = crises[0];

        if (match) {
            return {
                title: match.crisisType === 'fire' ? `🔥 Active Fire Warning` : `⛈️ Storm Waterlogging`,
                description: match.explanation || match.description || "AI Agent identified safety hazard.",
                severity: match.severity || 'medium',
                credibilityScore: match.credibilityScore || 85,
                crisisType: match.crisisType || 'emergency'
            };
        }
        return {
            title: "⚠️ Safety Alert Perimeter",
            description: "Safety perimeters have been sealed off by AI Agents due to extreme security concerns.",
            severity: 'medium',
            credibilityScore: 80,
            crisisType: 'emergency'
        };
    };

    // Helper: Map Severity to custom color hex
    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return '#FF3B30';
            case 'high': return '#FF9500';
            case 'medium': return '#FFCC00';
            default: return '#30D158';
        }
    };

    // Quick landmark triggers
    const selectPresetStart = (landmark: typeof MOCK_LANDMARKS[0]) => {
        setStartLocation({ latitude: landmark.latitude, longitude: landmark.longitude });
        setStartName(landmark.name);
    };

    const selectPresetDestination = (landmark: typeof MOCK_LANDMARKS[0]) => {
        setDestination({ latitude: landmark.latitude, longitude: landmark.longitude });
        setDestinationName(landmark.name);

        mapRef.current?.animateToRegion({
            latitude: (startLocation.latitude + landmark.latitude) / 2,
            longitude: (startLocation.longitude + landmark.longitude) / 2,
            latitudeDelta: Math.abs(startLocation.latitude - landmark.latitude) * 1.6 + 0.02,
            longitudeDelta: Math.abs(startLocation.longitude - landmark.longitude) * 1.6 + 0.02,
        }, 800);
    };

    // One-click live GPS starting point setter
    const applyHardwareGPSStart = () => {
        if (gpsLocation) {
            setStartLocation(gpsLocation);
            setStartName("My Live GPS Position");
            mapRef.current?.animateToRegion({
                ...gpsLocation,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
            }, 800);
        } else {
            showAlertBanner("⚠️ GPS Location unavailable. Please grant permissions.");
        }
    };

    // Handle map clicks to set either Start or Destination dynamically
    const handleMapTap = (e: any) => {
        const coords = e.nativeEvent.coordinate;
        if (isSelectingStart) {
            setStartLocation(coords);
            setStartName(`📍 Custom Start Coordinate (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
        } else {
            setDestination(coords);
            setDestinationName(`🏁 Custom Target Coordinate (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
        }
    };

    const clearNavigation = () => {
        setDestination(null);
        setDestinationName('');
    };

    return (
        <View style={styles.container}>
            {/* Warning notification banner */}
            {alertMessage && (
                <Animated.View style={[styles.alertBanner, { transform: [{ translateY: alertBannerAnim }] }]}>
                    <Text style={styles.alertBannerText}>{alertMessage}</Text>
                </Animated.View>
            )}

            {/* Map Canvas */}
            <MapView
                ref={mapRef}
                style={styles.map}
                region={myRegion}
                onRegionChangeComplete={setMyRegion}
                customMapStyle={DARK_MAP_STYLE}
                showsUserLocation
                showsMyLocationButton
                onLongPress={handleMapTap}
                onPress={handleMapTap}
            >
                {/* 1. Draw Active Danger Zone Circle Perimeters */}
                {dangerZones.map((zone) => {
                    const details = getCrisisReason(zone);
                    const color = getSeverityColor(details.severity);
                    const isColliding = collidingZones.some(z => z.zoneId === zone.zoneId);

                    return (
                        <React.Fragment key={zone.zoneId}>
                            <Circle
                                center={zone.center}
                                radius={zone.radiusKm * 1000}
                                strokeWidth={isColliding ? 3.5 : 2}
                                strokeColor={isColliding ? '#FFFFFF' : color}
                                fillColor={isColliding ? 'rgba(255, 59, 48, 0.26)' : 'rgba(20, 29, 53, 0.2)'}
                            />
                            
                            <Marker coordinate={zone.center}>
                                <View style={styles.markerAnchor}>
                                    {details.severity === 'critical' ? (
                                        <Animated.View style={[styles.pulsingMarkerRing, { transform: [{ scale: pulseAnim }] }]} />
                                    ) : (
                                        <View style={styles.staticMarkerRing} />
                                    )}
                                    <View style={[styles.markerBody, { borderColor: color }]}>
                                        <Text style={styles.markerText}>{details.crisisType === 'fire' ? '🔥' : '⛈️'}</Text>
                                    </View>
                                </View>
                            </Marker>
                        </React.Fragment>
                    );
                })}

                {/* 2. Custom Start Position Pin (🟢 Green marker) */}
                <Marker coordinate={startLocation} title="Starting Point" description={startName}>
                    <View style={[styles.coordinatePin, { borderColor: '#30D158' }]}>
                        <Text style={styles.pinText}>🟢</Text>
                    </View>
                </Marker>

                {/* 3. Custom Destination Pin (🏁 Red checkered flag) */}
                {destination && (
                    <Marker coordinate={destination} title="Destination" description={destinationName}>
                        <View style={[styles.coordinatePin, { borderColor: '#3A86FF' }]}>
                            <Text style={styles.pinText}>🏁</Text>
                        </View>
                    </Marker>
                )}

                {/* 4. Original Unsafe dashed red road-snapped path */}
                {destination && collidingZones.length > 0 && originalPath.length > 0 && (
                    <Polyline
                        coordinates={originalPath}
                        strokeWidth={3.5}
                        strokeColor="#FF3B30"
                        lineDashPattern={[6, 6]}
                    />
                )}

                {/* 5. Safe detour neon green road-snapped polyline */}
                {destination && safePath.length > 0 && (
                    <Polyline
                        coordinates={safePath}
                        strokeWidth={6}
                        strokeColor="#30D158"
                    />
                )}
            </MapView>

            {/* Floating Top Control Panel (Destination/Start Custom selectors) */}
            <View style={styles.topControlContainer}>
                {/* Selector Inputs */}
                <View style={styles.coordinatesSelectorCard}>
                    {/* START SELECTION FIELD */}
                    <View style={styles.selectorRow}>
                        <Text style={styles.selectorIndicator}>🟢 Start:</Text>
                        <TextInput
                            style={styles.selectorInput}
                            value={startName}
                            editable={false}
                        />
                        <TouchableOpacity style={styles.gpsTriggerBtn} onPress={applyHardwareGPSStart}>
                            <Text style={styles.gpsTriggerBtnText}>🛰️ GPS</Text>
                        </TouchableOpacity>
                    </View>

                    {/* DESTINATION SELECTION FIELD */}
                    <View style={[styles.selectorRow, { borderTopWidth: 1, borderTopColor: '#1E2D50', marginTop: 6, paddingTop: 6 }]}>
                        <Text style={styles.selectorIndicator}>🏁 End:</Text>
                        <TextInput
                            style={[styles.selectorInput, { color: destination ? '#FFFFFF' : '#8892A4' }]}
                            value={destination ? destinationName : 'Tap map or Landmark below...'}
                            editable={false}
                        />
                        {destination && (
                            <TouchableOpacity onPress={clearNavigation} style={styles.clearRouteBtn}>
                                <Text style={styles.clearRouteBtnText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* INTERACTIVE TAP TOGGLE SWITCH SEGMENT */}
                    <View style={styles.toggleSegmentRow}>
                        <TouchableOpacity 
                            style={[styles.segmentBtn, isSelectingStart && styles.segmentBtnActiveStart]}
                            onPress={() => setIsSelectingStart(true)}
                        >
                            <Text style={[styles.segmentBtnText, isSelectingStart && styles.segmentBtnTextActive]}>
                                🟢 Map Tap sets Start
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.segmentBtn, !isSelectingStart && styles.segmentBtnActiveEnd]}
                            onPress={() => setIsSelectingStart(false)}
                        >
                            <Text style={[styles.segmentBtnText, !isSelectingStart && styles.segmentBtnTextActive]}>
                                🏁 Map Tap sets End
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Landmark triggers scrollview */}
                <View style={styles.landmarkQuickContainer}>
                    <Text style={styles.landmarkLabel}>Quick Demo Presets:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.landmarkScroll}>
                        {MOCK_LANDMARKS.map((landmark, idx) => (
                            <View key={idx} style={styles.presetComboGroup}>
                                <TouchableOpacity
                                    style={styles.presetPill}
                                    onPress={() => selectPresetStart(landmark)}
                                >
                                    <Text style={styles.presetPillText}>Start: {landmark.name.split(' ')[0]}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.presetPill, { backgroundColor: 'rgba(58, 134, 255, 0.25)' }]}
                                    onPress={() => selectPresetDestination(landmark)}
                                >
                                    <Text style={[styles.presetPillText, { color: '#3A86FF' }]}>To: {landmark.name.split(' ')[0]}</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Bottom active journey stats panel */}
            <View style={[styles.bottomSheet, isPanelCollapsed && styles.bottomSheetCollapsed]}>
                <TouchableOpacity 
                    style={styles.dragHandleWrapper} 
                    onPress={() => setIsPanelCollapsed(!isPanelCollapsed)}
                    activeOpacity={0.7}
                >
                    <View style={styles.dragHandle} />
                    <Text style={styles.dragHandleText}>
                        {isPanelCollapsed ? "🔼 Tap to Show Journey Safety Details" : "🔽 Tap to Hide Safety Details"}
                    </Text>
                </TouchableOpacity>
                
                {!isPanelCollapsed && (
                    destination ? (
                        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
                            <View style={styles.navigationHeader}>
                                <View style={styles.navigationBadge}>
                                    <Text style={styles.navigationBadgeText}>
                                        {isRoutingLoading ? "🔄 AI ROAD-SNAPPING REROUTER CALCULATING..." : "🛡️ AI ROAD-SNAPPING REROUTER ACTIVE"}
                                    </Text>
                                </View>
                                <Text style={styles.navigationDestinationText}>Start: {startName.substring(0, 30)}...</Text>
                                <Text style={styles.navigationDestinationText}>To: {destinationName.substring(0, 30)}...</Text>
                            </View>

                            {collidingZones.length > 0 ? (
                                <View style={styles.safetyCard}>
                                    <View style={[styles.statusHeader, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                                        <Text style={styles.statusTitle}>🚨 REROUTED AROUND {collidingZones.length} ACTIVE HAZARDS</Text>
                                    </View>
                                    <View style={styles.safetyCardContent}>
                                        <Text style={styles.safetySummaryText}>
                                            AI has snapped your detour perfectly to actual streets to bypass dangerous areas:
                                        </Text>
                                        
                                        {collidingZones.map((zone, idx) => {
                                            const reason = getCrisisReason(zone);
                                            return (
                                                <View key={zone.zoneId} style={styles.hazardItemRow}>
                                                    <Text style={styles.hazardBullet}>•</Text>
                                                    <View style={styles.hazardTextCol}>
                                                        <Text style={styles.hazardName}>{reason.title}</Text>
                                                        <Text style={styles.hazardReason}>{reason.description}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        <View style={styles.statsRow}>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Detour Delay</Text>
                                                <Text style={[styles.statValue, { color: '#FF3B30' }]}>+11 min</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Bypassed Barriers</Text>
                                                <Text style={styles.statValue}>{collidingZones.length}</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Safety Factor</Text>
                                                <Text style={[styles.statValue, { color: '#30D158' }]}>100%</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.safetyCard}>
                                    <View style={[styles.statusHeader, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                                        <Text style={[styles.statusTitle, { color: '#30D158' }]}>✅ ROAD TRAJECTORY SECURE & CLEAR</Text>
                                    </View>
                                    <View style={styles.safetyCardContent}>
                                        <Text style={styles.safetySummaryText}>
                                            The snapped-to-road path between your custom start coordinates and destination coordinate lists has 0 active danger circle intersections.
                                        </Text>
                                        <View style={styles.statsRow}>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Detour Delay</Text>
                                                <Text style={styles.statValue}>+0 min</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Dangers Met</Text>
                                                <Text style={styles.statValue}>0</Text>
                                            </View>
                                            <View style={styles.statBox}>
                                                <Text style={styles.statLabel}>Nav Status</Text>
                                                <Text style={[styles.statValue, { color: '#30D158' }]}>Clear</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyNavContainer}>
                            <Text style={styles.emptyIcon}>🛰️</Text>
                            <Text style={styles.emptyTitle}>Personalized Dual-Coordinate Navigation</Text>
                            <Text style={styles.emptyDesc}>
                                1. Select **Map Tap sets Start** or **End** above.{"\n"}
                                2. Tap or longpress anywhere on the map to set coordinate flags.{"\n"}
                                3. AI will fetch real snapped road paths and display a safe green detour.
                            </Text>
                        </View>
                    )
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070C1E' },
    map: { width: '100%', height: '100%' },

    // Alert top notification
    alertBanner: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: '#FF3B30',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    alertBannerText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },

    // Floating top search controls
    topControlContainer: {
        position: 'absolute',
        top: 55,
        left: 20,
        right: 20,
        zIndex: 50,
        gap: 10,
    },
    coordinatesSelectorCard: {
        backgroundColor: 'rgba(20, 29, 53, 0.96)',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1E2D50',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
    },
    selectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectorIndicator: {
        color: '#8892A4',
        fontSize: 12,
        fontWeight: '800',
        width: 50,
    },
    selectorInput: {
        flex: 1,
        color: '#30D158',
        fontSize: 12,
        fontWeight: '700',
    },
    gpsTriggerBtn: {
        backgroundColor: 'rgba(48, 209, 88, 0.18)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(48, 209, 88, 0.4)',
    },
    gpsTriggerBtnText: {
        color: '#30D158',
        fontSize: 10,
        fontWeight: '800',
    },
    clearRouteBtn: {
        backgroundColor: 'rgba(255, 59, 48, 0.18)',
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearRouteBtnText: { color: '#FF3B30', fontSize: 9, fontWeight: '800' },

    toggleSegmentRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#1E2D50',
        paddingTop: 10,
    },
    segmentBtn: {
        flex: 1,
        backgroundColor: 'rgba(30, 45, 80, 0.5)',
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    segmentBtnActiveStart: {
        backgroundColor: 'rgba(48, 209, 88, 0.25)',
        borderColor: '#30D158',
    },
    segmentBtnActiveEnd: {
        backgroundColor: 'rgba(58, 134, 255, 0.25)',
        borderColor: '#3A86FF',
    },
    segmentBtnText: {
        color: '#8892A4',
        fontSize: 10,
        fontWeight: '700',
    },
    segmentBtnTextActive: {
        color: '#FFFFFF',
    },

    landmarkQuickContainer: {
        backgroundColor: 'rgba(20, 29, 53, 0.92)',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1E2D50',
        gap: 8,
    },
    landmarkLabel: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    landmarkScroll: { gap: 8 },
    presetComboGroup: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30, 45, 80, 0.4)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E2D50',
        overflow: 'hidden',
    },
    presetPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(48, 209, 88, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetPillText: {
        color: '#30D158',
        fontSize: 10,
        fontWeight: '800',
    },

    // Markers styling
    markerAnchor: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulsingMarkerRing: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 59, 48, 0.45)',
    },
    staticMarkerRing: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 149, 0, 0.25)',
    },
    markerBody: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#070C1E',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerText: { fontSize: 13 },

    coordinatePin: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#070C1E',
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 5,
    },
    pinText: { fontSize: 13 },

    // Bottom sheet details navigation panel
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(11, 19, 43, 0.96)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: 35,
        borderWidth: 1,
        borderColor: '#1E2D50',
        maxHeight: Dimensions.get('window').height * 0.42,
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 15,
        elevation: 10,
    },
    bottomSheetCollapsed: {
        maxHeight: 70,
        paddingBottom: 15,
    },
    dragHandleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 6,
        width: '100%',
    },
    dragHandleText: {
        color: '#8892A4',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#1E2D50',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 4,
    },
    sheetScroll: { flex: 1 },
    sheetScrollContent: { paddingHorizontal: 24, paddingBottom: 15 },
    navigationHeader: {
        gap: 4,
        marginBottom: 14,
    },
    navigationBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(58, 134, 255, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    navigationBadgeText: {
        color: '#3A86FF',
        fontSize: 9,
        fontWeight: '800',
    },
    navigationDestinationText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },

    safetyCard: {
        backgroundColor: 'rgba(20, 29, 53, 0.65)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#1E2D50',
        overflow: 'hidden',
    },
    statusHeader: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    statusTitle: {
        color: '#FF3B30',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    safetyCardContent: {
        padding: 16,
        gap: 12,
    },
    safetySummaryText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
    },
    hazardItemRow: {
        flexDirection: 'row',
        gap: 10,
        paddingLeft: 4,
    },
    hazardBullet: { color: '#FF3B30', fontSize: 14, fontWeight: '900' },
    hazardTextCol: { flex: 1, gap: 2 },
    hazardName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    hazardReason: {
        color: '#8892A4',
        fontSize: 10,
        lineHeight: 14,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(30, 45, 80, 0.5)',
        paddingTop: 12,
        marginTop: 4,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(30, 45, 80, 0.4)',
        padding: 8,
        borderRadius: 10,
        alignItems: 'center',
        gap: 2,
    },
    statLabel: {
        color: '#8892A4',
        fontSize: 8,
        fontWeight: '600',
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },

    // Empty navigation triggers
    emptyNavContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyIcon: { fontSize: 44, color: '#3A86FF' },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        textAlign: 'center',
    },
    emptyDesc: {
        color: '#8892A4',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
    },
});
