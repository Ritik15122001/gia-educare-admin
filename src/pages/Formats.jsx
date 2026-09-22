import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Copy, Check, Eye, MessageSquareText } from 'lucide-react';
import { formatApi } from '../api';
import { useCanModule } from '../store/authStore';
import { useDebounced } from '../hooks/useDebounced';
import { confirmDialog, toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/data/Pagination';
import { Input } from '../components/forms/Field';
import FormatModal from '../components/forms/FormatModal';
import { CHANNEL_TONE, fillTokens, tokensUsed, sampleValues, copyText } from '../utils/formats';
import { cn } from '../utils/cn';

// Preview: the format with the API's sample values swapped in, plus a copy
// button for the raw version (tokens intact) that the team actually sends.
function PreviewModal({ format, placeholders, onClose }) {
  const [copied, setCopied] = useState('');
  if (!format) return null;

  const values = sampleValues(placeholders);
  const subject = fillTokens(format.subject, values);
  const body = fillTokens(format.body, values);
  const used = tokensUsed(format.subject, format.body);

  const copy = async (text, which) => {
    if (await copyText(text)) {
      setCopied(which);
      toast('Copied to clipboard');
      setTimeout(() => setCopied(''), 1600);
    } else {
      toast('Your browser blocked the clipboard — select the text and copy it', 'err');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={format.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            variant="outline"
            icon={copied === 'raw' ? Check : Copy}
            onClick={() => copy([format.subject, format.body].filter(Boolean).join('\n\n'), 'raw')}
          >
            Copy with placeholders
          </Button>
          <Button
            variant="gold"
            icon={copied === 'filled' ? Check : Copy}
            onClick={() => copy([subject, body].filter(Boolean).join('\n\n'), 'filled')}
          >
            Copy this preview
          </Button>
        </>
      }
    >
      <p className="tiny muted" style={{ marginBottom: 14 }}>
        Shown with example details filled in. Copying with placeholders keeps
        <code className="mono"> {'{{name}}'} </code> and friends so you can replace them for the student in front of you.
      </p>

      {format.description && <p className="fmt-when">{format.description}</p>}

      <div className="fmt-preview">
        {format.channel === 'email' && subject && (
          <div className="fmt-preview-subject"><b>Subject:</b> {subject}</div>
        )}
        <pre className="fmt-preview-body">{body}</pre>
      </div>

      {used.length > 0 && (
        <div className="token-bar" style={{ marginTop: 14 }}>
          <span className="tiny muted">Placeholders used:</span>
          {used.map((t) => <span key={t} className="token-chip is-static">{`{{${t}}}`}</span>)}
        </div>
      )}
    </Modal>
  );
}

function FormatCard({ format, channels, canEdit, canDelete, onPreview, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false);
  const channel = channels.find((c) => c.key === format.channel);

  const copy = async () => {
    if (await copyText([format.subject, format.body].filter(Boolean).join('\n\n'))) {
      setCopied(true);
      toast('Copied to clipboard');
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast('Your browser blocked the clipboard', 'err');
    }
  };

  return (
    <div className={cn('fmt-card', !format.active && 'is-archived')}>
      <div className="fmt-card-head">
        <div style={{ minWidth: 0 }}>
          <b title={format.title}>{format.title}</b>
          {format.description && <p className="tiny muted">{format.description}</p>}
        </div>
        <Badge tone={CHANNEL_TONE[format.channel] || 'neutral'}>{channel?.label || format.channel}</Badge>
      </div>

      {format.channel === 'email' && format.subject && (
        <div className="fmt-card-subject">{format.subject}</div>
      )}
      <pre className="fmt-card-body">{format.body}</pre>

      <div className="fmt-card-foot">
        {!format.active && <Badge tone="warn">Archived</Badge>}
        <span className="tiny muted">{format.updatedByName || format.createdByName}</span>
        <div className="fmt-card-actions">
          <IconButton icon={copied ? Check : Copy} label="Copy" onClick={copy} />
          <IconButton icon={Eye} label="Preview" onClick={() => onPreview(format)} />
          {canEdit && <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(format)} />}
          {canDelete && <IconButton icon={Trash2} label="Delete" onClick={() => onDelete(format)} />}
        </div>
      </div>
    </div>
  );
}

export default function Formats() {
  const qc = useQueryClient();
  const canEdit = useCanModule('formats', 'edit');
  const canDelete = useCanModule('formats', 'delete');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new
  const [preview, setPreview] = useState(null);

  const debounced = useDebounced(search, 300);
  const params = useMemo(() => ({ page, limit: 24, search: debounced, channel }), [page, debounced, channel]);

  const { data: options } = useQuery({ queryKey: ['formats', 'options'], queryFn: formatApi.options, staleTime: Infinity });
  const { data, isLoading } = useQuery({
    queryKey: ['formats', params],
    queryFn: () => formatApi.list(params),
    placeholderData: (prev) => prev,
  });

  const channels = options?.data?.channels || [];
  const placeholders = options?.data?.placeholders || [];
  const rows = data?.data || [];
  const meta = data?.meta;
  const counts = meta?.counts || {};

  const invalidate = () => qc.invalidateQueries({ queryKey: ['formats'] });

  const save = useMutation({
    mutationFn: (values) => (editing?.id ? formatApi.update(editing.id, values) : formatApi.create(values)),
    onSuccess: () => {
      toast(editing?.id ? 'Format updated' : 'Format added');
      setEditing(null);
      invalidate();
    },
    onError: (e) => toast(e.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (id) => formatApi.remove(id),
    onSuccess: () => { toast('Format deleted'); invalidate(); },
    onError: (e) => toast(e.message, 'err'),
  });

  const onDelete = async (format) => {
    const yes = await confirmDialog({
      title: 'Delete this format?',
      message: `"${format.title}" will be removed for everyone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (yes) remove.mutate(format.id);
  };

  const pick = (key) => { setChannel(key === channel ? '' : key); setPage(1); };

  return (
    <>
      <PageHeader
        crumb="Team workspace"
        title="Important formats"
        sub="The approved wording for replying to a lead — WhatsApp, email, SMS and call scripts. Copy one, fill in the placeholders, send."
      >
        {canEdit && <Button icon={Plus} onClick={() => setEditing({})}>New format</Button>}
      </PageHeader>

      <Card>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <Input placeholder="Search titles and wording…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="chips">
            <button type="button" className={cn('chip', !channel && 'active')} onClick={() => pick('')}>
              All<span>{meta?.total ?? 0}</span>
            </button>
            {channels.map((c) => (
              <button key={c.key} type="button" className={cn('chip', channel === c.key && 'active')} onClick={() => pick(c.key)}>
                {c.label}<span>{counts[c.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card-pad">
          {isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title={search || channel ? 'No format matches that' : 'No formats yet'}
              message={
                search || channel
                  ? 'Clear the search or pick another channel.'
                  : 'Add the messages your counsellors send every day, so everyone sends the same thing.'
              }
              action={canEdit && !search && !channel ? <Button icon={Plus} onClick={() => setEditing({})}>New format</Button> : null}
            />
          ) : (
            <div className="fmt-grid">
              {rows.map((f) => (
                <FormatCard
                  key={f.id}
                  format={f}
                  channels={channels}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onPreview={setPreview}
                  onEdit={setEditing}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>

        {meta && meta.pages > 1 && <Pagination meta={meta} onChange={setPage} />}
      </Card>

      <FormatModal
        open={Boolean(editing)}
        format={editing?.id ? editing : null}
        channels={channels}
        placeholders={placeholders}
        saving={save.isPending}
        onClose={() => setEditing(null)}
        onSave={(values) => save.mutate(values)}
      />

      <PreviewModal format={preview} placeholders={placeholders} onClose={() => setPreview(null)} />
    </>
  );
}
