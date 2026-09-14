import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Save, Plus, Trash2, Mail } from 'lucide-react';
import { settingsApi } from '../api';
import { toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useCanModule } from '../store/authStore';
import IconButton from '../components/ui/IconButton';
import Spinner from '../components/ui/Spinner';
import { Field, Input, Textarea, Switch } from '../components/forms/Field';
import ImagePicker from '../components/forms/ImagePicker';
import { Controller } from 'react-hook-form';

const emailOrEmpty = z.string().trim().email('Enter a valid email').or(z.literal(''));

const schema = z.object({
  brand: z.string().trim().min(1, 'Brand name is required').max(80),
  tagline: z.string().trim().max(120).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  topbarMessage: z.string().trim().max(200).optional(),
  phonePrimary: z.string().trim().max(30).optional(),
  phoneSecondary: z.string().trim().max(30).optional(),
  emailPrimary: emailOrEmpty.optional(),
  emailAdmissions: emailOrEmpty.optional(),
  hours: z.string().trim().max(120).optional(),
  addressLine: z.string().trim().max(200).optional(),
  footerBlurb: z.string().trim().max(600).optional(),
  notifyEnquiriesTo: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || v.split(',').every((e) => z.string().email().safeParse(e.trim()).success),
      'Use valid email addresses, separated by commas',
    )
    .optional(),
  offices: z
    .array(
      z.object({
        name: z.string().trim().min(2, 'Office name is required').max(120),
        address: z.string().trim().min(4, 'Address is required').max(300),
        phone: z.string().trim().max(30).optional(),
        hours: z.string().trim().max(80).optional(),
      }),
    )
    .optional(),
  socials: z.object({
    instagram: z.string().trim().max(300).optional(),
    linkedin: z.string().trim().max(300).optional(),
    youtube: z.string().trim().max(300).optional(),
    whatsapp: z.string().trim().max(300).optional(),
  }),
  seo: z.object({
    title: z.string().trim().max(160).optional(),
    description: z.string().trim().max(320).optional(),
  }),
  founder: z.object({
    enabled: z.boolean(),
    name: z.string().trim().max(120).optional(),
    title: z.string().trim().max(120).optional(),
    photoUrl: z.string().trim().max(500).optional(),
    message: z.string().trim().max(1200).optional(),
    email: emailOrEmpty.optional(),
    phone: z.string().trim().max(30).optional(),
    whatsapp: z.string().trim().max(30).optional(),
    linkedin: z.string().trim().max(300).optional(),
    instagram: z.string().trim().max(300).optional(),
    youtube: z.string().trim().max(300).optional(),
    twitter: z.string().trim().max(300).optional(),
    facebook: z.string().trim().max(300).optional(),
  }),
});

const FOUNDER_KEYS = ['name', 'title', 'photoUrl', 'message', 'email', 'phone', 'whatsapp', 'linkedin', 'instagram', 'youtube', 'twitter', 'facebook'];

