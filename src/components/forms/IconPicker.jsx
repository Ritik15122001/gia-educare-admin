import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Icon from '../ui/Icon';
import { ICON_GROUPS } from '../../config/iconCatalogue';
import { Input } from './Field';
import { cn } from '../../utils/cn';

// Grouped, searchable grid. With ~70 icons a flat wall is hard to scan, so the
// groups stay visible until you start typing.
export default function IconPicker({ value, onChange }) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_GROUPS;
    const matched = ICON_GROUPS
      .map((g) => ({ ...g, icons: g.icons.filter((n) => n.includes(q) || g.label.toLowerCase().includes(q)) }))
      .filter((g) => g.icons.length);
    return matched;
  }, [query]);

  return (
    <div>
      <div className="search-box" style={{ maxWidth: 'none', marginBottom: 10 }}>
        <Search />
        <Input placeholder="Search icons…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            <div className="tiny muted" style={{ fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              {group.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: 6 }}>
              {group.icons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  title={name}
                  className={cn('btn', value === name ? 'btn-gold' : 'btn-ghost')}
                  style={{ flexDirection: 'column', gap: 3, padding: '9px 3px', height: 'auto' }}
                >
                  <Icon name={name} size={17} />
                  <span style={{ fontSize: '.53rem', fontWeight: 600, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {!groups.length && <p className="tiny muted" style={{ padding: '12px 0' }}>No icon matches “{query}”.</p>}
      </div>

      <p className="tiny muted" style={{ marginTop: 6 }}>
        Selected: <strong>{value || 'none'}</strong>
      </p>
    </div>
  );
}
