import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { registerWithEmail } from '@/services/authService';

export default function RegisterScreen() {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm]   = useState('');
    const [loading, setLoading]   = useState(false);
    const [showPass, setShowPass] = useState(false);

    const validate = (): boolean => {
        if (!email.trim()) {
            Alert.alert('Required', 'Please enter your email.'); return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Invalid', 'Please enter a valid email address.'); return false;
        }
        if (password.length < 6) {
            Alert.alert('Weak password', 'Password must be at least 6 characters.'); return false;
        }
        if (password !== confirm) {
            Alert.alert('Mismatch', 'Passwords do not match.'); return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);

        try {
            await registerWithEmail(email, password);
        } catch (error: any) {
            const message =
                error.code === 'auth/email-already-in-use'
                    ? 'An account with this email already exists.'
                    : error.code === 'auth/invalid-email'
                    ? 'Invalid email address.'
                    : error.code === 'auth/weak-password'
                    ? 'Password is too weak.'
                    : error.message;
            Alert.alert('Registration failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join SIRENS to stay informed and safe</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#4A5568"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                />

                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Min. 6 characters"
                        placeholderTextColor="#4A5568"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPass}
                        autoComplete="new-password"
                    />
                    <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPass(p => !p)}
                    >
                        <Ionicons
                            name={showPass ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color="#6C7A9C"
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Repeat password"
                    placeholderTextColor="#4A5568"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={!showPass}
                    autoComplete="new-password"
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#FFFFFF" />
                        : <Text style={styles.buttonText}>Create Account</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => router.replace('/login')}
                >
                    <Text style={styles.linkText}>
                        Already have an account? <Text style={styles.link}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:  { flex: 1, backgroundColor: '#0B132B' },
    scroll:     { flexGrow: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 60 },
    title:      { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5 },
    subtitle:   { fontSize: 15, color: '#6C7A9C', marginBottom: 40, lineHeight: 22 },
    label:      { color: '#8A9BAE', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    input:      { backgroundColor: '#0D1829', borderWidth: 1.5, borderColor: '#1A2540', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16 },
    passwordRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:     { position: 'absolute', right: 16, padding: 4 },
    button:     { backgroundColor: '#3A86FF', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 32, shadowColor: '#3A86FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
    buttonDisabled: { opacity: 0.6, shadowOpacity: 0 },
    buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    linkRow:    { marginTop: 24, alignItems: 'center' },
    linkText:   { color: '#6C7A9C', fontSize: 14 },
    link:       { color: '#3A86FF', fontWeight: '700' },
});
