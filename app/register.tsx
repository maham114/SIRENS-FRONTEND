import { router } from 'expo-router';
<<<<<<< HEAD
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../constants/firebase/config';
=======
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, initProfileFn } from '../firebaseConfig';
>>>>>>> 7a80fb7 (frontend almost done)

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
<<<<<<< HEAD
        console.log("REGISTER CLICKED");
=======
>>>>>>> 7a80fb7 (frontend almost done)
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

<<<<<<< HEAD
        try {
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            Alert.alert('Success', 'Registration Successful');

            router.push('/login');

        } catch (error: any) {
            Alert.alert('Registration Failed', error.message);
=======
        setLoading(true);
        try {
            // 1. Create Firebase Auth user
            const { user } = await createUserWithEmailAndPassword(auth, email, password);

            // 2. Set display name
            await updateProfile(user, { displayName: name });

            // 3. Initialize Firestore profile via Cloud Function
            const initProfile = initProfileFn();
            await initProfile();

            // 4. Navigate to onboarding
            router.replace('/onboarding');
        } catch (error: any) {
            const msg =
                error.code === 'auth/email-already-in-use'
                    ? 'This email is already registered.'
                    : error.code === 'auth/invalid-email'
                    ? 'Please enter a valid email address.'
                    : error.message || 'Registration failed. Please try again.';
            Alert.alert('Registration Failed', msg);
        } finally {
            setLoading(false);
>>>>>>> 7a80fb7 (frontend almost done)
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoRing}>
                        <Text style={styles.logoIcon}>🚨</Text>
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join SIRENS Emergency System</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>FULL NAME</Text>
                        <TextInput
                            placeholder="Enter your full name"
                            placeholderTextColor="#4A5568"
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>EMAIL</Text>
                        <TextInput
                            placeholder="Enter your email"
                            placeholderTextColor="#4A5568"
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            placeholder="Min. 6 characters"
                            placeholderTextColor="#4A5568"
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account →</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkBtn}>
                        <Text style={styles.linkText}>
                            Already have an account?{' '}
                            <Text style={styles.linkAccent}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 28,
        backgroundColor: '#0B132B',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: '#3A86FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        backgroundColor: 'rgba(58,134,255,0.1)',
    },
    logoIcon: {
        fontSize: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#8892A4',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    form: {
        gap: 4,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3A86FF',
        letterSpacing: 2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#141D35',
        color: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#1E2D50',
    },
    button: {
        backgroundColor: '#3A86FF',
        padding: 17,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#3A86FF',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    linkBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#8892A4',
        fontSize: 14,
    },
    linkAccent: {
        color: '#3A86FF',
        fontWeight: '700',
    },
});