const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCCkG0Blnh2BGus-XiJQWCT1e1H8LUdNlU",
  authDomain: "sirens-451958.firebaseapp.com",
  projectId: "sirens-451958",
  storageBucket: "sirens-451958.firebasestorage.app",
  messagingSenderId: "895118049933",
  appId: "1:895118049933:web:e3d209ff15c3e4e0b218c4",
};

const email = "mocktest_hackathon@example.com";
const password = "Password123!";

// Helper to encode coordinates into Google Polyline format
function encodePolyline(points) {
    let result = '';
    let prevLat = 0;
    let prevLng = 0;

    for (let point of points) {
        let lat = Math.round(point[0] * 1E5);
        let lng = Math.round(point[1] * 1E5);

        let dLat = lat - prevLat;
        let dLng = lng - prevLng;

        result += encodeValue(dLat);
        result += encodeValue(dLng);

        prevLat = lat;
        prevLng = lng;
    }
    return result;
}

function encodeValue(value) {
    value = value < 0 ? ~(value << 1) : (value << 1);
    let chunks = [];
    while (value >= 0x20) {
        chunks.push((value & 0x1f) | 0x20);
        value >>= 5;
    }
    chunks.push(value);
    return chunks.map(c => String.fromCharCode(c + 63)).join('');
}

async function run() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log("1. Authenticating seeder script...");
  let userCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (regErr) {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
  }
  console.log("Authenticated UID:", userCredential.user.uid);

  // Karachi coordinate points surrounding center 24.8607, 67.0011
  const detourPath = [
    [24.8750, 67.0150],
    [24.8750, 66.9850],
    [24.8450, 66.9850],
    [24.8450, 67.0150],
    [24.8750, 67.0150]
  ];
  const encodedPath = encodePolyline(detourPath);
  console.log("Generated alternate polyline path:", encodedPath);

  console.log("2. Seeding active AI crisis documents in 'crises' collection...");
  
  // Fire Crisis
  await setDoc(doc(db, 'crises', 'mock_fire_crisis_101'), {
    crisisType: "fire",
    severity: "high",
    credibilityScore: 94,
    explanation: "AI Agent gathered direct news confirmations of an active warehouse fire matched with 3 citizen reports within 200m.",
    status: "active",
    timestamp: new Date()
  });
  console.log("Seeded crisis: mock_fire_crisis_101");

  // Flood / Weather Crisis
  await setDoc(doc(db, 'crises', 'mock_weather_crisis_102'), {
    crisisType: "weather",
    severity: "medium",
    credibilityScore: 87,
    explanation: "Extreme weather alert: intense rainfall leading to sudden waterlogging and flood concerns near main Karachi highway routes.",
    status: "active",
    timestamp: new Date()
  });
  console.log("Seeded crisis: mock_weather_crisis_102");

  console.log("3. Seeding active Verification Request in 'verification_requests' collection...");
  await setDoc(doc(db, 'verification_requests', 'mock_verification_201'), {
    crisisId: "mock_fire_crisis_101",
    description: "AI Agent 1 detected thermal anomaly and plume signature matching local citizen reports of fire near Central Block.",
    status: "active"
  });
  console.log("Seeded verification request: mock_verification_201");

  console.log("3b. Seeding active Community Poll in 'polls' collection...");
  await setDoc(doc(db, 'polls', 'mock_verification_201'), {
    question: "Do you verify there is an active fire outbreak or thick smoke near the Central Block warehouse?",
    yesVotes: [],
    noVotes: [],
    reportId: "mock_fire_crisis_101",
    createdAt: new Date()
  });
  console.log("Seeded community poll: mock_verification_201");

  console.log("4. Seeding active Danger Zone and Alt detour path in 'danger_zones' collection...");
  await setDoc(doc(db, 'danger_zones', 'mock_danger_zone_301'), {
    center: { latitude: 24.8607, longitude: 67.0011 },
    radiusKm: 1.5,
    active: true,
    routePolyline: encodedPath,
    routeDistance: "4.8 km detour",
    routeDuration: "+11 min delay"
  });
  console.log("Seeded danger zone: mock_danger_zone_301");

  console.log("5. Seeding active live broadcast alerts in 'alerts' collection...");
  // Weather flood alert
  await setDoc(doc(db, 'alerts', 'mock_alert_501'), {
    title: "⚡ Severe Urban Flooding Alert",
    message: "Heavy rainfall combined with high drainage blockages has flooded key Clifton streets. Avoid travel.",
    category: "weather",
    severity: "critical",
    createdAt: new Date(),
    read: false
  });
  // Fire emergency alert
  await setDoc(doc(db, 'alerts', 'mock_alert_502'), {
    title: "🔥 Commercial Warehouse Fire Outbreak",
    message: "Major fire reported. Emergency response units have successfully cordoned off the 100m perimeter.",
    category: "fire",
    severity: "high",
    createdAt: new Date(),
    read: false
  });
  // Traffic roadblock alert
  await setDoc(doc(db, 'alerts', 'mock_alert_503'), {
    title: "🚧 Major Road Blockage near Saddar",
    message: "Construction blockages combined with minor collisions have stalled transit. Use safe detours.",
    category: "traffic",
    severity: "medium",
    createdAt: new Date(),
    read: false
  });
  console.log("Seeded live alerts successfully!");

  console.log("\n🚀 SEEDING COMPLETED SUCCESSFULLY! The Mobile Frontend Live Feed, Smart Map, and Alerts count will now render these active documents in real-time.");
  process.exit(0);
}

run().catch(console.error);
