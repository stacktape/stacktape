import { Tabs } from '@stacktape/ui-react/tabs';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BiCheck, BiChevronRight, BiCopy, BiDownArrowAlt, BiError, BiSearch, BiX } from 'react-icons/bi';
import { clock, spokenDuration, type DeployModel, type DeployPhase, type LogEntry } from '../../deploy-model';
import { awsTypeName } from './aws-types';
import { StatusMark } from './DeploySteps';
import { useNow } from './use-now';

type Filter = 'all' | 'warn' | 'error';

const MARKS: Partial<Record<LogEntry['level'], ReactNode>> = {
  success: <BiCheck size={15} />,
  warn: <BiError size={14} />,
  error: <BiX size={16} />
};

const timeOfDay = (time: number) =>
  new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

/** The text with what the search matched marked. */
function Highlighted({ text, query }: { text: string; query: string }) {
  if (query === '') return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  for (let index = lower.indexOf(query); index >= 0; index = lower.indexOf(query, from)) {
    parts.push(text.slice(from, index), <mark key={index}>{text.slice(index, index + query.length)}</mark>);
    from = index + query.length;
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

type Section = { entry?: LogEntry; phase?: DeployPhase; lines: LogEntry[] };

const sectionsOf = (log: readonly LogEntry[], phases: readonly DeployPhase[]): Section[] => {
  const sections: Section[] = [{ lines: [] }];
  for (const entry of log) {
    if (entry.kind === 'section') {
      sections.push({ entry, ...withPhase(phases, entry.phase), lines: [] });
      continue;
    }
    sections.at(-1)!.lines.push(entry);
  }
  return sections.filter((section) => section.entry !== undefined || section.lines.length > 0);
};

const withPhase = (phases: readonly DeployPhase[], id: string | undefined) => {
  const phase = phases.find((candidate) => candidate.id === id);
  return phase === undefined ? {} : { phase };
};

/** What wrote a line: a workload as the CLI names it, an AWS resource by its type's short name. */
const sourceLabel = (source: string | undefined) =>
  source === undefined ? '' : source.startsWith('AWS::') ? awsTypeName(source) : source;

const plainLine = (entry: LogEntry) =>
  [
    entry.time === undefined ? '        ' : timeOfDay(entry.time),
    entry.level === 'warn' ? 'WARN ' : entry.level === 'error' ? 'ERROR' : '     ',
    entry.source === undefined ? '' : `[${sourceLabel(entry.source)}]`,
    entry.text
  ]
    .filter((part) => part !== '')
    .join(' ');

/**
 * The deploy's log as a log tool shows one: a section per phase with its time, then one row per line with the time
 * of day, a mark for what finished, warned or failed, and what wrote it (a workload, an AWS resource's type). Warnings
 * and errors are tinted and can be shown alone; the search narrows the lines and marks what it found. While the deploy
 * runs, the log follows its newest line unless the reader has scrolled up, and offers a way back down.
 */
export function DeployLog({
  model,
  live,
  collapseDone = false,
  failed = false,
  className
}: {
  model: DeployModel;
  live: boolean;
  /** Finished phases start folded, the way a CI log shows its steps. */
  collapseDone?: boolean;
  failed?: boolean;
  className?: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const now = useNow(live);
  const needle = query.trim().toLowerCase();

  const warnings = model.log.filter((entry) => entry.kind === 'line' && entry.level === 'warn').length;
  const errors = model.log.filter((entry) => entry.kind === 'line' && entry.level === 'error').length;
  const sections = useMemo(() => sectionsOf(model.log, model.phases), [model.log, model.phases]);
  const matches = (entry: LogEntry) =>
    (filter === 'all' || entry.level === filter) &&
    (needle === '' || entry.text.toLowerCase().includes(needle) || (entry.source ?? '').toLowerCase().includes(needle));
  const narrowed = filter !== 'all' || needle !== '';
  const visible = sections
    .map((section) => Object.assign({}, section, { lines: section.lines.filter(matches) }))
    .filter((section) => !narrowed || section.lines.length > 0);
  const shownLines = visible.reduce((sum, section) => sum + section.lines.length, 0);

  // Follow the newest line while the reader is at the bottom.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element !== null && live && following && !narrowed) element.scrollTop = element.scrollHeight;
  }, [model.log.length, live, following, narrowed]);
  // A failed deploy opens on its error.
  useEffect(() => {
    if (!failed) return;
    scroller.current?.querySelector('.r-line.is-error')?.scrollIntoView({ block: 'center' });
  }, [failed]);

  const copy = async () => {
    const text = visible
      .flatMap((section) => [
        ...(section.entry === undefined ? [] : [`── ${section.entry.text}`]),
        ...section.lines.map(plainLine)
      ])
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The log is on screen to select by hand.
    }
  };

  return (
    <div className={`r-log${className === undefined ? '' : ` ${className}`}`}>
      <div className="r-log-tools">
        <Tabs
          ariaLabel="Show"
          appearance="segmented"
          onValueChange={setFilter}
          size="small"
          width="fit"
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'warn', label: `Warnings ${warnings}`, disabled: warnings === 0 && filter !== 'warn' },
            { value: 'error', label: `Errors ${errors}`, disabled: errors === 0 && filter !== 'error' }
          ]}
          value={filter}
        />
        <label className="r-log-search">
          <BiSearch aria-hidden size={15} />
          <input
            aria-label="Find in the deploy log"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find in the log"
            type="search"
            value={query}
          />
        </label>
        <button className="r-log-copy" onClick={() => void copy()} type="button">
          {copied ? <BiCheck aria-hidden size={15} /> : <BiCopy aria-hidden size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div
        aria-label="Deploy log"
        className="r-log-lines"
        onScroll={(event) => {
          const element = event.currentTarget;
          setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 32);
        }}
        ref={scroller}
        role="log"
      >
        {visible.length === 0 && (
          <p className="r-log-empty">{narrowed ? 'No line matches.' : 'The deploy has not written anything yet.'}</p>
        )}
        {visible.map((section, index) => {
          const phase = section.phase;
          const key = section.entry?.key ?? `pre${index}`;
          const defaultOpen = !collapseDone || phase === undefined || phase.status !== 'done' || narrowed;
          const isOpen = opened[key] ?? defaultOpen;
          return (
            <Fragment key={key}>
              {section.entry !== undefined && (
                <button
                  aria-expanded={isOpen}
                  className={`r-section is-${phase?.status ?? 'done'}`}
                  onClick={() => setOpened({ ...opened, [key]: !isOpen })}
                  type="button"
                >
                  <BiChevronRight aria-hidden className="r-chevron" size={16} />
                  <StatusMark size="small" status={phase?.status ?? 'done'} />
                  <span className="r-section-label">{section.entry.text}</span>
                  <span className="r-section-count">
                    {section.lines.length} {section.lines.length === 1 ? 'line' : 'lines'}
                  </span>
                  <span className="r-time">
                    {phase?.startedAt === undefined
                      ? ''
                      : phase.status === 'running' && live
                        ? clock(now - phase.startedAt)
                        : phase.endedAt === undefined
                          ? ''
                          : spokenDuration(phase.endedAt - phase.startedAt)}
                  </span>
                </button>
              )}
              {isOpen &&
                section.lines.map((entry) => (
                  <div
                    className={`r-line is-${entry.level}`}
                    key={entry.key}
                    title={entry.source === undefined ? undefined : sourceLabel(entry.source)}
                  >
                    <span
                      className="r-line-time"
                      title={entry.time === undefined ? undefined : new Date(entry.time).toISOString()}
                    >
                      {entry.time === undefined ? '' : timeOfDay(entry.time)}
                    </span>
                    <span aria-hidden className="r-line-mark">
                      {MARKS[entry.level]}
                    </span>
                    <span className="r-line-source" title={entry.source}>
                      {sourceLabel(entry.source)}
                    </span>
                    <span className="r-line-text">
                      <Highlighted query={needle} text={entry.text} />
                    </span>
                  </div>
                ))}
            </Fragment>
          );
        })}
      </div>
      <div className="r-log-foot">
        <span>
          {narrowed ? `${shownLines} of ` : ''}
          {model.log.filter((entry) => entry.kind === 'line').length} lines
        </span>
        {live && !following && !narrowed && (
          <button
            className="r-log-latest"
            onClick={() => {
              setFollowing(true);
              const element = scroller.current;
              if (element !== null) element.scrollTop = element.scrollHeight;
            }}
            type="button"
          >
            <BiDownArrowAlt aria-hidden size={15} />
            Latest
          </button>
        )}
      </div>
    </div>
  );
}
