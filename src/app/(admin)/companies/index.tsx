import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SubscriptionBadge } from '../../../components/subscription';
import { Badge, Button, Card, Chip, ChipRow, Empty, ErrorBox, Header, Input, Loading, Screen, T } from '../../../components/ui';
import { useDebounced, usePaged } from '../../../hooks/usePaged';
import { formatDate } from '../../../lib/format';
import { colors, space } from '../../../lib/theme';
import type { AdminCompany } from '../../../lib/types';

const STATUSES = [
  ['all', 'All'], ['active', 'Paying'], ['trial', 'Trial'], ['expiring', 'Expiring soon'], ['expired', 'Expired'], ['suspended', 'Suspended'],
] as const;
const SORTS = [['newest', 'Newest'], ['expiry', 'Expiry date'], ['name', 'Name']] as const;

export default function Companies() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<string>('all');
  const [sort, setSort] = useState<string>('newest');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());

  // Dashboard cards deep-link here with ?status=…
  useEffect(() => {
    if (params.status && STATUSES.some(([k]) => k === params.status)) {
      setStatus(params.status);
      if (params.status === 'expiring' || params.status === 'expired') setSort('expiry');
    }
  }, [params.status]);

  const list = usePaged<AdminCompany>(
    (page) => `/api/admin/companies?page=${page}&limit=25&status=${status}&sort=${sort}&search=${encodeURIComponent(q)}`,
    [status, sort, q],
  );

  return (
    <Screen onRefresh={list.onRefresh} refreshing={list.refreshing}>
      <Header title="Companies" subtitle={`${list.total} result${list.total === 1 ? '' : 's'}`} />
      <Input placeholder="Search name, email or code" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <ChipRow>
        {STATUSES.map(([k, label]) => <Chip key={k} label={label} selected={status === k} onPress={() => setStatus(k)} />)}
      </ChipRow>
      <ChipRow>
        {SORTS.map(([k, label]) => <Chip key={k} label={`Sort: ${label}`} selected={sort === k} onPress={() => setSort(k)} />)}
      </ChipRow>

      {list.error ? <ErrorBox message={list.error.message} onRetry={list.reload} /> : null}
      {list.loading ? <Loading /> : null}
      {!list.loading && !list.error && list.items.length === 0 ? (
        <Empty icon="business-outline" title="No companies found" text="Try another filter or search." />
      ) : null}

      {list.items.map((c) => {
        const sub = c.subscription;
        return (
          <Card key={c.id} onPress={() => router.push({ pathname: '/companies/[id]', params: { id: c.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <T variant="h3">{c.name}</T>
                <T variant="small" numberOfLines={1}>{c.email}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: space.sm }}>
              {c.status === 'suspended' ? <Badge label="Suspended" tone="danger" /> : <SubscriptionBadge sub={sub} />}
              {sub ? <Badge label={sub.planName} tone="primary" /> : null}
              <Badge label={`${c.userCount} user${c.userCount === 1 ? '' : 's'}`} />
            </View>
            <T variant="small" style={{ marginTop: space.sm }}>
              {sub ? `${sub.status === 'expired' ? 'Expired' : 'Expires'} ${formatDate(sub.expiresAt)}${sub.status === 'expired' ? '' : ` · ${sub.daysLeft}d left`}` : 'No subscription'} · Joined {formatDate(c.createdAt)}
            </T>
          </Card>
        );
      })}
      {list.hasMore ? <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={list.loadMore} /> : null}
    </Screen>
  );
}
