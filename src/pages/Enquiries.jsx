import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Trash2, Inbox, Plus, Upload } from 'lucide-react';
import { enquiryApi } from '../api';
import { api } from '../api/client';
import { useAuthStore, can } from '../store/authStore';
import { useDebounced } from '../hooks/useDebounced';
import { confirmDialog, toast } from '../store/uiStore';
import { STATUS_OPTIONS, STATUS_TONE, ENQUIRY_STATUSES, BUDGET_RANGES } from '../utils/enquiryStatus';
import { relativeTime } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import LeadFormModal from '../components/forms/LeadFormModal';
import ImportLeadsModal from '../components/forms/ImportLeadsModal';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import { Input, Select } from '../components/forms/Field';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/data/Pagination';
import AssignSelect from '../components/forms/AssignSelect';
import { toAssignValue, fromAssignValue } from '../utils/assign';
import { cn } from '../utils/cn';

export default function Enquiries() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canDelete = can(user, 'leads.delete');
  const canEdit = can(user, 'leads.edit');
  const canAssign = can(user, 'leads.assign');
  const canExport = can(user, 'leads.export');
  const canImport = can(user, 'leads.import');
  const [addingLead, setAddingLead] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const scopedToAssigned = user?.leadScope === 'assigned';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [budget, setBudget] = useState('');
  const [referral, setReferral] = useState('');
  // '' | 'me' | 'none' | 'role:<key>'
  const [assigned, setAssigned] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 300);

  const params = useMemo(
    () => ({
      page,
      limit: 25,
      search: debouncedSearch,
      status,
      budget,
      referral,
      assignedTo: assigned === 'me' || assigned === 'none' ? assigned : '',
      assignedRole: assigned.startsWith('role:') ? assigned.slice(5) : '',
    }),
    [page, debouncedSearch, status, budget, referral, assigned],
  );

  const { data: assigneeData } = useQuery({
    queryKey: ['assignees'],
    queryFn: enquiryApi.assignees,
    enabled: canAssign,
    staleTime: 60_000,
  });
  const assignees = assigneeData?.data || { roles: [], users: [] };

  const assignedOptions = [
    { value: 'me', label: 'Assigned to me' },
    ...(canAssign
      ? [{ value: 'none', label: 'Unassigned' }, ...assignees.roles.map((r) => ({ value: `role:${r.key}`, label: `Role: ${r.name}` }))]
      : []),
  ];

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

  const assign = useMutation({
    mutationFn: ({ id, value }) => enquiryApi.update(id, fromAssignValue(value)),
    onSuccess: ({ data: e }) => {
      invalidate();
      toast(e.assignedRole ? `Assigned to ${[e.assignedRoleName, e.assignedTo?.name].filter(Boolean).join(' / ')}` : 'Unassigned');
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
  const createLead = useMutation({
    mutationFn: (payload) => enquiryApi.create(payload),
    onSuccess: () => {
      invalidate();
      setAddingLead(false);
      toast('Enquiry added');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  const importLeads = useMutation({
    mutationFn: (payload) => enquiryApi.import(payload),
    onSuccess: ({ data }) => {
      invalidate();
      toast(`Imported ${data.imported} enquir${data.imported === 1 ? 'y' : 'ies'}`);
    },
    onError: (err) => toast(err.message, 'err'),
  });

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
      <PageHeader
        crumb="Leads"
        title={scopedToAssigned ? 'My leads' : 'Leads'}
        sub={
          scopedToAssigned
            ? `Leads assigned to you or to the ${user?.roleName || 'your'} role, newest first.`
            : 'Website enquiries plus the leads you add or import, newest first.'
        }
      >
        {canExport && (
          <Button variant="ghost" icon={Download} onClick={handleExport}>
            Export CSV
          </Button>
        )}
        {canImport && (
          <Button variant="ghost" icon={Upload} onClick={() => setImportOpen(true)}>
            Import
          </Button>
        )}
        {canImport && (
          <Button variant="gold" icon={Plus} onClick={() => setAddingLead(true)}>
            Add enquiry
          </Button>
        )}
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
          <Select
            style={{ maxWidth: 180 }}
            placeholder="Any budget"
            value={budget}
            options={BUDGET_RANGES}
            onChange={(e) => { setBudget(e.target.value); setPage(1); }}
          />
          <Select
            style={{ maxWidth: 170 }}
            placeholder="All sources"
            value={referral}
            options={[{ value: 'any', label: 'Referred leads only' }]}
            onChange={(e) => { setReferral(e.target.value); setPage(1); }}
          />
          <Select
            style={{ maxWidth: 190 }}
            placeholder={canAssign ? 'Any assignment' : 'All my leads'}
            value={assigned}
            options={assignedOptions}
            onChange={(e) => { setAssigned(e.target.value); setPage(1); }}
          />
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
            title={search || status || budget || referral || assigned ? 'No matching enquiries' : scopedToAssigned ? 'Nothing assigned to you yet' : 'No enquiries yet'}
            message={
              search || status || budget || referral || assigned
                ? 'Try a different search or clear the filters.'
                : scopedToAssigned
                  ? 'When a lead is assigned to you or your role, it shows up here.'
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
                  <th style={{ width: 130 }}>Budget</th>
                  <th style={{ width: 150 }}>Referral</th>
                  <th style={{ width: 190 }}>Assigned to</th>
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
                    <td className="tiny">{row.budget || <span className="muted">—</span>}</td>
                    <td>
                      {row.referral ? (
                        <Badge tone="info">{row.referral}</Badge>
                      ) : row.utmSource ? (
                        <span className="tiny muted">{row.utmSource}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {canAssign ? (
                        <AssignSelect
                          style={{ padding: '5px 28px 5px 9px', fontSize: '.78rem' }}
                          roles={assignees.roles}
                          users={assignees.users}
                          value={toAssignValue(row)}
                          currentLabel={[row.assignedRoleName, row.assignedTo?.name].filter(Boolean).join(' / ')}
                          onChange={(value) => assign.mutate({ id: row.id, value })}
                        />
                      ) : row.assignedRole ? (
                        <>
                          <div className="tiny" style={{ fontWeight: 700 }}>{row.assignedTo?.name || 'Whole team'}</div>
                          <div className="tiny muted">{row.assignedRoleName || row.assignedRole}</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <Select
                          style={{ padding: '5px 28px 5px 9px', fontSize: '.78rem' }}
                          value={row.status}
                          options={STATUS_OPTIONS}
                          onChange={(e) => updateStatus.mutate({ id: row.id, value: e.target.value })}
                        />
                      ) : (
                        <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
                      )}
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
      <LeadFormModal
        open={addingLead}
        onClose={() => setAddingLead(false)}
        onSubmit={(values) => createLead.mutateAsync(values)}
        saving={createLead.isPending}
      />

      <ImportLeadsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        importing={importLeads.isPending}
        onImport={async (payload) => {
          const res = await importLeads.mutateAsync(payload).catch(() => null);
          return res?.data || null;
        }}
      />

    </>
  );
}
