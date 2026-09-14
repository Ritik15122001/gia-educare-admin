import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ShieldCheck, Users2 } from 'lucide-react';
import { roleApi } from '../api';
import { confirmDialog, toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Select, Checkbox } from '../components/forms/Field';

const SCOPE_OPTIONS = [
  { value: 'assigned', label: 'Only enquiries assigned to them or their role' },
  { value: 'all', label: 'Every enquiry' },
];

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(60),
  description: z.string().trim().max(240),
  leadScope: z.enum(['all', 'assigned']),
  permissions: z.array(z.string()),
});

function RoleModal({ open, record, groups, onClose, onSubmit, saving }) {
  const isEdit = Boolean(record?.id);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    values: {
      name: record?.name || '',
      description: record?.description || '',
      leadScope: record?.leadScope || 'assigned',
      permissions: record?.permissions || [],
    },
  });

  const permissions = watch('permissions');
  const canViewLeads = permissions.includes('leads.view');

  const toggle = (key, on) => {
    const next = on ? [...new Set([...permissions, key])] : permissions.filter((p) => p !== key);
    // Every other lead permission is meaningless without being able to see the lead.
    const cleaned = key === 'leads.view' && !on ? next.filter((p) => !p.startsWith('leads.')) : next;
    setValue('permissions', cleaned, { shouldDirty: true });
  };

  const toggleGroup = (group, on) => {
    const keys = group.permissions.map((p) => p.key);
    const next = on ? [...new Set([...permissions, ...keys])] : permissions.filter((p) => !keys.includes(p));
    setValue('permissions', next, { shouldDirty: true });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit role — ${record.name}` : 'New role'}
      footer={
        <>
          <span className="tiny muted">{permissions.length} permission(s)</span>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" loading={saving} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save role' : 'Create role'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Role name" required error={errors.name?.message}>
          <Input {...register('name')} placeholder="Canada Team" />
        </Field>
        <Field label="Can see" hint={canViewLeads ? undefined : 'Only applies once “View enquiries” is ticked.'}>
          <Select {...register('leadScope')} options={SCOPE_OPTIONS} disabled={!canViewLeads} />
        </Field>
        <Field label="Description" full error={errors.description?.message}>
          <Input {...register('description')} placeholder="Counsellors handling Canada admissions" />
        </Field>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {groups.map((group) => {
          const keys = group.permissions.map((p) => p.key);
          const allOn = keys.every((k) => permissions.includes(k));
          return (
            <div key={group.key} style={{ border: '1px solid var(--line-2)', borderRadius: 10 }}>
              <div className="row-gap" style={{ justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line-2)' }}>
                <b style={{ fontSize: '.85rem' }}>{group.label}</b>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleGroup(group, !allOn)}>
                  {allOn ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="stack" style={{ gap: 10, padding: '12px 14px' }}>
                {group.permissions.map((p) => {
                  const needsView = p.key.startsWith('leads.') && p.key !== 'leads.view' && !canViewLeads;
                  return (
                    <Checkbox
                      key={p.key}
                      label={p.label}
                      checked={permissions.includes(p.key)}
                      disabled={needsView}
                      onChange={(on) => toggle(p.key, on)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="tiny muted">
          Team accounts and roles stay with super admins — they can’t be granted to other roles.
        </p>
      </div>
    </Modal>
  );
}

export default function Roles() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['roles'], queryFn: roleApi.list });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    queryClient.invalidateQueries({ queryKey: ['assignees'] });
  };

  const create = useMutation({
    mutationFn: (payload) => roleApi.create(payload),
    onSuccess: () => { invalidate(); setEditing(null); toast('Role created'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }) => roleApi.update(id, payload),
    onSuccess: () => { invalidate(); setEditing(null); toast('Role updated — applies on their next action'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (id) => roleApi.remove(id),
    onSuccess: () => { invalidate(); toast('Role deleted'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const roles = data?.data || [];
  const groups = data?.meta?.permissionGroups || [];
  const labelOf = Object.fromEntries(groups.flatMap((g) => g.permissions.map((p) => [p.key, p.label])));
  const total = Object.keys(labelOf).length;

  const handleSubmit = (values) => {
    if (editing?.id) update.mutate({ id: editing.id, payload: values });
    else create.mutate(values);
  };

  const handleDelete = async (role) => {
    const confirmed = await confirmDialog({
      title: 'Delete role?',
      message: `“${role.name}” will be removed. Enquiries assigned to it keep their assigned person but lose the role.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(role.id);
  };

  return (
    <div className="content-narrow">
      <PageHeader crumb="Site" title="Roles & permissions" sub="What each role can open and change, and which enquiries its members see.">
        <Link to="/users">
          <Button variant="ghost" icon={Users2}>Team accounts</Button>
        </Link>
        <Button variant="gold" icon={Plus} onClick={() => setEditing({})}>
          New role
        </Button>
      </PageHeader>

      <Card>
        {isLoading ? (
          <div className="card-pad stack">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}
          </div>
        ) : !roles.length ? (
          <EmptyState icon={ShieldCheck} title="No roles yet" />
        ) : (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Role</th>
                  <th style={{ width: 150 }}>Enquiries</th>
                  <th style={{ width: 90 }}>Members</th>
                  <th style={{ width: 100 }} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => {
                  const locked = r.key === 'super_admin';
                  const leads = r.permissions.includes('leads.view');
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="row-title">
                          {r.name} {r.system && <Badge tone="neutral">Built-in</Badge>}
                        </div>
                        <div className="row-sub">{r.description || '—'}</div>
                        <div className="row-gap" style={{ gap: 5, marginTop: 6 }}>
                          {locked ? (
                            <Badge tone="gold">Full access</Badge>
                          ) : total && r.permissions.length === total ? (
                            <Badge tone="gold">All permissions (except team &amp; roles)</Badge>
                          ) : r.permissions.length ? (
                            r.permissions.map((p) => <Badge key={p} tone="info">{labelOf[p] || p}</Badge>)
                          ) : (
                            <span className="tiny muted">No permissions</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {!leads ? (
                          <span className="muted">—</span>
                        ) : r.leadScope === 'all' ? (
                          <Badge tone="gold">All</Badge>
                        ) : (
                          <Badge tone="warn">Assigned only</Badge>
                        )}
                      </td>
                      <td>{r.userCount}</td>
                      <td className="actions">
                        <div className="row-gap" style={{ justifyContent: 'flex-end', gap: 5 }}>
                          {!locked && <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(r)} />}
                          {!r.system && <IconButton icon={Trash2} label="Delete" onClick={() => handleDelete(r)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RoleModal
        open={Boolean(editing)}
        record={editing?.id ? editing : null}
        groups={groups}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        saving={create.isPending || update.isPending}
      />
    </div>
  );
}
