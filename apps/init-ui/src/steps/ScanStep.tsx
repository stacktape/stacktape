import { useEffect, useRef, useState } from 'react';
import type { WizardState } from '../session';

/**
 * The wait, made legible.
 *
 * A minute of nothing is the difference between a tool that is working and a tool that is broken, so this shows every
 * file the agent opens as it opens it. That is also the honest answer to "what is it doing with my code": the list is
 * the complete set of reads, not a summary of them. The path above turns while this runs, so nothing here spins too.
 */
export function ScanStep({ state, startedAt }: { state: WizardState; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);

  return (
    <div className="flex flex-col gap-3">
      {/* The page title says what is happening; this line says who does it, where, and for how long. */}
      <p className="wizard-fine-print">
        {agent === undefined || agent.id === 'none' ? 'Without an agent' : `By ${agent.label}`}, on this machine
        {elapsed < 1 ? '' : ` · ${elapsed}s`}
      </p>
      <ScanFeed state={state} />
    </div>
  );
}

/** Every file and search the agent made, newest last and scrolled to, in the order they happened. */
export function ScanFeed({ state }: { state: WizardState }) {
  const feed = useRef<HTMLOListElement>(null);
  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight });
  }, [state.timeline.length]);

  return (
    <ol className="wizard-feed" ref={feed}>
      {state.timeline.length === 0 && (
        <li className="wizard-code text-[var(--stp-text-subtle)]">waiting for the first file…</li>
      )}
      {state.timeline.map(renderEntry)}
    </ol>
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
      return 'Read the project summary';
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
