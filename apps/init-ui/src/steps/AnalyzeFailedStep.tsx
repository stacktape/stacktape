import { Button } from '@stacktape/ui-react/button';
import { InfoTip } from '../components/InfoTip';
import type { WizardState } from '../session';

/** The analysis stopped. What it said, the fix, and the ways on: again, or without AI. */
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
  const outOfCredit = usesAi && /credit|quota|limit|billing/i.test(state.error ?? '');
  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">The analysis stopped</h1>
        <p className="w-lede">Nothing was written and nothing was created on AWS.</p>
      </header>
      <dl className="w-card w-fail">
        <div className="w-fail-row is-cause">
          <dt>What happened</dt>
          <dd>{state.error ?? 'The analysis stopped before it reported anything.'}</dd>
        </div>
        <div className="w-fail-row">
          <dt>The fix</dt>
          <dd>
            {outOfCredit ? (
              `Add credit to your ${agent.label} account and try again, or analyze without AI.`
            ) : usesAi ? (
              'Try again. If it stops again, analyze without AI.'
            ) : (
              <>
                Try again. If it keeps stopping, run <span className="w-code">stacktape init --headless</span> in a
                terminal to see the full output.
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="w-actions">
        <Button className="w-big" isLoading={busy === 'start'} onClick={onRetry} variant="primary">
          Try again
        </Button>
        {usesAi && (
          <span className="inline-flex items-center gap-2">
            <Button className="w-big" isLoading={busy === 'start-plain'} onClick={onWithoutAi} variant="secondary">
              Analyze without AI
            </Button>
            <InfoTip about="analyzing without AI">
              Stacktape’s own scanner reads manifests, Dockerfiles and config files on this machine. It finds most apps,
              but not settings that only the source code shows.
            </InfoTip>
          </span>
        )}
      </div>
    </div>
  );
}
