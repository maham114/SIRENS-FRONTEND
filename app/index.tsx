import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function Index() {


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
