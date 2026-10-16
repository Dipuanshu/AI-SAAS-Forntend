import { router } from 'expo-router';
import { View } from 'react-native';
import { Banner, Button, Card, ErrorBox, Header, Loading, Screen, SectionTitle, StatCard, T } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { get } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { colors, space } from '../../lib/theme';
import type { AdminStats } from '../../lib/types';

const go = (status: string) => router.push({ pathname: '/companies', params: { status } });

export default function AdminDashboard() {
  const { data: s, error, loading, refreshing, onRefresh, reload } = useApi(() => get<AdminStats>('/api/admin/stats'), []);
  const maxPlan = Math.max(1, ...(s?.companiesByPlan.map((p) => p.companies) ?? [1]));

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header title="Platform overview" subtitle="All companies on your SaaS" />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}
      {s ? (
        <>
          {s.expiringIn7Days > 0 ? (
            <Banner
              tone="warning"
              icon="time"
              title={`${s.expiringIn7Days} subscription${s.expiringIn7Days === 1 ? '' : 's'} expiring within 7 days`}
              action={<Button title="Review" small variant="secondary" onPress={() => go('expiring')} />}
            />
          ) : null}
          {s.expired > 0 ? (
            <Banner
              tone="danger"
              icon="alert-circle"
              title={`${s.expired} compan${s.expired === 1 ? 'y has' : 'ies have'} an expired subscription`}
              action={<Button title="Review" small variant="secondary" onPress={() => go('expired')} />}
            />
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.lg }}>
            <StatCard label="Total companies" value={s.totalCompanies} icon="business" onPress={() => go('all')} />
            <StatCard label="Paying" value={s.paying} icon="checkmark-circle" tone="success" onPress={() => go('active')} />
            <StatCard label="On free trial" value={s.onTrial} icon="flask" tone="info" onPress={() => go('trial')} />
            <StatCard label="Expiring in 7 days" value={s.expiringIn7Days} icon="time" tone="warning" onPress={() => go('expiring')} />
            <StatCard label="Expired" value={s.expired} icon="alert-circle" tone="danger" onPress={() => go('expired')} />
            <StatCard label="Suspended" value={s.suspended} icon="ban" tone="neutral" onPress={() => go('suspended')} />
            <StatCard label="Total users" value={s.totalUsers} icon="people" />
            <StatCard label="New (30 days)" value={s.newLast30Days} icon="trending-up" tone="success" />
          </View>

          <Card>
            <T variant="small">Estimated monthly recurring revenue</T>
            <T variant="title" style={{ marginVertical: 4 }}>{formatMoney(s.monthlyRecurringRevenue)}</T>
            <T variant="small">Total billed to date: {formatMoney(s.totalBilled)} · expiring in 30 days: {s.expiringIn30Days}</T>
          </Card>

          <SectionTitle>Active companies by plan</SectionTitle>
          <Card>
            {s.companiesByPlan.length === 0 ? <T variant="small">No active subscriptions yet.</T> : null}
            {s.companiesByPlan.map((p) => (
              <View key={p.code} style={{ marginBottom: space.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <T variant="label">{p.name}</T>
                  <T variant="label">{p.companies}</T>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.primary, width: `${(p.companies / maxPlan) * 100}%` }} />
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
