import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Trash2, FileText, FileSpreadsheet, FileImage, FileArchive } from 'lucide-react';
import { leadDocumentApi } from '../../api';
import { confirmDialog, toast } from '../../store/uiStore';
import { Card, CardHead } from '../ui/Card';
import IconButton from '../ui/IconButton';
import Spinner from '../ui/Spinner';
import { Input } from '../forms/Field';
import { bytes } from '../../utils/formats';
import { cn } from '../../utils/cn';

function fileIcon(contentType = '') {
  if (contentType.startsWith('image/')) return FileImage;
  if (contentType.includes('sheet') || contentType.includes('excel') || contentType === 'text/csv') return FileSpreadsheet;
  if (contentType.includes('zip')) return FileArchive;
  return FileText;
}

/**
 * Attachments on one lead — passport scans, transcripts, offer letters.
 * Shown on the enquiry detail page; uploading and deleting need leads.edit.
 */
export default function LeadDocuments({ leadId, canEdit }) {
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [label, setLabel] = useState('');
  const [dragging, setDragging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['lead-documents', leadId],
    queryFn: () => leadDocumentApi.list(leadId),
    enabled: Boolean(leadId),
  });

  const docs = data?.data || [];
  const maxBytes = data?.meta?.maxBytes || 15 * 1024 * 1024;
  const accept = data?.meta?.accept || 'PDF, Word, Excel or an image';

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lead-documents', leadId] });

  const upload = useMutation({
    mutationFn: (file) => leadDocumentApi.upload(leadId, file, label),
    onSuccess: () => { toast('Document attached'); setLabel(''); invalidate(); },
    onError: (e) => toast(e.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (docId) => leadDocumentApi.remove(leadId, docId),
    onSuccess: () => { toast('Document removed'); invalidate(); },
    onError: (e) => toast(e.message, 'err'),
  });

  const pick = (file) => {
    if (!file) return;
    if (file.size > maxBytes) {
      toast(`That file is ${bytes(file.size)} — the limit is ${bytes(maxBytes)}`, 'err');
      return;
    }
    upload.mutate(file);
  };

  const onDelete = async (doc) => {
    const yes = await confirmDialog({
      title: 'Remove this document?',
      message: `${doc.originalName} will be deleted from this lead.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (yes) remove.mutate(doc.id);
  };

  const download = async (doc) => {
    try {
      await leadDocumentApi.download(leadId, doc.id, doc.originalName);
    } catch (e) {
      toast(e.message, 'err');
    }
  };

  return (
    <Card>
      <CardHead title="Documents" sub={docs.length ? `${docs.length} attached` : 'Nothing attached yet'} />
      <div className="card-pad">
        {canEdit && (
          <div className="lead-doc-upload">
            <Input
              placeholder="Label (optional) — e.g. Passport copy"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button
              type="button"
              className={cn('doc-drop is-compact', dragging && 'has-file')}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
              disabled={upload.isPending}
            >
              {upload.isPending ? <span className="spinner" /> : <Upload />}
              <span>
                <b>{upload.isPending ? 'Uploading…' : 'Attach a file'}</b>
                <small>{accept}. Up to {bytes(maxBytes)}.</small>
              </span>
            </button>
            <input ref={inputRef} type="file" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        )}

        {isLoading ? (
          <Spinner />
        ) : docs.length === 0 ? (
          <p className="tiny muted" style={{ marginTop: canEdit ? 14 : 0 }}>
            {canEdit
              ? 'Attach anything worth keeping with the lead — passport, transcripts, offer letters.'
              : 'No documents have been attached to this lead.'}
          </p>
        ) : (
          <ul className="lead-doc-list">
            {docs.map((doc) => {
              const Icon = fileIcon(doc.contentType);
              return (
                <li key={doc.id}>
                  <span className="doc-ico sm"><Icon /></span>
                  <div style={{ minWidth: 0 }}>
                    <b title={doc.originalName}>{doc.label || doc.originalName}</b>
                    <small>
                      {bytes(doc.size)}
                      {doc.label ? ` · ${doc.originalName}` : ''}
                      {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ''}
                    </small>
                  </div>
                  <div className="lead-doc-actions">
                    <IconButton icon={Download} label="Download" onClick={() => download(doc)} />
                    {canEdit && <IconButton icon={Trash2} label="Remove" onClick={() => onDelete(doc)} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
