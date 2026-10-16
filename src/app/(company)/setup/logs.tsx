import { router } from 'expo-router';
import { View } from 'react-native';
import { Badge, Button, Card, Empty, ErrorBox, Header, Loading, Screen, T } from '../../../components/ui';
import { usePaged } from '../../../hooks/usePaged';
import { formatDateTime } from '../../../lib/format';
import type { AiLog } from '../../../lib/types';

const TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ok: 'success', awaiting_confirmation: 'warning', cancelled: 'neutral', http_error: 'danger', error: 'danger',
  blocked_role: 'danger', blocked_delete: 'danger', not_connected: 'warning', connector_offline: 'danger',
};
const LABEL: Record<string, string> = {
  ok: 'Done', awaiting_confirmation: 'Asked to confirm', cancelled: 'Cancelled', http_error: 'Software refused', error: 'Failed',
  blocked_role: 'Blocked (role)', blocked_delete: 'Blocked (delete)', not_connected: 'Not connected', connector_offline: 'Connector offline',
};

export default function Logs() {
  const list = usePaged<AiLog>((p) => `/api/company/ai/logs?page=${p}&limit=30`, []);
  return (
    <Screen onRefresh={list.onRefresh} refreshing={list.refreshing}>
      <Header title="Activity log" subtitle="What the assistant did for your team" onBack={() => (router.canGoBack() ? router.back() : router.replace('/setup'))} />
      {list.error ? <ErrorBox message={list.error.message} onRetry={list.reload} /> : null}
      {list.loading ? <Loading /> : null}
      {!list.loading && !list.error && list.items.length === 0 ? <Empty icon="list-outline" title="Nothing yet" text="Calls appear here once your team starts asking questions." /> : null}
      {list.items.map((l) => (
        <Card key={l.id} style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <T variant="h3" style={{ flex: 1 }}>{l.tool}</T>
            <Badge label={LABEL[l.status] ?? l.status} tone={TONE[l.status] ?? 'neutral'} />
          </View>
          <T variant="small">{l.method} {l.path}{l.httpStatus ? ` · HTTP ${l.httpStatus}` : ''}{l.durationMs ? ` · ${l.durationMs} ms` : ''}</T>
          <T variant="small">{[l.userName, formatDateTime(l.createdAt)].filter(Boolean).join(' · ')}</T>
          {l.args && l.args !== '{}' ? <T variant="small" numberOfLines={2} selectable>Input: {l.args}</T> : null}
          {l.error ? <T variant="small" color="#DC2626">{l.error}</T> : null}
        </Card>
      ))}
      {list.hasMore ? <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={list.loadMore} /> : null}
    </Screen>
  );
}
