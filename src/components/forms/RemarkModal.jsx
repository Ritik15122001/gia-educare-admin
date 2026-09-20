import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Select, Textarea, Input } from './Field';
import { STATUS_OPTIONS } from '../../utils/enquiryStatus';
import { todayStr, plusDays } from '../../utils/followUp';

const QUICK = [
  { label: 'Today', get: todayStr },
  { label: 'Tomorrow', get: () => plusDays(1) },
  { label: 'In 3 days', get: () => plusDays(3) },
  { label: 'Next week', get: () => plusDays(7) },
];

/**
 * Log what was said and when to call back, in one step — the thing a
 * counsellor does twenty times a day.
 */
export default function RemarkModal({ open, lead, saving, onClose, onSubmit }) {
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setBody('');
    setError('');
    setStatus(lead?.status || '');
    setFollowUpAt(lead?.followUpAt ? String(lead.followUpAt).slice(0, 10) : '');
  }, [open, lead]);

  const submit = () => {
    if (!body.trim()) { setError('Write what happened on the call.'); return; }
    onSubmit({
      body: body.trim(),
      ...(status && status !== lead?.status ? { status } : {}),
      followUpAt: followUpAt || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? `Add remark — ${lead.name}` : 'Add remark'}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={submit}>Save remark</Button>
        </>
      )}
    >
      <Field label="Remark" required error={error} full hint="Kept on the lead's timeline with your name and the time.">
        <Textarea
          rows={4}
          autoFocus
          placeholder="Spoke to the parent — wants Canada, September intake. Asked us to call after 6pm."
          value={body}
          onChange={(e) => { setBody(e.target.value); setError(''); }}
        />
      </Field>

      <div className="form-grid">
        <Field label="Status">
          <Select value={status} options={STATUS_OPTIONS} onChange={(e) => setStatus(e.target.value)} />
        </Field>
        <Field label="Next follow-up" hint="Leave empty for no reminder.">
          <Input type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
        </Field>
      </div>

      <div className="row-gap" style={{ marginTop: -4 }}>
        {QUICK.map((q) => (
          <button key={q.label} type="button" className="btn btn-sm btn-ghost" onClick={() => setFollowUpAt(q.get())}>
            {q.label}
          </button>
        ))}
        {followUpAt && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFollowUpAt('')}>Clear</button>
        )}
      </div>
    </Modal>
  );
}
