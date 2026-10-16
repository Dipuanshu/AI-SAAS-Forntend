import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthShell, FormError } from '../../components/auth-shell';
import { Avatar, Button, Card, Input, Loading, T } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, space } from '../../lib/theme';

interface CompanyHit {
  name: string;
  slug: string;
}

export default function Login() {
  const { loginCompany, notice, clearNotice } = useAuth();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CompanyHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [company, setCompany] = useState<CompanyHit | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1: debounced company search.
  useEffect(() => {
    if (company) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await api<{ companies: CompanyHit[] }>('GET', `/api/auth/companies?q=${encodeURIComponent(q)}`, undefined, { auth: false });
        setHits(r.companies);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, company]);

  async function submit() {
    if (!company) return;
    if (!email.trim() || !password) return setError('Enter your email and password');
    setBusy(true);
    setError(null);
    clearNotice();
    try {
      await loginCompany(company.slug, email.trim(), password);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in" subtitle={company ? 'Enter your credentials' : 'First, find your company'}>
      {notice ? <FormError message={notice} /> : null}
      <FormError message={error} />

      {!company ? (
        <>
          <Input label="Company name" placeholder="Start typing your company name" value={query} onChangeText={setQuery} autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
          {searching ? <Loading /> : null}
          {!searching && hits.map((h) => (
            <Card key={h.slug} onPress={() => { setCompany(h); setError(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
              <Avatar name={h.name} />
              <View style={{ flex: 1 }}>
                <T variant="h3">{h.name}</T>
                <T variant="small">{h.slug}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          ))}
          {!searching && query.trim().length >= 2 && hits.length === 0 ? (
            <T variant="small" style={{ textAlign: 'center', marginTop: space.md }}>
              No company found. Check the spelling, or register your company.
            </T>
          ) : null}
          <Button title="Register a new company" variant="ghost" onPress={() => router.replace('/register')} style={{ marginTop: space.lg }} />
        </>
      ) : (
        <>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
            <Avatar name={company.name} />
            <View style={{ flex: 1 }}>
              <T variant="h3">{company.name}</T>
              <T variant="small">{company.slug}</T>
            </View>
            <Pressable onPress={() => { setCompany(null); setPassword(''); setError(null); }} hitSlop={10}>
              <T variant="label" color={colors.primary}>Change</T>
            </Pressable>
          </Card>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoFocus />
          <Input label="Password" value={password} onChangeText={setPassword} secure autoComplete="password" onSubmitEditing={submit} returnKeyType="go" />
          <Button title="Log in" onPress={submit} loading={busy} />
        </>
      )}
    </AuthShell>
  );
}
