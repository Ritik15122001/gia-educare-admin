import { cn } from '../../utils/cn';

export function Card({ children, className, pad }) {
  return <div className={cn('card', pad && 'card-pad', className)}>{children}</div>;
}

export function CardHead({ title, sub, children }) {
  return (
    <div className="card-head">
      <div>
        {title && <h2>{title}</h2>}
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="card-head-actions">{children}</div>}
    </div>
  );
}
