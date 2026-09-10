import { cn } from '../../utils/cn';

export function Field({ label, required, error, hint, full, children }) {
  return (
    <div className={cn('field', error && 'err', full && 'full')}>
      {label && (
        <label>
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="field-msg">{error}</span>}
    </div>
  );
}

export function Input({ className, ...rest }) {
  return <input className={cn('input', className)} {...rest} />;
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cn('textarea', className)} {...rest} />;
}

export function Select({ options = [], placeholder, className, ...rest }) {
  return (
    <select className={cn('select', className)} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

export function Switch({ checked, onChange, label, ...rest }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange?.(e.target.checked)} {...rest} />
      <span className="track" />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, ...rest }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange?.(e.target.checked)} {...rest} />
      <span>{label}</span>
    </label>
  );
}
