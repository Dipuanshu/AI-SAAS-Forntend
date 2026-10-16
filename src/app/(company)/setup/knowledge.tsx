import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FormError } from '../../../components/auth-shell';
import { Banner, Button, Card, ConfirmDialog, Empty, ErrorBox, Header, Input, Loading, Screen, Sheet, T } from '../../../components/ui';
import { useApi } from '../../../hooks/useApi';
import { del, get, post, put } from '../../../lib/api';
import { formatDate } from '../../../lib/format';
import { space } from '../../../lib/theme';
import { toast } from '../../../lib/toast';
import type { KnowledgeDoc } from '../../../lib/types';

export default function Knowledge() {
  const { data, error, loading, refreshing, onRefresh, reload } = useApi(() => get<{ items: KnowledgeDoc[] }>('/api/company/ai/knowledge'), []);
  const [edit, setEdit] = useState<{ open: boolean; doc: KnowledgeDoc | null }>({ open: false, doc: null });

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Header title="Help documents" subtitle="Answers for “how do I…” questions" onBack={() => (router.canGoBack() ? router.back() : router.replace('/setup'))}
        right={<Button title="Add" icon="add" small onPress={() => setEdit({ open: true, doc: null })} />} />
      <Banner tone="info" icon="book" title="No API call needed" text="Write short guides, FAQs and rules of your software. The assistant uses the most relevant ones when someone asks." />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : null}
      {loading ? <Loading /> : null}
      {data && data.items.length === 0 ? <Empty icon="book-outline" title="No documents yet" text="Add your first help article, for example “How to create an invoice”." /> : null}
      {data?.items.map((d) => (
        <Card key={d.id} onPress={() => setEdit({ open: true, doc: d })}>
          <T variant="h3">{d.title}</T>
          <T variant="small" numberOfLines={3} style={{ marginTop: 2 }}>{d.content}</T>
          <T variant="small" style={{ marginTop: 6 }}>Updated {formatDate(d.updatedAt)}</T>
        </Card>
      ))}
      <DocSheet state={edit} onClose={() => setEdit({ open: false, doc: null })} onSaved={reload} />
    </Screen>
  );
}

function DocSheet({ state, onClose, onSaved }: { state: { open: boolean; doc: KnowledgeDoc | null }; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    setTitle(state.doc?.title ?? '');
    setContent(state.doc?.content ?? '');
    setError(null);
  }, [state]);

  async function save() {
    if (title.trim().length < 2) return setError('Enter a title');
    if (content.trim().length < 5) return setError('Write the guide text');
    setBusy(true);
    try {
      if (state.doc) await put(`/api/company/ai/knowledge/${state.doc.id}`, { title: title.trim(), content: content.trim() });
      else await post('/api/company/ai/knowledge', { title: title.trim(), content: content.trim() });
      toast('Saved');
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet visible={state.open} onClose={onClose} title={state.doc ? 'Edit document' : 'New document'} footer={<Button title="Save" onPress={save} loading={busy} />}>
        <FormError message={error} />
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="How to create an invoice" />
        <Input label="Content" value={content} onChangeText={setContent} multiline style={{ minHeight: 160, textAlignVertical: 'top' }} placeholder="Step 1: open Billing…" />
        {state.doc ? <Button title="Delete document" variant="danger" small icon="trash-outline" style={{ alignSelf: 'flex-start', marginTop: space.sm }} onPress={() => setConfirm(true)} /> : null}
      </Sheet>
      <ConfirmDialog visible={confirm} danger title="Delete document?" message="The assistant will no longer use it." confirmLabel="Delete" onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await del(`/api/company/ai/knowledge/${state.doc!.id}`);
            toast('Deleted');
            onSaved();
            onClose();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setConfirm(false);
          }
        }} />
    </>
  );
}
