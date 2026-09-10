import { GRADIENT_PRESETS } from '../../config/fieldTypes';
import { Input } from './Field';
import { cn } from '../../utils/cn';

export default function GradientPicker({ value, onChange }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(76px,1fr))', gap: 8, marginBottom: 10 }}>
        {GRADIENT_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            title={preset.label}
            className={cn('btn', 'btn-ghost')}
            style={{
              padding: 4,
              height: 'auto',
              flexDirection: 'column',
              gap: 4,
              borderColor: value === preset.value ? 'var(--gold)' : undefined,
              borderWidth: value === preset.value ? 2 : 1,
            }}
          >
            <span style={{ display: 'block', width: '100%', height: 26, borderRadius: 6, background: preset.value }} />
            <span style={{ fontSize: '.6rem', fontWeight: 600, opacity: 0.75 }}>{preset.label}</span>
          </button>
        ))}
      </div>
      <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Custom CSS gradient" />
    </div>
  );
}
