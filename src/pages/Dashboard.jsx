import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, TrendingUp, CalendarDays, CheckCircle2, ArrowRight, Activity } from 'lucide-react';
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

export default function Dashboard() {
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="Lead volume, pipeline and what has changed on the site recently."
      >
        <Button variant="ghost" onClick={() => window.open('http://localhost:5183', '_blank')}>
          View website
        </Button>
      </PageHeader>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard icon={Inbox} label="Total enquiries" value={d.enquiries.total} sub="All time" />
        <StatCard icon={CalendarDays} label="Today" value={d.enquiries.today} sub={`${d.enquiries.week} in the last 7 days`} />
        <StatCard icon={TrendingUp} label="New / unactioned" value={d.enquiries.byStatus.new} sub="Waiting on a first call" />
        <StatCard icon={CheckCircle2} label="Converted" value={converted} sub={`${conversionRate}% of all leads`} />
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

      <div className="two-col">
        <Card>
          <CardHead title="Latest enquiries">
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

        <Card>
          <CardHead title="Recent activity" sub="Changes made in this panel" />
          {d.activity.length ? (
            <div>
              {d.activity.map((a) => (
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
      </div>
    </>
  );
}
