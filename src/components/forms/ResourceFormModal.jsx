import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Switch } from './Field';
import FieldRenderer from './FieldRenderer';

/**
 * Create/edit dialog generated from a resource config. The same component
 * serves all 13 collections, so every form behaves identically.
 */
export default function ResourceFormModal({ config, open, record, onClose, onSubmit, saving }) {
  const isEdit = Boolean(record?.id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(config.schema),
    defaultValues: config.defaults,
  });

  // `toForm` lets a resource reshape a stored row into what its inputs expect
  // (e.g. an ISO timestamp down to the YYYY-MM-DD a date input needs).
  const { defaults, toForm } = config;

  // Reload the form whenever a different record is opened.
  useEffect(() => {
    if (!open) return;
    const row = record || {};
    reset({ ...defaults, ...(toForm ? toForm(row) : row) });
  }, [open, record, defaults, toForm, reset]);

  const published = watch('published');

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
      footer={
        <>
          {config.publishable && (
            <Switch
              checked={published}
              onChange={(v) => setValue('published', v)}
              label={published ? 'Visible on the site' : 'Hidden from the site'}
            />
          )}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="gold" loading={saving} onClick={handleSubmit(onSubmit)}>
            {isEdit ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)}>
        {config.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            control={control}
            register={register}
            error={errors[field.name]?.message}
          />
        ))}
      </form>
    </Modal>
  );
}
