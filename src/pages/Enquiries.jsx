import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Trash2, Inbox } from 'lucide-react';
import { enquiryApi } from '../api';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useDebounced } from '../hooks/useDebounced';
import { confirmDialog, toast } from '../store/uiStore';
import { STATUS_OPTIONS, ENQUIRY_STATUSES } from '../utils/enquiryStatus';
import { relativeTime } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import { Input, Select } from '../components/forms/Field';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/data/Pagination';
import { cn } from '../utils/cn';

export default function Enquiries() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = ['super_admin', 'admin'].includes(role);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 300);

  const params = useMemo(() => ({ page, limit: 25, search: debouncedSearch, status }), [page, debouncedSearch, status]);

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', params],
    queryFn: () => enquiryApi.list(params),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['enquiries'] });

  const updateStatus = useMutation({
    mutationFn: ({ id, value }) => enquiryApi.update(id, { status: value }),
    onSuccess: () => {
      invalidate();
      toast('Status updated');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (id) => enquiryApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast('Enquiry deleted');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  const rows = data?.data || [];
  const meta = data?.meta;
  const counts = meta?.counts || {};

  // The export endpoint needs the auth header, so fetch it and save the blob.
  const handleExport = async () => {
    try {
      const res = await api.raw(enquiryApi.exportUrl(status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gia-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast('CSV downloaded');
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDialog({
      title: 'Delete enquiry?',
      message: `${row.name}'s enquiry will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(row.id);
  };

  return (
    <>
      <PageHeader crumb="Leads" title="Enquiries" sub="Every form submission from the website, newest first.">
        <Button variant="ghost" icon={Download} onClick={handleExport}>
          Export CSV
        </Button>
      </PageHeader>

      {/* Status filter chips double as a pipeline summary */}
      <div className="row-gap" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={cn('btn', 'btn-sm', status === '' ? 'btn-primary' : 'btn-ghost')}
          onClick={() => { setStatus(''); setPage(1); }}
        >
          All <span style={{ opacity: 0.7 }}>{meta?.total ?? 0}</span>
        </button>
        {ENQUIRY_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={cn('btn', 'btn-sm', status === s ? 'btn-primary' : 'btn-ghost')}
            onClick={() => { setStatus(s); setPage(1); }}
            style={{ textTransform: 'capitalize' }}
          >
            {s} <span style={{ opacity: 0.7 }}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <Input
              placeholder="Search name, email, phone or message…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <span className="tiny muted" style={{ marginLeft: 'auto' }}>{meta?.total ?? 0} enquiry(s)</span>
        </div>

        {isLoading ? (
          <div className="card-pad stack">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44 }} />
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState
            icon={Inbox}
            title={search || status ? 'No matching enquiries' : 'No enquiries yet'}
            message={
              search || status
                ? 'Try a different search or clear the status filter.'
                : 'Leads submitted through the website form will appear here automatically.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ width: 190 }}>Contact</th>
                  <th style={{ width: 130 }}>Destination</th>
                  <th style={{ width: 110 }}>Intake</th>
                  <th style={{ width: 150 }}>Status</th>
                  <th style={{ width: 100 }}>Received</th>
                  <th style={{ width: 80 }} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/enquiries/${row.id}`}>
                        <div className="row-title">{row.name}</div>
                        <div className="row-sub">{row.level || '—'}{row.qual ? ` · ${row.qual}` : ''}</div>
                      </Link>
                    </td>
                    <td>
                      <div className="tiny">{row.email}</div>
                      <div className="tiny muted">{row.code} {row.phone}</div>
                    </td>
                    <td>{row.destination ? <Badge tone="gold">{row.destination}</Badge> : <span className="muted">—</span>}</td>
                    <td className="tiny">{row.intake || '—'}</td>
                    <td>
                      <Select
                        style={{ padding: '5px 28px 5px 9px', fontSize: '.78rem' }}
                        value={row.status}
                        options={STATUS_OPTIONS}
                        onChange={(e) => updateStatus.mutate({ id: row.id, value: e.target.value })}
                      />
                    </td>
                    <td className="tiny muted">{relativeTime(row.createdAt)}</td>
                    <td className="actions">
                      <div className="row-gap" style={{ justifyContent: 'flex-end', gap: 5 }}>
                        {canDelete && <IconButton icon={Trash2} label="Delete" onClick={() => handleDelete(row)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.pages > 1 && <Pagination meta={meta} onChange={setPage} />}
      </Card>
    </>
  );
}
