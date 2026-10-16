import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, MAX_WIDTH, radius, space } from '../lib/theme';
import { initials } from '../lib/format';
import { setToastListener, ToastTone } from '../lib/toast';

type IconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------------------------------------- text
type Variant = 'title' | 'h2' | 'h3' | 'body' | 'small' | 'label';
const textStyles: Record<Variant, TextStyle> = {
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
};

export function T({ variant = 'body', color, style, children, ...rest }: {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  return (
    <Text {...rest} style={[textStyles[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------- layout
export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  footer,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  padded?: boolean;
}) {
  const inner = <View style={[styles.container, padded && { padding: space.lg }]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space.xxl, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <T variant="title" numberOfLines={2}>{title}</T>
        {subtitle ? <T variant="small" style={{ marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ label, value, children }: { label: string; value?: string | null; children?: ReactNode }) {
  return (
    <View style={styles.kv}>
      <T variant="small" style={{ flexShrink: 0, marginRight: space.md }}>{label}</T>
      {children ?? <T variant="body" style={{ flex: 1, textAlign: 'right' }} selectable>{value || '—'}</T>}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <T variant="h3">{children}</T>
      {right}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------- inputs
export function Button({
  title, onPress, variant = 'primary', loading, disabled, icon, small, style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    secondary: { bg: colors.white, fg: colors.text, border: colors.border },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: palette.fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, error, hint, secure, style, ...rest }: TextInputProps & { label?: string; error?: string | null; hint?: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? <T variant="label" style={{ marginBottom: 6 }}>{label}</T> : null}
      <View style={[styles.inputWrap, focused && { borderColor: colors.primary }, !!error && { borderColor: colors.danger }]}>
        <TextInput
          {...rest}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor="#94A3B8"
          style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null, style]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <T variant="small" color={colors.danger} style={{ marginTop: 4 }}>{error}</T> : hint ? <T variant="small" style={{ marginTop: 4 }}>{hint}</T> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
      accessibilityState={{ selected: !!selected }}
    >
      <Text style={{ color: selected ? colors.white : tone ?? colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {children}
    </ScrollView>
  );
}

export function SwitchRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={[styles.kv, { alignItems: 'center', marginBottom: space.md }]}>
      <View style={{ flex: 1, marginRight: space.md }}>
        <T variant="label">{label}</T>
        {hint ? <T variant="small">{hint}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
}

// ---------------------------------------------------------------------------------------------- display
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  neutral: { bg: '#F1F5F9', fg: colors.muted },
  primary: { bg: colors.primarySoft, fg: colors.primary },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={{ color: tones[tone].fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

export function StatCard({ label, value, icon, tone = 'primary', onPress }: { label: string; value: string | number; icon: IconName; tone?: Tone; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tones[tone].bg }]}>
        <Ionicons name={icon} size={18} color={tones[tone].fg} />
      </View>
      <T variant="title" style={{ fontSize: 24, marginTop: space.sm }}>{value}</T>
      <T variant="small">{label}</T>
    </Card>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={{ padding: space.xxl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} />
      {text ? <T variant="small" style={{ marginTop: space.sm }}>{text}</T> : null}
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: space.xl }}>
      <Ionicons name={icon} size={40} color="#94A3B8" />
      <T variant="h3" style={{ marginTop: space.sm, textAlign: 'center' }}>{title}</T>
      {text ? <T variant="small" style={{ textAlign: 'center', marginTop: 4 }}>{text}</T> : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ backgroundColor: colors.dangerSoft, borderColor: '#FECACA' }}>
      <T variant="label" color={colors.danger}>{message}</T>
      {onRetry ? <Button title="Try again" variant="secondary" small onPress={onRetry} style={{ marginTop: space.md, alignSelf: 'flex-start' }} /> : null}
    </Card>
  );
}

export function Banner({ tone, icon, title, text, action }: { tone: Tone; icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={[styles.banner, { backgroundColor: tones[tone].bg }]}>
      <Ionicons name={icon} size={22} color={tones[tone].fg} style={{ marginRight: space.md }} />
      <View style={{ flex: 1 }}>
        <T variant="label" color={tones[tone].fg}>{title}</T>
        {text ? <T variant="small" color={tones[tone].fg}>{text}</T> : null}
        {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------------------------- overlays
export function Sheet({
  visible, onClose, title, children, footer,
}: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <T variant="h2" style={{ flex: 1 }}>{title}</T>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ padding: space.lg }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFoot}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({
  visible, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel, children, confirmDisabled,
}: {
  visible: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean;
  onConfirm: () => void; onCancel: () => void; children?: ReactNode; confirmDisabled?: boolean;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
          <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} loading={loading} disabled={confirmDisabled} onPress={onConfirm} style={{ flex: 1 }} />
        </View>
      }
    >
      <T variant="body" color={colors.muted} style={{ marginBottom: children ? space.md : 0 }}>{message}</T>
      {children}
    </Sheet>
  );
}

const toastColors: Record<ToastTone, string> = { success: '#166534', error: '#991B1B', info: '#1E3A8A' };

export function ToastHost() {
  const [item, setItem] = useState<{ message: string; tone: ToastTone; key: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    setToastListener((message, tone) => {
      setItem({ message, tone, key: Date.now() });
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      clearTimeout(timer);
      timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setItem(null));
      }, 3200);
    });
    return () => {
      clearTimeout(timer);
      setToastListener(null);
    };
  }, [opacity]);
  if (!item) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity, backgroundColor: toastColors[item.tone] }]}>
      <Text style={{ color: colors.white, fontWeight: '600' }}>{item.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg, gap: space.sm },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.border, marginBottom: space.md },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, marginBottom: space.sm },
  btn: { minHeight: 46, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.sm },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md },
  input: { flex: 1, minHeight: 46, fontSize: 15, color: colors.text, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  stat: { flexBasis: 150, flexGrow: 1, flexShrink: 1, marginBottom: 0 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', padding: space.lg, borderRadius: radius.lg, marginBottom: space.md, alignItems: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg + 4, borderTopRightRadius: radius.lg + 4,
    borderBottomLeftRadius: Platform.OS === 'web' ? radius.lg + 4 : 0, borderBottomRightRadius: Platform.OS === 'web' ? radius.lg + 4 : 0,
    overflow: 'hidden',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetFoot: { padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border },
  toast: { position: 'absolute', left: 16, right: 16, top: Platform.OS === 'web' ? 16 : 56, alignSelf: 'center', maxWidth: 520, padding: space.md, borderRadius: radius.md, zIndex: 100 },
});
