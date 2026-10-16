import { useEffect, useState } from 'react';
import { ChangePasswordSheet } from '../../components/account';
import { FormError } from '../../components/auth-shell';
import { SubscriptionCard } from '../../components/subscription';
import { Badge, Button, Card, Header, Input, Row, Screen, SectionTitle, Sheet, T } from '../../components/ui';
import { patch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { space } from '../../lib/theme';
import { toast } from '../../lib/toast';
import { ROLE_LABELS } from '../../lib/types';

export default function Account() {
  const { user, company, subscription, role, logout, reload } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void reload().catch(() => undefined); // refresh subscription info whenever the tab mounts
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editOpen) setF({ name: company?.name ?? '', phone: company?.phone ?? '', address: company?.address ?? '' });
    setError(null);
  }, [editOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveCompany() {
    if (f.name.trim().length < 2) return setError('Enter the company name');
    setBusy(true);
    try {
      await patch('/api/company/profile', { name: f.name.trim(), phone: f.phone.trim() || null, address: f.address.trim() || null });
      await reload();
      toast('Company updated');
      setEditOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header title="Account" />
      <Card>
        <T variant="h3">{user?.name}</T>
        <T variant="small" style={{ marginBottom: space.sm }}>{user?.email}</T>
        <Row label="Role"><Badge label={role ? ROLE_LABELS[role] : ''} tone="primary" /></Row>
        <Row label="Job title" value={user?.jobTitle} />
        <Row label="Phone" value={user?.phone} />
        <Row label="Joined" value={formatDate(user?.createdAt)} />
      </Card>

      <SectionTitle right={role === 'company_admin' ? <Button title="Edit" variant="ghost" small onPress={() => setEditOpen(true)} /> : undefined}>Company</SectionTitle>
      <Card>
        <Row label="Name" value={company?.name} />
        <Row label="Login code" value={company?.slug} />
        <Row label="Email" value={company?.email} />
        <Row label="Phone" value={company?.phone} />
        <Row label="Address" value={company?.address} />
      </Card>

      <SubscriptionCard sub={subscription} />

      <Button title="Change password" variant="secondary" icon="key-outline" onPress={() => setPwOpen(true)} />
      <Button title="Log out" variant="danger" icon="log-out-outline" onPress={logout} style={{ marginTop: space.md }} />

      <ChangePasswordSheet visible={pwOpen} onClose={() => setPwOpen(false)} />
      <Sheet visible={editOpen} onClose={() => setEditOpen(false)} title="Edit company" footer={<Button title="Save" onPress={saveCompany} loading={busy} />}>
        <FormError message={error} />
        <Input label="Company name" value={f.name} onChangeText={(v) => setF((s) => ({ ...s, name: v }))} />
        <Input label="Phone" value={f.phone} onChangeText={(v) => setF((s) => ({ ...s, phone: v }))} keyboardType="phone-pad" />
        <Input label="Address" value={f.address} onChangeText={(v) => setF((s) => ({ ...s, address: v }))} multiline />
      </Sheet>
    </Screen>
  );
}
