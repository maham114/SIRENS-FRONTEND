require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const admin = require('firebase-admin');
const sa = require('./serviceaccount.json');
if (typeof sa === 'function') sa = sa();
const app = admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('crises').get();
  console.log(`Total docs: ${snap.size}\n`);
  snap.forEach((doc) => {
    const d = doc.data();
    delete d.timestamp; // clean output
    console.log(`--- ${doc.id} ---`);
    console.log(JSON.stringify(d, null, 2));
  });
  console.log('\nDone.\n');
}
main().catch(e => { console.error(e.message); process.exit(1); });
