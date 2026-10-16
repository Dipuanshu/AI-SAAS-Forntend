import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FormError } from '../../../components/auth-shell';
import { SubscriptionBadge, SubscriptionCard } from '../../../components/subscription';
import { Badge, Banner, Button, Card, Chip, ConfirmDialog, ErrorBox, Header, Input, Loading, Row, Screen, SectionTitle, Sheet, SwitchRow, T } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { del, get, post } from '../../../lib/api';
import { formatDate, formatMoney } from '../../../lib/format';
import { colors, space } from '../../../lib/theme';
import { toast } from '../../../lib/toast';
import { AdminCompany, Plan, ROLE_LABELS, Subscription, User } from '../../../lib/types';

interface Detail {
  company: AdminCompany;
  owner: User | null;
  usersByRole: Record<string, number>;
  subscriptionHistory: Subscription[];
}

export default function CompanyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, onRefresh, reload, setData } = useApi(() => get<Detail>(`/api/admin/companies/${id}`), [id]);
  const [dialog, setDialog] = useState<null | 'extend' | 'plan' | 'suspend' | 'activate' | 'delete'>(null);
  const close = () => setDialog(null);
  const apply = (company: AdminCompany) => {
    setData((d) => (d ? { ...d, company } : d));
    void reload();
  };

  const c = data?.company;
  const sub = c?.subscription ?? null;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header title={c?.name ?? 'Company'} subtitle={c?.slug} onBack={() => (router.canGoBack() ? router.back() : router.replace('/companies'))} />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}

      {c && data ? (
        <>
          {c.status === 'suspended' ? (
            <Banner tone="danger" icon="ban" title="This company is suspended" text={c.suspendedReason ? `Reason: ${c.suspendedReason}` : 'Its users cannot log in.'} />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.md, flexWrap: 'wrap' }}>
            <Button title="Extend" icon="calendar-outline" small onPress={() => setDialog('extend')} />
            <Button title={sub ? 'Change plan' : 'Assign plan'} icon="swap-horizontal" small variant="secondary" onPress={() => setDialog('plan')} />
            {c.status === 'active' ? (
              <Button title="Suspend" icon="ban" small variant="secondary" onPress={() => setDialog('suspend')} />
            ) : (
              <Button title="Activate" icon="checkmark-circle-outline" small variant="secondary" onPress={() => setDialog('activate')} />
            )}
          </View>

          <SubscriptionCard sub={sub} />

          <SectionTitle>Company</SectionTitle>
          <Card>
            <Row label="Email" value={c.email} />
            <Row label="Phone" value={c.phone} />
            <Row label="Address" value={c.address} />
            <Row label="Registered" value={formatDate(c.createdAt)} />
            <Row label="Account"><Badge label={c.status === 'active' ? 'Active' : 'Suspended'} tone={c.status === 'active' ? 'success' : 'danger'} /></Row>
            <Row label="Admin" value={data.owner ? `${data.owner.name} (${data.owner.email})` : null} />
            <Row label="Users" value={`${c.userCount} active${sub ? ` of ${sub.maxUsers}` : ''}`} />
          </Card>
          <Card>
            <T variant="label" style={{ marginBottom: 4 }}>Users by role</T>
            {Object.keys(ROLE_LABELS).filter((r) => r !== 'super_admin').map((r) => (
              <Row key={r} label={ROLE_LABELS[r as keyof typeof ROLE_LABELS]} value={String(data.usersByRole[r] ?? 0)} />
            ))}
          </Card>

          <SectionTitle>Subscription history</SectionTitle>
          {data.subscriptionHistory.map((h) => (
            <Card key={h.id} style={{ padding: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T variant="h3">{h.planName}</T>
                <SubscriptionBadge sub={h} />
              </View>
              <T variant="small">{formatDate(h.startsAt)} → {formatDate(h.expiresAt)} · {h.kind === 'trial' ? 'Trial' : `${h.kind} · ${h.billingCycle}`} · {formatMoney(h.amount, h.currency)}</T>
              {h.notes ? <T variant="small" style={{ marginTop: 2 }}>{h.notes}</T> : null}
            </Card>
          ))}

          <Button title="Delete company" variant="danger" icon="trash-outline" onPress={() => setDialog('delete')} style={{ marginTop: space.lg }} />

          <ExtendSheet visible={dialog === 'extend'} company={c} onClose={close} onDone={apply} />
          <PlanSheet visible={dialog === 'plan'} company={c} onClose={close} onDone={apply} />
          <SuspendDialog visible={dialog === 'suspend'} company={c} onClose={close} onDone={apply} />
          <ConfirmAction
            visible={dialog === 'activate'}
            title="Activate company?"
            message={`${c.name} users will be able to log in again.`}
            confirmLabel="Activate"
            action={() => post<{ company: AdminCompany }>(`/api/admin/companies/${c.id}/activate`)}
            okMessage="Company activated"
            onClose={close}
            onDone={(r) => apply(r.company)}
          />
          <DeleteDialog visible={dialog === 'delete'} company={c} onClose={close} />
        </>
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------- dialogs
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>, okMessage: string): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      toast(okMessage);
      return r;
    } catch (e: any) {
      setError(e.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

function ConfirmAction<R>({
  visible, title, message, confirmLabel, action, okMessage, onClose, onDone,
}: { visible: boolean; title: string; message: string; confirmLabel: string; action: () => Promise<R>; okMessage: string; onClose: () => void; onDone: (r: R) => void }) {
  const { busy, error, run } = useAction();
  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      loading={busy}
      onCancel={onClose}
      onConfirm={async () => {
        const r = await run(action, okMessage);
        if (r !== undefined) { onClose(); onDone(r); }
      }}
    >
      <FormError message={error} />
    </ConfirmDialog>
  );
}

function SuspendDialog({ visible, company, onClose, onDone }: { visible: boolean; company: AdminCompany; onClose: () => void; onDone: (c: AdminCompany) => void }) {
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <ConfirmDialog
      visible={visible}
      danger
      title="Suspend company?"
      message={`All users of ${company.name} are logged out and cannot sign in until you activate it again.`}
      confirmLabel="Suspend"
      loading={busy}
      onCancel={onClose}
      onConfirm={async () => {
        const r = await run(() => post<{ company: AdminCompany }>(`/api/admin/companies/${company.id}/suspend`, { reason: reason.trim() || undefined }), 'Company suspended');
        if (r) { setReason(''); onClose(); onDone(r.company); }
      }}
    >
      <FormError message={error} />
      <Input label="Reason (shown to admin)" value={reason} onChangeText={setReason} placeholder="e.g. Payment overdue" />
    </ConfirmDialog>
  );
}

function DeleteDialog({ visible, company, onClose }: { visible: boolean; company: AdminCompany; onClose: () => void }) {
  const [slug, setSlug] = useState('');
  const { busy, error, run } = useAction();
  return (
    <ConfirmDialog
      visible={visible}
      danger
      title="Delete company permanently?"
      message={`This erases ${company.name}, all of its users and its history. This cannot be undone. Type "${company.slug}" to confirm.`}
      confirmLabel="Delete forever"
      loading={busy}
      confirmDisabled={slug !== company.slug}
      onCancel={onClose}
      onConfirm={async () => {
        const r = await run(() => del(`/api/admin/companies/${company.id}`, { confirmSlug: slug }), 'Company deleted');
        if (r) { onClose(); router.replace('/companies'); }
      }}
    >
      <FormError message={error} />
      <Input value={slug} onChangeText={setSlug} placeholder={company.slug} autoCapitalize="none" />
    </ConfirmDialog>
  );
}

const EXTEND_PRESETS = [7, 15, 30, 90, 180, 365];

function ExtendSheet({ visible, company, onClose, onDone }: { visible: boolean; company: AdminCompany; onClose: () => void; onDone: (c: AdminCompany) => void }) {
  const [days, setDays] = useState('30');
  const { busy, error, setError, run } = useAction();
  useEffect(() => { if (visible) { setDays('30'); setError(null); } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Number(days);
  const base = company.subscription && company.subscription.status !== 'expired' ? new Date(company.subscription.expiresAt) : new Date();
  const newDate = Number.isInteger(n) && n > 0 ? new Date(base.getTime() + n * 86_400_000).toISOString() : null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Extend subscription"
      footer={
        <Button
          title="Extend"
          loading={busy}
          disabled={!newDate}
          onPress={async () => {
            const r = await run(() => post<{ company: AdminCompany }>(`/api/admin/companies/${company.id}/extend`, { days: n }), 'Subscription extended');
            if (r) { onClose(); onDone(r.company); }
          }}
        />
      }
    >
      <FormError message={error} />
      {!company.subscription ? <Banner tone="warning" icon="information-circle" title="No subscription yet" text="Use “Assign plan” first." /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
        {EXTEND_PRESETS.map((d) => <Chip key={d} label={`+${d} days`} selected={Number(days) === d} onPress={() => setDays(String(d))} />)}
      </View>
      <Input label="Days to add" value={days} onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
      <T variant="small">New expiry: <T variant="label">{newDate ? formatDate(newDate) : '—'}</T>{company.subscription?.status === 'expired' ? ' (counted from today, since it already expired)' : ''}</T>
    </Sheet>
  );
}

function PlanSheet({ visible, company, onClose, onDone }: { visible: boolean; company: AdminCompany; onClose: () => void; onDone: (c: AdminCompany) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planCode, setPlanCode] = useState('');
  const [kind, setKind] = useState<'paid' | 'trial' | 'complimentary'>('paid');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [days, setDays] = useState('30');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [carry, setCarry] = useState(false);
  const [notes, setNotes] = useState('');
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setNotes('');
    setCarry(false);
    setAmountTouched(false);
    get<{ plans: Plan[] }>('/api/admin/plans')
      .then((r) => {
        const active = r.plans.filter((p) => p.isActive || p.code === company.subscription?.planCode);
        setPlans(active);
        setPlanCode(company.subscription?.planCode ?? active[0]?.code ?? '');
      })
      .catch((e) => setError(e.message));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = plans.find((p) => p.code === planCode);
  // Suggest duration and amount from the plan unless the admin typed their own.
  useEffect(() => {
    if (cycle !== 'custom') setDays(cycle === 'yearly' ? '365' : '30');
  }, [cycle]);
  useEffect(() => {
    if (amountTouched || !plan) return;
    setAmount(kind !== 'paid' ? '0' : String(cycle === 'yearly' ? plan.priceYearly : cycle === 'monthly' ? plan.priceMonthly : 0));
  }, [plan, kind, cycle, amountTouched]);

  async function save() {
    const d = Number(days);
    const a = Number(amount);
    if (!planCode) return setError('Choose a plan');
    if (!Number.isInteger(d) || d < 1) return setError('Enter the number of days');
    if (!Number.isFinite(a) || a < 0) return setError('Enter a valid amount');
    const r = await run(
      () => post<{ company: AdminCompany }>(`/api/admin/companies/${company.id}/subscription`, {
        planCode, kind, billingCycle: cycle, durationDays: d, amount: a, carryOverRemaining: carry, notes: notes.trim() || undefined,
      }),
      'Plan updated',
    );
    if (r) { onClose(); onDone(r.company); }
  }

  const active = company.subscription && company.subscription.status !== 'expired';
  return (
    <Sheet visible={visible} onClose={onClose} title={company.subscription ? 'Change plan' : 'Assign plan'} footer={<Button title="Save subscription" onPress={save} loading={busy} />}>
      <FormError message={error} />
      <T variant="label" style={{ marginBottom: 6 }}>Plan</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
        {plans.map((p) => <Chip key={p.code} label={`${p.name} · ${p.maxUsers} users`} selected={planCode === p.code} onPress={() => setPlanCode(p.code)} />)}
      </View>
      <T variant="label" style={{ marginBottom: 6 }}>Type</T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.md, flexWrap: 'wrap' }}>
        {(['paid', 'trial', 'complimentary'] as const).map((k) => <Chip key={k} label={k[0]!.toUpperCase() + k.slice(1)} selected={kind === k} onPress={() => setKind(k)} />)}
      </View>
      <T variant="label" style={{ marginBottom: 6 }}>Billing cycle</T>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.md, flexWrap: 'wrap' }}>
        {(['monthly', 'yearly', 'custom'] as const).map((k) => <Chip key={k} label={k[0]!.toUpperCase() + k.slice(1)} selected={cycle === k} onPress={() => setCycle(k)} />)}
      </View>
      <Input label="Duration (days)" value={days} onChangeText={(v) => { setDays(v.replace(/[^0-9]/g, '')); setCycle('custom'); }} keyboardType="number-pad" />
      <Input label={`Amount received (${plan?.currency ?? 'INR'})`} value={amount} onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, '')); setAmountTouched(true); }} keyboardType="decimal-pad" />
      {active ? <SwitchRow label="Keep remaining days" value={carry} onChange={setCarry} hint={`Adds the ${company.subscription!.daysLeft} unused days on top (renewal).`} /> : null}
      <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="e.g. Paid via UPI, ref 1234" multiline />
      <T variant="small" color={colors.muted}>A new subscription period is recorded; the old one stays in history.</T>
    </Sheet>
  );
}
