import { View } from 'react-native';
import { Button, Card, Empty, ErrorBox, Header, Loading, Screen, T } from '../../components/ui';
import { usePaged } from '../../hooks/usePaged';
import { describeAction, formatDateTime } from '../../lib/format';
import type { AuditItem } from '../../lib/types';

function metaSummary(meta: Record<string, unknown>): string {
  return Object.entries(meta ?? {})
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ');
}

export default function Activity() {
  const list = usePaged<AuditItem>((page) => `/api/admin/audit-logs?page=${page}&limit=30`, []);
  return (
    <Screen onRefresh={list.onRefresh} refreshing={list.refreshing}>
      <Header title="Activity" subtitle="Recent actions across the platform" />
      {list.error ? <ErrorBox message={list.error.message} onRetry={list.reload} /> : null}
      {list.loading ? <Loading /> : null}
      {!list.loading && !list.error && list.items.length === 0 ? <Empty icon="time-outline" title="Nothing yet" /> : null}
      {list.items.map((a) => (
        <Card key={a.id} style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T variant="h3" style={{ flex: 1 }}>{describeAction(a.action)}</T>
            <T variant="small">{formatDateTime(a.createdAt)}</T>
          </View>
          <T variant="small">{[a.companyName, a.userName ?? a.userEmail].filter(Boolean).join(' · ') || 'System'}</T>
          {metaSummary(a.meta) ? <T variant="small" numberOfLines={2}>{metaSummary(a.meta)}</T> : null}
        </Card>
      ))}
      {list.hasMore ? <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={list.loadMore} /> : null}
    </Screen>
  );
}
