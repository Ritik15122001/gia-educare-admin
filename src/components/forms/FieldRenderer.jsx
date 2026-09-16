import { Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { resourceApi } from '../../api';
import { F } from '../../config/fieldTypes';
import { Field, Input, Textarea, Select, Switch } from './Field';
import TagsInput from './TagsInput';
import PairsInput from './PairsInput';
import IconPicker from './IconPicker';
import GradientPicker from './GradientPicker';
import ImagePicker from './ImagePicker';
import EmojiPicker from './EmojiPicker';

// Options can be declared inline or pulled from another collection
// (e.g. a course's category list comes from `course-categories`).
function useFieldOptions(field) {
  const { data } = useQuery({
    queryKey: ['options', field.optionsFrom],
    queryFn: () => resourceApi.list(field.optionsFrom, { limit: 100, published: 'true' }),
    enabled: Boolean(field.optionsFrom),
    staleTime: 60_000,
  });

  if (field.options) return field.options;
  if (!data?.data) return [];
  return data.data.map((row) => ({
    value: row[field.valueKey || 'id'],
    label: row[field.labelKey || 'title'],
  }));
}

export default function FieldRenderer({ field, control, register, error }) {
  const options = useFieldOptions(field);
  const common = { label: field.label, required: field.required, error, hint: field.hint, full: field.full };

  // Simple inputs can register directly — no re-render per keystroke.
  if (field.type === F.TEXT) {
    return (
      <Field {...common}>
        <Input {...register(field.name)} placeholder={field.placeholder} />
      </Field>
    );
  }

  if (field.type === F.NUMBER) {
    return (
      <Field {...common}>
        <Input type="number" {...register(field.name)} placeholder={field.placeholder} />
      </Field>
    );
  }

  if (field.type === F.DATE) {
    return (
      <Field {...common}>
        <Input type="date" {...register(field.name)} />
      </Field>
    );
  }

  if (field.type === F.TEXTAREA) {
    return (
      <Field {...common}>
        <Textarea {...register(field.name)} placeholder={field.placeholder} rows={field.rows} />
      </Field>
    );
  }


  // Selects are controlled: options from another collection arrive after the
  // form has been reset, and an uncontrolled <select> cannot hold a value that
  // has no <option> yet — it would show the placeholder and save it back blank.
  if (field.type === F.SELECT) {
    return (
      <Controller
        control={control}
        name={field.name}
        render={({ field: ctrl }) => (
          <Field {...common}>
            <Select
              name={ctrl.name}
              ref={ctrl.ref}
              value={ctrl.value ?? ''}
              onChange={(e) => ctrl.onChange(e.target.value)}
              onBlur={ctrl.onBlur}
              options={options}
              placeholder={field.placeholder || 'Select…'}
            />
          </Field>
        )}
      />
    );
  }

  // Everything else is a controlled widget.
  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: ctrl }) => (
        <Field {...common}>
          {field.type === F.SWITCH && <Switch checked={ctrl.value} onChange={ctrl.onChange} label={field.switchLabel} />}
          {field.type === F.TAGS && <TagsInput value={ctrl.value} onChange={ctrl.onChange} />}
          {field.type === F.PAIRS && <PairsInput value={ctrl.value} onChange={ctrl.onChange} />}
          {field.type === F.ICON && <IconPicker value={ctrl.value} onChange={ctrl.onChange} />}
          {field.type === F.GRADIENT && <GradientPicker value={ctrl.value} onChange={ctrl.onChange} />}
          {field.type === F.IMAGE && <ImagePicker value={ctrl.value} onChange={ctrl.onChange} />}
          {field.type === F.EMOJI && (
            <EmojiPicker value={ctrl.value} onChange={ctrl.onChange} set={field.emojiSet || 'flags'} />
          )}
        </Field>
      )}
    />
  );
}
