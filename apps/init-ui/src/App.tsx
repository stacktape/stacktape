import { useEffect, useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { CopyableCommand } from './components/CopyableCommand';
import { GuideRail } from './components/GuideRail';
import { Section } from './components/Section';
import { connect, SessionError, type Session, type WizardState } from './session';
import { DeployStep } from './steps/DeployStep';
import { ScanStep } from './steps/ScanStep';
import { StartStep } from './steps/StartStep';
import { ReviewStep } from './steps/ReviewStep';
import { stepsFor } from './steps';

/**
 * The wizard: one page, read top to bottom.
 *
 * It used to be a stepper, and the difference matters. A stepper asks you to complete a stage before
 * it will show you the next one, which is the right shape for a form and the wrong shape for this —
 * because almost nothing here actually needs your input. The pipeline decides, and the page reports.
 * So: one document that grows downwards as the run progresses, with a rail that says where you are
 * rather than what you are permitted to see.
 *
 * Nothing blocks. There is exactly one moment where the wizard waits for a person — the button that
 * starts reading — and one where it must, before spending money.
 */
export function App() {
  const [session, setSession] = useState<Session | undefined>();
  const [state, setState] = useState<WizardState | undefined>();
  /** A connection failure ends the page; an action failure leaves the connected session usable. */
  const [failure, setFailure] = useState<string | undefined>();
  const [actionFailure, setActionFailure] = useState<string | undefined>();
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting'>('connected');
  const [busy, setBusy] = useState<string | undefined>();
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  /** The saved review, opened again from its summary line. */
  const [reviewOpen, setReviewOpen] = useState(false);
  const deploymentStatus = state?.deployment?.status;

  // A deploy that starts puts the review back to its one line, so the progress is what is on screen.
  useEffect(() => {
    if (deploymentStatus === 'running') setReviewOpen(false);
  }, [deploymentStatus]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const connected = await connect();
        setSession(connected);
        setState(connected.state);
        unsubscribe = connected.subscribe(setState, setConnectionState);
      } catch (error: unknown) {
        setFailure(
          error instanceof SessionError
            ? error.message
            : 'This page could not reach stacktape init. If you stopped it, run stacktape init in your project again.'
        );
      }
    })();
    return () => unsubscribe?.();
  }, []);

  if (failure !== undefined) {
    return (
      <main className="wizard-shell">
        <div className="wizard-masthead flex flex-col gap-6">
          <div>
            <p className="wizard-step-label">Session ended</p>
            <h1 className="wizard-title">This wizard is no longer running</h1>
            <p className="wizard-lede">{failure}</p>
          </div>
          <div className="max-w-[420px]">
            <p className="m-0 mb-2 text-[0.9rem] text-[var(--stp-text-muted)]">In your project’s directory, run:</p>
            <CopyableCommand command="stacktape init" />
          </div>
        </div>
      </main>
    );
  }

  if (state === undefined || session === undefined) {
    return (
      <main className="wizard-shell flex items-center gap-3">
        <Spinner />
        <span className="text-[var(--stp-text-muted)]">Connecting…</span>
      </main>
    );
  }

  const steps = stepsFor(state);
  const isActive = (id: string) => steps.find((step) => step.id === id)?.status === 'active';
  const isReached = (id: string) => steps.find((step) => step.id === id)?.status !== 'todo';
  const lede = ledeFor(state);
  const deploying = deploymentStatus === 'running' || deploymentStatus === 'repairing';

  const run = async (label: string, action: () => Promise<unknown>, whenItFails: string) => {
    setBusy(label);
    setActionFailure(undefined);
    try {
      await action();
    } catch (error) {
      setActionFailure(error instanceof SessionError ? error.message : whenItFails);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <main className="wizard-shell">
      <header className="wizard-masthead">
        <p className="wizard-step-label">{state.projectName}</p>
        <h1 className="wizard-title">{headingFor(state)}</h1>
        {lede !== '' && <p className="wizard-lede">{lede}</p>}
      </header>

      <div className="wizard-page">
        <GuideRail openedIds={reviewOpen ? ['review'] : []} steps={steps} />

        <div className="wizard-flow">
          {actionFailure !== undefined && (
            <Alert className="mb-6" tone="danger" title="That action did not finish">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="m-0">{actionFailure} Everything already shown below is still here.</p>
                <Button onClick={() => setActionFailure(undefined)} variant="plain">
                  Dismiss
                </Button>
              </div>
            </Alert>
          )}

          {connectionState === 'reconnecting' && (
            <Alert className="mb-6" tone="warning" title="Lost the connection to stacktape init">
              If <span className="wizard-code">stacktape init</span> is still running in your terminal, this page
              reconnects by itself. If you stopped it, run it again: a file you already saved stays in your project.
            </Alert>
          )}

          <Section
            id="start"
            isActive={isActive('start')}
            isMuted={!isActive('start')}
            label="Start"
            {...(isActive('start')
              ? {}
              : { summary: <StartStep isBusy={false} isDone onStart={() => {}} state={state} /> })}
          >
            {isActive('start') && (
              <StartStep
                isBusy={busy === 'start'}
                isDone={false}
                onStart={(agentId, modelId) => {
                  setStartedAt(Date.now());
                  void run('start', () => session.start(agentId, modelId), 'That analysis could not be started.');
                }}
                state={state}
              />
            )}
          </Section>

          {isReached('read') && (
            <Section
              id="read"
              isActive={isActive('read')}
              isMuted={!isActive('read')}
              label="Analyze"
              {...(isActive('read') ? {} : { summary: <ScanStep isDone startedAt={startedAt} state={state} /> })}
            >
              {!isActive('read') ? undefined : state.phase === 'failed' ? (
                <div className="flex flex-col gap-4">
                  <Alert tone="danger" title="What stopped it">
                    {state.error ?? 'The agent stopped before it produced anything.'} Nothing was changed, and nothing
                    you picked is lost.
                  </Alert>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      isLoading={busy === 'start'}
                      onClick={() => {
                        setStartedAt(Date.now());
                        void run(
                          'start',
                          () => session.start(state.choice?.agentId ?? 'none', state.choice?.modelId ?? 'default'),
                          'That analysis could not be started.'
                        );
                      }}
                      variant="primary"
                    >
                      Try again
                    </Button>
                    {state.choice !== undefined && state.choice.agentId !== 'none' && (
                      <Button
                        isLoading={busy === 'start-plain'}
                        onClick={() => {
                          setStartedAt(Date.now());
                          void run(
                            'start-plain',
                            () => session.start('none', 'default'),
                            'That analysis could not be started.'
                          );
                        }}
                        variant="secondary"
                      >
                        Analyze without an agent
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <ScanStep isDone={false} startedAt={startedAt} state={state} />
              )}
            </Section>
          )}

          {isReached('review') && (
            <Section
              id="review"
              isActive={isActive('review')}
              isExpanded={reviewOpen}
              isMuted={!isActive('review')}
              label="Review"
              onToggle={() => setReviewOpen(!reviewOpen)}
              hideLabel="Hide the review"
              toggleLabel="Show the review"
              {...(isActive('review') ? {} : { summary: <ReviewSummary state={state} /> })}
            >
              <ReviewStep
                busy={busy}
                lock={deploying ? 'deploying' : connectionState === 'reconnecting' ? 'disconnected' : undefined}
                onChangeDecision={(id, value) =>
                  void run(id, () => session.answer(id, value), 'That change could not be applied.')
                }
                onChangePreference={(change) =>
                  void run(
                    `preference-${change.key}`,
                    () => session.setPreference(change),
                    'That infrastructure choice could not be applied.'
                  )
                }
                onRestart={(agentId) => {
                  setStartedAt(Date.now());
                  void run('start', () => session.start(agentId, 'default'), 'That analysis could not be started.');
                }}
                onWrite={(format) => void run('write', () => session.write(format), 'The file could not be written.')}
                state={state}
              />
            </Section>
          )}

          {isReached('deploy') && (
            <Section id="deploy" isActive={isActive('deploy')} label="Deploy" scrollKey={deploymentStatus ?? 'ready'}>
              <DeployStep
                isBusy={
                  busy === 'deploy' ||
                  busy === 'pipeline' ||
                  busy === 'recheck' ||
                  busy === 'verify' ||
                  busy === 'coding-agent'
                    ? busy
                    : undefined
                }
                onDeploy={(stage, region, expected) =>
                  void run('deploy', () => session.deploy(stage, region, expected), 'The deploy could not be started.')
                }
                onRegionChange={(region) => {
                  // A price is a convenience: a failed request leaves the old one out of the sentence, nothing else.
                  session.setPriceRegion(region).catch(() => {});
                }}
                onDismissVerification={() =>
                  void run('dismiss-verify', () => session.dismissVerification(), 'Could not set the result aside.')
                }
                onPipeline={(stage, region) =>
                  void run('pipeline', () => session.pipeline(stage, region), 'The pipeline could not be written.')
                }
                onConnectCodingAgent={() =>
                  void run(
                    'coding-agent',
                    () => session.connectCodingAgent(),
                    'The coding agent could not be connected.'
                  )
                }
                onRecheck={() => void run('recheck', () => session.recheck(), 'Could not re-check the sign-ins.')}
                onSignIn={(request) => session.signIn(request)}
                onVerify={() => void run('verify', () => session.verify(), 'The local try-out could not be started.')}
                state={state}
              />
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}

/** The saved review in one line: what was written and what it holds. */
function ReviewSummary({ state }: { state: WizardState }) {
  const count = Object.keys(state.composition?.resources ?? {}).length;
  const price = state.composition?.price?.monthly;
  return (
    <p className="wizard-recap">
      Saved <strong>{state.configFile?.filename ?? 'the configuration'}</strong> with{' '}
      {count === 1 ? 'one resource' : `${count} resources`}
      {price === undefined ? '' : `, about ${price}`}.
    </p>
  );
}

/** The analysis finished and found nothing to run, so there is no configuration to show. */
const nothingFound = (state: WizardState): boolean => Object.keys(state.composition?.resources ?? {}).length === 0;

const headingFor = (state: WizardState): string => {
  if (state.deployment?.status === 'running') return 'Deploying';
  if (state.deployment?.status === 'repairing') return 'Fixing what went wrong';
  if (state.deployment?.status === 'succeeded') return 'It’s live';
  if (state.deployment?.status === 'failed') return 'The deploy stopped';
  if (state.phase === 'failed') return 'Reading your project did not finish';
  if (state.configFile !== undefined) return 'Ready to deploy';
  if (state.phase === 'reviewing' && nothingFound(state)) return 'Found nothing to deploy';
  if (state.phase === 'reviewing') return 'Here’s your app on AWS';
  if (state.phase === 'analysing') return 'Reading your project';
  return 'Put this project on AWS';
};

const ledeFor = (state: WizardState): string => {
  if (state.phase === 'ready') {
    return 'We read your code on this machine, work out the AWS setup it needs, and hand you one file. Nothing is created on AWS and nothing is billed until you confirm the deploy.';
  }
  if (state.phase === 'reviewing' && state.configFile === undefined && !nothingFound(state)) {
    return 'Everything here came from your own code. Change a choice and the file and the price follow.';
  }
  return '';
};
