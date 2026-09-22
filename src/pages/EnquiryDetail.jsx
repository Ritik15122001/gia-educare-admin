import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, MessageSquare, Send, Trash2, UserCheck } from 'lucide-react';
import { enquiryApi } from '../api';
import { useAuthStore, can } from '../store/authStore';
import { confirmDialog, toast } from '../store/uiStore';
import { STATUS_OPTIONS, STATUS_TONE, statusLabel } from '../utils/enquiryStatus';
import { followUpLabel, followUpTone, todayStr, plusDays } from '../utils/followUp';
import { formatDateTime, relativeTime, initialsOf } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import LeadDocuments from '../components/data/LeadDocuments';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Field, Select, Textarea, Input } from '../components/forms/Field';
import { LEAD_TYPES, leadTypeOf, leadTypeLabel, leadTypeTone } from '../utils/leadType';

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
  const user = useAuthStore((s) => s.user);
  const canEdit = can(user, 'leads.edit');
  const canAssign = can(user, 'leads.assign');
  const [note, setNote] = useState('');
  // Draft assignment; null = untouched, so it follows the saved value.
  const [draft, setDraft] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => enquiryApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
    queryClient.invalidateQueries({ queryKey: ['enquiries'] });
  };

  const setFollowUp = useMutation({
    mutationFn: (followUpAt) => enquiryApi.update(id, { followUpAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiry', id] });
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      toast('Follow-up updated');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  const setLeadType = useMutation({
    mutationFn: (leadType) => enquiryApi.update(id, { leadType }),
    onSuccess: () => { toast('Lead type updated'); invalidate(); },
    onError: (err) => toast(err.message, 'err'),
  });

  const updateStatus = useMutation({
    mutationFn: (status) => enquiryApi.update(id, { status }),
    onSuccess: () => { invalidate(); toast('Status updated'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const { data: assigneeData } = useQuery({
    queryKey: ['assignees'],
    queryFn: enquiryApi.assignees,
    enabled: canAssign,
    staleTime: 60_000,
  });
  const assignees = assigneeData?.data || { roles: [], users: [] };

  const assign = useMutation({
    mutationFn: (payload) => enquiryApi.update(id, payload),
    onSuccess: () => { invalidate(); setDraft(null); toast('Assignment saved'); },
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
  const saved = { assignedRole: e.assignedRole || '', assignedTo: e.assignedTo?.id || null };
  const current = draft || saved;
  const dirty = current.assignedRole !== saved.assignedRole || current.assignedTo !== saved.assignedTo;
  const roleOptions = assignees.roles.map((r) => ({ value: r.key, label: r.leadScope === 'all' ? `${r.name} (sees all leads)` : r.name }));
  if (saved.assignedRole && !roleOptions.some((o) => o.value === saved.assignedRole)) {
    roleOptions.push({ value: saved.assignedRole, label: e.assignedRoleName || saved.assignedRole });
  }
  const peopleOptions = assignees.users
    .filter((u) => u.role === current.assignedRole)
    .map((u) => ({ value: u.id, label: u.name }));
  if (saved.assignedTo && current.assignedTo === saved.assignedTo && !peopleOptions.some((o) => o.value === saved.assignedTo)) {
    peopleOptions.push({ value: saved.assignedTo, label: e.assignedTo.name });
  }

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
        {can(user, 'leads.delete') && (
          <Button variant="ghost" icon={Trash2} onClick={handleDelete}>
            Delete
          </Button>
        )}
      </PageHeader>

      <div className="stack">
        <Card>
          <CardHead title="Contact">
            <Badge tone={leadTypeTone(e)}>{leadTypeLabel(e)}</Badge>
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
            <DetailRow label="Budget" value={e.budget} />
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
          <CardHead title="Referral & attribution" sub="How this student found you" />
          <div>
            <DetailRow label="Referral" value={e.referral} />
            <DetailRow label="UTM source" value={e.utmSource} />
            <DetailRow label="UTM medium" value={e.utmMedium} />
            <DetailRow label="UTM campaign" value={e.utmCampaign} />
            <DetailRow label="Landing page" value={e.landingPage} />
            <DetailRow label="Referring site" value={e.referrerUrl} />
          </div>
        </Card>

        <Card>
          <CardHead title="Assignment" sub="Everyone in the role sees this lead; pick a person to make one of them responsible">
            {e.assignedAt && <span className="tiny muted">Assigned {relativeTime(e.assignedAt)}</span>}
          </CardHead>
          {canAssign ? (
            <div className="card-pad">
              <div className="form-grid">
                <Field label="Role / team">
                  <Select
                    placeholder="Unassigned"
                    value={current.assignedRole}
                    options={roleOptions}
                    onChange={(ev) => setDraft({ assignedRole: ev.target.value, assignedTo: null })}
                  />
                </Field>
                <Field label="Person" hint={current.assignedRole ? undefined : 'Choose a role first.'}>
                  <Select
                    placeholder={current.assignedRole ? 'Whole team' : '—'}
                    value={current.assignedTo || ''}
                    options={peopleOptions}
                    disabled={!current.assignedRole}
                    onChange={(ev) => setDraft({ ...current, assignedTo: ev.target.value || null })}
                  />
                </Field>
              </div>
              <div className="row-gap">
                <Button variant="primary" size="sm" icon={UserCheck} loading={assign.isPending} disabled={!dirty} onClick={() => assign.mutate(current)}>
                  Save assignment
                </Button>
                {dirty && <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>Reset</Button>}
              </div>
            </div>
          ) : (
            <div>
              <DetailRow label="Role / team" value={e.assignedRoleName || e.assignedRole} />
              <DetailRow label="Person" value={e.assignedTo?.name || (e.assignedRole ? 'Whole team' : '')} />
            </div>
          )}
        </Card>

        <Card>
          <CardHead title="Pipeline status" sub="Where this lead sits right now" />
          <div className="card-pad">
            {canEdit ? (
              <div className="form-grid">
                <Field label="Status">
                  <Select value={e.status} options={STATUS_OPTIONS} onChange={(ev) => updateStatus.mutate(ev.target.value)} />
                </Field>
                <Field label="Lead type" hint="B2C is a student; B2B is a partner, agent or school.">
                  <Select
                    value={leadTypeOf(e)}
                    options={LEAD_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    onChange={(ev) => setLeadType.mutate(ev.target.value)}
                  />
                </Field>
                <Field label="Next follow-up" hint="Feeds the today and missed queues on the list.">
                  <Input
                    type="date"
                    value={e.followUpAt ? String(e.followUpAt).slice(0, 10) : ''}
                    onChange={(ev) => setFollowUp.mutate(ev.target.value || null)}
                  />
                </Field>
                <div className="row-gap full" style={{ marginTop: -6 }}>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFollowUp.mutate(todayStr())}>Today</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFollowUp.mutate(plusDays(1))}>Tomorrow</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFollowUp.mutate(plusDays(3))}>In 3 days</button>
                  {e.followUpAt && (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFollowUp.mutate(null)}>Clear</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="row-gap">
                <Badge tone={STATUS_TONE[e.status]}>{statusLabel(e.status)}</Badge>
                {e.followUpAt && <Badge tone={followUpTone(e.followUpAt, e.status)}>Follow up {followUpLabel(e.followUpAt).toLowerCase()}</Badge>}
              </div>
            )}
          </div>
        </Card>

        <LeadDocuments leadId={id} canEdit={canEdit} />

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

          {canEdit && (
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
          )}
        </Card>
      </div>
    </div>
  );
}
