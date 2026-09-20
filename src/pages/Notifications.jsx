import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, UserPlus, Inbox, CalendarClock } from 'lucide-react';
import { notificationApi } from '../api';
import { confirmDialog, toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/data/Pagination';
import { relativeTime } from '../utils/format';
import { cn } from '../utils/cn';
import { useState } from 'react';

const ICONS = {
  'lead.new': Inbox,
  'lead.assigned': UserPlus,
  'lead.remark': Bell,
  'followup.due': CalendarClock,
};

const LABELS = {
  'lead.new': 'New lead',
  'lead.assigned': 'Assigned',
  'lead.remark': 'Remark',
  'followup.due': 'Follow-up',
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const params = { page, limit: 25, ...(unreadOnly ? { unread: 'true' } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.list(params),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data || [];
  const meta = data?.meta;
  const unread = meta?.unread ?? 0;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({ mutationFn: notificationApi.markRead, onSuccess: invalidate });
  const markAll = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => { invalidate(); toast('All caught up'); },
  });
  const clearRead = useMutation({
    mutationFn: notificationApi.clearRead,
    onSuccess: () => { invalidate(); toast('Read notifications cleared'); },
  });

  const handleClear = async () => {
    const ok = await confirmDialog({
      title: 'Clear read notifications?',
      message: 'Everything you have already read is removed from this list. Leads are not affected.',
      confirmLabel: 'Clear',
      tone: 'danger',
    });
    if (ok) clearRead.mutate();
  };

  return (
    <>
      <PageHeader
        crumb="Notifications"
        title="Notifications"
        sub={unread ? `${unread} unread — newest first.` : 'Everything that happened on your leads, newest first.'}
      >
        <Button variant="ghost" icon={Trash2} onClick={handleClear}>Clear read</Button>
        <Button icon={CheckCheck} onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={!unread}>
          Mark all read
        </Button>
      </PageHeader>

      <div className="row-gap" style={{ marginBottom: 16 }}>
        <button type="button" className={cn('btn btn-sm', unreadOnly ? 'btn-ghost' : 'btn-primary')} onClick={() => { setUnreadOnly(false); setPage(1); }}>
          All
        </button>
        <button type="button" className={cn('btn btn-sm', unreadOnly ? 'btn-primary' : 'btn-ghost')} onClick={() => { setUnreadOnly(true); setPage(1); }}>
          Unread {unread ? <span style={{ opacity: 0.7 }}>{unread}</span> : null}
        </button>
      </div>

      <Card>
        {isLoading ? (
          <div className="card-pad stack">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 52 }} />)}
          </div>
        ) : !rows.length ? (
          <EmptyState
            icon={Bell}
            title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}
            message={unreadOnly ? 'You are all caught up.' : 'New leads and assignments will show up here as they happen.'}
          />
        ) : (
          <div>
            {rows.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              const row = (
                <>
                  <span className={cn('avatar', !n.read && 'is-unread')} aria-hidden="true"><Icon size={16} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '.88rem', fontWeight: n.read ? 500 : 700 }}>{n.title}</div>
                    {n.body && <div className="tiny muted">{n.body}</div>}
                  </div>
                  <Badge tone={n.read ? 'neutral' : 'gold'}>{LABELS[n.type] || 'Update'}</Badge>
                  <span className="meta tiny muted">{relativeTime(n.createdAt)}</span>
                </>
              );
              return n.link ? (
                <Link
                  key={n.id}
                  to={n.link}
                  className="list-row"
                  onClick={() => !n.read && markRead.mutate(n.id)}
                  style={{ color: 'inherit' }}
                >
                  {row}
                </Link>
              ) : (
                <div key={n.id} className="list-row">{row}</div>
              );
            })}
          </div>
        )}
        {meta && meta.pages > 1 && <Pagination meta={meta} onChange={setPage} />}
      </Card>
    </>
  );
}
