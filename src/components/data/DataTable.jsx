import { useState } from 'react';
import { GripVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import Badge from '../ui/Badge';
import IconButton from '../ui/IconButton';
import EmptyState from '../ui/EmptyState';
import { cn } from '../../utils/cn';

// Renders a single cell based on the column's declared display type.
function Cell({ column, row }) {
  const value = row[column.key];

  switch (column.type) {
    case 'emoji':
      return <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{value}</span>;

    case 'title':
      return (
        <div>
          <div className="row-title">{value}</div>
          {column.sub && row[column.sub] && <div className="row-sub">{row[column.sub]}</div>}
        </div>
      );

    case 'truncate':
      return (
        <span className="muted" style={{ display: 'block', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
      );

    case 'badge':
      return value ? <Badge tone="gold">{value}</Badge> : <span className="muted">—</span>;

    case 'bool':
      return value ? <Badge tone="ok">Yes</Badge> : <Badge tone="neutral">No</Badge>;

    case 'count':
      return <span className="muted">{Array.isArray(value) ? value.length : 0}</span>;

    case 'mono':
      return <code className="mono">{value}</code>;

    case 'gradient':
      return <span className="swatch" style={{ background: value }} />;

    case 'icon':
      return <Badge tone="neutral">{value}</Badge>;

    case 'stars':
      return <span style={{ color: 'var(--gold)', letterSpacing: 1 }}>{'★'.repeat(value || 5)}</span>;

    case 'stat':
      return (
        <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.05rem' }}>
          {Number(value || 0).toLocaleString('en-IN')}
          <span style={{ color: 'var(--gold)' }}>{row.suffix}</span>
        </span>
      );

    case 'date':
      return value ? (
        <span className="tiny">
          {new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ) : (
        <span className="muted">—</span>
      );

    case 'thumb':
      return value ? (
        <img className="thumb" src={value} alt="" style={{ width: 54, height: 36, borderRadius: 6 }} />
      ) : (
        <span
          className="swatch"
          style={{ display: 'inline-block', width: 54, height: 36, background: '#F1EFE9' }}
        />
      );

    case 'avatar':
      return (
        <span className="list-row" style={{ padding: 0, border: 0 }}>
          <span className="avatar">{value}</span>
        </span>
      );

    case 'avatarImage':
      return value ? (
        <img className="thumb" src={value} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
      ) : (
        <span className="avatar" style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--ink)', color: '#fff', fontSize: '.7rem', fontWeight: 800 }}>
          {row.initials || '—'}
        </span>
      );

    default:
      return value ? <span>{value}</span> : <span className="muted">—</span>;
  }
}

/**
 * Table with optional drag-to-reorder and per-row publish/edit/delete.
 * Reordering is native HTML5 drag and drop — no dependency needed for a
 * list of this size.
 */
export default function DataTable({
  rows = [],
  columns = [],
  loading,
  sortable,
  publishable,
  canEdit = true,
  canDelete = true,
  onEdit,
  onDelete,
  onTogglePublish,
  onReorder,
  emptyState,
}) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  if (loading) {
    return (
      <div className="card-pad stack">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    );
  }

  if (!rows.length) return emptyState || <EmptyState />;

  const handleDrop = (targetId) => {
    setDragId(null);
    setOverId(null);
    if (!dragId || dragId === targetId) return;

    const next = [...rows];
    const from = next.findIndex((r) => r.id === dragId);
    const to = next.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder?.(next.map((row, index) => ({ id: row.id, order: index })));
  };

  return (
    <div className="table-wrap">
      <table className="dt">
        <thead>
          <tr>
            {sortable && <th style={{ width: 40 }} aria-label="Reorder" />}
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
            {publishable && <th style={{ width: 100 }}>Status</th>}
            <th style={{ width: 132 }} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              draggable={Boolean(sortable)}
              onDragStart={() => setDragId(row.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setOverId(row.id); }}
              onDrop={() => handleDrop(row.id)}
              className={cn(dragId === row.id && 'dragging', overId === row.id && dragId && dragId !== row.id && 'drop-target')}
            >
              {sortable && (
                <td>
                  <span className="drag-handle" title="Drag to reorder">
                    <GripVertical size={15} />
                  </span>
                </td>
              )}

              {columns.map((c) => (
                <td key={c.key}>
                  <Cell column={c} row={row} />
                </td>
              ))}

              {publishable && (
                <td>
                  {row.published ? <Badge tone="ok">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
                </td>
              )}

              <td className="actions">
                <div className="row-gap" style={{ justifyContent: 'flex-end', gap: 5 }}>
                  {publishable && canEdit && (
                    <IconButton
                      icon={row.published ? EyeOff : Eye}
                      label={row.published ? 'Hide from site' : 'Publish'}
                      onClick={() => onTogglePublish?.(row)}
                    />
                  )}
                  {canEdit && <IconButton icon={Pencil} label="Edit" onClick={() => onEdit?.(row)} />}
                  {canDelete && <IconButton icon={Trash2} label="Delete" onClick={() => onDelete?.(row)} />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
