import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from './Field';
import { cn } from '../../utils/cn';
import { today, DEFAULT_TAG, PAYMENT_MODE_LABELS, tagsForType } from '../../utils/finance';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  amount: z.coerce.number({ error: 'Enter an amount' }).positive('Amount must be more than zero').max(1e11, 'That amount is too large'),
  category: z.string().trim().min(1, 'Choose or type a category').max(80),
  plTag: z.string().min(1, 'Choose a P&L tag'),
  party: z.string().trim().max(120),
  paymentMode: z.string(),
  reference: z.string().trim().max(80),
  description: z.string().trim().max(500),
});

const NO_TAGS = [];

const blank = (type = 'expense') => ({
  type, date: today(), amount: '', category: '', plTag: DEFAULT_TAG[type], party: '', paymentMode: '', reference: '', description: '',
});

export default function FinanceEntryModal({ open, entry, options, saving, onClose, onSubmit }) {
  const plTags = options?.plTags || NO_TAGS;
  // Once someone picks a tag by hand, the category no longer re-suggests one.
  const tagTouched = useRef(false);

  const {
    register, control, handleSubmit, reset, watch, setValue, getValues,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: blank() });

  useEffect(() => {
    if (!open) return;
    tagTouched.current = Boolean(entry);
    reset(entry
      ? {
        type: entry.type,
        date: String(entry.date).slice(0, 10),
        amount: entry.amount,
        category: entry.category,
        plTag: entry.plTag,
        party: entry.party || '',
        paymentMode: entry.paymentMode || '',
        reference: entry.reference || '',
        description: entry.description || '',
      }
      : blank());
  }, [open, entry, reset]);

  const type = watch('type');
  const category = watch('category');
  const plTag = watch('plTag');
  const allowed = tagsForType(plTags, type);

  // Switching type drops a tag that no longer fits it.
  useEffect(() => {
    if (!plTags.length) return;
    const current = getValues('plTag');
    if (!tagsForType(plTags, type).some((t) => t.key === current)) setValue('plTag', DEFAULT_TAG[type]);
  }, [type, plTags, getValues, setValue]);

  // A preset category suggests its usual head until the tag is chosen by hand.
  useEffect(() => {
    if (tagTouched.current || !options) return;
    const suggested = options.suggestedTags?.[category];
    const fits = suggested && tagsForType(plTags, type).some((t) => t.key === suggested);
    setValue('plTag', fits ? suggested : DEFAULT_TAG[type]);
  }, [category, type, options, plTags, setValue]);

  const hint = plTags.find((t) => t.key === plTag)?.hint;
  const listId = `finance-categories-${type}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit entry' : 'Add entry'}
      size="lg"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSubmit(onSubmit)}>{entry ? 'Save changes' : 'Add entry'}</Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="fin-type" role="radiogroup" aria-label="Entry type">
          {[
            ['expense', 'Expense', 'Money going out', ArrowUpRight],
            ['income', 'Income', 'Money coming in', ArrowDownLeft],
          ].map(([key, label, sub, Icon]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={type === key}
              className={cn('fin-type-opt', `is-${key}`, type === key && 'active')}
              onClick={() => setValue('type', key, { shouldDirty: true })}
            >
              <Icon size={18} />
              <span><b>{label}</b><small>{sub}</small></span>
            </button>
          ))}
        </div>

        <div className="form-grid">
          <Field label="Date" required error={errors.date?.message}>
            <Input type="date" {...register('date')} />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount?.message}>
            <Input type="number" inputMode="decimal" step="0.01" min="0" placeholder="e.g. 25000" {...register('amount')} />
          </Field>

          <Field label="Category" required error={errors.category?.message} hint="Pick a suggestion or type your own.">
            <Input list={listId} placeholder={type === 'income' ? 'e.g. Counselling fees' : 'e.g. Rent'} autoComplete="off" {...register('category')} />
            <datalist id={listId}>
              {(options?.categories?.[type] || []).map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="P&L tag" required error={errors.plTag?.message} hint={hint}>
            <Controller
              control={control}
              name="plTag"
              render={({ field }) => (
                <Select
                  {...field}
                  options={allowed.map((t) => ({ value: t.key, label: t.label }))}
                  onChange={(e) => { tagTouched.current = true; field.onChange(e.target.value); }}
                />
              )}
            />
          </Field>

          <Field label={type === 'income' ? 'Received from' : 'Paid to'} error={errors.party?.message}>
            <Input placeholder={type === 'income' ? 'Student, university or partner' : 'Vendor, landlord or employee'} {...register('party')} />
          </Field>
          <Field label="Payment mode">
            <Controller
              control={control}
              name="paymentMode"
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Not specified"
                  options={(options?.paymentModes || []).map((m) => ({ value: m, label: PAYMENT_MODE_LABELS[m] || m }))}
                />
              )}
            />
          </Field>

          <Field label="Invoice / receipt no." error={errors.reference?.message}>
            <Input placeholder="Optional" {...register('reference')} />
          </Field>
          <Field label="Notes" full error={errors.description?.message}>
            <Textarea rows={3} placeholder="What was this for?" {...register('description')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
