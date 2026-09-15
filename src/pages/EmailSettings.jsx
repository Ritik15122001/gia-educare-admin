import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, PlugZap, Send, RefreshCw, Eye, EyeOff, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { emailApi } from '../api';
import { toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useCanModule } from '../store/authStore';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { Field, Input, Select, Switch } from '../components/forms/Field';
import { relativeTime, formatDateTime } from '../utils/format';
import { cn } from '../utils/cn';

// Common providers. Hints are what trips people up most with each one.
const PRESETS = [
  { key: 'gmail', label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: 465, security: 'ssl', hint: 'Turn on 2-Step Verification, then create an App Password (Google Account → Security → App passwords). Username is your full Gmail address.' },
  { key: 'outlook', label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, security: 'starttls', hint: 'Username is your full email address. SMTP AUTH must be allowed for the mailbox in the Microsoft 365 admin centre.' },
  { key: 'zoho', label: 'Zoho Mail', host: 'smtp.zoho.in', port: 465, security: 'ssl', hint: 'Use smtp.zoho.com if your Zoho account is outside India. With 2FA on, generate an app-specific password.' },
  { key: 'sendgrid', label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, security: 'starttls', username: 'apikey', hint: 'The username is literally "apikey" and the password is your SendGrid API key. Verify your sender address in SendGrid first.' },
  { key: 'brevo', label: 'Brevo', host: 'smtp-relay.brevo.com', port: 587, security: 'starttls', hint: 'Use the SMTP login and SMTP key shown under Brevo → SMTP & API, not your account password.' },
  { key: 'ses', label: 'Amazon SES', host: 'email-smtp.ap-south-1.amazonaws.com', port: 587, security: 'starttls', hint: 'Use SMTP credentials created in the SES console (not IAM access keys). Change the region in the host if yours differs.' },
];

const SECURITY_OPTIONS = [
  { value: 'starttls', label: 'STARTTLS (usually port 587)' },
  { value: 'ssl', label: 'SSL/TLS (usually port 465)' },
  { value: 'none', label: 'None — unencrypted' },
];

const TYPE_LABELS = {
  'lead-admin-alert': 'Team lead alert',
  'lead-student-confirmation': 'Student confirmation',
  'account-created': 'New account',
  test: 'Test email',
};

const TEMPLATES = [
  { key: 'admin-alert', label: 'Team lead alert' },
  { key: 'student-confirmation', label: 'Student confirmation' },
  { key: 'account-created', label: 'New team account' },
  { key: 'test', label: 'Test email' },
];

const emailOrEmpty = z.string().trim().email('Enter a valid email address').or(z.literal(''));

