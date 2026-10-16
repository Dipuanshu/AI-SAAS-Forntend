import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { FormError } from '../../../components/auth-shell';
import { Badge, Banner, Button, Card, Chip, ChipRow, ConfirmDialog, Empty, ErrorBox, Header, Input, Loading, Screen, Sheet, SwitchRow, T } from '../../../components/ui';
import { useDebounced, usePaged } from '../../../hooks/usePaged';
import { patch, post } from '../../../lib/api';
import { colors, space } from '../../../lib/theme';
import { toast, toastError } from '../../../lib/toast';
import { ApiTool, ROLE_LABELS, ToolRisk } from '../../../lib/types';

const METHOD_TONE = { GET: 'success', POST: 'info', PUT: 'warning', PATCH: 'warning', DELETE: 'danger' } as const;
const RISK_LABEL: Record<ToolRisk, string> = { read: 'Read-only', write: 'Changes data', delete: 'Deletes data' };
const ROLES = ['company_admin', 'manager', 'employee', 'viewer'] as const;
const STATUS = [['all', 'All'], ['enabled', 'Enabled'], ['disabled', 'Disabled'], ['review', 'Needs review'], ['stale', 'Outdated']] as const;

export default function Tools() {
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [status, setStatus] = useState('all');
  const [edit, setEdit] = useState<ApiTool | null>(null);
  const [bulk, setBulk] = useState<null | 'enable-read' | 'disable-all'>(null);
  const q = useDebounced(search.trim());
  const list = usePaged<ApiTool>((p) => `/api/company/ai/tools?page=${p}&limit=30&search=${encodeURIComponent(q)}&risk=${risk}&status=${status}`, [q, risk, status]);

  async function toggle(t: ApiTool, enabled: boolean) {
    try {
      await patch(`/api/company/ai/tools/${t.id}`, { enabled });
      await list.reload();
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <Screen onRefresh={list.onRefresh} refreshing={list.refreshing}>
      <Header title="API tools" subtitle={`${list.total} route${list.total === 1 ? '' : 's'}`} onBack={() => (router.canGoBack() ? router.back() : router.replace('/setup'))} />
      <Banner tone="info" icon="information-circle" title="The AI chooses tools by reading their descriptions"
        text="Make unclear descriptions clearer, pick which roles may use each tool, then switch it on. Anything that changes data asks the user to confirm first." />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.md, flexWrap: 'wrap' }}>
        <Button title="Enable all safe read-only tools" small variant="secondary" onPress={() => setBulk('enable-read')} />
        <Button title="Disable all" small variant="ghost" onPress={() => setBulk('disable-all')} />
      </View>
      <Input placeholder="Search by name, path or description" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <ChipRow>
        {STATUS.map(([k, label]) => <Chip key={k} label={label} selected={status === k} onPress={() => setStatus(k)} />)}
      </ChipRow>
      <ChipRow>
        {(['all', 'read', 'write', 'delete'] as const).map((k) => <Chip key={k} label={k === 'all' ? 'Any type' : RISK_LABEL[k]} selected={risk === k} onPress={() => setRisk(k)} />)}
      </ChipRow>

      {list.error ? <ErrorBox message={list.error.message} onRetry={list.reload} /> : null}
      {list.loading ? <Loading /> : null}
      {!list.loading && !list.error && list.items.length === 0 ? (
        <Empty icon="git-network-outline" title="No routes yet" text="Start the connector next to your backend. Your routes appear here automatically." />
      ) : null}

      {list.items.map((t) => (
        <Card key={t.id} style={{ opacity: t.stale ? 0.55 : 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Badge label={t.method} tone={METHOD_TONE[t.method]} />
            <T variant="small" style={{ flex: 1 }} numberOfLines={1} selectable>{t.path}</T>
            <Switch value={t.enabled} onValueChange={(v) => toggle(t, v)} trackColor={{ true: colors.primary, false: colors.border }} disabled={t.stale} />
          </View>
          {/* The switch sits outside the tap area so toggling never opens the editor. */}
          <Pressable onPress={() => setEdit(t)} accessibilityLabel={`Edit ${t.name}`}>
            <T variant="h3" style={{ marginTop: 6 }}>{t.name}</T>
            <T variant="small" style={{ marginTop: 2 }} numberOfLines={3}>{t.effectiveDescription}</T>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: space.sm }}>
              <Badge label={RISK_LABEL[t.risk]} tone={t.risk === 'read' ? 'neutral' : t.risk === 'write' ? 'warning' : 'danger'} />
              {t.needsReview ? <Badge label="Needs description" tone="warning" /> : null}
              {t.stale ? <Badge label="No longer in your API" tone="danger" /> : null}
              <Badge label={t.allowedRoles.length === 4 ? 'All roles' : t.allowedRoles.map((r) => ROLE_LABELS[r as keyof typeof ROLE_LABELS]?.replace('Company ', '') ?? r).join(', ')} tone="primary" />
              <Badge label="Edit ›" tone="neutral" />
            </View>
          </Pressable>
        </Card>
      ))}
      {list.hasMore ? <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={list.loadMore} /> : null}

      <ToolSheet tool={edit} onClose={() => setEdit(null)} onSaved={list.reload} />

      <ConfirmDialog
        visible={!!bulk}
        title={bulk === 'enable-read' ? 'Enable read-only tools?' : 'Disable every tool?'}
        message={bulk === 'enable-read' ? 'Turns on all tools that only read data (GET), except ones still needing a description. You can switch any of them off again.' : 'The assistant will not be able to call your software until you enable tools again.'}
        confirmLabel={bulk === 'enable-read' ? 'Enable' : 'Disable all'}
        danger={bulk === 'disable-all'}
        onCancel={() => setBulk(null)}
        onConfirm={async () => {
          try {
            const r = await post<{ changed: number }>('/api/company/ai/tools/bulk', { action: bulk });
            toast(`${r.changed} tools updated`);
            await list.reload();
          } catch (e) {
            toastError(e);
          } finally {
            setBulk(null);
          }
        }}
      />
    </Screen>
  );
}

