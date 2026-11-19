import { Button } from '@stacktape/ui-react/button';
import type { WizardState } from '../session';

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
              ? `Add credit to your ${agent.label} account, then try again. Or analyze without AI: Stacktape's own scanner reads manifests and config files, which finds most apps but not settings that only the source code shows.`
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
 * What the agent is doing right now, said the way a person would, for the line under the code window: "is reading
 * lib/db/drizzle.ts", "is searching the code for process.env". The label is `<tool> <path or pattern>`, as the agent
 * transport records it; the tool names are ours (the init MCP tools), not words a developer knows.
 */
export const scanActivity = (label: string): { text: string; subject?: string } => {
  const space = label.indexOf(' ');
  const tool = space < 0 ? label : label.slice(0, space);
  const subject = space < 0 ? '' : label.slice(space + 1);
  switch (tool) {
    case 'read_file':
      return { text: 'is reading', subject };
    case 'list_dir':
      return { text: 'is looking around', subject: subject === '.' ? 'the project folder' : `${subject}/` };
    case 'glob':
      return { text: 'is looking for', subject };
    case 'grep':
      return { text: 'is searching the code for', subject };
    case 'get_project_brief':
      return { text: 'is getting an overview of the project' };
    case 'submit_facts':
      return { text: 'is writing down what it found' };
    default:
      return { text: 'is reading the project' };
  }
};
