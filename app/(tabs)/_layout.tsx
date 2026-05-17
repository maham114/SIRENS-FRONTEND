import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
    return (
        <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
            <Text style={styles.iconEmoji}>{icon}</Text>
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#3A86FF',
                tabBarInactiveTintColor: '#4A5568',
                tabBarLabelStyle: styles.tabLabel,
                tabBarShowLabel: true,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Feed',
                    tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    title: 'Report',
                    tabBarIcon: ({ focused }) => <TabIcon icon="📸" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="alerts"
                options={{
                    title: 'Alerts',
                    tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#0D1526',
        borderTopColor: '#1E2D50',
        borderTopWidth: 1,
        height: 80,
        paddingBottom: 16,
        paddingTop: 10,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    iconWrapper: {
        width: 36,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    iconWrapperActive: {
        backgroundColor: 'rgba(58, 134, 255, 0.15)',
    },
    iconEmoji: {
        fontSize: 20,
    },
});