import { useState } from 'react';
import { AuthShell, FormError } from '../../components/auth-shell';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError('Enter your email and password');
    setBusy(true);
    setError(null);
    try {
      await loginAdmin(email.trim(), password);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Super Admin" subtitle="Manage every company, plan and subscription">
      <FormError message={error} />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus />
      <Input label="Password" value={password} onChangeText={setPassword} secure onSubmitEditing={submit} returnKeyType="go" />
      <Button title="Log in" onPress={submit} loading={busy} />
    </AuthShell>
  );
}