function ToolSheet({ tool, onClose, onSaved }: { tool: ApiTool | null; onClose: () => void; onSaved: () => void }) {
  const [desc, setDesc] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [risk, setRisk] = useState<ToolRisk>('read');
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tool) return;
    setDesc(tool.customDescription ?? '');
    setRoles(tool.allowedRoles);
    setRisk(tool.risk);
    setEnabled(tool.enabled);
    setError(null);
  }, [tool]);

  async function save() {
    if (!tool) return;
    if (enabled && roles.length === 0) return setError('Choose at least one role, or switch the tool off.');
    setBusy(true);
    try {
      await patch(`/api/company/ai/tools/${tool.id}`, { enabled, allowedRoles: roles, risk, customDescription: desc.trim() || null });
      toast('Tool updated');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={!!tool} onClose={onClose} title={tool?.name ?? ''} footer={<Button title="Save" onPress={save} loading={busy} />}>
      <FormError message={error} />
      {tool ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: space.md }}>
            <Badge label={tool.method} tone={METHOD_TONE[tool.method]} />
            <T variant="small" selectable style={{ flex: 1 }}>{tool.path}</T>
          </View>
          <SwitchRow label="Enabled" value={enabled} onChange={setEnabled} hint="The assistant can use this tool for the roles below." />
          <Input label="Description the AI reads" value={desc} onChangeText={setDesc} multiline style={{ minHeight: 80, textAlignVertical: 'top' }}
            placeholder={tool.summary || tool.description || 'Explain in plain words what this does and when to use it'}
            hint={tool.summary || tool.description ? `From your API: ${(tool.summary || tool.description).slice(0, 160)}` : 'Your API gave no description. Write one: it decides when the AI uses this tool.'} />
          <T variant="label" style={{ marginBottom: 6 }}>Who may use it</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
            {ROLES.map((r) => (
              <Chip key={r} label={ROLE_LABELS[r]} selected={roles.includes(r)} onPress={() => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))} />
            ))}
          </View>
          <T variant="label" style={{ marginBottom: 6 }}>Treat as</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.sm }}>
            {(['read', 'write', 'delete'] as const).map((r) => <Chip key={r} label={RISK_LABEL[r]} selected={risk === r} onPress={() => setRisk(r)} />)}
          </View>
          <T variant="small">“Read-only” runs without asking. “Changes data” and “Deletes data” always ask the user to confirm. If a POST route only searches, you can mark it read-only.</T>
        </>
      ) : null}
    </Sheet>
  );
}
