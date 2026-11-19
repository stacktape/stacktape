import { Button } from '@stacktape/ui-react/button';
import { useState } from 'react';
import type { WizardState } from '../session';

/**
 * "Claude Code exited with 1: Credit balance is too low." → who stopped, what it said, and its exit code.
 *
 * The CLI words an agent that stops as "<agent> exited with <code>: <its own output>"; an older wording is
 * "<agent> exited before it finished (exit code <code>): <output>". Anything else is kept whole as what it said.
 */
export const analysisError = (error: string): { said: string; exitCode?: string } => {
  const match = /^.+? exited (?:before it finished )?(?:\(exit code (\d+)\)|with (\d+))\s*:?\s*([\s\S]*)$/.exec(
    error.trim()
  );
  if (match === null) return { said: error.trim() };
  const said = match[3]!.trim();
  const exitCode = match[1] ?? match[2];
  return { said, ...(exitCode === undefined ? {} : { exitCode }) };
};

/** Where an agent's credit is topped up: the account behind it, not the tool's name. */
const CREDIT_ACCOUNT: Readonly<Record<string, string>> = {
  'claude-code': 'Claude account',
  codex: 'OpenAI account'
};

/** The agent's words, ending in a full stop, without the exit code that is in the details. */
const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * The analysis stopped. It leads with the reason in plain words, then the way on that works right now: without AI when
 * the agent cannot run (no credit), again when it may have been a one-off. The raw output is one click away.
 */
export function AnalyzeFailedStep({
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
  const raw = state.error ?? '';
  const { said, exitCode } = analysisError(raw);
  const outOfCredit = usesAi && /credit|quota|billing|usage limit|rate limit/i.test(raw);
  const [showDetails, setShowDetails] = useState(false);
  const title = outOfCredit
    ? `${agent.label} ran out of credit`
    : usesAi
      ? `${agent.label} stopped before it finished`
      : 'The analysis stopped';

  const withoutAi = (
    <div className="w-way">
      <Button
        className="w-big"
        isLoading={busy === 'start-plain'}
        onClick={onWithoutAi}
        variant={outOfCredit ? 'primary' : 'secondary'}
      >
        Analyze without AI
      </Button>
      <p>Reads your manifests and config files. Takes a few seconds.</p>
    </div>
  );
  const retry = (
    <div className="w-way">
      <Button
        className="w-big"
        isLoading={busy === 'start'}
        onClick={onRetry}
        variant={outOfCredit ? 'secondary' : 'primary'}
      >
        {usesAi ? `Try ${agent.label} again` : 'Try again'}
      </Button>
      <p>
        {outOfCredit
          ? `Add credit to your ${CREDIT_ACCOUNT[agent.id] ?? `${agent.label} account`} first.`
          : usesAi
            ? 'It may have been a one-off.'
            : 'If it keeps stopping, run stacktape init --headless in a terminal to see the full output.'}
      </p>
    </div>
  );

  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">{title}</h1>
        <p className="w-lede">
          {said === '' ? (
            'It stopped before it reported anything.'
          ) : (
            <>
              {usesAi ? `${agent.label} said: ` : ''}“{sentence(said.split('\n')[0]!)}”
            </>
          )}
        </p>
        <p className="w-lede w-lede-next">Nothing was written and nothing was created on AWS.</p>
      </header>

      <div className="w-card w-ways">
        {outOfCredit || !usesAi ? (
          <>
            {usesAi && withoutAi}
            {retry}
          </>
        ) : (
          <>
            {retry}
            {withoutAi}
          </>
        )}
      </div>

      {raw !== '' && (
        <div className="w-terminal">
          <button
            aria-expanded={showDetails}
            className="w-link w-small text-[var(--w-subtle)]"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            {showDetails ? 'Hide the details' : 'Show the details'}
          </button>
          {showDetails && (
            <pre className="w-log">
              {raw}
              {exitCode === undefined ? '' : `\n\nExit code ${exitCode}`}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
