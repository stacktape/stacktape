import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@stacktape/ui-react/spinner';
import type { WizardState } from '../session';

/**
 * The wait, made legible.
 *
 * A minute of nothing is the difference between a tool that is working and a tool that is broken, so
 * this shows every file the agent opens as it opens it. That is also the honest answer to "what is it
 * doing with my code" — the list is the complete set of reads, not a summary of them.
 *
 * Once the reading is over the same band has to stop pretending. A spinner and a counting clock above
 * a finished run say the tool is stuck; and "Files only" finishes so fast, and so silently, that this
 * was the *usual* reading of the page rather than an edge case.
 */
export function ScanStep({ state, startedAt, isDone }: { state: WizardState; startedAt: number; isDone: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [showFeed, setShowFeed] = useState(false);
  const feed = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Stopping the interval also freezes the number, which is what makes it a duration rather than a
    // clock: whatever it read when the run ended is how long the run took.
    if (isDone) return;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt, isDone]);

  // Newest last, so the feed reads in the order things happened; scrolled for the same reason.
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight });
  }, [state.timeline.length]);

  const filesRead = state.timeline.filter(
    (entry) => entry.kind === 'tool' && entry.label.startsWith('read_file ')
  ).length;

  if (isDone) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="wizard-recap">
            {filesRead === 0
              ? 'Read straight from your project files, without an agent.'
              : `Opened ${filesRead} ${filesRead === 1 ? 'file' : 'files'}${elapsed > 0 ? ` in ${elapsed}s` : ''}, all on this machine.`}
          </p>
          {state.timeline.length > 0 && (
            <button className="wizard-disclosure" onClick={() => setShowFeed(!showFeed)} type="button">
              {showFeed ? 'Hide what it opened' : 'Show what it opened'}
            </button>
          )}
        </div>
        {showFeed && <ol className="wizard-feed">{state.timeline.map(renderEntry)}</ol>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Spinner />
        <div>
          {/* House copy only: the agent's own prose never becomes a headline. The feed below shows
              what it is actually doing. */}
          <p className="m-0 font-medium">
            {filesRead === 0
              ? 'Reading your project…'
              : `${filesRead} ${filesRead === 1 ? 'file' : 'files'} read so far`}
          </p>
          <p className="m-0 text-[0.85rem] text-[var(--stp-text-subtle)]">
            {elapsed < 1 ? 'Just started' : `${elapsed}s`} · everything happens on this machine
          </p>
        </div>
      </div>

      <ol className="wizard-feed" ref={feed}>
        {state.timeline.length === 0 && (
          <li className="wizard-code text-[var(--stp-text-subtle)]">waiting for the first file…</li>
        )}
        {state.timeline.map(renderEntry)}
      </ol>
    </div>
  );
}

/**
 * A tool call as a person would describe it. The label is `<tool> <path or pattern>`, as the agent
 * transport records it; the tool names are ours (the init MCP tools), not words a developer knows.
 */
export const describeEntry = (label: string): string => {
  const space = label.indexOf(' ');
  const tool = space < 0 ? label : label.slice(0, space);
  const subject = space < 0 ? '' : label.slice(space + 1);
  switch (tool) {
    case 'read_file':
      return `Read ${subject}`;
    case 'list_dir':
      return `Listed ${subject}`;
    case 'glob':
      return `Looked for ${subject}`;
    case 'grep':
      return `Searched for ${subject}`;
    case 'get_project_brief':
      return 'Read what the scan found';
    case 'submit_facts':
      return 'Reported its findings';
    default:
      return label;
  }
};

/* Keyed by position: this is an append-only feed, so an entry's place in it is its identity, and two
   identical reads really are two events rather than one repeated. */
const renderEntry = (entry: WizardState['timeline'][number], index: number) => (
  <li className="wizard-code" key={`${index}-${entry.label}`}>
    <span className="text-[var(--stp-text-subtle)]">{entry.kind === 'tool' ? '→' : ' '}</span>{' '}
    <span className={entry.kind === 'tool' ? 'text-[var(--stp-text-muted)]' : 'text-[var(--stp-text-subtle)]'}>
      {entry.kind === 'tool' ? describeEntry(entry.label) : entry.label}
    </span>
  </li>
);
