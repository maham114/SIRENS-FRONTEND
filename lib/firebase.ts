import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    const { getReactNativePersistence } = require('@firebase/auth');
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const getUploadUrlFn = () => httpsCallable(functions, 'getUploadUrl');
export const createReportFn = () => httpsCallable(functions, 'createCommunityReport');
export const initProfileFn = () => httpsCallable(functions, 'initializeUserProfile');
export const updateOnboardingFn = () => httpsCallable(functions, 'updateOnboardingData');
export const getPersonalizedFeedFn = () => httpsCallable(functions, 'getPersonalizedFeed');
export const setAlertPrefsFn = () => httpsCallable(functions, 'setAlertPreferences');
export const submitPollVoteFn = () => httpsCallable(functions, 'submitPollVote');

export default app;
