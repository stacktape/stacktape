import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { useEffect, useState } from 'react';
import { BiCheck } from 'react-icons/bi';
import type { WizardState } from '../session';

/**
 * The wait, made legible: what the agent is finding out, as it goes, beside the picture it is about to fill in.
 *
 * Each line is a tool call said the way a person would say it ("Reading dependencies", not `read_file`), with the
 * file it touched in small type, so the list is also the complete answer to "what did it open".
 */
export function AnalyzeStep({ state, startedAt }: { state: WizardState; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const usesAi = agent !== undefined && agent.id !== 'none';
  const entries = state.timeline.filter((entry) => entry.kind === 'tool').map((entry) => describeEntry(entry.label));

  return (
    <div className="w-enter">
      <header className="w-hero">
        <p className="w-eyebrow">Analyze</p>
        <h1 className="w-title">Reading {state.projectName}</h1>
        <p className="w-lede">
          {usesAi
            ? `Your ${agent.label} is reading the code, read-only, under your own plan. Usually under a minute.`
            : 'Reading manifests and config files on this machine.'}
        </p>
      </header>
      <div className="w-analyze">
        <section aria-label="What it is doing" aria-live="polite" className="w-card">
          <div className="w-card-head">
            <h2 className="w-card-title">What it is looking at</h2>
            <p className="w-card-note">{elapsed < 1 ? 'Just started' : `${elapsed}s`}</p>
          </div>
          <ol className="w-findings">
            {entries.length === 0 && (
              <li className="w-finding">
                <Spinner />
                <span className="w-finding-text">Starting…</span>
              </li>
            )}
            {entries.map((entry, index) => {
              const isLast = index === entries.length - 1;
              return (
                // oxlint-disable-next-line react/no-array-index-key -- an append-only feed; position is identity.
                <li className={`w-finding${isLast ? '' : ' is-done'}`} key={index}>
                  {isLast ? <Spinner /> : <BiCheck className="text-[var(--w-ok)]" size={18} />}
                  <span className="w-finding-text">{entry.text}</span>
                  <span className="w-finding-file">{entry.subject}</span>
                </li>
              );
            })}
          </ol>
        </section>
        <section aria-hidden className="w-card w-ghost-diagram">
          <svg viewBox="0 0 300 200">
            <g transform="translate(150 70)">
              <path className="w-ghost-block" d="M0 -26 L45 0 L0 26 L-45 0 Z M-45 0 L-45 18 L0 44 L45 18 L45 0" />
            </g>
            <g transform="translate(70 125)">
              <path className="w-ghost-block" d="M0 -20 L35 0 L0 20 L-35 0 Z M-35 0 L-35 14 L0 34 L35 14 L35 0" />
            </g>
            <g transform="translate(230 125)">
              <path className="w-ghost-block" d="M0 -20 L35 0 L0 20 L-35 0 Z M-35 0 L-35 14 L0 34 L35 14 L35 0" />
            </g>
          </svg>
          <p className="w-ghost-caption">Your app's diagram appears here</p>
        </section>
      </div>
    </div>
  );
}

/** The analysis stopped. What it said, and the ways on: again, or without AI. */
export function AnalyzeFailed({
  state,
  busy,
  onRetry,
  onWithoutAi
}: {
  state: WizardState;
  busy: string | undefined;
  onRetry: () => void;
  onWithoutAi: () => void;
}) {
  const agent = state.agents?.find((option) => option.id === state.choice?.agentId);
  const usesAi = agent !== undefined && agent.id !== 'none';
  return (
    <div className="w-enter mx-auto max-w-[760px]">
      <header className="w-hero">
        <p className="w-eyebrow text-[var(--w-error)]">Analyze</p>
        <h1 className="w-title">The analysis stopped</h1>
        <p className="w-lede">Nothing was written and nothing was created. What you picked is kept.</p>
      </header>
      <section className="w-card w-failure">
        <dl className="w-failure-grid">
          <dt>What happened</dt>
          <dd>{state.error ?? 'The agent stopped before it reported anything.'}</dd>
          <dt>What to do</dt>
          <dd>
            {usesAi && /credit|quota|limit|billing/i.test(state.error ?? '')
              ? `${agent.label} is out of credit or usage. Top it up and try again, or read the project without AI: Stacktape's own scanner reads manifests and config files, which is enough for most apps.`
              : usesAi
                ? `Try again. If it stops again, read the project without AI: Stacktape's own scanner reads manifests and config files.`
                : 'Try again. If it keeps stopping, run stacktape init --headless in a terminal to see the full output.'}
          </dd>
        </dl>
        <div className="w-actions">
          <Button isLoading={busy === 'start'} onClick={onRetry} variant="primary">
            Try again
          </Button>
          {usesAi && (
            <Button isLoading={busy === 'start-plain'} onClick={onWithoutAi} variant="secondary">
              Analyze without AI
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * A tool call as a person would describe it. The label is `<tool> <path or pattern>`, as the agent transport records
 * it; the tool names are ours (the init MCP tools), not words a developer knows.
 */
export const describeEntry = (label: string): { text: string; subject: string } => {
  const space = label.indexOf(' ');
  const tool = space < 0 ? label : label.slice(0, space);
  const subject = space < 0 ? '' : label.slice(space + 1);
  const file = subject.split('/').at(-1) ?? subject;
  switch (tool) {
    case 'read_file':
      if (
        /^(package\.json|requirements.*\.txt|pyproject\.toml|go\.mod|Gemfile|composer\.json|Cargo\.toml)$/.test(file)
      ) {
        return { text: 'Reading dependencies', subject };
      }
      if (file.startsWith('.env')) return { text: 'Reading the settings your app expects', subject };
      if (/^(Dockerfile|Procfile|docker-compose.*)$/i.test(file))
        return { text: 'Reading how the app is built', subject };
      return { text: `Reading ${file}`, subject };
    case 'list_dir':
      return { text: `Looking around ${subject}/`, subject: '' };
    case 'glob':
      return { text: 'Looking for files', subject };
    case 'grep':
      return /env/i.test(subject)
        ? { text: 'Finding the settings your code reads', subject }
        : { text: 'Searching the code', subject };
    case 'get_project_brief':
      return { text: 'Checking what the quick scan found', subject: '' };
    case 'submit_facts':
      return { text: 'Putting together the setup', subject: '' };
    default:
      return { text: label, subject: '' };
  }
};
