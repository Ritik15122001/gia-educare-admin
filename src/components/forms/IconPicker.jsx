import Icon from '../ui/Icon';
import { cn } from '../../utils/cn';

// Visual picker so editors choose an icon by looking at it, not by typing a slug.
export default function IconPicker({ value, onChange, options = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(58px,1fr))', gap: 8 }}>
      {options.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          title={name}
          className={cn('btn', value === name ? 'btn-gold' : 'btn-ghost')}
          style={{ flexDirection: 'column', gap: 4, padding: '10px 4px', height: 'auto' }}
        >
          <Icon name={name} size={18} />
          <span style={{ fontSize: '.58rem', fontWeight: 600, opacity: 0.8 }}>{name}</span>
        </button>
      ))}
    </div>
  );
}
