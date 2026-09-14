import { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { getResourceConfig } from '../config/resources';
import { resourceApi } from '../api';
import { useResource } from '../hooks/useResource';
import { useDebounced } from '../hooks/useDebounced';
import { confirmDialog } from '../store/uiStore';
import { useAuthStore, canModule } from '../store/authStore';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Select } from '../components/forms/Field';
import DataTable from '../components/data/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ResourceFormModal from '../components/forms/ResourceFormModal';
import Pagination from '../components/data/Pagination';

export default function ResourceListPage() {
  const { resource } = useParams();
  const config = getResourceConfig(resource);
  const user = useAuthStore((s) => s.user);
  const canView = canModule(user, resource);
  const canEdit = canModule(user, resource, 'edit');
  const canDelete = canModule(user, resource, 'delete');

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = closed, {} = new record

  const debouncedSearch = useDebounced(search, 300);

  const params = useMemo(
    () => ({ page, limit: 50, search: debouncedSearch, ...filters }),
    [page, debouncedSearch, filters],
  );

  const { list, create, update, remove, togglePublish, reorder } = useResource(resource, params);

  // Options for any dropdown filters this resource declares.
  const filterConfig = config?.filters?.[0];
  const { data: filterOptions } = useQuery({
    queryKey: ['options', filterConfig?.optionsFrom],
    queryFn: () => resourceApi.list(filterConfig.optionsFrom, { limit: 100 }),
    enabled: Boolean(filterConfig?.optionsFrom),
    staleTime: 60_000,
  });

  if (!config) return <EmptyState title="Unknown collection" message={`No configuration for “${resource}”.`} />;
  // The API refuses it too; this just keeps a stray link from showing an error screen.
  if (!canView) return <Navigate to="/" replace />;

  const rows = list.data?.data || [];
  const meta = list.data?.meta;
  const isSearching = Boolean(debouncedSearch) || Object.values(filters).some(Boolean);

  const handleSubmit = async (values) => {
    if (editing?.id) await update.mutateAsync({ id: editing.id, payload: values });
    else await create.mutateAsync(values);
    setEditing(null);
  };

  const handleDelete = async (row) => {
    const label = row.name || row.title || row.question || row.country || row.label || 'this record';
    const confirmed = await confirmDialog({
      title: `Delete ${config.singular.toLowerCase()}?`,
      message: `“${label}” will be removed from the site immediately. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(row.id);
  };

  return (
    <>
      <PageHeader crumb="Content" title={config.label} sub={config.description}>
        {canEdit && (
          <Button variant="gold" icon={Plus} onClick={() => setEditing({})}>
            New {config.singular.toLowerCase()}
          </Button>
        )}
      </PageHeader>

      <Card>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <Input
              className="input"
              placeholder={config.searchPlaceholder || `Search ${config.label.toLowerCase()}…`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {filterConfig && (
            <Select
              style={{ maxWidth: 210 }}
              placeholder={filterConfig.label}
              value={filters[filterConfig.key] || ''}
              onChange={(e) => {
                setFilters({ [filterConfig.key]: e.target.value });
                setPage(1);
              }}
              options={(filterOptions?.data || []).map((o) => ({
                value: o[filterConfig.valueKey || 'id'],
                label: o[filterConfig.labelKey || 'label'],
              }))}
            />
          )}

          {config.publishable && (
            <Select
              style={{ maxWidth: 170 }}
              placeholder="All statuses"
              value={filters.published || ''}
              onChange={(e) => {
                setFilters((f) => ({ ...f, published: e.target.value }));
                setPage(1);
              }}
              options={[
                { value: 'true', label: 'Live only' },
                { value: 'false', label: 'Hidden only' },
              ]}
            />
          )}

          <span className="tiny muted" style={{ marginLeft: 'auto' }}>
            {config.sortable && canEdit && !isSearching ? 'Drag rows to reorder' : `${meta?.total ?? 0} record(s)`}
          </span>
        </div>

        <DataTable
          rows={rows}
          columns={config.columns}
          loading={list.isLoading}
          sortable={config.sortable && canEdit && !isSearching}
          publishable={config.publishable}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={setEditing}
          onDelete={handleDelete}
          onTogglePublish={(row) => togglePublish.mutate(row.id)}
          onReorder={(items) => reorder.mutate(items)}
          emptyState={
            <EmptyState
              icon={config.icon}
              title={isSearching ? 'No matches' : `No ${config.label.toLowerCase()} yet`}
              message={
                isSearching
                  ? 'Try a different search or clear the filters.'
                  : `Add your first ${config.singular.toLowerCase()} — it appears on the website as soon as it is published.`
              }
              action={
                !isSearching && canEdit && (
                  <Button variant="gold" icon={Plus} onClick={() => setEditing({})}>
                    New {config.singular.toLowerCase()}
                  </Button>
                )
              }
            />
          }
        />

        {meta && meta.pages > 1 && <Pagination meta={meta} onChange={setPage} />}
      </Card>

      <ResourceFormModal
        config={config}
        open={Boolean(editing)}
        record={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        onSubmit={handleSubmit}
        saving={create.isPending || update.isPending}
      />
    </>
  );
}
