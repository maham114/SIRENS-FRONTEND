import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            const { user } = await signInWithEmailAndPassword(auth, email, password);

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const onboardingComplete = userDoc.data()?.onboardingComplete ?? false;

            if (onboardingComplete) {
                router.replace('/(tabs)/home');
            } else {
                router.replace('/onboarding');
            }
        } catch (error: any) {
            const msg =
                error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password'
                    ? 'Invalid email or password.'
                    : error.code === 'auth/too-many-requests'
                    ? 'Too many attempts. Please try again later.'
                    : error.message || 'Login failed. Please try again.';
            Alert.alert('Login Failed', msg);
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
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View
                    entering={FadeInDown.duration(1000).springify()}
                    style={styles.logoContainer}
                >
                    <View style={styles.iconBackground}>
                        <Ionicons name="shield-checkmark" size={60} color="#3A86FF" />
                    </View>
                    <Text style={styles.title}>SIRENS</Text>
                    <Text style={styles.subtitle}>Emergency Response System</Text>
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.duration(1000).delay(200).springify()}
                    style={styles.formContainer}
                >
                    <View style={[styles.inputContainer, isEmailFocused && styles.inputFocused]}>
                        <Ionicons name="mail-outline" size={20} color={isEmailFocused ? '#3A86FF' : '#6C7A9C'} style={styles.inputIcon} />
                        <TextInput
                            placeholder="Email Address"
                            placeholderTextColor="#6C7A9C"
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onFocus={() => setIsEmailFocused(true)}
                            onBlur={() => setIsEmailFocused(false)}
                        />
                    </View>

                    <View style={[styles.inputContainer, isPasswordFocused && styles.inputFocused]}>
                        <Ionicons name="lock-closed-outline" size={20} color={isPasswordFocused ? '#3A86FF' : '#6C7A9C'} style={styles.inputIcon} />
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#6C7A9C"
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            onFocus={() => setIsPasswordFocused(true)}
                            onBlur={() => setIsPasswordFocused(false)}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6C7A9C" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/register')}>
                            <Text style={styles.registerLink}>Register</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B132B',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(58, 134, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(58, 134, 255, 0.3)',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 2,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#8A9BAE',
        letterSpacing: 0.5,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 60,
    },
    inputFocused: {
        borderColor: '#3A86FF',
        backgroundColor: 'rgba(58, 134, 255, 0.05)',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        height: '100%',
    },
    eyeIcon: {
        padding: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 32,
    },
    forgotPasswordText: {
        color: '#3A86FF',
        fontSize: 14,
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#3A86FF',
        borderRadius: 16,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3A86FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    registerText: {
        color: '#8A9BAE',
        fontSize: 15,
    },
    registerLink: {
        color: '#3A86FF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});