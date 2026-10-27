import { Tabs } from '@stacktape/ui-react/tabs';
import type { CSSProperties } from 'react';
import { Fragment, useEffect, useState } from 'react';
import {
  type BenchmarkData,
  type BenchmarkGroup as Group,
  type Comparison,
  fileUrl,
  formatValue,
  scaleMax,
  toolName
} from './benchmarks';

const TABS_ID = 'rm-bench';
const panelId = (comparison: Comparison) => `${TABS_ID}-panel-${comparison.id}`;

const shortDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Notes carry `code` in backticks, as the benchmark repository writes them. */
export function Inline({ text }: { text: string }) {
  let offset = 0;
  const parts = text.split('`').map((part, index) => {
    const start = offset;
    offset += part.length + 1;
    return { start, part, code: index % 2 === 1 };
  });
  return (
    <>
      {parts.map(({ start, part, code }) =>
        code ? <code key={start}>{part}</code> : <Fragment key={start}>{part}</Fragment>
      )}
    </>
  );
}

/**
 * One application's bars: a row per tool, fastest first. Stacktape's bar is
 * the brand colour and every other tool is the same muted grey, so the eye finds one bar and reads
 * the rest against it. The value sits at the bar's tip; the fastest tool in the group says so, which
 * is how a loss shows without a second colour.
 */
export function BenchmarkGroup({
  data,
  group,
  unit,
  max,
  compact = false
}: {
  data: BenchmarkData;
  group: Group;
  unit: string;
  max: number;
  compact?: boolean;
}) {
  const values = group.values.toSorted((a, b) => a.median - b.median);
  const best = values[0]?.median;
  return (
    <div className={compact ? 'rm-bench__group rm-bench__group--compact' : 'rm-bench__group'}>
      {!compact && (
        <h4 className="rm-bench__app">
          <code>{group.app}</code>
          <span>{group.label}</span>
        </h4>
      )}
      <ul className="rm-bench__rows" aria-label={compact ? undefined : `${group.app}: ${group.label}`}>
        {values.map((value) => {
          const name = toolName(data, value.tool);
          const fastest = value.median === best;
          const range =
            value.runs > 1
              ? `${formatValue(value.min, unit)} to ${formatValue(value.max, unit)}, ${value.runs} runs`
              : 'one measurement';
          return (
            <li
              className={['rm-bench__row', value.tool === 'stacktape' && 'rm-bench__row--stacktape']
                .filter(Boolean)
                .join(' ')}
              key={value.tool}
              title={`${name}: ${formatValue(value.median, unit)} median (${range}), ${shortDate(value.date)}`}
            >
              <span className="rm-bench__tool">{name}</span>
              <span className="rm-bench__track">
                <span
                  aria-hidden="true"
                  className="rm-bench__bar"
                  style={{ '--rm-share': value.median / max } as CSSProperties}
                />
                <span className="rm-bench__val">
                  {formatValue(value.median, unit)}
                  {fastest && <span className="rm-bench__best">fastest</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Panel({ data, comparison, active }: { data: BenchmarkData; comparison: Comparison; active: boolean }) {
  const [viewId, setViewId] = useState(comparison.views[0]?.id ?? '');
  const view = comparison.views.find((candidate) => candidate.id === viewId) ?? comparison.views[0];
  const max = scaleMax(comparison);
  const viewPanelId = `${panelId(comparison)}-view`;
  const files = [...new Set(comparison.views.flatMap((v) => v.groups.flatMap((g) => g.values.map((x) => x.file))))];
  const dates = [
    ...new Set(comparison.views.flatMap((v) => v.groups.flatMap((g) => g.values.map((x) => x.date))))
  ].toSorted();

  return (
    <section
      aria-labelledby={`${TABS_ID}-tab-${comparison.id}`}
      className="rm-bench__panel"
      hidden={!active}
      id={panelId(comparison)}
      role="tabpanel"
      tabIndex={0}
    >
      <div className="rm-bench__head">
        <h3 className="rm-bench__title">{comparison.title}</h3>
        <p className="rm-bench__desc">
          <Inline text={comparison.description} />
        </p>
      </div>

      {comparison.views.length > 1 && (
        <Tabs
          ariaLabel={`${comparison.title}: kind of change`}
          className="rm-bench__views"
          id={`${TABS_ID}-${comparison.id}`}
          onValueChange={setViewId}
          size="small"
          tabs={comparison.views.map((candidate) => ({
            value: candidate.id,
            label: candidate.label,
            panelId: viewPanelId
          }))}
          value={view?.id ?? ''}
          width="fit"
        />
      )}

      <div className="rm-bench__groups" id={viewPanelId}>
        {view?.groups.map((group) => (
          <BenchmarkGroup data={data} group={group} key={group.app} max={max} unit={comparison.unit} />
        ))}
      </div>

      <ul className="rm-bench__notes">
        {comparison.notes.map((note) => (
          <li key={note}>
            <Inline text={note} />
          </li>
        ))}
      </ul>

      <p className="rm-bench__source">
        <span className="rm-bench__status">{data.status}</span>
        <span aria-hidden="true">·</span>
        <span>Measured {dates.map(shortDate).join(' and ')} 2026</span>
        <span aria-hidden="true">·</span>
        <span>
          Data:{' '}
          {files.map((file, index) => (
            <Fragment key={file}>
              {index > 0 && ', '}
              <a href={fileUrl(data, file)}>{file}</a>
            </Fragment>
          ))}
        </span>
      </p>
    </section>
  );
}

/**
 * The benchmark page's one chart: a tab per comparison, one comparison visible at a time.
 *
 * Server-rendered, so the first tab reads before hydration and without JavaScript. The address
 * hash selects a tab (`/benchmarks#git-push`), which is how the homepage links straight to one.
 */
export function BenchmarkTabs({ data }: { data: BenchmarkData }) {
  const first = data.comparisons[0]?.id ?? '';
  const [current, setCurrent] = useState(first);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (data.comparisons.some((comparison) => comparison.id === id)) setCurrent(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [data]);

  const select = (id: string) => {
    setCurrent(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="rm-bench">
      <div className="rm-bench__strip">
        <Tabs
          appearance="underline"
          ariaLabel="Benchmark"
          className="rm-bench__tabs"
          id={TABS_ID}
          onValueChange={select}
          tabs={data.comparisons.map((comparison) => ({
            value: comparison.id,
            label: comparison.label,
            panelId: panelId(comparison)
          }))}
          value={current}
          width="fit"
        />
      </div>
      {data.comparisons.map((comparison) => (
        <Panel active={comparison.id === current} comparison={comparison} data={data} key={comparison.id} />
      ))}
    </div>
  );
}
