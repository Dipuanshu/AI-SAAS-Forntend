import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { del, patch, post } from '../lib/api';
import { colors, space } from '../lib/theme';
import { toast } from '../lib/toast';
import { COMPANY_ROLES, ROLE_LABELS, User } from '../lib/types';
import { FormError } from './auth-shell';
import { Button, Chip, ConfirmDialog, Input, Sheet, SwitchRow, T } from './ui';

const weakPassword = (p: string) => p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p);

export function RoleChips({ value, onChange, disabled }: { value: string; onChange: (r: any) => void; disabled?: boolean }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <T variant="label" style={{ marginBottom: 6 }}>Role</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, opacity: disabled ? 0.5 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
        {COMPANY_ROLES.map((r) => (
          <Chip key={r} label={ROLE_LABELS[r]} selected={value === r} onPress={() => onChange(r)} />
        ))}
      </View>
    </View>
  );
}

/** Add (user = null) or edit a company user. */
export function UserSheet({
  visible, user, selfId, onClose, onSaved,
}: { visible: boolean; user: User | null; selfId?: string; onClose: () => void; onSaved: () => void }) {
  const editing = !!user;
  const isSelf = user?.id === selfId;
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'employee', phone: '', jobTitle: '', isActive: true });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setF({
      name: user?.name ?? '', email: user?.email ?? '', password: '', role: user?.role ?? 'employee',
      phone: user?.phone ?? '', jobTitle: user?.jobTitle ?? '', isActive: user?.isActive ?? true,
    });
    setNewPassword('');
    setError(null);
  }, [visible, user]);

  const set = (k: keyof typeof f) => (v: any) => setF((s) => ({ ...s, [k]: v }));

  async function run(fn: () => Promise<unknown>, okMessage: string, close = true) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast(okMessage);
      onSaved();
      if (close) onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (f.name.trim().length < 2) return setError('Enter the name');
    if (!editing) {
      if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError('Enter a valid email');
      if (weakPassword(f.password)) return setError('Password needs 8+ characters with letters and numbers');
      return run(
        () => post('/api/company/users', { name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role, phone: f.phone.trim() || undefined, jobTitle: f.jobTitle.trim() || undefined }),
        'User added',
      );
    }
    return run(
      () => patch(`/api/company/users/${user!.id}`, {
        name: f.name.trim(), phone: f.phone.trim() || null, jobTitle: f.jobTitle.trim() || null,
        ...(isSelf ? {} : { role: f.role, isActive: f.isActive }),
      }),
      'User updated',
    );
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={editing ? 'Edit user' : 'Add user'}
        footer={<Button title={editing ? 'Save changes' : 'Add user'} onPress={save} loading={busy} />}
      >
        <FormError message={error} />
        <Input label="Full name" value={f.name} onChangeText={set('name')} />
        {editing ? (
          <Input label="Email" value={f.email} editable={false} style={{ color: colors.muted }} />
        ) : (
          <>
            <Input label="Email (login)" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
            <Input label="Temporary password" value={f.password} onChangeText={set('password')} secure hint="Share it with the user; they can change it after login." />
          </>
        )}
        <RoleChips value={f.role} onChange={set('role')} disabled={isSelf} />
        <Input label="Job title" value={f.jobTitle} onChangeText={set('jobTitle')} />
        <Input label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
        {editing && !isSelf ? <SwitchRow label="Active" value={f.isActive} onChange={set('isActive')} hint="Inactive users cannot log in." /> : null}
        {isSelf ? <T variant="small">This is your own account: role and status can’t be changed here.</T> : null}

        {editing && !isSelf ? (
          <View style={{ marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
            <T variant="h3" style={{ marginBottom: space.sm }}>Reset password</T>
            <Input placeholder="New password" value={newPassword} onChangeText={setNewPassword} secure />
            <Button
              title="Reset password"
              variant="secondary"
              small
              style={{ alignSelf: 'flex-start' }}
              onPress={() => {
                if (weakPassword(newPassword)) return setError('Password needs 8+ characters with letters and numbers');
                void run(() => post(`/api/company/users/${user!.id}/reset-password`, { newPassword }), 'Password reset', false).then(() => setNewPassword(''));
              }}
            />
            <Button title="Delete user" variant="danger" small icon="trash-outline" style={{ alignSelf: 'flex-start', marginTop: space.lg }} onPress={() => setConfirmDelete(true)} />
          </View>
        ) : null}
      </Sheet>

      <ConfirmDialog
        visible={confirmDelete}
        danger
        title="Delete user?"
        message={`${user?.name ?? 'This user'} will lose access immediately and be removed permanently.`}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await run(() => del(`/api/company/users/${user!.id}`), 'User deleted');
          setConfirmDelete(false);
        }}
      />
    </>
  );
}
