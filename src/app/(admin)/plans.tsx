import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FormError } from '../../components/auth-shell';
import { Badge, Button, Card, ErrorBox, Header, Input, Loading, Screen, Sheet, SwitchRow, T } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { get, patch, post } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { space } from '../../lib/theme';
import { toast } from '../../lib/toast';
import type { Plan } from '../../lib/types';

export default function Plans() {
  const { data, error, loading, refreshing, onRefresh, reload } = useApi(() => get<{ plans: Plan[] }>('/api/admin/plans'), []);
  const [editing, setEditing] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header title="Plans" subtitle="Pricing and limits offered to companies" right={<Button title="New plan" icon="add" small onPress={() => setEditing({ open: true, plan: null })} />} />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}
      {data?.plans.map((p) => (
        <Card key={p.id} onPress={() => setEditing({ open: true, plan: p })} style={{ opacity: p.isActive ? 1 : 0.65 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T variant="h2">{p.name}</T>
              <Badge label={p.code} />
              {!p.isActive ? <Badge label="Inactive" tone="warning" /> : null}
            </View>
            <Badge label={`${p.companies ?? 0} companies`} tone="primary" />
          </View>
          <T variant="small" style={{ marginTop: 2 }}>{p.description}</T>
          <T variant="h3" style={{ marginTop: space.sm }}>
            {formatMoney(p.priceMonthly, p.currency)}<T variant="small"> /month · </T>{formatMoney(p.priceYearly, p.currency)}<T variant="small"> /year</T>
          </T>
          <T variant="small" style={{ marginTop: 2 }}>Up to {p.maxUsers} users</T>
          {p.features.map((f) => <T key={f} variant="small" style={{ marginTop: 2 }}>• {f}</T>)}
        </Card>
      ))}
      <PlanSheet visible={editing.open} plan={editing.plan} onClose={() => setEditing({ open: false, plan: null })} onSaved={reload} />
    </Screen>
  );
}

function PlanSheet({ visible, plan, onClose, onSaved }: { visible: boolean; plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ code: '', name: '', description: '', priceMonthly: '', priceYearly: '', currency: 'INR', maxUsers: '', features: '', isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: any) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setF({
      code: plan?.code ?? '', name: plan?.name ?? '', description: plan?.description ?? '',
      priceMonthly: String(plan?.priceMonthly ?? ''), priceYearly: String(plan?.priceYearly ?? ''),
      currency: plan?.currency ?? 'INR', maxUsers: String(plan?.maxUsers ?? ''),
      features: (plan?.features ?? []).join('\n'), isActive: plan?.isActive ?? true,
    });
  }, [visible, plan]);

  async function save() {
    const priceMonthly = Number(f.priceMonthly);
    const priceYearly = Number(f.priceYearly);
    const maxUsers = Number(f.maxUsers);
    if (f.name.trim().length < 2) return setError('Enter the plan name');
    if (!plan && !/^[a-z0-9_-]{2,30}$/.test(f.code.trim().toLowerCase())) return setError('Code: 2–30 chars, letters, numbers, - or _');
    if (!Number.isFinite(priceMonthly) || priceMonthly < 0 || f.priceMonthly === '') return setError('Enter the monthly price');
    if (!Number.isFinite(priceYearly) || priceYearly < 0 || f.priceYearly === '') return setError('Enter the yearly price');
    if (!Number.isInteger(maxUsers) || maxUsers < 1) return setError('Enter the user limit');
    const body = {
      name: f.name.trim(), description: f.description.trim(), priceMonthly, priceYearly, maxUsers,
      currency: f.currency.trim().toUpperCase() || 'INR', isActive: f.isActive,
      features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    setBusy(true);
    setError(null);
    try {
      if (plan) await patch(`/api/admin/plans/${plan.id}`, body);
      else await post('/api/admin/plans', { ...body, code: f.code.trim().toLowerCase() });
      toast(plan ? 'Plan updated' : 'Plan created');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={plan ? `Edit ${plan.name}` : 'New plan'} footer={<Button title="Save plan" onPress={save} loading={busy} />}>
      <FormError message={error} />
      {!plan ? <Input label="Code" value={f.code} onChangeText={set('code')} autoCapitalize="none" placeholder="e.g. pro" hint="Unique id, cannot be changed later." /> : null}
      <Input label="Name" value={f.name} onChangeText={set('name')} />
      <Input label="Description" value={f.description} onChangeText={set('description')} />
      <Input label="Price / month" value={f.priceMonthly} onChangeText={set('priceMonthly')} keyboardType="decimal-pad" />
      <Input label="Price / year" value={f.priceYearly} onChangeText={set('priceYearly')} keyboardType="decimal-pad" />
      <Input label="Currency" value={f.currency} onChangeText={set('currency')} autoCapitalize="characters" maxLength={3} />
      <Input label="Max users" value={f.maxUsers} onChangeText={set('maxUsers')} keyboardType="number-pad" />
      <Input label="Features (one per line)" value={f.features} onChangeText={set('features')} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
      <SwitchRow label="Available for new sign-ups" value={f.isActive} onChange={set('isActive')} hint="Inactive plans stay on existing companies." />
    </Sheet>
  );
}
