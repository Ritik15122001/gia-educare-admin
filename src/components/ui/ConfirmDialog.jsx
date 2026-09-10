import { useUiStore } from '../../store/uiStore';
import Modal from './Modal';
import Button from './Button';

// Rendered once at the app root; driven by confirmDialog() from anywhere.
export default function ConfirmDialog() {
  const state = useUiStore((s) => s.confirmState);
  const resolve = useUiStore((s) => s.resolveConfirm);

  return (
    <Modal
      open={Boolean(state)}
      onClose={() => resolve(false)}
      title={state?.title || 'Are you sure?'}
      footer={
        <>
          <Button variant="ghost" onClick={() => resolve(false)}>
            {state?.cancelLabel || 'Cancel'}
          </Button>
          <Button variant={state?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => resolve(true)}>
            {state?.confirmLabel || 'Confirm'}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: '.88rem', color: 'var(--muted)' }}>
        {state?.message || 'This action cannot be undone.'}
      </p>
    </Modal>
  );
}