export default function Settings() {
  const canEdit = useCanModule('settings', 'edit');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema) });

  const { fields, append, remove } = useFieldArray({ control, name: 'offices' });

  // Load the saved settings into the form once they arrive.
  useEffect(() => {
    if (!data?.data) return;
    const s = data.data;
    reset({
      brand: s.brand || '',
      tagline: s.tagline || '',
      logoUrl: s.logoUrl || '',
      topbarMessage: s.topbarMessage || '',
      phonePrimary: s.phonePrimary || '',
      phoneSecondary: s.phoneSecondary || '',
      emailPrimary: s.emailPrimary || '',
      emailAdmissions: s.emailAdmissions || '',
      hours: s.hours || '',
      addressLine: s.addressLine || '',
      footerBlurb: s.footerBlurb || '',
      notifyEnquiriesTo: s.notifyEnquiriesTo || '',
      offices: (s.offices || []).map((o) => ({ name: o.name, address: o.address, phone: o.phone || '', hours: o.hours || '' })),
      socials: { instagram: '', linkedin: '', youtube: '', whatsapp: '', ...(s.socials || {}) },
      seo: { title: s.seo?.title || '', description: s.seo?.description || '' },
      founder: {
        enabled: s.founder?.enabled ?? true,
        ...Object.fromEntries(FOUNDER_KEYS.map((k) => [k, s.founder?.[k] || ''])),
      },
    });
  }, [data, reset]);

  const save = useMutation({
    mutationFn: (payload) => settingsApi.update(payload),
    onSuccess: ({ data: saved }) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      reset(undefined, { keepValues: true, keepDirty: false });
      toast('Settings saved — the website picks this up on next load');
      return saved;
    },
    onError: (err) => toast(err.message, 'err'),
  });

  if (isLoading) return <Spinner label="Loading settings…" />;

  return (
    <form className="content-narrow" onSubmit={handleSubmit((values) => save.mutate(values))}>
      <PageHeader crumb="Site" title="Settings" sub="Brand, contact details, offices and SEO — everything the website reads globally.">
        <Button type="submit" variant="gold" icon={Save} loading={save.isPending} disabled={!isDirty || !canEdit}>
          {isDirty ? 'Save changes' : 'Saved'}
        </Button>
      </PageHeader>

      <div className="stack">
        <Card>
          <CardHead title="Brand" />
          <div className="card-pad">
            <div className="form-grid">
              <Field label="Brand name" required error={errors.brand?.message}>
                <Input {...register('brand')} />
              </Field>
              <Field label="Tagline" error={errors.tagline?.message} hint="Shown under the logo in the nav.">
                <Input {...register('tagline')} />
              </Field>
              <Field label="Logo" full hint="Used in the header, footer and mobile menu.">
                <Controller
                  control={control}
                  name="logoUrl"
                  render={({ field }) => <ImagePicker value={field.value} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Top bar message" full error={errors.topbarMessage?.message} hint="The thin announcement strip above the nav.">
                <Input {...register('topbarMessage')} />
              </Field>
              <Field label="Footer blurb" full error={errors.footerBlurb?.message}>
                <Textarea {...register('footerBlurb')} rows={3} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Contact" />
          <div className="card-pad">
            <div className="form-grid">
              <Field label="Primary phone" error={errors.phonePrimary?.message}>
                <Input {...register('phonePrimary')} />
              </Field>
              <Field label="Secondary phone" error={errors.phoneSecondary?.message}>
                <Input {...register('phoneSecondary')} />
              </Field>
              <Field label="Primary email" error={errors.emailPrimary?.message}>
                <Input {...register('emailPrimary')} />
              </Field>
              <Field label="Admissions email" error={errors.emailAdmissions?.message}>
                <Input {...register('emailAdmissions')} />
              </Field>
              <Field label="Office hours" error={errors.hours?.message}>
                <Input {...register('hours')} />
              </Field>
              <Field label="Short address" error={errors.addressLine?.message} hint="One-line address in the footer.">
                <Input {...register('addressLine')} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title={`Offices (${fields.length})`} sub="Shown on the contact page and in the footer">
            <Button
              variant="subtle"
              size="sm"
              icon={Plus}
              onClick={() => append({ name: '', address: '', phone: '', hours: 'Mon–Sat · 10am–7pm' })}
            >
              Add office
            </Button>
          </CardHead>
          <div className="card-pad stack">
            {fields.length === 0 && <p className="tiny muted">No offices yet — add one so students know where to walk in.</p>}
            {fields.map((field, i) => (
              <div key={field.id} className="card" style={{ padding: 14, background: '#FCFBF8' }}>
                <div className="row-gap" style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: '.82rem' }}>Office {i + 1}</strong>
                  <IconButton icon={Trash2} label="Remove office" style={{ marginLeft: 'auto' }} onClick={() => remove(i)} />
                </div>
                <div className="form-grid">
                  <Field label="Name" required error={errors.offices?.[i]?.name?.message}>
                    <Input {...register(`offices.${i}.name`)} placeholder="Gurugram · Head office" />
                  </Field>
                  <Field label="Phone" error={errors.offices?.[i]?.phone?.message}>
                    <Input {...register(`offices.${i}.phone`)} />
                  </Field>
                  <Field label="Address" required full error={errors.offices?.[i]?.address?.message}>
                    <Input {...register(`offices.${i}.address`)} />
                  </Field>
                  <Field label="Hours" full error={errors.offices?.[i]?.hours?.message}>
                    <Input {...register(`offices.${i}.hours`)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Email notifications" sub="SMTP server, sender, new-lead alerts and the delivery log now have their own page.">
            <Link to="/settings/email">
              <Button variant="subtle" size="sm" icon={Mail}>
                Open Email &amp; SMTP
              </Button>
            </Link>
          </CardHead>
        </Card>

        <Card>
          <CardHead title="Founder connect" sub="A personal note from the founder, with direct ways to reach them. Shown on the home and about pages.">
            <Controller
              control={control}
              name="founder.enabled"
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} label={field.value ? 'Shown on site' : 'Hidden'} />
              )}
            />
          </CardHead>
          <div className="card-pad">
            <div className="form-grid">
              <Field label="Name" error={errors.founder?.name?.message}>
                <Input {...register('founder.name')} placeholder="Rhea Malhotra" />
              </Field>
              <Field label="Title" error={errors.founder?.title?.message}>
                <Input {...register('founder.title')} placeholder="Founder & Lead Counsellor" />
              </Field>
              <Field label="Photo" full>
                <Controller
                  control={control}
                  name="founder.photoUrl"
                  render={({ field }) => <ImagePicker value={field.value} onChange={field.onChange} />}
                />
              </Field>
              <Field label="Message" full error={errors.founder?.message?.message}>
                <Textarea {...register('founder.message')} rows={4} />
              </Field>
              <Field label="Email" error={errors.founder?.email?.message}>
                <Input {...register('founder.email')} placeholder="founder@giaeducare.com" />
              </Field>
              <Field label="Phone" error={errors.founder?.phone?.message}>
                <Input {...register('founder.phone')} placeholder="+91 90000 00010" />
              </Field>
              <Field label="WhatsApp number" error={errors.founder?.whatsapp?.message} hint="With country code.">
                <Input {...register('founder.whatsapp')} placeholder="+91 90000 00010" />
              </Field>
              {['linkedin', 'instagram', 'youtube', 'twitter', 'facebook'].map((key) => (
                <Field key={key} label={key === 'twitter' ? 'X (Twitter)' : key.charAt(0).toUpperCase() + key.slice(1)} error={errors.founder?.[key]?.message}>
                  <Input {...register(`founder.${key}`)} placeholder="https://…" />
                </Field>
              ))}
            </div>
            <p className="tiny muted">Leave any link blank to hide that button.</p>
          </div>
        </Card>

        <Card>
          <CardHead title="Social links" sub="Leave blank to hide the icon in the footer" />
          <div className="card-pad">
            <div className="form-grid">
              {['instagram', 'linkedin', 'youtube', 'whatsapp'].map((key) => (
                <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                  <Input {...register(`socials.${key}`)} placeholder="https://…" />
                </Field>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="SEO" sub="Used for the browser tab and search results" />
          <div className="card-pad">
            <div className="form-grid">
              <Field label="Meta title" full error={errors.seo?.title?.message}>
                <Input {...register('seo.title')} />
              </Field>
              <Field label="Meta description" full error={errors.seo?.description?.message}>
                <Textarea {...register('seo.description')} rows={3} />
              </Field>
            </div>
          </div>
        </Card>

        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
          <Button type="submit" variant="gold" icon={Save} loading={save.isPending} disabled={!isDirty || !canEdit}>
            {isDirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </div>
    </form>
  );
}
