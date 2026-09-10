import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'btn-primary',
  gold: 'btn-gold',
  ghost: 'btn-ghost',
  subtle: 'btn-subtle',
  danger: 'btn-danger',
};

export default function Button({
  variant = 'primary',
  size,
  block,
  icon: Icon,
  loading,
  children,
  className,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={cn('btn', VARIANTS[variant], size === 'sm' && 'btn-sm', block && 'btn-block', className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="spinner" /> : Icon && <Icon />}
      {children}
    </button>
  );
}
