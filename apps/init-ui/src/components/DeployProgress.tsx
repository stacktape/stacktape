import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { ButtonLink } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { explainFailure } from '@stacktape/console-api/failure-explanations';
import type { DeployModel } from '../deploy-model';
import { CopyableCommand } from './CopyableCommand';
import { FailureExplanationText } from './FailureExplanation';
import { Row } from './RowList';

/** "2m 14s" since the first event, ticking while the deploy runs and frozen once it has ended. */
function useElapsed(startedAt: string | undefined, endedAt: string | undefined): string | undefined {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === undefined || endedAt !== undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt, endedAt]);
  if (startedAt === undefined) return undefined;
  const start = Date.parse(startedAt);
  const end = endedAt === undefined ? now : Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

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
  where,
  startedAt,
  endedAt,
  actions
}: {
  model: DeployModel;
  status: 'running' | 'repairing' | 'succeeded' | 'failed';
  outcome: { ok: boolean; code: string; message: string } | undefined;
  urls: Array<{ resourceName: string; url: string }>;
  /** Where the deploy went, in words: "dev, eu-west-1". */
  where: string;
  commandLine: string;
  /** One entry per attempt the agent was asked about, so the failure message can say what happened. */
  repairs?: Array<{ attempt: number; applied: boolean; changedResources?: string[] }>;
  /** The failed attempt left its progress standing — resources that exist are resources that bill. */
  keptPartialProgress?: boolean;
  /** When the CLI reported its first event, so the page can say how long the deploy has taken. */
  startedAt?: string;
  /** The last event, once the deploy has ended; the duration stops with it. */
  endedAt?: string;
  /** What to do next, right under the outcome rather than after the log. */
  actions?: ReactNode;
}) {
  const [showLog, setShowLog] = useState(false);
  const [showOriginalError, setShowOriginalError] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  // After success the steps are history: one line that opens them, so the live app leads the page.
  const finished = status === 'succeeded';
  const logRef = useRef<HTMLPreElement>(null);
  const elapsed = useElapsed(startedAt, endedAt);

  // Follows the tail while the deploy runs; a finished log opens at its first line.
  useEffect(() => {
    if (showLog && (status === 'running' || status === 'repairing')) {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }
  }, [model.log.length, showLog, status]);

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
      {finished && (
        <section aria-label="Live" className="wizard-live">
          <p className="wizard-live-status">
            <span aria-hidden className="wizard-live-dot" />
            <span>
              Live <span className="text-[var(--stp-text-subtle)]">· {where}</span>
            </span>
          </p>
          {urls.length > 0 ? (
            <ul className="wizard-live-urls">
              {urls.map(({ resourceName, url }) => (
                <li key={url}>
                  <div className="min-w-0 flex-1">
                    <span className="wizard-live-name">{resourceName}</span>
                    <a className="wizard-link wizard-live-url" href={url} rel="noreferrer" target="_blank" title={url}>
                      {url.replace(/^https:\/\//, '')}
                    </a>
                  </div>
                  <ButtonLink href={url} rel="noreferrer" target="_blank" variant="secondary">
                    Open
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[var(--stp-text-muted)]">
              Everything was created. No public address was found for it; the Console lists its resources.
            </p>
          )}
          {anyRepairApplied && (
            <p className="m-0 text-[0.9rem] text-[var(--stp-text-muted)]">
              After the first attempt failed, we changed {rewrittenLabel} and tried again. The file in your project is
              the version that is live now.
            </p>
          )}
        </section>
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

      {(!finished || showSteps) && (
        <section aria-label="Deploy steps" className="wizard-live">
          {!finished && (
            <p className="wizard-live-status">
              <span aria-hidden className={`wizard-live-dot${status === 'failed' ? ' is-failed' : ' is-running'}`} />
              <span>
                {status === 'failed' ? 'Stopped' : status === 'repairing' ? 'Fixing' : 'Deploying'}{' '}
                <span className="text-[var(--stp-text-subtle)]">
                  · {where}
                  {elapsed !== undefined && ` · ${elapsed}`}
                </span>
              </span>
            </p>
          )}
          <ol className="wizard-phases">
            {model.phases.map((phase) => (
              <li className={`wizard-phase is-${phase.status}`} key={phase.id}>
                <span className="wizard-phase-marker" aria-hidden>
                  {phase.status === 'done' ? '✓' : phase.status === 'failed' ? '✕' : ''}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="wizard-phase-label">{phase.label}</span>
                    {phase.cloudformation !== undefined && phase.cloudformation.total > 0 && (
                      <span className="text-[0.85rem] text-[var(--stp-text-subtle)]">
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
        </section>
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

      {/* Everything the deploy printed, behind one row of disclosures. */}
      <section>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {finished && (
            <button
              aria-expanded={showSteps}
              className="wizard-disclosure"
              onClick={() => setShowSteps(!showSteps)}
              type="button"
            >
              {showSteps ? 'Hide' : 'Show'} the {model.phases.length} deploy steps
            </button>
          )}
          {(status === 'failed' || status === 'repairing') && explanations.length > 0 && (
            <button
              aria-expanded={showOriginalError}
              className="wizard-disclosure"
              onClick={() => setShowOriginalError(!showOriginalError)}
              type="button"
            >
              {showOriginalError ? 'Hide' : 'Show'} the original error
            </button>
          )}
          <button
            aria-expanded={showLog}
            className="wizard-disclosure"
            onClick={() => setShowLog(!showLog)}
            type="button"
          >
            {showLog ? 'Hide' : 'Show'} the full log ({model.log.length} lines)
          </button>
        </div>
        {showOriginalError && (
          <pre aria-label="The original error" className="wizard-log">
            {outcome?.message}
          </pre>
        )}
        {showLog && (
          <pre aria-label="The full log" className="wizard-log" ref={logRef}>
            {model.log.join('\n')}
          </pre>
        )}
      </section>

      {status === 'failed' && commandLine !== '' && (
        <ul aria-label="Try again from your terminal" className="wizard-rows">
          <Row
            description="The same command, with the full output in front of you. Nothing in the wizard needs to be redone."
            title="Try again from your terminal"
          >
            <CopyableCommand command={commandLine} />
          </Row>
        </ul>
      )}
    </div>
  );
}
