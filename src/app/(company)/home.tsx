import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SubscriptionCard } from '../../components/subscription';
import { Badge, Banner, Button, Card, ErrorBox, Header, Loading, Screen, SectionTitle, StatCard, T } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { get } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { space } from '../../lib/theme';
import { ROLE_LABELS, Subscription } from '../../lib/types';

interface Dashboard {
  totalUsers: number;
  usersByRole: Record<string, number>;
  subscription: Subscription | null;
}

export default function Home() {
  const { user, company, role } = useAuth();
  const { data, error, loading, refreshing, onRefresh, reload } = useApi(() => get<Dashboard>('/api/company/dashboard'), []);
  const sub = data?.subscription ?? null;
  const isAdmin = role === 'company_admin';

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header
        title={`Hello, ${user?.name.split(' ')[0] ?? ''}`}
        subtitle={company?.name}
        right={user ? <Badge label={ROLE_LABELS[user.role]} tone="primary" /> : undefined}
      />

      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}

      {sub?.status === 'expired' ? (
        <Banner
          tone="danger"
          icon="alert-circle"
          title="Your subscription has expired"
          text={isAdmin ? 'Contact the platform team to renew. Team management is paused until then.' : 'Please ask your company admin to renew the plan.'}
        />
      ) : sub && sub.daysLeft <= 7 ? (
        <Banner tone="warning" icon="time" title={`${sub.status === 'trial' ? 'Trial' : 'Plan'} ends in ${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'}`} text="Renew in time to avoid interruption." />
      ) : null}

      {data ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.md }}>
            <StatCard label="Active users" value={sub ? `${data.totalUsers} / ${sub.maxUsers}` : data.totalUsers} icon="people" />
            <StatCard label="Plan" value={sub?.planName ?? '—'} icon="ribbon" tone="info" />
          </View>

          <SubscriptionCard sub={sub} />

          {isAdmin || role === 'manager' ? (
            <>
              <SectionTitle>Team by role</SectionTitle>
              <Card>
                {Object.entries(ROLE_LABELS)
                  .filter(([r]) => r !== 'super_admin')
                  .map(([r, label]) => (
                    <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                      <T>{label}</T>
                      <T variant="h3">{data.usersByRole[r] ?? 0}</T>
                    </View>
                  ))}
                <Button title="Manage team" variant="secondary" small onPress={() => router.push('/team')} style={{ marginTop: space.md, alignSelf: 'flex-start' }} />
              </Card>
            </>
          ) : null}

          <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Ionicons name="sparkles" size={28} color="#4F46E5" />
            <View style={{ flex: 1 }}>
              <T variant="h3">AI Assistant</T>
              <T variant="small">Chat and automation for your business data is coming soon.</T>
            </View>
            <Badge label="Soon" tone="info" />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
