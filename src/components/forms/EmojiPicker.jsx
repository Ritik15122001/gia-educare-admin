import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EMOJI_SETS } from '../../config/emojiSets';
import { Input } from './Field';
import { cn } from '../../utils/cn';

/**
 * Searchable emoji grid with a free-text box underneath, so you can either pick
 * one or paste your own (macOS emoji keyboard: Control + Command + Space).
 */
export default function EmojiPicker({ value, onChange, set = 'flags' }) {
  const [query, setQuery] = useState('');
  const all = EMOJI_SETS[set] || EMOJI_SETS.flags;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) => e.search.includes(q));
  }, [all, query]);

  return (
    <div>
      <div className="row-gap" style={{ gap: 8, marginBottom: 8, flexWrap: 'nowrap' }}>
        <span
          style={{
            fontSize: '1.6rem', lineHeight: 1, width: 48, height: 40, flexShrink: 0,
            display: 'grid', placeItems: 'center', border: '1.5px solid var(--line)',
            borderRadius: 9, background: '#FCFBF8',
          }}
        >
          {value || '—'}
        </span>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pick below, or paste your own"
          style={{ flex: 1 }}
        />
      </div>

      <div className="search-box" style={{ maxWidth: 'none', marginBottom: 8 }}>
        <Search />
        <Input
          placeholder={set === 'flags' ? 'Search country… e.g. Canada' : 'Search subject… e.g. nursing'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(52px,1fr))', gap: 5,
          maxHeight: 190, overflowY: 'auto', paddingRight: 4,
        }}
      >
        {results.map((e) => (
          <button
            key={e.char + e.label}
            type="button"
            onClick={() => onChange(e.char)}
            title={e.label}
            className={cn('btn', value === e.char ? 'btn-gold' : 'btn-ghost')}
            style={{ padding: '7px 2px', height: 'auto', fontSize: '1.25rem', lineHeight: 1.1 }}
          >
            {e.char}
          </button>
        ))}
      </div>

      {!results.length && <p className="tiny muted" style={{ padding: '10px 0' }}>Nothing matches “{query}”.</p>}

      <p className="tiny muted" style={{ marginTop: 6 }}>
        Tip: press <strong>Control + Command + Space</strong> in the text box for the full emoji keyboard.
      </p>
    </div>
  );
}
