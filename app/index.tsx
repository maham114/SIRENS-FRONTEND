import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function Index() {
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace('/login');
                return;
            }
            // Check onboarding status
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const onboardingComplete = userDoc.data()?.onboardingComplete ?? false;
                if (onboardingComplete) {
                    router.replace('/(tabs)/home');
                } else {
                    router.replace('/onboarding');
                }
            } catch {
                router.replace('/login');
            }
        });
        return unsub;
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.logo}>🚨</Text>
            <Text style={styles.title}>SIRENS</Text>
            <ActivityIndicator color="#3A86FF" style={{ marginTop: 24 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B132B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 8,
    },
});