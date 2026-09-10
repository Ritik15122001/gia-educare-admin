import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Input } from './Field';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

// Repeater for label/value rows, e.g. a destination's fact table.
export default function PairsInput({ value = [], onChange, labelPlaceholder = 'Label', valuePlaceholder = 'Value' }) {
  const rows = Array.isArray(value) ? value : [];

  const update = (index, patch) => onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, { label: '', value: '' }]);

  return (
    <div>
      <div className="stack" style={{ gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} className="row-gap" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <span className="drag-handle" style={{ flexShrink: 0 }}>
              <GripVertical size={14} />
            </span>
            <Input
              value={row.label || ''}
              placeholder={labelPlaceholder}
              onChange={(e) => update(i, { label: e.target.value })}
              style={{ flex: '0 0 40%' }}
            />
            <Input
              value={row.value || ''}
              placeholder={valuePlaceholder}
              onChange={(e) => update(i, { value: e.target.value })}
              style={{ flex: 1 }}
            />
            <IconButton icon={Trash2} label="Remove row" onClick={() => remove(i)} />
          </div>
        ))}
      </div>
      <Button variant="subtle" size="sm" icon={Plus} onClick={add} style={{ marginTop: rows.length ? 10 : 0 }}>
        Add row
      </Button>
    </div>
  );
}
