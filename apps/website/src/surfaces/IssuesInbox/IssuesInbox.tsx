/*
 * Console's error tracking, with one issue open.
 *
 * The list, the status filters, the three counters and the detail pane's metadata tiles and stack
 * trace are all the product's. One thing on this surface is not: **Autofix with Claude**. Today's
 * Console offers "Resolve", "Ignore", "Reopen" and "View latest logs" — it has no AI fix action —
 * so this button is the new capability the page is there to announce, and it is deliberately the
 * loudest thing on the screen. Everything around it is unchanged so the claim lands on a surface
 * the reader can trust.
 *
 * The occurrences sparkline is also an addition; the real detail page lists recent occurrences as a
 * table. It earns its place by being the join between this surface and the metrics one — the same
 * burst, an hour wide, in both.
 *
 * Server-rendered. The controls are spans, like every other recreated control on the site.
 */
import { ISSUES, OCCURRENCES_BY_HOUR, STACK_FRAMES, type Issue } from './issues';

const SELECTED_ID = 'checkout-items';

export type IssuesInboxProps = {
  className?: string | undefined;
};

export function IssuesInbox({ className }: IssuesInboxProps) {
  const selected = ISSUES.find((issue) => issue.id === SELECTED_ID) ?? ISSUES[0];
  if (selected === undefined) return null;

  return (
    <section className={['issues', className].filter(Boolean).join(' ')}>
      <header className="issues__header">
        <h3 className="issues__title">Error tracking</h3>
        <span className="issues__counts">
          <span className="issues__count is-open">
            <b>2</b> Open
          </span>
          <span className="issues__count is-resolved">
            <b>14</b> Resolved
          </span>
          <span className="issues__count is-ignored">
            <b>3</b> Ignored
          </span>
        </span>
      </header>

      <div className="issues__filters">
        <span className="issues__filter">
          Status
          <b>Open (2)</b>
        </span>
        <span className="issues__filter">
          Project
          <b>acme-project</b>
        </span>
        <span className="issues__filter">
          Stage
          <b>production</b>
        </span>
      </div>

      <div className="issues__split">
        <ol className="issues__list">
          {ISSUES.map((issue) => (
            <IssueRow isSelected={issue.id === selected.id} issue={issue} key={issue.id} />
          ))}
        </ol>

        <IssueDetail issue={selected} />
      </div>
    </section>
  );
}

function IssueRow({ issue, isSelected }: { issue: Issue; isSelected: boolean }) {
  return (
    <li className={`issue-row${isSelected ? ' is-selected' : ''}`}>
      <p className="issue-row__message">{issue.message}</p>
      <p className="issue-row__meta">
        <span className="issue-row__resource">{issue.resource}</span>
        <span className="issue-row__runtime">{issue.runtime}</span>
        <span className="issue-row__count">{issue.occurrences}×</span>
        <span className={`issue-status is-${issue.status.toLowerCase()}`}>{issue.status}</span>
      </p>
      <p className="issue-row__seen">Last seen {issue.lastSeen}</p>
    </li>
  );
}

function IssueDetail({ issue }: { issue: Issue }) {
  return (
    <article className="issue-detail">
      <p className="issue-detail__kind">
        <span className={`issue-status is-${issue.status.toLowerCase()}`}>{issue.status}</span>
        {issue.kind}
      </p>

      <h4 className="issue-detail__message">{issue.message}</h4>

      {/*
       * The hero of the surface. One brand-filled action, larger than anything near it, with the
       * product's existing actions kept beside it as plain secondaries — the point being that the
       * autofix is an addition to the workflow rather than a replacement for it.
       */}
      <div className="issue-detail__actions">
        <span className="issue-autofix">
          <SparkGlyph />
          Autofix with Claude
        </span>
        <span className="issue-action">Resolve</span>
        <span className="issue-action">Ignore</span>
        <span className="issue-action">View latest logs</span>
      </div>

      <dl className="issue-detail__facts">
        <div>
          <dt>First seen</dt>
          <dd>{issue.firstSeen}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{issue.lastSeen}</dd>
        </div>
        <div>
          <dt>Occurrences</dt>
          <dd>{issue.occurrences}</dd>
        </div>
        <div>
          <dt>Resource</dt>
          <dd>{issue.resource}</dd>
        </div>
      </dl>

      <p className="issue-detail__section-label">Occurrences · last 24 hours</p>
      <OccurrencesSparkline />

      <p className="issue-detail__section-label">Stack trace</p>
      <ol className="issue-trace">
        {STACK_FRAMES.map((frame) => (
          <li className="issue-trace__frame" key={`${frame.file}:${frame.line}`}>
            <p className="issue-trace__head">
              <span className="issue-trace__fn">{frame.fn}</span>
              <span className="issue-trace__loc">
                {frame.file}:{frame.line}:{frame.column}
              </span>
            </p>
            {frame.source !== undefined && <p className="issue-trace__source">{frame.source}</p>}
          </li>
        ))}
      </ol>
    </article>
  );
}

/**
 * Occurrences per hour, as bars.
 *
 * `preserveAspectRatio="none"` stretches the 24-unit box to whatever width it is given; the bars are
 * plain rectangles, so stretching them is exactly what should happen.
 */
function OccurrencesSparkline() {
  return (
    <svg aria-hidden="true" className="issue-spark" preserveAspectRatio="none" viewBox="0 0 24 10">
      {occurrenceBars().map((bar) => (
        <rect height={bar.height} key={bar.x} width="0.62" x={bar.x} y={bar.y} />
      ))}
    </svg>
  );
}

/**
 * One bar per hour, in a 24 × 10 box the SVG stretches to whatever width it is given.
 *
 * A quiet hour keeps a 0.35-high tick rather than disappearing, so the flat stretch before the burst
 * reads as "nothing happened" instead of as missing data. Each bar's x position is unique, which is
 * what makes it a stable key.
 */
const occurrenceBars = (): { x: number; y: number; height: number }[] => {
  const max = Math.max(...OCCURRENCES_BY_HOUR);

  return OCCURRENCES_BY_HOUR.map((value, hour) => {
    const height = value === 0 ? 0.35 : Math.max((value / max) * 10, 0.5);
    return { x: hour + 0.19, y: 10 - height, height };
  });
};

/** A four-point sparkle: the shorthand for "a model did this", used once on the whole site. */
function SparkGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="issue-autofix__glyph"
      fill="currentColor"
      height="15"
      viewBox="0 0 16 16"
      width="15"
    >
      <path d="M8 0.9c.35 2.7.9 4.4 1.85 5.35C10.8 7.2 12.5 7.75 15.2 8.1c-2.7.35-4.4.9-5.35 1.85C8.9 10.9 8.35 12.6 8 15.3c-.35-2.7-.9-4.4-1.85-5.35C5.2 9 3.5 8.45.8 8.1c2.7-.35 4.4-.9 5.35-1.85C7.1 5.3 7.65 3.6 8 .9Z" />
      <path
        d="M13.1 0.6c.16 1.06.36 1.66.75 2.05.39.39.99.59 2.05.75-1.06.16-1.66.36-2.05.75-.39.39-.59.99-.75 2.05-.16-1.06-.36-1.66-.75-2.05-.39-.39-.99-.59-2.05-.75 1.06-.16 1.66-.36 2.05-.75.39-.39.59-.99.75-2.05Z"
        opacity="0.75"
      />
    </svg>
  );
}
