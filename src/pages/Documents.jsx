import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Search, Trash2, Download, FolderOpen, FileText, FileSpreadsheet, FileImage, FileArchive, Pencil,
} from 'lucide-react';
import { libraryApi } from '../api';
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
import { Field, Input, Textarea, Select } from '../components/forms/Field';
import { bytes } from '../utils/formats';
import { cn } from '../utils/cn';

// A rough icon per file family — enough to scan the list quickly.
function fileIcon(contentType = '') {
  if (contentType.startsWith('image/')) return FileImage;
  if (contentType.includes('sheet') || contentType.includes('excel') || contentType === 'text/csv') return FileSpreadsheet;
  if (contentType.includes('zip')) return FileArchive;
  return FileText;
}

function UploadModal({ open, categories, onClose, onUpload, uploading, accept, maxBytes }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const inputRef = useRef(null);

  const reset = () => { setFile(null); setTitle(''); setDescription(''); setCategory('general'); };
  const close = () => { reset(); onClose(); };

  const pick = (chosen) => {
    if (!chosen) return;
    if (chosen.size > maxBytes) {
      toast(`That file is ${bytes(chosen.size)} — the limit is ${bytes(maxBytes)}`, 'err');
      return;
    }
    setFile(chosen);
    // Pre-fill the title from the filename; the uploader can still change it.
    if (!title) setTitle(chosen.name.replace(/\.[^.]+$/, ''));
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload a document"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button icon={Upload} loading={uploading} disabled={!file} onClick={() => onUpload({ file, title, description, category })}>
            Upload
          </Button>
        </>
      }
    >
      <button
        type="button"
        className={cn('doc-drop', file && 'has-file')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
      >
        <Upload />
        {file ? (
          <span><b>{file.name}</b><small>{bytes(file.size)} — click to choose another</small></span>
        ) : (
          <span><b>Choose a file or drop it here</b><small>{accept}. Up to {bytes(maxBytes)}.</small></span>
        )}
      </button>
      <input ref={inputRef} type="file" hidden onChange={(e) => pick(e.target.files?.[0])} />

      <div className="form-grid" style={{ marginTop: 16 }}>
        <Field label="Title" full hint="What the team will see in the list.">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="UK visa document checklist" />
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c.key, label: c.label }))} />
        </Field>
        <Field label="Notes" full>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who it is for and when to send it." />
        </Field>
      </div>
    </Modal>
  );
}

