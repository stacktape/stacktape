/*
 * Console's metrics, for the four resources that have any.
 *
 * The chrome is the product's, down to the details that are easy to get wrong: the metric name
 * carries its unit in parentheses ("CPU utilization (%)"), the numbers above the plot are a
 * min/avg/max triplet rather than one "current" figure, gridlines are horizontal and dashed only,
 * the y-axis starts at zero, and the fill is a gradient that fades out downwards. Cards sit in an
 * auto-fitting grid with a 350 px minimum, exactly as `CombinedMetricsGrid` lays them out.
 *
 * The charts are hand-drawn SVG. A charting library would be a large dependency shipped to every
 * visitor so that a picture which never changes could be computed in the browser; these are six
 * fixed arrays and a path builder, server-rendered once.
 *
 * The samples are hand-authored to be plausible rather than random — and the `worker` card carries
 * a short error spike on purpose. It is the same incident the Issues surface is looking at, so a
 * reader who scrolls from one to the other finds the story already joined up.
 */

/** Twelve minutes a sample, twenty-four samples: the three-hour window the toolbar says. */
const X_TICKS = ['14:00', '14:45', '15:30', '16:15', '17:00'] as const;

type Series = {
  label: string;
  values: readonly number[];
  /** `brand` is the product's default teal; `error` is the red it forces on error series. */
  tone: 'brand' | 'accent' | 'error';
};

export type MetricsPanelProps = {
  className?: string | undefined;
};

export function MetricsPanel({ className }: MetricsPanelProps) {
  return (
    <section className={['metrics', className].filter(Boolean).join(' ')}>
      <MetricsToolbar />

      <div className="metrics__grid">
        <MetricCard
          gradientId="metric-fill-cpu"
          headline="CPU & memory utilization (%)"
          max={100}
          resource="apiService · Fargate"
          series={[
            { label: 'CPU utilization', tone: 'brand', values: CPU },
            { label: 'Memory utilization', tone: 'accent', values: MEMORY }
          ]}
          unit="%"
        />

        <MetricCard
          gradientId="metric-fill-invocations"
          headline="Invocations (count)"
          max={900}
          overlay={{ label: 'Errors', values: ERRORS }}
          resource="worker · Lambda"
          series={[{ label: 'Invocations', tone: 'brand', values: INVOCATIONS }]}
          unit=""
        />

        <MetricCard
          gradientId="metric-fill-connections"
          headline="Database connections (count)"
          max={80}
          resource="mainDatabase · Aurora"
          series={[{ label: 'Database connections', tone: 'brand', values: CONNECTIONS }]}
          unit=""
        />

        <MetricCard
          gradientId="metric-fill-latency"
          headline="Response time · p95 (s)"
          max={1.2}
          resource="web · CloudFront"
          series={[{ label: 'Response time', tone: 'brand', values: LATENCY }]}
          unit="s"
        />
      </div>
    </section>
  );
}

/**
 * The toolbar. The product's org-level observability pages put a time-range control on the right of
 * the page header and an account/stage selector beside it; both are drawn here as the closed
 * triggers they spend almost all their life as.
 */
function MetricsToolbar() {
  return (
    <div className="metrics__toolbar">
      <p className="metrics__title">Metrics</p>

      <span className="metrics__control">
        <ClockGlyph />
        Last 3 hours
        <SmallChevron />
      </span>

      <span className="metrics__control">
        acme-project / staging
        <SmallChevron />
      </span>
    </div>
  );
}

