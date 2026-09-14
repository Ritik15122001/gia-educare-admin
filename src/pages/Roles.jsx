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

// Every key a module can grant, so "select all" and counts stay in one place.
const keysOf = (m) => [...m.actions.map((a) => `${m.key}.${a}`), ...m.extras.map((e) => e.key)];

function RoleModal({ open, record, groups, actions, onClose, onSubmit, saving }) {
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
  const has = (key) => permissions.includes(key);
  const set = (next) => setValue('permissions', [...new Set(next)], { shouldDirty: true });

  // View is the floor: editing or deleting implies it, and dropping it drops the rest.
  const toggle = (module, action, on) => {
    const key = `${module.key}.${action}`;
    if (on) return set([...permissions, key, `${module.key}.view`]);
    if (action === 'view') return set(permissions.filter((p) => !keysOf(module).includes(p)));
    return set(permissions.filter((p) => p !== key));
  };

  const toggleExtra = (module, key, on) => (
    on ? set([...permissions, key, `${module.key}.view`]) : set(permissions.filter((p) => p !== key))
  );

  const toggleGroup = (group, on) => {
    const keys = group.modules.flatMap(keysOf);
    return on ? set([...permissions, ...keys]) : set(permissions.filter((p) => !keys.includes(p)));
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
        <Field label="Can see" hint={has('leads.view') ? undefined : 'Applies once Enquiries → View is ticked.'}>
          <Select {...register('leadScope')} options={SCOPE_OPTIONS} disabled={!has('leads.view')} />
        </Field>
        <Field label="Description" full error={errors.description?.message}>
          <Input {...register('description')} placeholder="Counsellors handling Canada admissions" />
        </Field>
      </div>

      <div className="stack" style={{ gap: 14 }}>
        {groups.map((group) => {
          const keys = group.modules.flatMap(keysOf);
          const allOn = keys.every((k) => permissions.includes(k));
          return (
            <div className="perm-group" key={group.key}>
              <div className="perm-group-head">
                <b>{group.label}</b>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleGroup(group, !allOn)}>
                  {allOn ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <table className="perm-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    {actions.map((a) => <th key={a.key}>{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {group.modules.map((m) => (
                    <tr key={m.key}>
                      <td>
                        <span className="perm-name">{m.label}</span>
                        {m.extras.length > 0 && has(`${m.key}.view`) && (
                          <span className="perm-extras">
                            {m.extras.map((e) => (
                              <Checkbox
                                key={e.key}
                                label={e.label}
                                checked={has(e.key)}
                                onChange={(on) => toggleExtra(m, e.key, on)}
                              />
                            ))}
                          </span>
                        )}
                        {m.note && has(`${m.key}.view`) && <span className="perm-note">{m.note}</span>}
                      </td>
                      {actions.map((a) => {
                        const supported = m.actions.includes(a.key);
                        return (
                          <td key={a.key} className="perm-cell">
                            {supported ? (
                              <label aria-label={`${m.label} — ${m.actionLabels?.[a.key] || a.label}`} title={m.actionLabels?.[a.key] || a.label}>
                                <input
                                  type="checkbox"
                                  checked={has(`${m.key}.${a.key}`)}
                                  onChange={(e) => toggle(m, a.key, e.target.checked)}
                                />
                              </label>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
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
  const groups = data?.meta?.moduleGroups || [];
  const actions = data?.meta?.actions || [];
  const modules = groups.flatMap((g) => g.modules);

  // What a role can reach, for the list: module names it can at least view.
  const modulesOf = (role) => modules.filter((m) => role.permissions.some((p) => p === `${m.key}.view` || p === `${m.key}.edit`));

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
      <PageHeader crumb="Site" title="Roles & permissions" sub="Pick the modules each role can open, and what it may do in them.">
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
                  const reach = modulesOf(r);
                  const leads = r.permissions.includes('leads.view');
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="row-title">
                          {r.name} {r.system && <Badge tone="neutral">Built-in</Badge>}
                        </div>
                        <div className="row-sub">{r.description || '—'}</div>
                        <div className="row-gap" style={{ gap: 5, marginTop: 6 }}>
                          {locked || reach.length === modules.length ? (
                            <Badge tone="gold">All {modules.length} modules</Badge>
                          ) : reach.length ? (
                            <>
                              {reach.slice(0, 4).map((m) => <Badge key={m.key} tone="info">{m.label}</Badge>)}
                              {reach.length > 4 && <Badge tone="neutral">+{reach.length - 4} more</Badge>}
                            </>
                          ) : (
                            <span className="tiny muted">No modules</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {!leads && !locked ? (
                          <span className="muted">—</span>
                        ) : r.leadScope === 'all' || locked ? (
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
        actions={actions}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        saving={create.isPending || update.isPending}
      />
    </div>
  );
}
