import { useRef, useState } from 'react';
import { FileDown, Upload, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Field, Select } from './Field';
import { downloadTemplate, parseLeadFile, validateRow, LEAD_COLUMNS } from '../../utils/leadImport';
import { toast } from '../../store/uiStore';

/**
 * Three steps in one dialog: get the template → pick a file → review what will
 * happen, then import. Rows are validated in the browser first so mistakes are
 * visible before anything is sent.
 */
export default function ImportLeadsModal({ open, onClose, onImport, importing }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [unknownHeaders, setUnknownHeaders] = useState([]);
  const [duplicates, setDuplicates] = useState('skip');
  const [result, setResult] = useState(null);

  const valid = rows.filter((r) => !r.__errors.length);
  const invalid = rows.filter((r) => r.__errors.length);

  const reset = () => {
    setFileName(''); setRows([]); setUnknownHeaders([]); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => { reset(); onClose(); };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const { rows: parsed, unknownHeaders: unknown } = await parseLeadFile(file);
      if (!parsed.length) {
        toast('No usable rows found in that file', 'err');
        return;
      }
      setFileName(file.name);
      setUnknownHeaders(unknown);
      setRows(parsed.map((r) => ({ ...r, __errors: validateRow(r) })));
      setResult(null);
    } catch {
      toast('Could not read that file — is it a .xlsx or .csv?', 'err');
    }
  };

  const runImport = async () => {
    const payload = valid.map(({ __errors, ...row }) => row);
    const res = await onImport({ rows: payload, duplicates });
    if (res) setResult(res);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import leads"
      footer={
        result ? (
          <Button variant="gold" onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" icon={FileDown} onClick={downloadTemplate}>Download template</Button>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="gold" loading={importing} disabled={!valid.length} onClick={runImport}>
              Import {valid.length || ''} lead{valid.length === 1 ? '' : 's'}
            </Button>
          </>
        )
      }
    >
      {/* ---------- after import ---------- */}
      {result ? (
        <div>
          <div className="row-gap" style={{ marginBottom: 14 }}>
            <CheckCircle2 size={20} style={{ color: 'var(--ok)' }} />
            <strong>Import finished</strong>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="list-row" style={{ padding: '8px 0' }}>Added <span className="meta"><Badge tone="ok">{result.imported}</Badge></span></div>
            {result.updated > 0 && <div className="list-row" style={{ padding: '8px 0' }}>Updated <span className="meta"><Badge tone="info">{result.updated}</Badge></span></div>}
            <div className="list-row" style={{ padding: '8px 0' }}>Skipped as duplicates <span className="meta"><Badge tone="neutral">{result.skipped}</Badge></span></div>
            {result.failed?.length > 0 && (
              <div className="list-row" style={{ padding: '8px 0' }}>Rejected by the server <span className="meta"><Badge tone="err">{result.failed.length}</Badge></span></div>
            )}
          </div>
          {result.failed?.length > 0 && (
            <div style={{ marginTop: 14, maxHeight: 180, overflowY: 'auto' }}>
              {result.failed.map((f) => (
                <div key={f.row} className="tiny" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <strong>Row {f.row}</strong> — {f.name}: <span style={{ color: 'var(--err)' }}>{f.errors.join('; ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !rows.length ? (
        /* ---------- step 1: choose a file ---------- */
        <div>
          <ol className="stack" style={{ gap: 10, paddingLeft: 18, listStyle: 'decimal', marginBottom: 18 }}>
            <li className="tiny">Download the template and fill in one student per row.</li>
            <li className="tiny">Name, Email and Phone are required — the rest is optional.</li>
            <li className="tiny">Upload it here. You will see a preview before anything is saved.</li>
          </ol>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            style={{
              border: '2px dashed var(--line)', borderRadius: 'var(--r-lg)', padding: '30px 20px',
              textAlign: 'center', cursor: 'pointer', background: '#FCFBF8',
            }}
          >
            <Upload size={22} style={{ margin: '0 auto 8px', color: 'var(--muted-2)' }} />
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Click to choose a file, or drag it here</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>Excel (.xlsx) or CSV, up to 2000 rows</div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <p className="tiny muted" style={{ marginTop: 12 }}>
            Columns: {LEAD_COLUMNS.map((c) => c.header).join(' · ')}
          </p>
        </div>
      ) : (
        /* ---------- step 2: preview ---------- */
        <div>
          <div className="row-gap" style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: '.88rem' }}>{fileName}</strong>
            <Badge tone="ok">{valid.length} ready</Badge>
            {invalid.length > 0 && <Badge tone="err">{invalid.length} with problems</Badge>}
            <Button variant="ghost" size="sm" icon={X} style={{ marginLeft: 'auto' }} onClick={reset}>
              Choose another file
            </Button>
          </div>

          {unknownHeaders.length > 0 && (
            <p className="tiny" style={{ color: 'var(--warn)', marginBottom: 10 }}>
              <AlertTriangle size={12} style={{ verticalAlign: '-2px' }} /> Ignored unknown columns: {unknownHeaders.join(', ')}
            </p>
          )}

          <Field label="If a lead already exists (same email or phone)">
            <Select
              value={duplicates}
              onChange={(e) => setDuplicates(e.target.value)}
              options={[
                { value: 'skip', label: 'Skip it — keep what we already have' },
                { value: 'update', label: 'Update it with the new details' },
              ]}
            />
          </Field>

          <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Destination</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={r.__errors.length ? { background: 'var(--err-soft)' } : undefined}>
                    <td className="tiny muted">{i + 2}</td>
                    <td className="tiny">{r.name || '—'}</td>
                    <td className="tiny">{r.email || '—'}</td>
                    <td className="tiny">{r.phone || '—'}</td>
                    <td className="tiny">{r.destination || '—'}</td>
                    <td className="tiny">
                      {r.__errors.length
                        ? <span style={{ color: 'var(--err)' }}>{r.__errors.join('; ')}</span>
                        : <Badge tone="ok">ready</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalid.length > 0 && (
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Rows with problems are skipped. Fix them in the file and import it again, or import the {valid.length} good ones now.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
