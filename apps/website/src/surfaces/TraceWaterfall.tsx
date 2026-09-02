/*
 * One distributed trace, as Console's trace detail page draws it.
 *
 * The shape is the product's: a summary strip (status, total duration, span count, the services
 * involved), then a header row whose axis ticks are the elapsed time at 0/25/50/75/100% of the
 * trace, then one row per span — indented by depth, tagged with its service's colour, bar
 * positioned by offset and sized by duration, duration right-aligned.
 *
 * The request is the checkout the rest of the site keeps referring to: the gateway hands it to
 * `apiService`, which reads the database, checks the cache, calls Stripe and hands the receipt to
 * `worker`. The database read is marked slow, which is the point of showing a waterfall at all —
 * 288 ms of a 842 ms request is a thing you can only see laid out like this.
 *
 * Server-rendered; every bar's geometry is arithmetic on the numbers below.
 */

const TOTAL_MS = 842;

type Span = {
  name: string;
  service: string;
  /** Milliseconds from the start of the trace. */
  offset: number;
  duration: number;
  /** Nesting level. The product indents 16 px per level. */
  depth: number;
  /** Flagged when the span is at or past the p95 for its operation; drawn amber, not red. */
  isSlow?: boolean;
};

const SPANS: readonly Span[] = [
  { name: 'POST /api/checkout', service: 'api-gateway', offset: 0, duration: 842, depth: 0 },
  { name: 'apiService POST /api/checkout', service: 'apiService', offset: 12, duration: 826, depth: 1 },
  { name: 'SELECT orders, order_items', service: 'mainDatabase', offset: 34, duration: 288, depth: 2, isSlow: true },
  { name: 'GET session:8f21c4', service: 'cache', offset: 330, duration: 6, depth: 2 },
  { name: 'POST api.stripe.com/v1/payment_intents', service: 'stripe.com', offset: 344, duration: 448, depth: 2 },
  { name: 'worker invoke (async)', service: 'worker', offset: 796, duration: 16, depth: 2 }
];

/*
 * Console colours a trace by service through a stable hash into a fixed palette — the colours
 * identify participants, they are not the AWS category tints the resource icons use. These are
 * assigned by hand for the same reason: six services, six colours nobody has to squint at.
 */
const SERVICE_COLORS: Readonly<Record<string, string>> = {
  'api-gateway': '#8E58EB',
  apiService: '#ED7100',
  mainDatabase: '#4D73F4',
  cache: '#36BEBE',
  'stripe.com': '#96A0B5',
  worker: '#5CA034'
};

const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

export type TraceWaterfallProps = {
  className?: string | undefined;
};

export function TraceWaterfall({ className }: TraceWaterfallProps) {
  return (
    <section className={['trace', className].filter(Boolean).join(' ')}>
      <header className="trace__header">
        <div className="trace__identity">
          <h3 className="trace__title">POST /api/checkout</h3>
          <p className="trace__subtitle">apiService · Sep 24, 2026, 2:31:07 PM</p>
        </div>
        <span className="trace__status">
          <span aria-hidden="true" className="trace__status-dot" />
          OK
          <span className="trace__status-code">200</span>
        </span>
      </header>

      <p className="trace__summary">
        <span>
          <b>842ms</b> total
        </span>
        <span>{SPANS.length} spans</span>
        {Object.keys(SERVICE_COLORS).map((service) => (
          <span className="trace__chip" key={service}>
            <span aria-hidden="true" className="trace__swatch" style={{ background: SERVICE_COLORS[service] }} />
            {service}
          </span>
        ))}
      </p>

      <div className="trace__waterfall">
        <div className="trace__row trace__row--head">
          <span className="trace__col-label">Span</span>
          <span className="trace__axis">
            {AXIS_TICKS.map((tick) => (
              <span key={tick}>{formatMs(TOTAL_MS * tick)}</span>
            ))}
          </span>
          <span />
        </div>

        {SPANS.map((span) => (
          <div className="trace__row" key={span.name}>
            <span className="trace__name" style={{ paddingLeft: `${span.depth * 16}px` }}>
              <span aria-hidden="true" className="trace__swatch" style={{ background: SERVICE_COLORS[span.service] }} />
              <span className="trace__name-text">{span.name}</span>
            </span>

            <span className="trace__track">
              <span
                className={`trace__bar${span.isSlow === true ? ' is-slow' : ''}`}
                style={{
                  background: SERVICE_COLORS[span.service],
                  left: `${percent(span.offset)}%`,
                  width: `${Math.max(percent(span.duration), 0.4)}%`
                }}
              />
            </span>

            <span className={`trace__duration${span.isSlow === true ? ' is-slow' : ''}`}>
              {formatMs(span.duration)}
            </span>
          </div>
        ))}
      </div>

      <p className="trace__note">
        <span aria-hidden="true" className="trace__note-dot" />
        <span>
          <b>SELECT orders, order_items</b> took 288 ms — past the p95 for this query. It is 34% of the request.
        </span>
      </p>
    </section>
  );
}

const percent = (ms: number): number => Math.round((ms / TOTAL_MS) * 10_000) / 100;

/** Console's span-duration format: whole milliseconds under a second, then seconds to two places. */
const formatMs = (ms: number): string => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`);
