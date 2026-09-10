import { cn } from '../../utils/cn';

export default function Badge({ tone = 'neutral', children, className }) {
  return <span className={cn('badge', `badge-${tone}`, className)}>{children}</span>;
}
