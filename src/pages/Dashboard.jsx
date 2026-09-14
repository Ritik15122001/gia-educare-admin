import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, TrendingUp, CalendarDays, CheckCircle2, ArrowRight, Activity, LayoutDashboard } from 'lucide-react';
import { dashboardApi } from '../api';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import TrendChart from '../components/data/TrendChart';
import { STATUS_TONE } from '../utils/enquiryStatus';
import { relativeTime } from '../utils/format';
import { SITE_URL } from '../config/site';
import { useAuthStore } from '../store/authStore';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="top">
        <span className="ico">
          <Icon />
        </span>
        <span className="label">{label}</span>
      </div>
      <div className="value">{Number(value || 0).toLocaleString('en-IN')}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function ActivityCard({ activity }) {
  return (
    <Card>
      <CardHead title="Recent activity" sub="Changes made in this panel" />
      {activity.length ? (
        <div>
          {activity.map((a) => (
            <div className="list-row" key={a.id}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '.83rem' }}>{a.summary}</div>
                <div className="tiny muted">{a.userName || 'System'}</div>
              </div>
              <span className="meta">{relativeTime(a.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No activity yet" />
      )}
    </Card>
  );
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.summary,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Spinner label="Loading dashboard…" />;
  if (error) return <EmptyState icon={Activity} title="Could not load the dashboard" message={error.message} />;

  const d = data.data;
  const converted = d.enquiries.byStatus.converted || 0;
  const conversionRate = d.enquiries.total ? Math.round((converted / d.enquiries.total) * 100) : 0;
  // null = this role can't see leads; 'assigned' = figures cover only their own leads.
  const scope = d.leadScope;
  const mine = scope === 'assigned';

  const header = (
    <PageHeader
      title={user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Dashboard'}
      sub={
        scope === null
          ? `Signed in as ${user?.roleName || 'a team member'}.`
          : mine
            ? `Your leads — assigned to you or the ${user?.roleName || 'your'} role.`
            : 'Lead volume, pipeline and what has changed on the site recently.'
      }
    >
      <Button variant="ghost" onClick={() => window.open(SITE_URL, '_blank')}>
        View website
      </Button>
    </PageHeader>
  );

  if (scope === null) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={LayoutDashboard}
            title="Pick up where you left off"
            message="Use the menu to edit the website. Lead figures appear here for roles that work enquiries."
          />
        </Card>
        {d.activity && <ActivityCard activity={d.activity} />}
      </>
    );
  }

  return (
    <>
      {header}

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={Inbox} label={mine ? 'My enquiries' : 'Total enquiries'} value={d.enquiries.total} sub="All time" />
        <StatCard icon={CalendarDays} label="Today" value={d.enquiries.today} sub={`${d.enquiries.week} in the last 7 days`} />
        <StatCard icon={TrendingUp} label="New / unactioned" value={d.enquiries.byStatus.new} sub="Waiting on a first call" />
        <StatCard icon={CheckCircle2} label="Converted" value={converted} sub={`${conversionRate}% of ${mine ? 'your' : 'all'} leads`} />
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <Card>
          <CardHead title="Enquiries — last 30 days" sub="One bar per day" />
          <div className="card-pad">
            <TrendChart data={d.trend} />
          </div>
        </Card>

        <Card>
          <CardHead title="Pipeline" />
          <div>
            {Object.entries(d.enquiries.byStatus).map(([status, count]) => (
              <div className="list-row" key={status}>
                <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                <span className="meta" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '.9rem' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <Card>
          <CardHead title="Budget ranges" sub="What leads told us they can spend in total" />
          <div className="card-pad stack" style={{ gap: 12 }}>
            {(d.budgets || []).map((b) => {
              const top = Math.max(1, ...(d.budgets || []).map((x) => x.count));
              return (
                <div key={b.range}>
                  <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="tiny" style={{ fontWeight: 700 }}>{b.range}</span>
                    <span className="tiny muted">{b.count}</span>
                  </div>
                  <div className="meter"><span style={{ width: `${(b.count / top) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="Top referrals" sub="Referral codes that brought in leads" />
          {d.topReferrals?.length ? (
            <div>
              {d.topReferrals.map((r) => (
                <div className="list-row" key={r.referral}>
                  <Badge tone="info">{r.referral}</Badge>
                  <span className="meta">
                    <b style={{ color: 'var(--ink)' }}>{r.count}</b> lead{r.count === 1 ? '' : 's'} · {r.converted} converted
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No referred leads yet" message="Share links like yoursite.com/?ref=PARTNER-NAME — the code is saved with the enquiry." />
          )}
        </Card>
      </div>

      <div className="two-col">
        <Card>
          <CardHead title={mine ? 'Your latest enquiries' : 'Latest enquiries'}>
            <Link to="/enquiries">
              <Button variant="ghost" size="sm">
                View all <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHead>
          {d.recent.length ? (
            <div>
              {d.recent.map((e) => (
                <Link to={`/enquiries/${e.id}`} className="list-row" key={e.id}>
                  <span className="avatar">
                    {e.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{e.name}</div>
                    <div className="tiny muted">{e.destination || 'No destination yet'}</div>
                  </div>
                  <span className="meta">
                    <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                    <span style={{ marginLeft: 8 }}>{relativeTime(e.createdAt)}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No enquiries yet" message="Leads submitted on the website land here." />
          )}
        </Card>

        {d.activity && <ActivityCard activity={d.activity} />}
      </div>
    </>
  );
}
