import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeBlock, RichText } from '../../components/rich-text';
import { Badge, Banner, Button, Card, Input, Sheet, T } from '../../components/ui';
import { del, get, post } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { colors, MAX_WIDTH, radius, space } from '../../lib/theme';
import { toast, toastError } from '../../lib/toast';
import type { ChatItem, ChatStatus, ChatView, PendingAction } from '../../lib/types';

const SUGGESTIONS = ['What can you help me with?', 'Show me the latest data', 'How do I get started?'];

export default function Assistant() {
  const { role, company } = useAuth();
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [view, setView] = useState<ChatView | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState<PendingAction[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [history, setHistory] = useState<{ id: string; title: string; updatedAt: string }[] | null>(null);
  const [booted, setBooted] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const apply = useCallback((v: ChatView) => {
    setView(v);
    setConvId(v.conversation.id);
    setItems(v.items);
    setPending(v.pending);
    setNeedsConnect(v.needsConnect);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const s = await get<ChatStatus>('/api/chat/status');
      setStatus(s);
      setNeedsConnect((n) => n || s.needsConnect);
      return s;
    } catch {
      return null;
    }
  }, []);

  // On every visit: refresh status; the first time also reopen the latest chat.
  useFocusEffect(
    useCallback(() => {
      void loadStatus();
      if (booted) return;
      (async () => {
        try {
          const list = await get<{ items: { id: string }[] }>('/api/chat/conversations');
          if (list.items[0]) apply(await get<ChatView>(`/api/chat/conversations/${list.items[0].id}`));
        } catch {
          /* start empty */
        } finally {
          setBooted(true);
        }
      })();
    }, [booted, apply, loadStatus]),
  );

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [items.length, pending.length, sending]);

  async function send(message: string) {
    const m = message.trim();
    if (!m || sending) return;
    setText('');
    setSending(true);
    setItems((cur) => [...cur, { id: `tmp-${Date.now()}`, role: 'user', text: m, steps: [], createdAt: new Date().toISOString() }]);
    try {
      apply(await post<ChatView>('/api/chat/message', { conversationId: convId, message: m }));
    } catch (e: any) {
      setItems((cur) => cur.filter((i) => !i.id.startsWith('tmp-')));
      setText(m);
      if (e.code === 'ACTION_PENDING' && convId) apply(await get<ChatView>(`/api/chat/conversations/${convId}`).catch(() => view!));
      toastError(e);
    } finally {
      setSending(false);
      void loadStatus();
    }
  }

  async function resolve(a: PendingAction, ok: boolean) {
    setSending(true);
    try {
      apply(await post<ChatView>(`/api/chat/actions/${a.id}/${ok ? 'confirm' : 'cancel'}`));
    } catch (e: any) {
      toastError(e);
      if (convId) apply(await get<ChatView>(`/api/chat/conversations/${convId}`).catch(() => view!));
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setView(null);
    setConvId(null);
    setItems([]);
    setPending([]);
    setText('');
  }

  async function openHistory() {
    try {
      setHistory((await get<{ items: { id: string; title: string; updatedAt: string }[] }>('/api/chat/conversations')).items);
    } catch (e) {
      toastError(e);
    }
  }

  const isAdmin = role === 'company_admin';
  const empty = items.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.wrap}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <T variant="title" style={{ fontSize: 22 }}>Assistant</T>
              <T variant="small" numberOfLines={1}>{company?.name}</T>
            </View>
            <Pressable onPress={openHistory} hitSlop={8} style={s.iconBtn} accessibilityLabel="Chat history"><Ionicons name="time-outline" size={20} color={colors.text} /></Pressable>
            <Pressable onPress={newChat} hitSlop={8} style={s.iconBtn} accessibilityLabel="New chat"><Ionicons name="create-outline" size={20} color={colors.text} /></Pressable>
          </View>

          <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, paddingBottom: space.md, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {status && !status.llmConfigured ? (
              <Banner tone="warning" icon="information-circle" title="The AI model is not set up yet" text="Ask the platform owner to add the AI key on the server." />
            ) : null}
            {status && status.llmConfigured && !status.ready ? (
              <Card>
                <T variant="h3">The assistant is not ready yet</T>
                <T variant="small" style={{ marginTop: 4 }}>
                  {isAdmin ? 'Connect your software and enable some tools, or add help documents.' : 'Your company admin still has to connect the software or add help documents.'}
                </T>
                {isAdmin ? <Button title="Open setup" small style={{ marginTop: space.md, alignSelf: 'flex-start' }} onPress={() => router.push('/setup')} /> : null}
              </Card>
            ) : null}
            {status?.connector && !status.connector.online && status.toolCount > 0 ? (
              <Banner tone="warning" icon="cloud-offline" title="Live data is unavailable" text="The company connector is offline. Help documents still work." />
            ) : null}

            {empty && !sending ? (
              <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
                <View style={s.logo}><Ionicons name="sparkles" size={26} color={colors.primary} /></View>
                <T variant="h2" style={{ marginTop: space.md, textAlign: 'center' }}>How can I help?</T>
                <T variant="small" style={{ textAlign: 'center', marginTop: 4, maxWidth: 320 }}>
                  Ask about your company’s software. I use what your role allows{status ? ` (${status.toolCount} tool${status.toolCount === 1 ? '' : 's'}, ${status.helpDocs} help doc${status.helpDocs === 1 ? '' : 's'})` : ''}.
                </T>
                <View style={{ gap: 8, marginTop: space.lg, alignItems: 'center' }}>
                  {SUGGESTIONS.map((q) => (
                    <Pressable key={q} onPress={() => send(q)} style={s.suggest}><T variant="label" color={colors.primary}>{q}</T></Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {items.map((m) => (
              <Bubble key={m.id} item={m} waiting={new Set(pending.map((p) => p.tool))} />
            ))}

            {pending.map((a) => (
              <ConfirmCard key={a.id} action={a} busy={sending} onConfirm={() => resolve(a, true)} onCancel={() => resolve(a, false)} />
            ))}

            {sending && pending.length === 0 ? (
              <View style={[s.bubble, s.assistant, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <T variant="small">Thinking…</T>
              </View>
            ) : null}

            {needsConnect ? (
              <ConnectCard
                onConnected={() => {
                  setNeedsConnect(false);
                  void loadStatus();
                  toast('Account connected');
                  // Retry what the user last asked, so they do not have to type it again.
                  const last = [...items].reverse().find((i) => i.role === 'user');
                  if (last) void send(last.text);
                }}
              />
            ) : null}
          </ScrollView>

          <View style={s.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={pending.length ? 'Confirm or cancel the action above first' : 'Ask about your software…'}
              placeholderTextColor="#94A3B8"
              multiline
              editable={!sending && pending.length === 0}
              maxLength={2000}
              onSubmitEditing={() => Platform.OS === 'web' && send(text)}
              style={[s.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
              onKeyPress={(e: any) => {
                if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                  e.preventDefault?.();
                  void send(text);
                }
              }}
            />
            <Pressable onPress={() => send(text)} disabled={!text.trim() || sending || pending.length > 0} style={[s.send, (!text.trim() || sending || pending.length > 0) && { opacity: 0.4 }]} accessibilityLabel="Send">
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={!!history} onClose={() => setHistory(null)} title="Chat history">
        {history?.length === 0 ? <T variant="small">No chats yet.</T> : null}
        {history?.map((h) => (
          <Card key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}
            onPress={async () => {
              try {
                apply(await get<ChatView>(`/api/chat/conversations/${h.id}`));
                setHistory(null);
              } catch (e) {
                toastError(e);
              }
            }}>
            <View style={{ flex: 1 }}>
              <T variant="h3" numberOfLines={1}>{h.title}</T>
              <T variant="small">{formatDateTime(h.updatedAt)}</T>
            </View>
            <Pressable hitSlop={10} accessibilityLabel="Delete chat" onPress={async () => {
              try {
                await del(`/api/chat/conversations/${h.id}`);
                setHistory((cur) => cur?.filter((x) => x.id !== h.id) ?? null);
                if (h.id === convId) newChat();
              } catch (e) {
                toastError(e);
              }
            }}>
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
            </Pressable>
          </Card>
        ))}
      </Sheet>
    </SafeAreaView>
  );
}

function Bubble({ item, waiting }: { item: ChatItem; waiting: Set<string> }) {
  const mine = item.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: space.md }}>
      {item.steps.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6, maxWidth: '90%' }}>
          {item.steps.map((st, i) => (
            <Badge key={i} label={`${waiting.has(st.tool) ? '…' : st.ok ? '✓' : '!'} ${st.label}`} tone={waiting.has(st.tool) ? 'neutral' : st.ok ? 'info' : 'warning'} />
          ))}
        </View>
      ) : null}
      {item.text ? (
        <View style={[s.bubble, mine ? s.mine : s.assistant]}>
          {mine ? <T color={colors.white} selectable>{item.text}</T> : <RichText text={item.text} />}
        </View>
      ) : null}
    </View>
  );
}

