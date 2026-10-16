import { useState } from 'react';
import { post } from '../lib/api';
import { setTokens } from '../lib/api';
import { setItem } from '../lib/storage';
import { toast } from '../lib/toast';
import { FormError } from './auth-shell';
import { Button, Input, Sheet } from './ui';

/** Change-password dialog shared by company users and the super admin. */
export function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!current) return setError('Enter your current password');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return setError('New password needs 8+ characters with letters and numbers');
    if (next !== confirm) return setError('Passwords do not match');
    setBusy(true);
    setError(null);
    try {
      // The server revokes other sessions and returns a fresh token pair for this device.
      const r = await post<{ accessToken: string; refreshToken: string }>('/api/auth/change-password', { currentPassword: current, newPassword: next });
      setTokens(r.accessToken, r.refreshToken);
      await setItem('auth.access', r.accessToken);
      await setItem('auth.refresh', r.refreshToken);
      toast('Password changed');
      setCurrent(''); setNext(''); setConfirm('');
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Change password" footer={<Button title="Update password" onPress={save} loading={busy} />}>
      <FormError message={error} />
      <Input label="Current password" value={current} onChangeText={setCurrent} secure />
      <Input label="New password" value={next} onChangeText={setNext} secure />
      <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secure />
    </Sheet>
  );
}
