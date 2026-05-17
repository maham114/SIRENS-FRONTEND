import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCCkG0Blnh2BGus-XiJQWCT1e1H8LUdNlU",
  authDomain: "sirens-451958.firebaseapp.com",
  projectId: "sirens-451958",
  storageBucket: "sirens-451958.firebasestorage.app",
  messagingSenderId: "895118049933",
  appId: "1:895118049933:web:e3d209ff15c3e4e0b218c4",
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