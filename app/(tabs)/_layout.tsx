import { View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useColors } from '@/lib/useColors';
import { useAuth } from '@/lib/auth-context';
import { getT } from '@/lib/i18n';

export default function TabsLayout() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const t = getT(userProfile?.language ?? 'fr');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.cardBg,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 12,
          height: 72,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabHome,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💩" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t.tabHistory,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📊" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="versus"
        options={{
          title: 'Versus',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⚔️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Défis',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🎮" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabProfile,
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
