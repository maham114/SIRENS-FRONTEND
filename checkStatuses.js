require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const admin = require('firebase-admin');
const sa = require('./serviceaccount.json');
if (typeof sa === 'function') sa = sa();

const app = admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  // Check all statuses in crises
  console.log('=== CRISES (all statuses) ===');
  const crisesSnap = await db.collection('crises').get();
  const statusCounts = {};
  crisesSnap.forEach(doc => {
    const s = doc.data().status || '(none)';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  console.log(JSON.stringify(statusCounts, null, 2));

  // Check all alerts statuses
  console.log('\n=== ALERTS (status / active field) ===');
  const alertsSnap = await db.collection('alerts').get();
  alertsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`  ${doc.id}  status="${d.status}"  active=${d.active}`);
  });

  // Check all reports statuses
  console.log('\n=== REPORTS (status field) ===');
  const reportsSnap = await db.collection('reports').get();
  reportsSnap.forEach(doc => {
    const d = doc.data();
    console.log(`  ${doc.id}  status="${d.status}"`);
  });

  console.log('\nDone.\n');
}
main().catch(e => { console.error(e.message); process.exit(1); });
