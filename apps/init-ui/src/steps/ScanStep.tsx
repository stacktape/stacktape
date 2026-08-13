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

  const lastThought = state.timeline.toReversed().find((entry) => entry.kind === 'thought');
  const filesRead = state.timeline.filter((entry) => entry.kind === 'tool').length;

  if (isDone) {
    return (
      <div className="flex flex-col gap-6">
        <p className="wizard-recap">
          {filesRead === 0
            ? 'Read straight from your project files — no agent, nothing to wait for.'
            : `Opened ${filesRead} ${filesRead === 1 ? 'file' : 'files'}${elapsed > 0 ? ` in ${elapsed}s` : ''}, all on this machine.`}
        </p>
        {filesRead > 0 && (
          <div className="flex flex-col items-start gap-4">
            <button className="wizard-disclosure" onClick={() => setShowFeed(!showFeed)} type="button">
              {showFeed ? 'Hide what it opened' : 'Show everything it opened'}
            </button>
            {showFeed && <ol className="wizard-feed">{state.timeline.map(renderEntry)}</ol>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Spinner />
        <div>
          <p className="m-0 font-medium">{lastThought?.label ?? 'Reading your project…'}</p>
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

/* Keyed by position: this is an append-only feed, so an entry's place in it is its identity, and two
   identical reads really are two events rather than one repeated. */
const renderEntry = (entry: WizardState['timeline'][number], index: number) => (
  <li className="wizard-code" key={`${index}-${entry.label}`}>
    <span className="text-[var(--stp-text-subtle)]">{entry.kind === 'tool' ? '→' : ' '}</span>{' '}
    <span className={entry.kind === 'tool' ? 'text-[var(--stp-text-muted)]' : 'text-[var(--stp-text-subtle)]'}>
      {entry.label}
    </span>
  </li>
);
