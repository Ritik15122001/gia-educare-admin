import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Textarea, Select, Switch } from './Field';

const schema = z.object({
  title: z.string().trim().min(2, 'Give the format a title').max(160),
  channel: z.string().min(1),
  subject: z.string().trim().max(240).optional(),
  body: z.string().trim().min(1, 'Write the message').max(8000),
  description: z.string().trim().max(400).optional(),
  active: z.boolean(),
});

const EMPTY = { title: '', channel: 'whatsapp', subject: '', body: '', description: '', active: true };

export default function FormatModal({ open, format, channels = [], placeholders = [], onClose, onSave, saving }) {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(format ? { ...EMPTY, ...format } : EMPTY);
  }, [open, format, reset]);

  const channel = watch('channel');
  const body = watch('body');
  const hint = channels.find((c) => c.key === channel)?.hint;

  // Append a token at the end of the body — simpler and more predictable than
  // tracking the caret across a controlled textarea.
  const addToken = (token) => setValue('body', `${body || ''}${body && !body.endsWith(' ') ? ' ' : ''}${token}`, { shouldDirty: true });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={format ? 'Edit format' : 'New format'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={Save} loading={saving} onClick={handleSubmit(onSave)}>
            {format ? 'Save format' : 'Add format'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Title" required full error={errors.title?.message} hint="What the team will look for in the list.">
          <Input {...register('title')} placeholder="New lead — first WhatsApp" />
        </Field>

        <Field label="Channel" error={errors.channel?.message} hint={hint}>
          <Controller
            name="channel"
            control={control}
            render={({ field }) => (
              <Select {...field} options={channels.map((c) => ({ value: c.key, label: c.label }))} />
            )}
          />
        </Field>

        <Field label="Status" hint="Turn off to keep a format for reference without the team sending it.">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} label={field.value ? 'In use' : 'Archived'} />
            )}
          />
        </Field>

        {channel === 'email' && (
          <Field label="Subject line" full error={errors.subject?.message}>
            <Input {...register('subject')} placeholder="Your study-abroad plan, {{first_name}}" />
          </Field>
        )}

        <Field label="When to use it" full error={errors.description?.message}>
          <Input {...register('description')} placeholder="Send within 10 minutes of a new lead landing." />
        </Field>

        <Field label="Message" required full error={errors.body?.message}>
          <Textarea {...register('body')} rows={9} placeholder="Hi {{first_name}}, this is {{counsellor}} from {{brand}}…" />
        </Field>
      </div>

      <div className="token-bar">
        <span className="tiny muted">Insert a placeholder:</span>
        {placeholders.map((p) => (
          <button key={p.token} type="button" className="token-chip" title={p.label} onClick={() => addToken(p.token)}>
            {p.token}
          </button>
        ))}
      </div>
    </Modal>
  );
}