function MetricCard({
  resource,
  headline,
  series,
  overlay,
  max,
  unit,
  gradientId
}: {
  resource: string;
  headline: string;
  series: readonly Series[];
  /**
   * A second measure whose scale has nothing to do with the first — errors against invocations.
   * Drawn as bars against their own maximum rather than forced onto a shared axis, where forty
   * errors beside eight hundred invocations would be an invisible line along the bottom.
   */
  overlay?: { label: string; values: readonly number[] };
  max: number;
  unit: string;
  gradientId: string;
}) {
  const primary = series[0];
  if (primary === undefined) return null;

  return (
    <article className="metric-card">
      <p className="metric-card__resource">{resource}</p>
      <h4 className="metric-card__headline">{headline}</h4>

      {series.length > 1 || overlay !== undefined ? (
        <p className="metric-card__legend">
          {series.map((entry) => (
            <span className={`metric-card__legend-item is-${entry.tone}`} key={entry.label}>
              <span aria-hidden="true" className="metric-card__swatch" />
              {entry.label}
              <b>{format(last(entry.values), unit)}</b>
            </span>
          ))}
          {overlay !== undefined && (
            <span className="metric-card__legend-item is-error" key={overlay.label}>
              <span aria-hidden="true" className="metric-card__swatch" />
              {overlay.label}
              <b>{format(Math.max(...overlay.values), '')} peak</b>
            </span>
          )}
        </p>
      ) : (
        <p className="metric-card__stats">
          <span>
            <i>Min</i>
            {format(Math.min(...primary.values), unit)}
          </span>
          <span>
            <i>Avg</i>
            {format(average(primary.values), unit)}
          </span>
          <span>
            <i>Max</i>
            {format(Math.max(...primary.values), unit)}
          </span>
        </p>
      )}

      <div className="metric-card__plot">
        <div className="metric-card__axis">
          {yTicks(max).map((tick) => (
            <span key={tick}>{format(tick, unit)}</span>
          ))}
        </div>

        <svg
          aria-hidden="true"
          className="metric-card__svg"
          preserveAspectRatio="none"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        >
          <g className="metric-card__grid">
            <line x1="0" x2={VIEW_W} y1={VIEW_H * 0.25} y2={VIEW_H * 0.25} />
            <line x1="0" x2={VIEW_W} y1={VIEW_H * 0.5} y2={VIEW_H * 0.5} />
            <line x1="0" x2={VIEW_W} y1={VIEW_H * 0.75} y2={VIEW_H * 0.75} />
          </g>

          {overlay !== undefined && (
            <g className="metric-card__bars">
              {errorBars(overlay.values).map((bar) => (
                <rect height={bar.height} key={bar.x} rx="0.4" width={bar.width} x={bar.x} y={bar.y} />
              ))}
            </g>
          )}

          {series.map((entry) => (
            <g className={`metric-card__series is-${entry.tone}`} key={entry.label}>
              {/*
               * The gradient lives inside the series group rather than in a shared `<defs>`, and
               * that placement is load-bearing: `currentColor` in a gradient stop resolves against
               * the gradient element's own inherited colour, not the colour of whatever references
               * it. Hoisted into `<defs>` it would inherit the page's text colour and every series
               * would fade out the same grey.
               */}
              <defs>
                <linearGradient id={`${gradientId}-${entry.tone}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath(entry.values, max)} fill={`url(#${gradientId}-${entry.tone})`} />
              <path
                d={linePath(entry.values, max)}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
      </div>

      <p className="metric-card__x-axis">
        {X_TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </p>
    </article>
  );
}

/**
 * The bars for a non-zero overlay sample, drawn up from the baseline against the overlay's own
 * maximum and capped at 55% of the plot — so a spike reads as an event against the primary series
 * rather than painting over it. Zero samples produce no bar at all, which is what makes the x
 * position of the surviving ones a usable React key.
 */
const errorBars = (values: readonly number[]): { x: number; y: number; width: number; height: number }[] => {
  const max = Math.max(...values);
  const width = round(VIEW_W / values.length / 2.4);

  return values.flatMap((value, index) => {
    if (value === 0) return [];
    const height = round((value / max) * VIEW_H * 0.55);
    return [
      {
        x: round(Math.max(0, (index / (values.length - 1)) * VIEW_W - width / 2)),
        y: round(VIEW_H - height),
        width,
        height
      }
    ];
  });
};

/* ── Geometry ─────────────────────────────────────────────────────────────────────────────────── */

/*
 * The plot is drawn in a 100 × 40 unit box and stretched to whatever the card is wide, which is why
 * every stroke carries `vector-effect="non-scaling-stroke"`: without it the horizontal stretch would
 * fatten the lines and squash the dashes.
 */
const VIEW_W = 100;
const VIEW_H = 40;

const round = (value: number): number => Math.round(value * 100) / 100;

const pointsFor = (values: readonly number[], max: number): { x: number; y: number }[] =>
  values.map((value, index) => ({
    x: (index / (values.length - 1)) * VIEW_W,
    y: VIEW_H - (Math.min(value, max) / max) * VIEW_H
  }));

/**
 * A quadratic curve through the midpoints between samples.
 *
 * It is the cheapest smoothing that never overshoots: the curve cannot invent a value above the
 * highest sample or below the lowest, which a cubic spline through the points themselves can.
 */
const linePath = (values: readonly number[], max: number): string => {
  const points = pointsFor(values, max);
  const first = points[0];
  if (first === undefined) return '';

  let d = `M ${round(first.x)} ${round(first.y)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] ?? first;
    const current = points[index] ?? first;
    const midX = round((previous.x + current.x) / 2);
    const midY = round((previous.y + current.y) / 2);
    d += ` Q ${round(previous.x)} ${round(previous.y)} ${midX} ${midY}`;
  }

  const end = points.at(-1) ?? first;
  return `${d} L ${round(end.x)} ${round(end.y)}`;
};

const areaPath = (values: readonly number[], max: number): string =>
  `${linePath(values, max)} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;

/* ── Formatting ───────────────────────────────────────────────────────────────────────────────── */

const yTicks = (max: number): number[] => [max, max * 0.75, max * 0.5, max * 0.25, 0];

const last = (values: readonly number[]): number => values.at(-1) ?? 0;

const average = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Console's own number formatting: thousands as `1.2K`, then the unit if there is one. */
const format = (value: number, unit: string): string => {
  const rendered =
    value >= 1000
      ? `${(value / 1000).toFixed(1)}K`
      : value >= 10 || value === 0
        ? String(Math.round(value))
        : value.toFixed(2);
  return unit === '' ? rendered : `${rendered}${unit === '%' ? '' : ' '}${unit}`;
};

/* ── Samples ──────────────────────────────────────────────────────────────────────────────────── */

const CPU = [31, 34, 29, 36, 41, 38, 44, 52, 49, 45, 58, 63, 57, 51, 47, 54, 61, 66, 59, 53, 48, 44, 41, 39];
const MEMORY = [52, 53, 54, 54, 55, 56, 58, 59, 61, 60, 62, 64, 63, 63, 64, 66, 67, 68, 67, 66, 65, 65, 64, 64];
const INVOCATIONS = [
  420, 380, 455, 510, 470, 530, 610, 585, 640, 700, 660, 720, 690, 640, 880, 760, 610, 570, 540, 500, 470, 455, 430, 412
];
/* The incident: a burst of undefined-property failures in the checkout worker, over in about half an
   hour. `IssuesInbox` shows the same 47 occurrences from the other side. */
const ERRORS = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 47, 31, 9, 2, 0, 0, 0, 0, 0, 0];
const CONNECTIONS = [22, 24, 23, 26, 29, 27, 31, 34, 33, 30, 36, 41, 44, 39, 52, 47, 38, 35, 33, 30, 28, 27, 26, 25];
const LATENCY = [
  0.21, 0.23, 0.2, 0.24, 0.27, 0.25, 0.29, 0.34, 0.31, 0.28, 0.35, 0.41, 0.38, 0.33, 0.62, 0.49, 0.36, 0.32, 0.3, 0.27,
  0.25, 0.24, 0.23, 0.22
];

/* ── Glyphs ───────────────────────────────────────────────────────────────────────────────────── */

function ClockGlyph() {
  return (
    <svg aria-hidden="true" className="metrics__glyph" fill="none" height="13" viewBox="0 0 16 16" width="13">
      <path d="M8 14.4A6.4 6.4 0 1 0 8 1.6a6.4 6.4 0 0 0 0 12.8Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.6V8l2.3 1.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
    </svg>
  );
}

function SmallChevron() {
  return (
    <svg
      aria-hidden="true"
      className="metrics__glyph metrics__glyph--chevron"
      fill="none"
      height="11"
      viewBox="0 0 16 16"
      width="11"
    >
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}
