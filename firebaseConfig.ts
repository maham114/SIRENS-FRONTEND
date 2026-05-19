import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  // 🔧 Replace with your actual Firebase project config
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// ─── Callable Functions ───────────────────────────────────────────────────────
export const getUploadUrlFn        = () => httpsCallable(functions, 'getUploadUrl');
export const createReportFn        = () => httpsCallable(functions, 'createCommunityReport');
export const initProfileFn         = () => httpsCallable(functions, 'initializeUserProfile');
export const updateOnboardingFn    = () => httpsCallable(functions, 'updateOnboardingData');
export const getPersonalizedFeedFn = () => httpsCallable(functions, 'getPersonalizedFeed');
export const setAlertPrefsFn       = () => httpsCallable(functions, 'setAlertPreferences');
export const submitPollVoteFn      = () => httpsCallable(functions, 'submitPollVote');
export const triggerSOSFn          = () => httpsCallable(functions, 'triggerSOS');

// ─── Newly Discovered Backend Functions ────────────────────────────────────────
export const sendOfficialAlertFn        = () => httpsCallable(functions, 'sendOfficialAlert');
export const submitSOSFn                = () => httpsCallable(functions, 'submitSOS');
export const getSOSListFn               = () => httpsCallable(functions, 'getSOSList');
export const submitReportFn             = () => httpsCallable(functions, 'submitReport');
export const triggerImpactEvaluationFn  = () => httpsCallable(functions, 'triggerImpactEvaluation');
export const resolveReportFn            = () => httpsCallable(functions, 'resolveReport');