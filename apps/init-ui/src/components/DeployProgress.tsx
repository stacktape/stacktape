import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Spinner } from '@stacktape/ui-react/spinner';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import type { DeployModel } from '../deploy-model';
import { CopyableCommand } from './CopyableCommand';
import { FailureExplanationText } from './FailureExplanation';

/**
 * A deploy, while it happens.
 *
 * The design rule here: one thing is happening at a time, and the screen says which. A deploy emits
 * an enormous amount of detail — every operation, every CloudFormation resource, every line of build
 * output — and showing all of it is how progress views end up looking like something is wrong. So
 * the phases are a short list, the current one carries the detail, and the full log is one click
 * away for the times it matters.
 *
 * The progress bar is CloudFormation's own count of resources, not a guess. It moves in steps
 * because creating infrastructure moves in steps, and a smoothly animating bar that is lying about
 * what it knows is worse than an honest one that pauses.
 */
export function DeployProgress({
  model,
  status,
  repairs,
  outcome,
  urls,
  commandLine,
  keptPartialProgress,
  actions
}: {
  model: DeployModel;
  status: 'running' | 'repairing' | 'succeeded' | 'failed';
  outcome: { ok: boolean; code: string; message: string } | undefined;
  urls: string[];
  commandLine: string;
  /** One entry per attempt the agent was asked about, so the failure message can say what happened. */
  repairs?: Array<{ attempt: number; applied: boolean; changedResources?: string[] }>;
  /** The failed attempt left its progress standing — resources that exist are resources that bill. */
  keptPartialProgress?: boolean;
  /** What to do next, right under the outcome rather than after the log. */
  actions?: ReactNode;
}) {
  const [showLog, setShowLog] = useState(false);
  const [showOriginalError, setShowOriginalError] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (showLog) logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [model.log.length, showLog]);

  // What the repairs rewrote, by resource name — diffed by the CLI, never the agent's words. Names
  // let the success and failure messages say *where* the deployed file differs from the reviewed one.
  const rewritten = [...new Set((repairs ?? []).flatMap((entry) => entry.changedResources ?? []))];
  const rewrittenLabel =
    rewritten.length === 0
      ? 'the configuration'
      : rewritten.length === 1
        ? rewritten[0]
        : `${rewritten.slice(0, -1).join(', ')} and ${rewritten.at(-1)}`;
  const anyRepairApplied = (repairs ?? []).some((entry) => entry.applied);
  // The deploy's own message is raw AWS or container text more often than not; lead with what it means.
  const explanations = outcome?.ok === false ? explainFailure(outcome.message) : [];
  const failureText =
    explanations.length > 0 ? <FailureExplanationText explanations={explanations} /> : outcome?.message;

  return (
    <div className="flex flex-col gap-6">
      {status === 'succeeded' && (
        <Alert tone="success" title="Deployed">
          {urls.length > 0 ? 'Your infrastructure is live.' : (outcome?.message ?? 'Your infrastructure is live.')}
          {anyRepairApplied &&
            ` One honest note: after the first attempt failed, we changed ${rewrittenLabel} and tried again. The file in your project is the version that is live now.`}
        </Alert>
      )}

      {status === 'repairing' && (
        <Alert tone="info" title="That did not work. Looking at your code again.">
          {failureText ?? 'The deploy failed.'} A failed deploy tells us something we believed about your project is
          wrong, so the agent is reading it again to find out what. If it finds something, we rewrite the configuration,
          save the file, and try once more. You will see exactly what changed.
        </Alert>
      )}

      {status === 'failed' && (
        <Alert tone="danger" title="The deploy did not finish">
          {failureText ?? 'Something went wrong.'}
          {repairs !== undefined && repairs.length > 0
            ? anyRepairApplied
              ? ` We changed ${rewrittenLabel} and tried again, and it still did not work.`
              : ' We looked at your code again and found nothing to change, so we stopped rather than repeat the same deploy.'
            : ''}
          {keptPartialProgress === true
            ? ' This retry ran without automatic rollback, so the stack can be left the way the attempt changed it. The command below rolls it back to the version that worked.'
            : ' When a deploy fails while AWS is changing the stack, AWS undoes that change: a new stack is removed, and an existing one goes back to the version that was running.'}
        </Alert>
      )}

      {actions}

      {(status === 'failed' || status === 'repairing') && explanations.length > 0 && (
        <section>
          <button className="wizard-disclosure" onClick={() => setShowOriginalError(!showOriginalError)} type="button">
            {showOriginalError ? 'Hide' : 'Show'} the original error
          </button>
          {showOriginalError && <pre className="wizard-log">{outcome?.message}</pre>}
        </section>
      )}

      {urls.length > 0 && (
        <section>
          <h3 className="wizard-section-heading">Live now</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {urls.map((url) => (
              <li key={url}>
                <a className="wizard-link wizard-code" href={url} rel="noreferrer" target="_blank">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="wizard-phases">
        {model.phases.map((phase) => (
          <li className={`wizard-phase is-${phase.status}`} key={phase.id}>
            <span className="wizard-phase-marker" aria-hidden>
              {phase.status === 'done' ? '✓' : phase.status === 'failed' ? '✕' : ''}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <span className="wizard-phase-label">{phase.label}</span>
                {phase.cloudformation !== undefined && phase.cloudformation.total > 0 && (
                  <span className="text-[0.8rem] text-[var(--stp-text-subtle)]">
                    {phase.cloudformation.completed} of {phase.cloudformation.total}
                  </span>
                )}
              </div>

              {/* CloudFormation's message is the same count as the figure beside the label. */}
              {phase.status === 'running' && phase.message !== '' && phase.cloudformation === undefined && (
                <p className="wizard-phase-message">{phase.message}</p>
              )}

              {phase.cloudformation !== undefined && phase.status === 'running' && (
                <>
                  <div
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(phase.cloudformation.percent)}
                    className="wizard-meter"
                    // A native `progress` cannot be given the shape this needs (a hairline track with
                    // a brand-coloured fill) without fighting three browsers' built-in appearances.
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see above.
                    role="progressbar"
                  >
                    <span style={{ width: `${Math.max(2, Math.min(100, phase.cloudformation.percent))}%` }} />
                  </div>
                  {phase.cloudformation.inProgress.length > 0 && (
                    <ul className="wizard-resource-list">
                      {phase.cloudformation.inProgress.slice(0, 6).map((resource) => (
                        <li key={resource}>
                          <span className="wizard-pulse" aria-hidden />
                          <span className="wizard-code">{resource}</span>
                        </li>
                      ))}
                      {phase.cloudformation.inProgress.length > 6 && (
                        <li className="text-[var(--stp-text-subtle)]">
                          and {phase.cloudformation.inProgress.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>

      {status === 'running' && model.phases.length === 0 && (
        <div className="flex items-center gap-3 text-[var(--stp-text-muted)]">
          <Spinner />
          <span>Starting the deploy…</span>
        </div>
      )}

      {/* Once the deploy has failed, its error is in the outcome above and in the full log. */}
      {model.notices.length > 0 && status !== 'failed' && (
        <section>
          <h3 className="wizard-section-heading">What the deploy reported</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {model.notices.slice(-6).map((notice, index) => (
              <li
                className={`wizard-output ${notice.level === 'error' ? 'text-[var(--stp-status-error)]' : ''}`}
                // oxlint-disable-next-line react/no-array-index-key -- an append-only feed of notices.
                key={index}
              >
                {notice.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <button className="wizard-disclosure" onClick={() => setShowLog(!showLog)} type="button">
          {showLog ? 'Hide' : 'Show'} the full log ({model.log.length} lines)
        </button>
        {showLog && (
          <pre className="wizard-log" ref={logRef}>
            {model.log.join('\n')}
          </pre>
        )}
      </section>

      {status === 'failed' && commandLine !== '' && (
        <section>
          <h3 className="wizard-section-heading">Try again from your terminal</h3>
          <p className="wizard-lede mb-3">
            The same command, with the full output in front of you. Nothing in the wizard needs to be redone.
          </p>
          <CopyableCommand command={commandLine} />
        </section>
      )}
    </div>
  );
}
