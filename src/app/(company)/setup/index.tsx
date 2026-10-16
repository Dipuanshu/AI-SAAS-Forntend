import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { FormError } from '../../../components/auth-shell';
import { CodeBlock, RichText } from '../../../components/rich-text';
import { Badge, Banner, Button, Card, Chip, ConfirmDialog, ErrorBox, Header, Loading, Row, Screen, SectionTitle, Sheet, T } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { API_URL, get, post, put } from '../../../lib/api';
import { copyText } from '../../../lib/copy';
import { formatDateTime } from '../../../lib/format';
import { colors, radius, space } from '../../../lib/theme';
import { toast, toastError } from '../../../lib/toast';
import type { AiOverview } from '../../../lib/types';

const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : formatDateTime(iso);
};

export default function Setup() {
  const { data, error, loading, refreshing, onRefresh, reload } = useApi(() => get<AiOverview>('/api/company/ai/overview'), []);
  const [busy, setBusy] = useState(false);
  const [linkSheet, setLinkSheet] = useState<string | null>(null);
  const [keySheet, setKeySheet] = useState<{ key: string; saasUrl: string } | null>(null);
  const [rotate, setRotate] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Keep the status fresh while this screen is open, so the connector turns green as soon as it starts.
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => void reloadRef.current(), 5000);
      return () => clearInterval(t);
    }, []),
  );

  async function download() {
    setBusy(true);
    try {
      const r = await post<{ path: string }>('/api/company/ai/connector/download-link');
      const url = API_URL + r.path;
      if (Platform.OS === 'web') await Linking.openURL(url);
      else setLinkSheet(url); // a phone is the wrong place for a .zip: hand the link to a computer
      void reload();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  async function showKey() {
    setSheetError(null);
    try {
      setKeySheet(await get<{ key: string; saasUrl: string }>('/api/company/ai/connector/key'));
    } catch (e: any) {
      toast(e.message ?? 'Create the connector first (download it once).', 'error');
    }
  }

  async function changeStack(id: string) {
    try {
      await put('/api/company/ai/stack', { stack: id });
      await reload();
    } catch (e) {
      toastError(e);
    }
  }

  const c = data?.connector;
  const done = data?.checklist.filter((x) => x.done).length ?? 0;
  const status = !c ? { tone: 'neutral' as const, text: 'Not created yet' } : c.online ? { tone: 'success' as const, text: 'Connected' } : c.lastSeenAt ? { tone: 'danger' as const, text: 'Offline' } : { tone: 'warning' as const, text: 'Waiting for the connector to start…' };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header title="AI assistant setup" subtitle="Connect your software so your team can ask questions" />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}

      {data ? (
        <>
          {!data.llm.configured ? (
            <Banner tone="warning" icon="information-circle" title="The AI model is not configured on the server yet" text="The platform owner must set ANTHROPIC_API_KEY in the backend .env. You can still prepare everything below." />
          ) : null}

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T variant="h3">Progress</T>
              <Badge label={`${done} / ${data.checklist.length}`} tone={done === data.checklist.length ? 'success' : 'primary'} />
            </View>
            {data.checklist.map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                <Ionicons name={i.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={i.done ? colors.success : colors.muted} />
                <T style={{ flex: 1 }} color={i.done ? colors.muted : colors.text}>{i.title}</T>
              </View>
            ))}
          </Card>

          <SectionTitle>Connector</SectionTitle>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: { success: colors.success, danger: colors.danger, warning: '#F59E0B', neutral: colors.muted }[status.tone] }} />
              <T variant="h3">{status.text}</T>
            </View>
            {c ? (
              <>
                <Row label="Last seen" value={ago(c.lastSeenAt)} />
                <Row label="Login mode" value={c.authMode === 'login' ? 'Each user logs in (recommended)' : c.authMode === 'static' ? 'One service key' : 'No login'} />
                <Row label="API description" value={c.specSource} />
                <Row label="Last route sync" value={c.lastSyncAt ? formatDateTime(c.lastSyncAt) : '—'} />
                <Row label="Version / host" value={[c.version, c.hostname].filter(Boolean).join(' · ') || '—'} />
              </>
            ) : (
              <T variant="small">One small program that you run next to your backend. It works with every language.</T>
            )}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: space.md }}>
              <Button title={c ? 'Download again' : 'Download connector'} icon="download-outline" onPress={download} loading={busy} />
              {c ? <Button title="Key" icon="key-outline" variant="secondary" onPress={showKey} /> : null}
            </View>
          </Card>

          <SectionTitle>Your backend language</SectionTitle>
          <Card>
            <T variant="small" style={{ marginBottom: space.sm }}>The connector is the same for everyone. This only tailors the instructions below.</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {data.stacks.map((s) => (
                <Chip key={s.id} label={s.label} selected={data.stack === s.id} onPress={() => changeStack(s.id)} />
              ))}
            </View>
          </Card>

          <SectionTitle>Manage</SectionTitle>
          <Card onPress={() => router.push('/setup/tools')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="git-network-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T variant="h3">API tools</T>
              <T variant="small">{data.tools.total} routes found · {data.tools.enabled} enabled{data.tools.needsReview ? ` · ${data.tools.needsReview} need review` : ''}</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
          <Card onPress={() => router.push('/setup/knowledge')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T variant="h3">Help documents</T>
              <T variant="small">{data.knowledgeDocs} document{data.knowledgeDocs === 1 ? '' : 's'} · answers “how do I…” questions</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
          <Card onPress={() => router.push('/setup/settings')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="options-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T variant="h3">AI settings</T>
              <T variant="small">About your software · deleting · hidden fields</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
          <Card onPress={() => router.push('/setup/logs')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Ionicons name="list-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T variant="h3">Activity log</T>
              <T variant="small">Every call the assistant made, who asked and the result</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>

          <SectionTitle>Step-by-step guide · {data.stackLabel}</SectionTitle>
          {data.guide.map((s) => (
            <Card key={s.id}>
              <T variant="h3" style={{ marginBottom: 6 }}>{s.title}</T>
              <RichText text={s.text} />
              {s.code ? <CodeBlock code={s.code} /> : null}
              {s.id === 'download' ? <Button title={c ? 'Download connector again' : 'Download connector (.zip)'} icon="download-outline" onPress={download} loading={busy} style={{ marginTop: space.md }} /> : null}
            </Card>
          ))}
        </>
      ) : null}

      <Sheet visible={!!linkSheet} onClose={() => setLinkSheet(null)} title="Download on your computer">
        <T style={{ marginBottom: space.sm }}>The connector is installed on the computer or server where your software runs. Open this link there (valid for 15 minutes):</T>
        <View style={{ backgroundColor: '#F1F5F9', padding: space.md, borderRadius: radius.md, marginBottom: space.md }}>
          <T selectable variant="small" color={colors.text}>{linkSheet}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button title="Share link" icon="share-outline" onPress={() => linkSheet && copyText(linkSheet, 'Link copied')} />
          <Button title="Open here" variant="secondary" onPress={() => linkSheet && Linking.openURL(linkSheet)} />
        </View>
      </Sheet>

      <Sheet visible={!!keySheet} onClose={() => setKeySheet(null)} title="Connector key"
        footer={<Button title="Rotate key" variant="danger" icon="refresh" onPress={() => setRotate(true)} />}>
        <FormError message={sheetError} />
        <T variant="small" style={{ marginBottom: space.sm }}>Already inside the downloaded .env file. Keep it secret: anyone with it can act as your connector.</T>
        <T variant="label" style={{ marginBottom: 4 }}>.env</T>
        <CodeBlock code={`AISAAS_URL=${keySheet?.saasUrl ?? ''}\nAISAAS_CONNECTOR_KEY=${keySheet?.key ?? ''}`} />
        <Button title="Copy" icon="copy-outline" variant="secondary" small style={{ marginTop: space.md, alignSelf: 'flex-start' }}
          onPress={() => keySheet && copyText(`AISAAS_URL=${keySheet.saasUrl}\nAISAAS_CONNECTOR_KEY=${keySheet.key}`, 'Copied')} />
      </Sheet>

      <ConfirmDialog
        visible={rotate}
        danger
        title="Rotate the key?"
        message="The running connector will stop working until you put the new key in its .env file (or download the package again)."
        confirmLabel="Rotate"
        onCancel={() => setRotate(false)}
        onConfirm={async () => {
          try {
            const r = await post<{ key: string }>('/api/company/ai/connector/rotate-key');
            setKeySheet((k) => (k ? { ...k, key: r.key } : k));
            toast('Key rotated');
          } catch (e) {
            toastError(e);
          } finally {
            setRotate(false);
          }
        }}
      />
    </Screen>
  );
}
