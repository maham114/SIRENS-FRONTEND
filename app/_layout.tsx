import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { router, Slot, useGlobalSearchParams, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

function LoadingScreen({ message }: { message?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B132B', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#3A86FF" />
      {message ? (
        <Text style={{ color: '#8A9BAE', marginTop: 12 }}>{message}</Text>
      ) : null}
    </View>
  );
}

function RouteGuard() {
  const { user, profile, authLoading, profileLoading, error } = useAuth();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ mode?: string; target?: string }>();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    const root = segments[0];
    const inAuthRoute = root === 'login' || root === 'register';
    const inOnboardingRoute = root === 'onboarding' || root === 'map-picker';
    const inAppRoute = root === '(tabs)' || root === 'report';
    const atIndex = !root;
    const editingOnboarding = params.mode === 'edit';
    const isReportLocationPicker = params.target === 'report';

    if (!user) {
      if (!inAuthRoute) router.replace('/login');
      return;
    }

    const needsOnboarding = !profile?.onboardingComplete;

    if (needsOnboarding) {
      if (!inOnboardingRoute) router.replace('/onboarding');
      return;
    }

    if (inOnboardingRoute && (editingOnboarding || isReportLocationPicker)) {
      return;
    }

    // Allow users who are already inside a proper app/tab route — guard must not
    // re-evaluate and push them back home during a tab transition (e.g. after
    // returning from map-picker on the Report flow) where the query params have
    // already been cleared by the navigation.
    if (inAppRoute) return;

    if (inAuthRoute || inOnboardingRoute || atIndex) {
      router.replace('/(tabs)/home');
      return;
    }

    if (!inAppRoute) {
      router.replace('/(tabs)/home');
    }
  }, [authLoading, params.mode, params.target, profile, profileLoading, segments, user]);

  if (authLoading) {
    return <LoadingScreen message="Restoring session..." />;
  }

  if (user && profileLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (user && error) {
    return <LoadingScreen message={error} />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  );
}
