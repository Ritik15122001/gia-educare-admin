import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Download, Search, Pencil, Trash2, Wallet, TrendingUp, TrendingDown, PiggyBank, Archive, BookOpen,
} from 'lucide-react';
import { financeApi } from '../api';
import { api } from '../api/client';
import { useCanModule } from '../store/authStore';
import { useDebounced } from '../hooks/useDebounced';
import { confirmDialog, toast } from '../store/uiStore';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardHead } from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/data/Pagination';
import { Input, Select } from '../components/forms/Field';
import FinanceEntryModal from '../components/forms/FinanceEntryModal';
import {
  inr, inrShort, inrSigned, formatDay, formatMonth, periodOptions, tagsForType, today, PAYMENT_MODE_LABELS,
} from '../utils/finance';
import { cn } from '../utils/cn';

const TABS = [
  { key: 'entries', label: 'Entries' },
  { key: 'statement', label: 'P&L statement' },
  { key: 'guide', label: 'Tagging guide' },
];

function Tile({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="stat-card">
      <div className="top">
        <span className={cn('ico', tone && `fin-ico-${tone}`)}><Icon /></span>
        <span className="label">{label}</span>
      </div>
      <div className={cn('value', tone === 'loss' && 'fin-neg')}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

// --- entries -----------------------------------------------------------------

function EntriesTab({ period, options, canEdit, canDelete, onEdit, onRetag, onDelete, filters, setFilters }) {
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(filters.search, 300);
  const plTags = options?.plTags || [];
  const tagLabel = Object.fromEntries(plTags.map((t) => [t.key, t.label]));

  const params = useMemo(() => ({
    page, limit: 25, from: period.from, to: period.to,
    search: debouncedSearch, type: filters.type, plTag: filters.plTag, category: filters.category,
  }), [page, period, debouncedSearch, filters.type, filters.plTag, filters.category]);

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'entries', params],
    queryFn: () => financeApi.list(params),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data || [];
  const meta = data?.meta;
  const set = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const filtered = filters.search || filters.type || filters.plTag || filters.category;
  const categories = [...new Set([...(options?.categories?.income || []), ...(options?.categories?.expense || [])])].sort();

  return (
    <Card>
      <div className="toolbar">
        <div className="search-box">
          <Search />
          <Input placeholder="Search notes, party, invoice no…" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
        </div>
        <Select style={{ maxWidth: 140 }} placeholder="All types" value={filters.type}
          options={[{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]}
          onChange={(e) => set({ type: e.target.value })} />
        <Select style={{ maxWidth: 180 }} placeholder="Any P&L tag" value={filters.plTag}
          options={plTags.map((t) => ({ value: t.key, label: t.label }))}
          onChange={(e) => set({ plTag: e.target.value })} />
        <Select style={{ maxWidth: 190 }} placeholder="Any category" value={filters.category}
          options={categories} onChange={(e) => set({ category: e.target.value })} />
        {meta?.totals && (
          <span className="tiny muted fin-toolbar-totals">
            In <b className="fin-pos">{inr(meta.totals.income)}</b> · Out <b className="fin-neg">{inr(meta.totals.expense)}</b>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="card-pad stack">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
        </div>
      ) : !rows.length ? (
        <EmptyState
          icon={Wallet}
          title={filtered ? 'No matching entries' : 'No entries in this period'}
          message={filtered
            ? 'Try a different search or clear the filters.'
            : canEdit ? 'Add your first income or expense — tag it to a P&L head and the statement builds itself.' : 'Nothing has been recorded for these dates.'}
        />
      ) : (
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Date</th>
                <th style={{ width: 90 }}>Type</th>
                <th>Category</th>
                <th style={{ width: 170 }}>Party</th>
                <th style={{ width: 190 }}>P&amp;L tag</th>
                <th style={{ width: 140, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 90 }} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="tiny" style={{ whiteSpace: 'nowrap' }}>{formatDay(row.date)}</td>
                  <td><Badge tone={row.type === 'income' ? 'ok' : 'err'}>{row.type === 'income' ? 'Income' : 'Expense'}</Badge></td>
                  <td>
                    <div className="row-title">{row.category}</div>
                    {row.description && <div className="row-sub fin-clip">{row.description}</div>}
                  </td>
                  <td>
                    <div className="tiny">{row.party || <span className="muted">—</span>}</div>
                    {(row.paymentMode || row.reference) && (
                      <div className="tiny muted">{[PAYMENT_MODE_LABELS[row.paymentMode], row.reference].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <Select
                        aria-label="P&L tag"
                        style={{ padding: '5px 28px 5px 9px', fontSize: '.78rem' }}
                        value={row.plTag}
                        options={tagsForType(plTags, row.type).map((t) => ({ value: t.key, label: t.label }))}
                        onChange={(e) => onRetag(row, e.target.value)}
                      />
                    ) : (
                      <Badge tone={row.plTag === 'excluded' ? 'neutral' : 'gold'}>{tagLabel[row.plTag] || row.plTag}</Badge>
                    )}
                  </td>
                  <td className={cn('fin-amt', row.type === 'income' ? 'fin-pos' : 'fin-neg')}>
                    {inrSigned(row.type === 'income' ? row.amount : -row.amount)}
                  </td>
                  <td className="actions">
                    <div className="row-gap" style={{ justifyContent: 'flex-end', gap: 5 }}>
                      {canEdit && <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(row)} />}
                      {canDelete && <IconButton icon={Trash2} label="Delete" onClick={() => onDelete(row)} />}
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
  );
}

// --- P&L statement -------------------------------------------------------------

function HeadRows({ head, prefix }) {
  if (!head) return null;
  return (
    <>
      <tr className="pl-head">
        <td>{prefix ? `${prefix} ` : ''}{head.label}</td>
        <td className="num">{inr(head.total)}</td>
      </tr>
      {head.categories.length ? head.categories.map((c) => (
        <tr className="pl-cat" key={c.category}>
          <td>{c.category} <span className="muted">· {c.count}</span></td>
          <td className="num">{inr(c.total)}</td>
        </tr>
      )) : (
        <tr className="pl-cat"><td className="muted">Nothing tagged here</td><td className="num muted">—</td></tr>
      )}
    </>
  );
}

function ProfitRow({ label, value, margin, big }) {
  return (
    <tr className={cn('pl-profit', big && 'pl-net')}>
      <td>
        {label}
        {margin !== null && margin !== undefined && <span className="pl-margin">{margin}% of revenue</span>}
      </td>
      <td className={cn('num', value < 0 && 'fin-neg')}>{value < 0 ? `−${inr(-value)}` : inr(value)}</td>
    </tr>
  );
}

function StatementTab({ summary, loading, periodLabel }) {
  if (loading || !summary) {
    return <Card pad><div className="stack">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 30 }} />)}</div></Card>;
  }
  const h = Object.fromEntries(summary.heads.map((x) => [x.key, x]));
  const t = summary.totals;
  const pct = (v) => (t.revenue ? Math.round((v / t.revenue) * 1000) / 10 : null);
  const maxMonth = Math.max(1, ...summary.months.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className="two-col">
      <Card>
        <CardHead title="Profit & loss statement" sub={`${periodLabel} · built from each entry's P&L tag`} />
        <div className="table-wrap">
          <table className="pl-table">
            <tbody>
              <HeadRows head={h.revenue} />
              <HeadRows head={h.direct_cost} prefix="Less:" />
              <ProfitRow label="Gross profit" value={t.grossProfit} margin={t.grossMargin} />
              <HeadRows head={h.operating_expense} prefix="Less:" />
              <ProfitRow label="Operating profit" value={t.operatingProfit} margin={pct(t.operatingProfit)} />
              <HeadRows head={h.other_income} prefix="Add:" />
              <HeadRows head={h.other_expense} prefix="Less:" />
              <ProfitRow label={t.netProfit < 0 ? 'Net loss' : 'Net profit'} value={t.netProfit} margin={t.netMargin} big />
            </tbody>
          </table>
        </div>
        <div className="pl-excluded">
          <table className="pl-table">
            <tbody><HeadRows head={h.excluded} /></tbody>
          </table>
          <p className="tiny muted">Recorded on the books but kept out of profit.</p>
        </div>
      </Card>

      <Card>
        <CardHead title="Month by month" sub="Entries tagged Not in P&L are left out" />
        {summary.months.length ? (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Income</th>
                  <th style={{ textAlign: 'right' }}>Expenses</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {[...summary.months].reverse().map((m) => (
                  <tr key={m.month}>
                    <td>
                      <div className="row-title">{formatMonth(m.month)}</div>
                      <div className="fin-bars" aria-hidden="true">
                        <span className="in" style={{ width: `${(m.income / maxMonth) * 100}%` }} />
                        <span className="out" style={{ width: `${(m.expense / maxMonth) * 100}%` }} />
                      </div>
                    </td>
                    <td className="fin-amt tiny">{inr(m.income)}</td>
                    <td className="fin-amt tiny">{inr(m.expense)}</td>
                    <td className={cn('fin-amt tiny', m.net < 0 ? 'fin-neg' : 'fin-pos')}>{inrSigned(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={TrendingUp} title="No months to show" message="Entries in this period will be totalled here by month." />
        )}
      </Card>
    </div>
  );
}

// --- tagging guide ---------------------------------------------------------------

function GuideTab({ options }) {
  const plTags = options?.plTags || [];
  const suggested = Object.entries(options?.suggestedTags || {});
  const applies = { income: 'Income entries', expense: 'Expense entries', any: 'Income or expense' };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Card pad>
        <h2 style={{ fontSize: '1rem', marginBottom: 6 }}>How P&amp;L tagging works</h2>
        <p className="muted" style={{ fontSize: '.85rem', maxWidth: '72ch' }}>
          Record every rupee that comes in or goes out as an entry, then tag it by hand to one P&amp;L head.
          The category says <i>what</i> it was (Rent, Counselling fees); the tag says <i>where it lands</i> in the statement.
          You can re-tag any entry straight from the Entries table.
        </p>
        <ol className="fin-formula">
          <li><b>Gross profit</b> = Revenue − Direct costs</li>
          <li><b>Operating profit</b> = Gross profit − Operating expenses</li>
          <li><b>Net profit</b> = Operating profit + Other income − Other expenses</li>
        </ol>
      </Card>

      <div className="fin-guide">
        {plTags.map((t) => (
          <div className="fin-guide-card" key={t.key}>
            <div className="row-gap" style={{ justifyContent: 'space-between' }}>
              <b>{t.label}</b>
              <Badge tone={t.type === 'income' ? 'ok' : t.type === 'expense' ? 'err' : 'neutral'}>{applies[t.type]}</Badge>
            </div>
            <p>{t.hint}</p>
            {suggested.some(([, key]) => key === t.key) && (
              <p className="tiny muted">Suggested for: {suggested.filter(([, key]) => key === t.key).map(([c]) => c).join(', ')}</p>
            )}
          </div>
        ))}
      </div>

      <Card pad>
        <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>When in doubt</h2>
        <ul className="fin-rules">
          <li>Would this cost disappear if you had one student fewer? Tag it <b>Direct costs</b>. Otherwise it is an <b>Operating expense</b>.</li>
          <li>Something you will use for years (laptops, furniture, office fit-out) is <b>Not in P&amp;L</b> — it is a purchase of an asset, not a monthly cost.</li>
          <li>Loans taken or repaid, money the owners put in or take out, and transfers between your own accounts are <b>Not in P&amp;L</b>. Loan <i>interest</i> is an <b>Other expense</b>.</li>
          <li>GST collected on an invoice isn't your income — record the fee without GST, or tag the GST part <b>Not in P&amp;L</b>.</li>
          <li>Refunded a student? Edit the original income entry down to the amount you kept, so revenue stays accurate.</li>
        </ul>
      </Card>
    </div>
  );
}

// --- page ----------------------------------------------------------------------------

export default function Finance() {
  const queryClient = useQueryClient();
  const canEdit = useCanModule('finance', 'edit');
  const canDelete = useCanModule('finance', 'delete');

  const periods = useMemo(() => periodOptions(), []);
  const [periodKey, setPeriodKey] = useState('this-fy');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const period = periodKey === 'custom' ? custom : periods.find((p) => p.key === periodKey);
  const periodLabel = periodKey === 'custom'
    ? [custom.from && formatDay(custom.from), custom.to && formatDay(custom.to)].filter(Boolean).join(' – ') || 'All dates'
    : period.label;

  const [tab, setTab] = useState('entries');
  const [filters, setFilters] = useState({ search: '', type: '', plTag: '', category: '' });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit

  const { data: optionsData } = useQuery({ queryKey: ['finance', 'options'], queryFn: financeApi.options, staleTime: 60_000 });
  const options = optionsData?.data;

  const range = { from: period.from, to: period.to };
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance', 'summary', range],
    queryFn: () => financeApi.summary(range),
    placeholderData: (prev) => prev,
  });
  const summary = summaryData?.data;
  const t = summary?.totals;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finance'] });

  const save = useMutation({
    mutationFn: ({ id, payload }) => (id ? financeApi.update(id, payload) : financeApi.create(payload)),
    onSuccess: (_res, { id }) => {
      invalidate();
      setEditing(null);
      toast(id ? 'Entry updated' : 'Entry added');
    },
    onError: (err) => toast(err.message, 'err'),
  });

  const retag = useMutation({
    mutationFn: ({ id, plTag }) => financeApi.update(id, { plTag }),
    onSuccess: () => { invalidate(); toast('P&L tag updated'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const remove = useMutation({
    mutationFn: (id) => financeApi.remove(id),
    onSuccess: () => { invalidate(); toast('Entry deleted'); },
    onError: (err) => toast(err.message, 'err'),
  });

  const handleDelete = async (row) => {
    const confirmed = await confirmDialog({
      title: 'Delete entry?',
      message: `${row.category} · ${inr(row.amount)} on ${formatDay(row.date)} will be permanently removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (confirmed) remove.mutate(row.id);
  };

  // The export endpoint needs the auth header, so fetch it and save the blob.
  const handleExport = async () => {
    try {
      const params = { ...range, type: filters.type, plTag: filters.plTag, category: filters.category, search: filters.search };
      const res = await api.raw(financeApi.exportUrl(params));
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `gia-finance-${periodKey === 'custom' ? 'custom' : periodKey}-${today()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast('CSV downloaded');
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  return (
    <>
      <PageHeader crumb="Finance" title="Expenses & P&L" sub="Record income and expenses, tag each one to a profit & loss head, and read the statement for any period.">
        <Button variant="ghost" icon={Download} onClick={handleExport}>Export CSV</Button>
        {canEdit && <Button icon={Plus} onClick={() => setEditing({})}>Add entry</Button>}
      </PageHeader>

      <div className="row-gap" style={{ marginBottom: 16 }}>
        {periods.map((p) => (
          <button key={p.key} type="button" className={cn('btn', 'btn-sm', periodKey === p.key ? 'btn-primary' : 'btn-ghost')} onClick={() => setPeriodKey(p.key)}>
            {p.label}
          </button>
        ))}
        <button type="button" className={cn('btn', 'btn-sm', periodKey === 'custom' ? 'btn-primary' : 'btn-ghost')} onClick={() => setPeriodKey('custom')}>
          Custom
        </button>
        {periodKey === 'custom' && (
          <span className="row-gap">
            <Input type="date" aria-label="From" style={{ width: 150 }} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <span className="muted tiny">to</span>
            <Input type="date" aria-label="To" style={{ width: 150 }} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </span>
        )}
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <Tile icon={TrendingUp} tone="in" label="Income" value={inrShort(t?.totalIncome)} sub={t ? `${inr(t.revenue)} revenue` : '—'} />
        <Tile
          icon={TrendingDown}
          tone="out"
          label="Expenses"
          value={inrShort(t?.totalExpense)}
          sub={summary ? `${inr(summary.heads.find((x) => x.key === 'operating_expense')?.total)} operating · ${inr(summary.heads.find((x) => x.key === 'direct_cost')?.total)} direct` : '—'}
        />
        <Tile
          icon={PiggyBank}
          tone={t && t.netProfit < 0 ? 'loss' : 'in'}
          label={t && t.netProfit < 0 ? 'Net loss' : 'Net profit'}
          value={inrShort(t?.netProfit)}
          sub={t?.netMargin !== null && t?.netMargin !== undefined ? `${t.netMargin}% net margin` : 'No revenue in this period'}
        />
        <Tile icon={Archive} label="Not in P&L" value={inrShort(t?.excluded)} sub="Assets, loans & transfers" />
      </div>

      <div className="row-gap fin-tabs" role="tablist" style={{ marginBottom: 16 }}>
        {TABS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={cn('fin-tab', tab === x.key && 'active')} onClick={() => setTab(x.key)}>
            {x.key === 'guide' && <BookOpen size={14} />} {x.label}
          </button>
        ))}
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>{periodLabel}</span>
      </div>

      {tab === 'entries' && (
        <EntriesTab
          period={range}
          options={options}
          canEdit={canEdit}
          canDelete={canDelete}
          filters={filters}
          setFilters={setFilters}
          onEdit={(row) => setEditing(row)}
          onRetag={(row, plTag) => retag.mutate({ id: row.id, plTag })}
          onDelete={handleDelete}
        />
      )}
      {tab === 'statement' && <StatementTab summary={summary} loading={summaryLoading} periodLabel={periodLabel} />}
      {tab === 'guide' && <GuideTab options={options} />}

      <FinanceEntryModal
        open={editing !== null}
        entry={editing?.id ? editing : null}
        options={options}
        saving={save.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => save.mutate({ id: editing?.id, payload })}
      />
    </>
  );
}