const schema = z
  .object({
    enabled: z.boolean(),
    host: z.string().trim().max(200).regex(/^[a-zA-Z0-9.-]*$/, 'Enter a host name like smtp.gmail.com'),
    port: z.coerce.number({ error: 'Enter a port' }).int().min(1, 'Enter a port').max(65535),
    security: z.enum(['starttls', 'ssl', 'none']),
    username: z.string().trim().max(200),
    password: z.string().max(500),
    fromName: z.string().trim().max(100).regex(/^[^\r\n<>"]*$/, 'Remove quotes and angle brackets'),
    fromEmail: emailOrEmpty,
    replyTo: emailOrEmpty,
    adminRecipients: z
      .string()
      .trim()
      .max(1000)
      .refine((v) => !v || v.split(',').every((e) => z.string().email().safeParse(e.trim()).success), 'Use valid email addresses, separated by commas'),
    notifyAdmin: z.boolean(),
    notifyStudent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.enabled) return;
    if (!v.host) ctx.addIssue({ code: 'custom', path: ['host'], message: 'A host is required to send email' });
    if (!v.fromEmail) ctx.addIssue({ code: 'custom', path: ['fromEmail'], message: 'A From address is required to send email' });
  });

const toForm = (c) => ({
  enabled: Boolean(c.enabled),
  host: c.host || '',
  port: c.port || 587,
  security: c.security || 'starttls',
  username: c.username || '',
  password: '',
  fromName: c.fromName || '',
  fromEmail: c.fromEmail || '',
  replyTo: c.replyTo || '',
  adminRecipients: c.adminRecipients || '',
  notifyAdmin: c.notifyAdmin !== false,
  notifyStudent: c.notifyStudent !== false,
});

function StatusBanner({ config }) {
  const { status } = config;
  let tone = 'warn';
  let Icon = AlertTriangle;
  let title = 'Email is off';
  let body = 'Leads are still saved in the admin, but no notification emails are sent. Add your SMTP details below and switch sending on.';

  if (status.problem) {
    tone = 'err';
    title = 'Email needs attention';
    body = status.problem;
  } else if (status.sending && status.source === 'admin') {
    tone = 'ok';
    Icon = CheckCircle2;
    title = `Sending is on via ${config.host}`;
    body = config.lastTestAt
      ? `Last connection test ${config.lastTestOk ? 'succeeded' : 'failed'} ${relativeTime(config.lastTestAt)}.${config.lastTestOk ? '' : ` ${config.lastError}`}`
      : 'Run "Test connection" to confirm the server accepts your credentials.';
  } else if (status.source === 'environment') {
    tone = 'info';
    Icon = Info;
    title = "Using the server's environment settings";
    body = 'Emails currently go out through SMTP details set on the server. Save and switch on settings here to manage them from the admin instead.';
  }

  return (
    <div className={cn('email-status', `email-status--${tone}`)}>
      <Icon />
      <div>
        <b>{title}</b>
        <p>{body}</p>
      </div>
    </div>
  );
}

function TemplatePreview() {
  const [template, setTemplate] = useState('admin-alert');
  const { data, isFetching } = useQuery({ queryKey: ['email-preview', template], queryFn: () => emailApi.preview(template), staleTime: 30_000 });

  return (
    <Card>
      <CardHead title="Email templates" sub="Exactly what recipients get, filled with a sample lead. Branding comes from Settings (logo, brand name, contact details).">
        {isFetching && <span className="spinner" />}
      </CardHead>
      <div className="card-pad">
        <div className="row-gap" style={{ marginBottom: 12 }}>
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" className={cn('btn', 'btn-sm', template === t.key ? 'btn-primary' : 'btn-ghost')} onClick={() => setTemplate(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {data?.data && (
          <>
            <p className="tiny muted" style={{ marginBottom: 8 }}>
              <b style={{ color: 'var(--ink)' }}>Subject:</b> {data.data.subject}
              {data.data.to && (
                <>
                  {' '}· <b style={{ color: 'var(--ink)' }}>To:</b> {data.data.to}
                </>
              )}
            </p>
            {/* sandbox with no permissions: the preview can't run scripts or navigate */}
            <iframe title="Email preview" className="email-preview" sandbox="" srcDoc={data.data.html} />
          </>
        )}
      </div>
    </Card>
  );
}

function DeliveryLog() {
  const { data, isFetching, refetch } = useQuery({ queryKey: ['email-logs'], queryFn: emailApi.logs, refetchInterval: 30_000 });
  const rows = data?.data || [];
  const totals = data?.meta?.last30Days || {};

  return (
    <Card>
      <CardHead title="Delivery log" sub={`Last 30 days: ${totals.sent || 0} sent · ${totals.failed || 0} failed · ${totals.skipped || 0} not sent`}>
        <IconButton icon={RefreshCw} label="Refresh" onClick={() => refetch()} className={cn(isFetching && 'spin')} />
      </CardHead>
      {rows.length ? (
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 130 }}>When</th>
                <th style={{ width: 170 }}>Email</th>
                <th>To</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tiny muted" title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt)}</td>
                  <td>
                    <div className="row-title" style={{ fontSize: '.82rem' }}>{TYPE_LABELS[row.type] || row.type}</div>
                    <div className="row-sub" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.subject}>{row.subject}</div>
                  </td>
                  <td className="tiny">
                    {(row.to || []).join(', ') || <span className="muted">—</span>}
                    {row.error && <div className="email-log-error">{row.error}</div>}
                  </td>
                  <td>
                    <Badge tone={row.status === 'sent' ? 'ok' : row.status === 'failed' ? 'err' : 'neutral'}>
                      {row.status === 'skipped' ? 'not sent' : row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card-pad tiny muted">No emails yet. New leads, test emails and account invites will appear here.</p>
      )}
    </Card>
  );
}

