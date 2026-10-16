import { View } from 'react-native';
import { formatDate, formatMoney } from '../lib/format';
import { colors, radius, space } from '../lib/theme';
import type { Subscription } from '../lib/types';
import { Badge, Card, Row, T } from './ui';

export function subscriptionTone(sub: Subscription | null | undefined): 'danger' | 'warning' | 'info' | 'success' | 'neutral' {
  if (!sub) return 'neutral';
  if (sub.status === 'expired') return 'danger';
  if (sub.daysLeft <= 7) return 'warning';
  return sub.status === 'trial' ? 'info' : 'success';
}

export function subscriptionLabel(sub: Subscription | null | undefined): string {
  if (!sub) return 'No plan';
  if (sub.status === 'expired') return 'Expired';
  if (sub.daysLeft <= 7) return `Expires in ${sub.daysLeft}d`;
  return sub.status === 'trial' ? 'Trial' : 'Active';
}

export function SubscriptionBadge({ sub }: { sub: Subscription | null | undefined }) {
  return <Badge label={subscriptionLabel(sub)} tone={subscriptionTone(sub)} />;
}

export function SubscriptionCard({ sub, title = 'Subscription' }: { sub: Subscription | null; title?: string }) {
  if (!sub) {
    return (
      <Card>
        <T variant="h3">{title}</T>
        <T variant="small" style={{ marginTop: 4 }}>No active plan.</T>
      </Card>
    );
  }
  const total = Math.max(1, Math.round((new Date(sub.expiresAt).getTime() - new Date(sub.startsAt).getTime()) / 86_400_000));
  const pct = sub.status === 'expired' ? 0 : Math.min(1, sub.daysLeft / total);
  const tone = subscriptionTone(sub);
  const bar = { danger: colors.danger, warning: '#F59E0B', info: '#0EA5E9', success: '#16A34A', neutral: colors.muted }[tone];
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T variant="h3">{title}</T>
        <SubscriptionBadge sub={sub} />
      </View>
      <T variant="h2" style={{ marginTop: space.sm }}>{sub.planName}{sub.kind === 'trial' ? ' (free trial)' : ''}</T>
      <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: '#E2E8F0', marginVertical: space.md, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, height: 8, backgroundColor: bar }} />
      </View>
      <T variant="small" style={{ marginBottom: space.sm }}>
        {sub.status === 'expired' ? `Expired on ${formatDate(sub.expiresAt)}` : `${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'} left`}
      </T>
      <Row label="Valid until" value={formatDate(sub.expiresAt)} />
      <Row label="Started" value={formatDate(sub.startsAt)} />
      <Row label="User limit" value={`${sub.maxUsers} users`} />
      <Row label="Billing" value={sub.kind === 'trial' ? 'Free trial' : `${sub.billingCycle} · ${formatMoney(sub.amount, sub.currency)}`} />
    </Card>
  );
}
