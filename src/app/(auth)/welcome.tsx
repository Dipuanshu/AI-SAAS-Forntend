import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_NAME } from '../../components/auth-shell';
import { Banner, Button, T } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors, radius, space } from '../../lib/theme';

const POINTS = [
  { icon: 'business-outline', text: 'Register your company in a minute – 14 days free' },
  { icon: 'people-outline', text: 'Employees and managers log in with role-based access' },
  { icon: 'sparkles-outline', text: 'AI assistant that works with your own business data' },
] as const;

export default function Welcome() {
  const { notice, clearNotice } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.wrap}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={s.logo}>
              <Ionicons name="sparkles" size={30} color={colors.primary} />
            </View>
            <Text style={s.name}>{APP_NAME}</Text>
            <Text style={s.tag}>Your company’s AI assistant, with the right access for every role.</Text>
            <View style={{ marginTop: space.xl, gap: space.md }}>
              {POINTS.map((p) => (
                <View key={p.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Ionicons name={p.icon} size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={{ color: 'rgba(255,255,255,0.9)', flex: 1, fontSize: 15 }}>{p.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.panel}>
            {notice ? (
              <View style={{ marginBottom: space.md }}>
                <Banner tone="warning" icon="information-circle" title={notice} />
                <Pressable onPress={clearNotice}><T variant="small" color={colors.primary}>Dismiss</T></Pressable>
              </View>
            ) : null}
            <Button title="Log in to your company" icon="log-in-outline" onPress={() => router.push('/login')} />
            <Button title="Register your company" variant="secondary" icon="add-circle-outline" onPress={() => router.push('/register')} style={{ marginTop: space.md }} />
            <Pressable onPress={() => router.push('/admin-login')} style={{ marginTop: space.lg, alignSelf: 'center' }} hitSlop={10}>
              <T variant="small" color={colors.muted}>Platform owner? <T variant="small" color={colors.primary} style={{ fontWeight: '700' }}>Super Admin login</T></T>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: space.xl },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  name: { color: colors.white, fontSize: 38, fontWeight: '800' },
  tag: { color: 'rgba(255,255,255,0.85)', fontSize: 17, marginTop: space.sm, lineHeight: 24 },
  panel: { backgroundColor: colors.white, borderRadius: radius.lg + 6, padding: space.xl },
});