export default function EmailSettings() {
  const canEdit = useCanModule('settings', 'edit');
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [preset, setPreset] = useState(null);
  const [testTo, setTestTo] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['email-settings'], queryFn: emailApi.get });
  const config = data?.data;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    trigger,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toForm({}) });

  // A hook, so it must run before the loading return below.
  const enabled = useWatch({ control, name: 'enabled' });

  // Fill the form once when settings first arrive. Later refetches (after a
  // connection test or test email refresh the status banner) must not reset
  // it, or they would wipe details the admin has typed but not saved yet.
  // Saving resets the form explicitly in its onSuccess.
  const loaded = useRef(false);
  useEffect(() => {
    if (config && !loaded.current) {
      loaded.current = true;
      reset(toForm(config));
    }
  }, [config, reset]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    queryClient.invalidateQueries({ queryKey: ['email-logs'] });
  };

  const save = useMutation({
    mutationFn: (values) => emailApi.update(values),
    onSuccess: ({ data: saved }) => {
      queryClient.setQueryData(['email-settings'], { data: saved });
      reset(toForm(saved));
      setShowPassword(false);
      toast(saved.enabled ? 'Email settings saved — new leads will be emailed' : 'Email settings saved (sending is off)');
    },
    onError: (err) => {
      err.errors?.forEach((e) => setError(e.field, { message: e.message }));
      toast(err.message, 'err');
    },
  });

  const verify = useMutation({
    mutationFn: () => {
      const v = getValues();
      return emailApi.verify({ host: v.host, port: Number(v.port), security: v.security, username: v.username, password: v.password });
    },
    onSuccess: ({ data: res }) => {
      toast(res.message);
      refresh();
    },
    onError: (err) => {
      toast(err.message, 'err');
      refresh();
    },
  });

  const sendTest = useMutation({
    mutationFn: (to) => emailApi.sendTest(to),
    onSuccess: ({ data: res }) => {
      toast(res.message);
      refresh();
    },
    onError: (err) => {
      toast(err.message, 'err');
      refresh();
    },
  });

  if (isLoading || !config) return <Spinner label="Loading email settings…" />;

  const activePreset = PRESETS.find((p) => p.key === preset);
  const canSendTest = config.enabled && config.status.sending && !isDirty;

  const applyPreset = (p) => {
    setPreset(p.key);
    setValue('host', p.host, { shouldDirty: true });
    setValue('port', p.port, { shouldDirty: true });
    setValue('security', p.security, { shouldDirty: true });
    if (p.username) setValue('username', p.username, { shouldDirty: true });
  };

  const runVerify = async () => {
    const ok = await trigger(['host', 'port', 'security', 'username']);
    if (!ok) return;
    if (!getValues('host')) {
      setError('host', { message: 'Enter the SMTP host first' });
      return;
    }
    verify.mutate();
  };

  const passwordHint = !config.hasPassword
    ? 'Stored encrypted. Never shown again after saving.'
    : config.passwordReadable
      ? 'A password is saved (encrypted). Leave blank to keep it, or type a new one to replace it.'
      : 'The saved password can no longer be read — please enter it again.';

  return (
    <form className="content-narrow" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
      <PageHeader crumb="Site" title="Email & SMTP" sub="Connect your mail server so every new lead emails your team and sends the student a confirmation.">
        <Button type="submit" variant="gold" icon={Save} loading={save.isPending} disabled={!isDirty || !canEdit}>
          {isDirty ? 'Save changes' : 'Saved'}
        </Button>
      </PageHeader>

      <div className="stack">
        <StatusBanner config={config} />

        <Card>
          <CardHead title="SMTP server" sub="The mail account emails are sent from.">
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label={field.value ? 'Sending on' : 'Sending off'} />}
            />
          </CardHead>
          <div className="card-pad">
            <p className="tiny muted" style={{ marginBottom: 8 }}>Quick setup</p>
            <div className="row-gap" style={{ marginBottom: 12 }}>
              {PRESETS.map((p) => (
                <button key={p.key} type="button" className={cn('btn', 'btn-sm', preset === p.key ? 'btn-primary' : 'btn-ghost')} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
            {activePreset && <div className="email-hint"><Info size={15} /> {activePreset.hint}</div>}

            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label="SMTP host" required={enabled} error={errors.host?.message}>
                <Input {...register('host')} placeholder="smtp.gmail.com" autoComplete="off" spellCheck={false} />
              </Field>
              <div className="form-grid" style={{ gap: '0 12px' }}>
                <Field label="Port" required error={errors.port?.message}>
                  <Input type="number" {...register('port')} />
                </Field>
                <Field label="Security" error={errors.security?.message}>
                  <Controller
                    control={control}
                    name="security"
                    render={({ field }) => <Select value={field.value} onChange={(e) => field.onChange(e.target.value)} options={SECURITY_OPTIONS} />}
                  />
                </Field>
              </div>
              <Field label="Username" error={errors.username?.message} hint="Usually your full email address.">
                <Input {...register('username')} placeholder="leads@yourdomain.com" autoComplete="off" spellCheck={false} />
              </Field>
              <Field label="Password / app password" error={errors.password?.message} hint={passwordHint}>
                <div className="row-gap" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder={config.hasPassword ? '•••••••• (saved)' : 'Enter password'}
                    autoComplete="new-password"
                    style={{ flex: 1 }}
                  />
                  <IconButton icon={showPassword ? EyeOff : Eye} label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)} />
                </div>
              </Field>
            </div>
            <Button variant="primary" icon={PlugZap} loading={verify.isPending} onClick={runVerify}>
              Test connection
            </Button>
            <span className="tiny muted" style={{ marginLeft: 10 }}>Checks the details above (saved or not) without sending an email.</span>
          </div>
        </Card>

        <Card>
          <CardHead title="Sender" sub="How your emails appear in the inbox." />
          <div className="card-pad">
            <div className="form-grid">
              <Field label="From name" error={errors.fromName?.message}>
                <Input {...register('fromName')} placeholder="GIA Educare" />
              </Field>
              <Field label="From email" required={enabled} error={errors.fromEmail?.message} hint="Most providers only allow sending from the account's own address or a verified domain.">
                <Input type="email" {...register('fromEmail')} placeholder="noreply@giaeducare.com" />
              </Field>
              <Field label="Reply-to email" full error={errors.replyTo?.message} hint="Optional. Team alerts always reply to the student directly.">
                <Input type="email" {...register('replyTo')} placeholder="info@giaeducare.com" />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Lead notifications" sub="Sent automatically the moment a student submits any enquiry form on the website." />
          <div className="card-pad">
            <div className="email-toggle">
              <Controller control={control} name="notifyAdmin" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} />
              <div>
                <b>Email the team about every new lead</b>
                <p className="tiny muted">Full lead details with one-tap Call, WhatsApp and Open-in-admin buttons.</p>
              </div>
            </div>
            <Field label="Team recipients" full error={errors.adminRecipients?.message} hint={`Separate several addresses with commas. If left blank, alerts go to ${config.fallbackRecipients || 'the email in Settings'}.`}>
              <Input {...register('adminRecipients')} placeholder="leads@giaeducare.com, counsellors@giaeducare.com" />
            </Field>
            <div className="email-toggle">
              <Controller control={control} name="notifyStudent" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} />
              <div>
                <b>Send the student a confirmation</b>
                <p className="tiny muted">Thanks them, explains the next steps and repeats the details they entered.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Send a test email" sub="Uses the saved settings and the real email template." />
          <div className="card-pad">
            <div className="row-gap" style={{ alignItems: 'flex-end' }}>
              <Field label="Send to">
                <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@giaeducare.com" style={{ minWidth: 260 }} />
              </Field>
              <Button
                variant="primary"
                icon={Send}
                loading={sendTest.isPending}
                disabled={!canSendTest || !testTo.trim()}
                style={{ marginBottom: 16 }}
                onClick={() => sendTest.mutate(testTo.trim())}
              >
                Send test email
              </Button>
            </div>
            {!canSendTest && (
              <p className="tiny muted">
                {isDirty ? 'Save your changes first — the test uses the saved settings.' : 'Save your SMTP details with sending switched on to send a test.'}
              </p>
            )}
          </div>
        </Card>

        <TemplatePreview />
        <DeliveryLog />

        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
          <Button type="submit" variant="gold" icon={Save} loading={save.isPending} disabled={!isDirty || !canEdit}>
            {isDirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </div>
    </form>
  );
}
