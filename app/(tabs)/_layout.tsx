import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.cardBg,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 12,
          height: 72,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💩" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📊" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⚙️" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 28 : 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
    </View>
  );
}
