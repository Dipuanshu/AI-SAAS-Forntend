import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthShell, FormError } from '../../components/auth-shell';
import { Button, Card, Input, Loading, T } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';
import { colors, space } from '../../lib/theme';
import type { Plan } from '../../lib/types';

export default function Register() {
  const { registerCompany } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [planCode, setPlanCode] = useState('starter');
  const [f, setF] = useState({ companyName: '', companyPhone: '', adminName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api<{ plans: Plan[] }>('GET', '/api/plans', undefined, { auth: false })
      .then((r) => {
        setPlans(r.plans);
        if (r.plans.length && !r.plans.some((p) => p.code === 'starter')) setPlanCode(r.plans[0]!.code);
      })
      .catch((e) => {
        setPlans([]);
        setError(e.message);
      });
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (f.companyName.trim().length < 2) e.companyName = 'Enter your company name';
    if (f.adminName.trim().length < 2) e.adminName = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'At least 8 characters with letters and numbers';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      await registerCompany({
        companyName: f.companyName.trim(),
        companyPhone: f.companyPhone.trim() || undefined,
        adminName: f.adminName.trim(),
        email: f.email.trim(),
        password: f.password,
        planCode,
      });
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Register your company" subtitle="Start your 14-day free trial. No card needed.">
      <FormError message={error} />
      <Input label="Company name *" value={f.companyName} onChangeText={set('companyName')} error={errors.companyName} />
      <Input label="Company phone" value={f.companyPhone} onChangeText={set('companyPhone')} keyboardType="phone-pad" />
      <Input label="Your name (admin) *" value={f.adminName} onChangeText={set('adminName')} error={errors.adminName} />
      <Input label="Work email *" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} hint="This becomes your admin login." />
      <Input label="Password *" value={f.password} onChangeText={set('password')} secure error={errors.password} />
      <Input label="Confirm password *" value={f.confirm} onChangeText={set('confirm')} secure error={errors.confirm} />

      <T variant="label" style={{ marginBottom: 8 }}>Choose a plan</T>
      {plans === null ? <Loading /> : plans.map((p) => {
        const on = p.code === planCode;
        return (
          <Pressable key={p.code} onPress={() => setPlanCode(p.code)} accessibilityState={{ selected: on }}>
            <Card style={{ borderColor: on ? colors.primary : colors.border, borderWidth: on ? 2 : 1, backgroundColor: on ? colors.primarySoft : colors.card }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="h3">{p.name}</T>
                <T variant="h3" color={colors.primary}>{formatMoney(p.priceMonthly, p.currency)}<T variant="small">/mo</T></T>
              </View>
              <T variant="small" style={{ marginTop: 2 }}>{p.description}</T>
              <T variant="small" style={{ marginTop: 6 }}>Up to {p.maxUsers} users</T>
            </Card>
          </Pressable>
        );
      })}
      <Button title="Create company account" onPress={submit} loading={busy} style={{ marginTop: space.md }} />
    </AuthShell>
  );
}
