import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from './Field';
import {
  BUDGET_OPTIONS, LEVEL_OPTIONS, INTAKE_OPTIONS, TEST_OPTIONS, QUAL_OPTIONS,
} from '../../utils/leadImport';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  code: z.string().trim().max(6).optional(),
  phone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 8, 'Enter a valid phone number'),
  destination: z.string().trim().max(80).optional(),
  level: z.string().optional(),
  intake: z.string().optional(),
  test: z.string().optional(),
  qual: z.string().optional(),
  budget: z.string().optional(),
  source: z.string().trim().max(60).optional(),
  referral: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
});

const EMPTY = {
  name: '', email: '', code: '+91', phone: '', destination: '', level: '', intake: '',
  test: '', qual: '', budget: '', source: 'walk-in', referral: '', message: '',
};

const asOptions = (list) => list.map((v) => ({ value: v, label: v }));

export default function LeadFormModal({ open, onClose, onSubmit, saving }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Add a lead"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" loading={saving} onClick={handleSubmit(onSubmit)}>Add lead</Button>
        </>
      }
    >
      <p className="tiny muted" style={{ marginBottom: 16 }}>
        For students who called, walked in or came from a fair. Website enquiries arrive here automatically.
      </p>

      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Full name" required error={errors.name?.message} full>
          <Input {...register('name')} placeholder="Aarav Sharma" />
        </Field>

        <Field label="Email" required error={errors.email?.message}>
          <Input {...register('email')} placeholder="aarav@example.com" />
        </Field>

        <Field label="Phone" required error={errors.phone?.message}>
          <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 8 }}>
            <Input {...register('code')} placeholder="+91" />
            <Input {...register('phone')} placeholder="98765 43210" />
          </div>
        </Field>

        <Field label="Destination" error={errors.destination?.message}>
          <Input {...register('destination')} placeholder="Canada" />
        </Field>

        <Field label="Study level">
          <Select {...register('level')} options={asOptions(LEVEL_OPTIONS)} placeholder="Not specified" />
        </Field>

        <Field label="Intake">
          <Select {...register('intake')} options={asOptions(INTAKE_OPTIONS)} placeholder="Not specified" />
        </Field>

        <Field label="Test status">
          <Select {...register('test')} options={asOptions(TEST_OPTIONS)} placeholder="Not specified" />
        </Field>

        <Field label="Qualification">
          <Select {...register('qual')} options={asOptions(QUAL_OPTIONS)} placeholder="Not specified" />
        </Field>

        <Field label="Budget">
          <Select {...register('budget')} options={asOptions(BUDGET_OPTIONS)} placeholder="Not specified" />
        </Field>

        <Field label="Source" hint="Where this lead came from.">
          <Input {...register('source')} placeholder="Walk-in / Education fair / Referral" />
        </Field>

        <Field label="Referred by">
          <Input {...register('referral')} placeholder="Partner or counsellor name" />
        </Field>

        <Field label="Notes" full>
          <Textarea {...register('message')} rows={3} placeholder="What did they ask for? Budget, backlogs, timeline…" />
        </Field>
      </form>
    </Modal>
  );
}
