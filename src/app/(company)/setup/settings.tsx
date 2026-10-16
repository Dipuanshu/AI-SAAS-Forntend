import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FormError } from '../../../components/auth-shell';
import { Banner, Button, Card, ErrorBox, Header, Input, Loading, Screen, SwitchRow, T } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { get, put } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import type { AiSettings } from '../../../lib/types';

export default function AiSettingsScreen() {
  const { data, error, loading, reload } = useApi(() => get<{ settings: AiSettings }>('/api/company/ai/settings'), []);
  const [about, setAbout] = useState('');
  const [allowDelete, setAllowDelete] = useState(false);
  const [fields, setFields] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAbout(data.settings.about);
    setAllowDelete(data.settings.allowDelete);
    setFields(data.settings.redactFields.join(', '));
  }, [data]);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await put('/api/company/ai/settings', {
        about: about.trim(),
        allowDelete,
        redactFields: fields.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast('Settings saved');
      await reload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header title="AI settings" onBack={() => (router.canGoBack() ? router.back() : router.replace('/setup'))} />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}
      {data ? (
        <>
          <FormError message={err} />
          <Card>
            <Input label="About your software" value={about} onChangeText={setAbout} multiline style={{ minHeight: 120, textAlignVertical: 'top' }}
              placeholder="e.g. Acme Store is our retail ERP. Products, orders and employees live here. Prices are in rupees. Orders can be 'pending' or 'delivered'."
              hint="The assistant reads this at the start of every chat. Mention business terms, units and rules." />
          </Card>
          <Card>
            <SwitchRow label="Allow deleting records" value={allowDelete} onChange={setAllowDelete} hint="Off by default. Even when on, every delete asks the user to confirm and only roles you allow can use delete tools." />
            {allowDelete ? <Banner tone="warning" icon="warning" title="Deleting is on" text="Review which roles can use each delete tool under API tools." /> : null}
          </Card>
          <Card>
            <Input label="Hidden fields" value={fields} onChangeText={setFields} autoCapitalize="none" multiline
              hint="Comma separated. These fields are removed from every answer before it reaches the AI (the connector removes them too). Example: password, salary, aadhaar" />
            <T variant="small">Removing sensitive fields is the safest protection: the AI cannot reveal what it never receives.</T>
          </Card>
          <Button title="Save settings" onPress={save} loading={busy} />
        </>
      ) : null}
    </Screen>
  );
}
