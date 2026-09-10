import { cn } from '../../utils/cn';

export default function IconButton({ icon: Icon, label, variant = 'ghost', className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('btn', `btn-${variant}`, 'btn-icon', className)}
      {...rest}
    >
      <Icon />
    </button>
  );
}
