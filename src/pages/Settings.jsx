import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2 } from 'lucide-react';
import { settingsApi } from '../api';
import { toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Spinner from '../components/ui/Spinner';
import { Field, Input, Textarea } from '../components/forms/Field';
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
  notifyEnquiriesTo: emailOrEmpty.optional(),
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
});

export default function Settings() {
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
        <Button type="submit" variant="gold" icon={Save} loading={save.isPending} disabled={!isDirty}>
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
              <Field
                label="Notify enquiries to"
                full
                error={errors.notifyEnquiriesTo?.message}
                hint="Where new-lead notifications will be sent once email delivery is connected."
              >
                <Input {...register('notifyEnquiriesTo')} placeholder="leads@giaeducare.com" />
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
          <Button type="submit" variant="gold" icon={Save} loading={save.isPending} disabled={!isDirty}>
            {isDirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </div>
    </form>
  );
}
