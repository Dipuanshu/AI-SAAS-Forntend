import { useState } from 'react';
import { ChangePasswordSheet } from '../../components/account';
import { Badge, Button, Card, Header, Row, Screen, T } from '../../components/ui';
import { API_URL } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { space } from '../../lib/theme';

export default function AdminAccount() {
  const { user, logout } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <Screen>
      <Header title="Account" />
      <Card>
        <T variant="h3">{user?.name}</T>
        <T variant="small" style={{ marginBottom: space.sm }}>{user?.email}</T>
        <Row label="Role"><Badge label="Super Admin" tone="primary" /></Row>
        <Row label="Last login" value={formatDateTime(user?.lastLoginAt)} />
        <Row label="API server" value={API_URL} />
      </Card>
      <Button title="Change password" variant="secondary" icon="key-outline" onPress={() => setPwOpen(true)} />
      <Button title="Log out" variant="danger" icon="log-out-outline" onPress={logout} style={{ marginTop: space.md }} />
      <ChangePasswordSheet visible={pwOpen} onClose={() => setPwOpen(false)} />
    </Screen>
  );
}
