import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, MessageSquare, Send, Trash2 } from 'lucide-react';
import { enquiryApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { confirmDialog, toast } from '../store/uiStore';
import { STATUS_OPTIONS, STATUS_TONE } from '../utils/enquiryStatus';
import { formatDateTime, relativeTime, initialsOf } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Field, Select, Textarea } from '../components/forms/Field';

function DetailRow({ label, value }) {
  return (
    <div className="list-row">
      <span className="tiny muted" style={{ width: 130, flexShrink: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: '.86rem' }}>{value || <span className="muted">—</span>}</span>
    </div>
  );
}

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [note, setNote] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => enquiryApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
    queryClient.invalidateQueries({ queryKey: ['enquiries'] });
  };

  const updateStatus = useMutation({
    mutationFn: (status) => enquiryApi.update(id, { status }),
    onSuccess: () => { invalidate(); toast('Status updated'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const addNote = useMutation({
    mutationFn: (body) => enquiryApi.addNote(id, body),
    onSuccess: () => { invalidate(); setNote(''); toast('Note added'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: () => enquiryApi.remove(id),
    onSuccess: () => { invalidate(); toast('Enquiry deleted'); navigate('/enquiries'); },
    onError: (err) => toast(err.message, 'err'),
  });

  if (isLoading) return <Spinner label="Loading enquiry…" />;
  if (error) return <EmptyState title="Enquiry not found" message={error.message} action={<Link to="/enquiries"><Button variant="ghost">Back to enquiries</Button></Link>} />;

  const e = data.data;

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete enquiry?',
      message: `${e.name}'s enquiry will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate();
  };

  return (
    <div className="content-narrow">
      <Link to="/enquiries" className="row-gap tiny muted" style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Back to enquiries
      </Link>

      <PageHeader crumb={`Received ${relativeTime(e.createdAt)}`} title={e.name}>
        {['super_admin', 'admin'].includes(role) && (
          <Button variant="ghost" icon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        )}
      </PageHeader>

      <div className="stack">
        <Card>
          <CardHead title="Contact">
            <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
          </CardHead>
          <div className="card-pad row-gap">
            <Button variant="gold" size="sm" icon={Phone} onClick={() => window.open(`tel:${e.code}${e.phone}`)}>
              {e.code} {e.phone}
            </Button>
            <Button variant="ghost" size="sm" icon={Mail} onClick={() => window.open(`mailto:${e.email}`)}>
              {e.email}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={MessageSquare}
              onClick={() => window.open(`https://wa.me/${(e.code + e.phone).replace(/\D/g, '')}`, '_blank')}
            >
              WhatsApp
            </Button>
          </div>
        </Card>

        <Card>
          <CardHead title="What they told us" />
          <div>
            <DetailRow label="Destination" value={e.destination} />
            <DetailRow label="Study level" value={e.level} />
            <DetailRow label="Intake" value={e.intake} />
            <DetailRow label="Test status" value={e.test} />
            <DetailRow label="Qualification" value={e.qual} />
            <DetailRow label="Message" value={e.message} />
            <DetailRow label="Came from" value={e.sourcePage || e.source} />
            <DetailRow label="Submitted" value={formatDateTime(e.createdAt)} />
          </div>
        </Card>

        <Card>
          <CardHead title="Pipeline status" sub="Where this lead sits right now" />
          <div className="card-pad" style={{ maxWidth: 280 }}>
            <Field label="Status">
              <Select value={e.status} options={STATUS_OPTIONS} onChange={(ev) => updateStatus.mutate(ev.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHead title={`Notes (${e.notes?.length || 0})`} sub="Visible to your team only" />

          {e.notes?.length ? (
            <div>
              {[...e.notes].reverse().map((n) => (
                <div className="list-row" key={n._id || n.createdAt} style={{ alignItems: 'flex-start' }}>
                  <span className="avatar">{initialsOf(n.authorName || 'GIA')}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '.86rem' }}>{n.body}</div>
                    <div className="tiny muted">
                      {n.authorName} · {relativeTime(n.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="card-pad tiny muted">No notes yet. Log what happened on the call so the next person has context.</p>
          )}

          <div className="card-pad" style={{ borderTop: '1px solid var(--line-2)' }}>
            <Field label="Add a note">
              <Textarea
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder="Called — interested in Canada, needs loan guidance, following up Friday."
                rows={3}
              />
            </Field>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              loading={addNote.isPending}
              disabled={!note.trim()}
              onClick={() => addNote.mutate(note.trim())}
            >
              Save note
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
