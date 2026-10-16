import { Tabs } from 'expo-router';
import { tabIcon } from '../../components/tab-icon';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function CompanyLayout() {
  const { role } = useAuth();
  const canSeeTeam = role === 'company_admin' || role === 'manager';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant', tabBarIcon: tabIcon('sparkles-outline') }} />
      <Tabs.Screen
        name="setup"
        options={{ title: 'Setup', href: role === 'company_admin' ? undefined : null, tabBarIcon: tabIcon('construct-outline') }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: 'Team', href: canSeeTeam ? undefined : null, tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('person-circle-outline') }} />
    </Tabs>
  );
}
