import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';

export default function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn('toast', t.tone === 'err' ? 'toast-err' : 'toast-ok')}>
          {t.tone === 'err' ? <AlertTriangle /> : <CheckCircle2 />}
          <span>{t.message}</span>
          <button className="close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
