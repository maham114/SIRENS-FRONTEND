/**
 * fetchCrises.js
 * Reads ALL AI crisis documents from the Firestore `crises` collection
 * using the Firebase Admin SDK with a service account key.
 *
 * Usage:  node fetchCrises.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const admin = require('firebase-admin');

async function main() {
  let serviceAccount;
  try {
    serviceAccount = require('./serviceaccount.json');
    if (typeof serviceAccount === 'function') serviceAccount = serviceAccount();
  } catch {
    console.error('❌ serviceaccount.json not found in project root.');
    process.exit(1);
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  console.log('Project ID :', app.options.projectId);
  console.log('Reading all documents from `crises` collection...\n');

  const snap = await db.collection('crises').get();

  if (snap.empty) {
    console.log('⚠ The `crises` collection is empty.');
    return;
  }

  console.log(`Found ${snap.size} document(s) in "crises":\n`);

  snap.forEach((doc) => {
    const d = doc.data();
    const insight = {
      id               : doc.id,
      crisisType       : d.crisisType        || 'unknown',
      severity         : d.severity          || 'unknown',
      credibilityScore : d.credibilityScore ?? null,
      explanation      : d.explanation       || '',
      status           : d.status            || 'unknown',
      timestamp        : d.timestamp         || null,
    };
    console.log(JSON.stringify(insight, null, 2));
    console.log('---');
  });

  console.log('\nDone.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
