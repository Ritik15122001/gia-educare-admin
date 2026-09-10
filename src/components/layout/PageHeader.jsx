// Rendered inside each page (not the topbar) so the title scrolls with content
// on small screens but still reads as the page's H1.
export default function PageHeader({ crumb, title, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      <div style={{ minWidth: 0 }}>
        {crumb && <div className="crumb" style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 4 }}>{crumb}</div>}
        <h1 style={{ fontSize: '1.45rem' }}>{title}</h1>
        {sub && <p className="muted" style={{ fontSize: '.85rem', marginTop: 5, maxWidth: '62ch' }}>{sub}</p>}
      </div>
      {children && <div className="row-gap" style={{ marginLeft: 'auto' }}>{children}</div>}
    </div>
  );
}
