require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const admin = require('firebase-admin');
const sa = require('./serviceaccount.json');
if (typeof sa === 'function') sa = sa();

const app = admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  // 1. Show all crises — raw status/timestamp for every doc
  console.log('=== ALL CRISIS DOCS ===');
  const all = await db.collection('crises').get();
  console.log(`Total: ${all.size}\n`);
  all.forEach(d => {
    const data = d.data();
    console.log({
      id: d.id,
      status: data.status,
      credibilityScore: data.credibilityScore,
      severity: data.severity,
      type: data.crisisType,
      hasTimestamp: !!data.timestamp,
      explanation: data.explanation ? `"${(data.explanation||'').slice(0,60)}"` : '(empty)',
    });
  });

  // 2. Replicate exactly what the app AI insights query does
  console.log('\n=== APP QUERY (status IN [active, executing]) ===');
  const appQ = db.collection('crises')
    .where('status', 'in', ['active', 'executing'])
    .orderBy('timestamp', 'desc');
  const appSnap = await appQ.get();
  console.log(`Returned: ${appSnap.size} docs`);

  // 3. Now try the query WITHOUT orderBy
  console.log('\n=== SAME FILTER — NO ORDER BY ===');
  try {
    const noOrder = db.collection('crises').where('status', 'in', ['active', 'executing']);
    const noOrderSnap = await noOrder.get();
    console.log(`Returned: ${noOrderSnap.size} docs`);
    noOrderSnap.forEach(d => console.log('  ', d.id, '| status:', d.data().status));
  } catch(e) { console.log('Error:', e.message); }

  console.log('\nDone.\n');
}
main().catch(e => { console.error(e.message); process.exit(1); });
