import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '../lib/theme';
import { T } from './ui';

export const APP_NAME = 'AI SaaS';

export function AuthShell({ title, subtitle, children, back = true }: { title: string; subtitle?: string; children: ReactNode; back?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.primary }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={s.hero}>
              {back ? (
                <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} hitSlop={12} style={s.back} accessibilityLabel="Go back">
                  <Ionicons name="chevron-back" size={22} color={colors.white} />
                </Pressable>
              ) : null}
              <Text style={s.brand}>{APP_NAME}</Text>
              <Text style={s.title}>{title}</Text>
              {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={s.sheetWrap}>
              <View style={s.sheet}>{children}</View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={{ backgroundColor: colors.dangerSoft, padding: space.md, borderRadius: radius.md, marginBottom: space.md }}>
      <T variant="label" color={colors.danger}>{message}</T>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { padding: space.xl, paddingTop: space.lg, paddingBottom: space.xxl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  brand: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  title: { color: colors.white, fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 6 },
  sheetWrap: { flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, padding: space.xl },
});