function ConfirmCard({ action, busy, onConfirm, onCancel }: { action: PendingAction; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const hasArgs = action.args && Object.keys(action.args).length > 0;
  const danger = action.method === 'DELETE';
  return (
    <Card style={{ borderColor: danger ? '#FECACA' : '#FDE68A', backgroundColor: danger ? '#FEF2F2' : '#FFFBEB', borderWidth: 1.5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={danger ? 'warning' : 'help-circle'} size={22} color={danger ? colors.danger : '#B45309'} />
        <T variant="h3" style={{ flex: 1 }}>{danger ? 'Confirm delete' : 'Confirm change'}: {action.label}</T>
      </View>
      <T variant="small" style={{ marginTop: 6 }}>{action.summary}</T>
      <T variant="small" style={{ marginTop: 2 }}>{action.method} {action.path}</T>
      {hasArgs ? <CodeBlock code={JSON.stringify(action.args, null, 2)} /> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md }}>
        <Button title={danger ? 'Yes, delete' : 'Confirm'} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={busy} style={{ flex: 1 }} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={busy} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

function ConnectCard({ onConnected }: { onConnected: () => void }) {
  const { company } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (!username.trim() || !password) return setError('Enter your username and password');
    setBusy(true);
    setError(null);
    try {
      await post('/api/chat/connect', { username: username.trim(), password });
      setPassword('');
      onConnected();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <T variant="h3">Connect your {company?.name} login</T>
      <T variant="small" style={{ marginTop: 4, marginBottom: space.md }}>
        Sign in once with the username and password you use in your company’s software. The assistant then works with your own permissions. Your password is not stored.
      </T>
      {error ? <T variant="small" color={colors.danger} style={{ marginBottom: space.sm }}>{error}</T> : null}
      <Input label="Username / email" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <Input label="Password" value={password} onChangeText={setPassword} secure onSubmitEditing={connect} />
      <Button title="Connect" onPress={connect} loading={busy} />
    </Card>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  suggest: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  bubble: { maxWidth: '92%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  assistant: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6, alignSelf: 'flex-start', marginBottom: space.md },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, maxHeight: 120, minHeight: 44, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, color: colors.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
