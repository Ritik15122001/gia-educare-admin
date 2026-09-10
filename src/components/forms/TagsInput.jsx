import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from './Field';
import Button from '../ui/Button';

// Comma / Enter separated chips, stored as a string array.
export default function TagsInput({ value = [], onChange, placeholder = 'Add and press Enter' }) {
  const [draft, setDraft] = useState('');
  const tags = Array.isArray(value) ? value : [];

  const add = () => {
    const next = draft.trim();
    if (!next) return;
    if (!tags.includes(next)) onChange([...tags, next]);
    setDraft('');
  };

  return (
    <div>
      <div className="row-gap" style={{ marginBottom: tags.length ? 8 : 0 }}>
        {tags.map((tag) => (
          <span key={tag} className="badge badge-neutral" style={{ paddingRight: 4 }}>
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove ${tag}`}
              style={{ background: 'none', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 2, color: 'inherit' }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="row-gap" style={{ gap: 6 }}>
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          style={{ flex: 1 }}
        />
        <Button variant="subtle" size="sm" icon={Plus} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}
