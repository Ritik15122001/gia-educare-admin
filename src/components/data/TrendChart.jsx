// A hand-rolled SVG bar chart. A charting library would add ~400KB for one
// 30-bar figure, so this stays dependency-free and themable via CSS.
export default function TrendChart({ data = [], height = 180 }) {
  if (!data.length) return null;

  const max = Math.max(1, ...data.map((d) => d.count));
  const barGap = 3;
  const width = 100; // viewBox units — scales to any container width
  const barWidth = (width - barGap * (data.length - 1)) / data.length;

  const label = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" style={{ height }} role="img" aria-label="Enquiries over the last 30 days">
        {data.map((d, i) => {
          const barHeight = (d.count / max) * 34;
          return (
            <rect
              key={d.date}
              className="bar"
              x={i * (barWidth + barGap)}
              y={38 - barHeight}
              width={barWidth}
              height={Math.max(barHeight, d.count ? 1 : 0.4)}
              rx="0.6"
            >
              <title>{`${label(d.date)}: ${d.count} enquiry${d.count === 1 ? '' : 's'}`}</title>
            </rect>
          );
        })}
        <line className="axis" x1="0" y1="38.6" x2={width} y2="38.6" vectorEffect="non-scaling-stroke" />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span className="tiny muted">{label(data[0].date)}</span>
        <span className="tiny muted">Peak {max}/day</span>
        <span className="tiny muted">{label(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}
