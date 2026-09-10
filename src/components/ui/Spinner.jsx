export default function Spinner({ label }) {
  return (
    <div className="page-loading">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        {label && <p className="tiny muted">{label}</p>}
      </div>
    </div>
  );
}