function EditModal({ doc, categories, onClose, onSave, saving }) {
  const [title, setTitle] = useState(doc?.title || '');
  const [description, setDescription] = useState(doc?.description || '');
  const [category, setCategory] = useState(doc?.category || 'general');
  if (!doc) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit document"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => onSave({ title, description, category })}>Save</Button>
        </>
      }
    >
      <p className="tiny muted" style={{ marginBottom: 14 }}>
        The file itself cannot be swapped — upload a new version and delete the old one, so nobody sends the wrong copy.
      </p>
      <div className="form-grid">
        <Field label="Title" full><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c.key, label: c.label }))} />
        </Field>
        <Field label="Notes" full><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function Documents() {
  const qc = useQueryClient();
  const canEdit = useCanModule('documents', 'edit');
  const canDelete = useCanModule('documents', 'delete');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  // Bumped after each upload so the modal remounts empty next time.
  const [uploadKey, setUploadKey] = useState(0);
  const [editing, setEditing] = useState(null);

  const debounced = useDebounced(search, 300);
  const params = useMemo(() => ({ page, limit: 24, search: debounced, category }), [page, debounced, category]);

  const { data: options } = useQuery({ queryKey: ['documents', 'options'], queryFn: libraryApi.options, staleTime: Infinity });
  const { data, isLoading } = useQuery({
    queryKey: ['documents', params],
    queryFn: () => libraryApi.list(params),
    placeholderData: (prev) => prev,
  });

  const categories = options?.data?.categories || [];
  const accept = options?.data?.accept || 'PDF, Word, Excel or an image';
  const maxBytes = options?.data?.maxBytes || 15 * 1024 * 1024;
  const rows = data?.data || [];
  const meta = data?.meta;
  const counts = meta?.counts || {};
  const label = Object.fromEntries(categories.map((c) => [c.key, c.label]));

  const invalidate = () => qc.invalidateQueries({ queryKey: ['documents'] });

  const upload = useMutation({
    mutationFn: ({ file, ...metaFields }) => libraryApi.upload(file, metaFields),
    onSuccess: () => { toast('Document uploaded'); setUploadOpen(false); setUploadKey((k) => k + 1); invalidate(); },
    onError: (e) => toast(e.message, 'err'),
  });

  const save = useMutation({
    mutationFn: (values) => libraryApi.update(editing.id, values),
    onSuccess: () => { toast('Document updated'); setEditing(null); invalidate(); },
    onError: (e) => toast(e.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (id) => libraryApi.remove(id),
    onSuccess: () => { toast('Document deleted'); invalidate(); },
    onError: (e) => toast(e.message, 'err'),
  });

  const onDelete = async (doc) => {
    const yes = await confirmDialog({
      title: 'Delete this document?',
      message: `"${doc.title}" will be removed for everyone and cannot be recovered.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (yes) remove.mutate(doc.id);
  };

  const download = async (doc) => {
    try {
      await libraryApi.download(doc.id, doc.originalName);
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  const pick = (key) => { setCategory(key === category ? '' : key); setPage(1); };

  return (
    <>
      <PageHeader
        crumb="Team workspace"
        title="Important documents"
        sub="The shared library — brochures, checklists, agreements and rate cards. Everyone can download; uploading is restricted."
      >
        {canEdit && <Button icon={Upload} onClick={() => setUploadOpen(true)}>Upload document</Button>}
      </PageHeader>

      <Card>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <Input placeholder="Search titles, notes and filenames…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="chips">
            <button type="button" className={cn('chip', !category && 'active')} onClick={() => pick('')}>
              All<span>{meta?.total ?? 0}</span>
            </button>
            {categories.map((c) => (
              <button key={c.key} type="button" className={cn('chip', category === c.key && 'active')} onClick={() => pick(c.key)}>
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
              icon={FolderOpen}
              title={search || category ? 'Nothing matches that' : 'The library is empty'}
              message={
                search || category
                  ? 'Clear the search or pick another category.'
                  : canEdit
                    ? 'Upload the files the team keeps asking for — checklists, brochures, agreements.'
                    : 'Ask a super admin to upload the documents your team needs.'
              }
              action={canEdit && !search && !category ? <Button icon={Upload} onClick={() => setUploadOpen(true)}>Upload document</Button> : null}
            />
          ) : (
            <div className="doc-grid">
              {rows.map((doc) => {
                const Icon = fileIcon(doc.contentType);
                return (
                  <div key={doc.id} className="doc-card">
                    <span className="doc-ico"><Icon /></span>
                    <div className="doc-main">
                      <b title={doc.title}>{doc.title}</b>
                      {doc.description && <p className="tiny muted">{doc.description}</p>}
                      <div className="doc-meta">
                        <Badge tone="neutral">{label[doc.category] || doc.category}</Badge>
                        <span className="tiny muted">{bytes(doc.size)}</span>
                        <span className="tiny muted" title={doc.originalName}>{doc.originalName}</span>
                        {doc.downloads > 0 && <span className="tiny muted">{doc.downloads} download{doc.downloads === 1 ? '' : 's'}</span>}
                      </div>
                    </div>
                    <div className="doc-actions">
                      <IconButton icon={Download} label="Download" onClick={() => download(doc)} />
                      {canEdit && <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(doc)} />}
                      {canDelete && <IconButton icon={Trash2} label="Delete" onClick={() => onDelete(doc)} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {meta && meta.pages > 1 && <Pagination meta={meta} onChange={setPage} />}
      </Card>

      <UploadModal
        key={uploadKey}
        open={uploadOpen}
        categories={categories}
        accept={accept}
        maxBytes={maxBytes}
        uploading={upload.isPending}
        onClose={() => setUploadOpen(false)}
        onUpload={(values) => upload.mutate(values)}
      />

      {editing && (
        <EditModal
          doc={editing}
          categories={categories}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(values) => save.mutate(values)}
        />
      )}
    </>
  );
}
