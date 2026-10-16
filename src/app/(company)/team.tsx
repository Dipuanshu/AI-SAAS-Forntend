import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { UserSheet } from '../../components/user-form';
import { Avatar, Badge, Button, Card, Chip, ChipRow, Empty, ErrorBox, Header, Input, Loading, Screen, T } from '../../components/ui';
import { useDebounced, usePaged } from '../../hooks/usePaged';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { colors, space } from '../../lib/theme';
import { COMPANY_ROLES, ROLE_LABELS, User } from '../../lib/types';

export default function Team() {
  const { user: me, role } = useAuth();
  const canEdit = role === 'company_admin';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sheet, setSheet] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const q = useDebounced(search.trim());
  const list = usePaged<User>(
    (page) => `/api/company/users?page=${page}&limit=30&search=${encodeURIComponent(q)}&role=${roleFilter}`,
    [q, roleFilter],
  );
  const expired = (list.error as any)?.code === 'SUBSCRIPTION_EXPIRED';

  return (
    <Screen onRefresh={list.onRefresh} refreshing={list.refreshing}>
      <Header
        title="Team"
        subtitle={`${list.total} member${list.total === 1 ? '' : 's'}`}
        right={canEdit && !expired ? <Button title="Add" icon="add" small onPress={() => setSheet({ open: true, user: null })} /> : undefined}
      />
      <Input placeholder="Search by name or email" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <ChipRow>
        <Chip label="All" selected={roleFilter === ''} onPress={() => setRoleFilter('')} />
        {COMPANY_ROLES.map((r) => (
          <Chip key={r} label={ROLE_LABELS[r]} selected={roleFilter === r} onPress={() => setRoleFilter(r)} />
        ))}
      </ChipRow>

      {expired ? (
        <Empty icon="lock-closed-outline" title="Subscription expired" text="Team management is paused. Contact the platform team to renew your plan." />
      ) : list.error ? (
        <ErrorBox message={list.error.message} onRetry={list.reload} />
      ) : list.loading ? (
        <Loading />
      ) : list.items.length === 0 ? (
        <Empty icon="people-outline" title="No members found" text={q || roleFilter ? 'Try a different search or filter.' : 'Add your first team member.'} />
      ) : (
        list.items.map((u) => (
          <Card key={u.id} onPress={canEdit ? () => setSheet({ open: true, user: u }) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: u.isActive ? 1 : 0.6 }}>
            <Avatar name={u.name} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <T variant="h3">{u.name}</T>
                {u.id === me?.id ? <Badge label="You" tone="info" /> : null}
                {!u.isActive ? <Badge label="Inactive" tone="neutral" /> : null}
              </View>
              <T variant="small" numberOfLines={1}>{u.email}</T>
              <T variant="small">{[u.jobTitle, `Last login ${formatDate(u.lastLoginAt)}`].filter(Boolean).join(' · ')}</T>
            </View>
            <Badge label={ROLE_LABELS[u.role]} tone={u.role === 'company_admin' ? 'primary' : 'neutral'} />
            {canEdit ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
          </Card>
        ))
      )}
      {list.hasMore ? <Button title="Load more" variant="secondary" loading={list.loadingMore} onPress={list.loadMore} /> : null}

      <UserSheet visible={sheet.open} user={sheet.user} selfId={me?.id} onClose={() => setSheet({ open: false, user: null })} onSaved={list.reload} />
    </Screen>
  );
}
