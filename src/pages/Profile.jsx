import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Save, KeyRound } from 'lucide-react';
import { authApi } from '../api';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Field, Input } from '../components/forms/Field';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const saveProfile = useMutation({
    mutationFn: (payload) => authApi.updateProfile(payload),
    onSuccess: ({ data }) => {
      setUser(data);
      toast('Profile updated');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  const changePassword = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      passwordForm.reset();
      toast('Password changed — other sessions were signed out');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  return (
    <div className="content-narrow">
      <PageHeader crumb="Account" title="Your profile" sub="Update your details or change your password." />

      <div className="stack">
        <Card>
          <CardHead title="Details">
            <Badge tone="gold">{user?.role?.replace('_', ' ')}</Badge>
          </CardHead>
          <form className="card-pad" onSubmit={profileForm.handleSubmit((v) => saveProfile.mutate(v))}>
            <div className="form-grid">
              <Field label="Full name" required error={profileForm.formState.errors.name?.message}>
                <Input {...profileForm.register('name')} />
              </Field>
              <Field label="Email" required error={profileForm.formState.errors.email?.message}>
                <Input type="email" {...profileForm.register('email')} />
              </Field>
            </div>
            <Button type="submit" variant="gold" icon={Save} loading={saveProfile.isPending}>
              Save details
            </Button>
          </form>
        </Card>

        <Card>
          <CardHead title="Password" sub="Changing this signs out your other devices" />
          <form className="card-pad" onSubmit={passwordForm.handleSubmit((v) => changePassword.mutate(v))}>
            <Field label="Current password" required error={passwordForm.formState.errors.currentPassword?.message}>
              <Input type="password" autoComplete="current-password" {...passwordForm.register('currentPassword')} />
            </Field>
            <div className="form-grid">
              <Field label="New password" required error={passwordForm.formState.errors.newPassword?.message}>
                <Input type="password" autoComplete="new-password" {...passwordForm.register('newPassword')} />
              </Field>
              <Field label="Confirm new password" required error={passwordForm.formState.errors.confirmPassword?.message}>
                <Input type="password" autoComplete="new-password" {...passwordForm.register('confirmPassword')} />
              </Field>
            </div>
            <Button type="submit" variant="primary" icon={KeyRound} loading={changePassword.isPending}>
              Change password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
