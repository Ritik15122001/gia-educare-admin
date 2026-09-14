import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { captchaApi } from '../../api';
import { Field, Input } from './Field';
import IconButton from '../ui/IconButton';

/**
 * The server-verified arithmetic captcha. The parent owns the answer (so it
 * validates with the rest of the form), receives the token via `onToken`, and
 * bumps `refreshKey` after any failed submit — every token is single-use.
 */
export default function CaptchaField({ answerProps, error, onToken, refreshKey = 0 }) {
  const [challenge, setChallenge] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // `manualKey` lets the refresh button request a new sum without the parent.
  const [manualKey, setManualKey] = useState(0);
  const refresh = useCallback(() => setManualKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    captchaApi
      .get()
      .then(({ data }) => {
        if (cancelled) return;
        setChallenge(data);
        setLoadError(null);
        onToken?.(data.token);
      })
      .catch((err) => {
        if (cancelled) return;
        setChallenge(null);
        setLoadError(err.message);
        onToken?.('');
      });
    return () => {
      cancelled = true;
    };
  }, [onToken, refreshKey, manualKey]);

  return (
    <Field label="Security check" required error={error || loadError} hint="Solve the sum to continue.">
      <div className="captcha-row">
        <span className="captcha-img">
          {challenge ? (
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(challenge.svg)}`} alt="Arithmetic security check" />
          ) : (
            <span className="tiny muted">Loading…</span>
          )}
        </span>
        <IconButton icon={RefreshCw} label="New security check" onClick={refresh} />
        <Input inputMode="numeric" autoComplete="off" placeholder="Answer" {...answerProps} />
      </div>
    </Field>
  );
}
