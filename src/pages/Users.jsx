import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users2, ShieldCheck } from 'lucide-react';
import { userApi, roleApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { confirmDialog, toast } from '../store/uiStore';
import { relativeTime, initialsOf } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Field, Input, Select, Switch } from '../components/forms/Field';

const ROLE_TONE = { super_admin: 'gold', admin: 'info' };

const makeSchema = (isEdit) =>
  z.object({
    name: z.string().trim().min(2, 'Name is required').max(120),
    email: z.string().trim().email('Enter a valid email'),
    password: isEdit
      ? z.string().min(8, 'Must be at least 8 characters').or(z.literal('')).optional()
      : z.string().min(8, 'Must be at least 8 characters'),
    role: z.string().min(1, 'Choose a role'),
    active: z.boolean(),
  });

function UserModal({ open, record, roleOptions, onClose, onSubmit, saving }) {
  const isEdit = Boolean(record?.id);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(makeSchema(isEdit)),
    values: {
      name: record?.name || '',
      email: record?.email || '',
      password: '',
      role: record?.role || 'editor',
      active: record?.active ?? true,
    },
  });

  const active = watch('active');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit team member' : 'Invite team member'}
      footer={
        <>
          <Switch checked={active} onChange={(v) => setValue('active', v)} label={active ? 'Active' : 'Deactivated'} />
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" loading={saving} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <Field label="Full name" required error={errors.name?.message}>
        <Input {...register('name')} placeholder="Rhea Malhotra" />
      </Field>
      <Field label="Email" required error={errors.email?.message}>
        <Input type="email" {...register('email')} placeholder="rhea@giaeducare.com" />
      </Field>
      <Field
        label={isEdit ? 'New password' : 'Password'}
        required={!isEdit}
        error={errors.password?.message}
        hint={isEdit ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}
      >
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </Field>
      <Field label="Role" required error={errors.role?.message}>
        <Select {...register('role')} options={roleOptions} />
      </Field>
      <p className="tiny muted">
        What each role can do is set in <Link to="/roles" style={{ textDecoration: 'underline' }}>Roles &amp; permissions</Link>.
      </p>
    </Modal>
  );
}

export default function Users() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list({ limit: 100 }) });
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: roleApi.list });
  const roles = rolesData?.data || [];
  const roleName = Object.fromEntries(roles.map((r) => [r.key, r.name]));
  const roleOptions = roles.map((r) => ({ value: r.key, label: r.description ? `${r.name} — ${r.description}` : r.name }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const create = useMutation({
    mutationFn: (payload) => userApi.create(payload),
    onSuccess: () => { invalidate(); setEditing(null); toast('Account created — a welcome email is on its way (share the password separately)'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }) => userApi.update(id, payload),
    onSuccess: () => { invalidate(); setEditing(null); toast('Account updated'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (id) => userApi.remove(id),
    onSuccess: () => { invalidate(); toast('Account removed'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const users = data?.data || [];

  const handleSubmit = (values) => {
    const payload = { ...values };
    if (!payload.password) delete payload.password;
    if (editing?.id) update.mutate({ id: editing.id, payload });
    else create.mutate(payload);
  };

  const handleDelete = async (user) => {
    const confirmed = await confirmDialog({
      title: 'Remove account?',
      message: `${user.name} will lose access to this admin panel immediately.`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(user.id);
  };

  return (
    <div className="content-narrow">
      <PageHeader crumb="Site" title="Team accounts" sub="Who can sign in here, and what they are allowed to change.">
        <Link to="/roles">
          <Button variant="ghost" icon={ShieldCheck}>Roles &amp; permissions</Button>
        </Link>
        <Button variant="gold" icon={Plus} onClick={() => setEditing({})}>
          Invite member
        </Button>
      </PageHeader>

      <Card>
        {isLoading ? (
          <div className="card-pad stack">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
          </div>
        ) : !users.length ? (
          <EmptyState icon={Users2} title="No accounts yet" />
        ) : (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ width: 150 }}>Role</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 130 }}>Last sign-in</th>
                  <th style={{ width: 100 }} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row-gap" style={{ gap: 10, flexWrap: 'nowrap' }}>
                        <span className="avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '.7rem', fontWeight: 800 }}>
                          {initialsOf(u.name)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="row-title">
                            {u.name}
                            {u.id === currentUser?.id && <span className="tiny muted"> (you)</span>}
                          </div>
                          <div className="row-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone={ROLE_TONE[u.role] || 'neutral'}>{roleName[u.role] || u.role.replace('_', ' ')}</Badge>
                    </td>
                    <td>{u.active ? <Badge tone="ok">Active</Badge> : <Badge tone="err">Disabled</Badge>}</td>
                    <td className="tiny muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never'}</td>
                    <td className="actions">
                      <div className="row-gap" style={{ justifyContent: 'flex-end', gap: 5 }}>
                        <IconButton icon={Pencil} label="Edit" onClick={() => setEditing(u)} />
                        {u.id !== currentUser?.id && (
                          <IconButton icon={Trash2} label="Remove" onClick={() => handleDelete(u)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserModal
        open={Boolean(editing)}
        record={editing?.id ? editing : null}
        roleOptions={roleOptions}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        saving={create.isPending || update.isPending}
      />
    </div>
  );
}
