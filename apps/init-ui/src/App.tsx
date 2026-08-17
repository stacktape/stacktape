import { useEffect, useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const connected = await connect();
        setSession(connected);
        setState(connected.state);
        unsubscribe = connected.subscribe(setState, setConnectionState);
      } catch (error: unknown) {
        setFailure(error instanceof SessionError ? error.message : 'Could not reach the Stacktape CLI.');
      }
    })();
    return () => unsubscribe?.();
  }, []);

  if (failure !== undefined) {
    return (
      <main className="wizard-shell">
        <p className="wizard-step-label">Session ended</p>
        <h1 className="wizard-title">{failure}</h1>
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
        <Alert className="mb-6" tone="info" title="Connection interrupted — retrying">
          Everything already shown is preserved. Keep the CLI running; this page will reconnect automatically.
        </Alert>
      )}

      <div className="wizard-page">
        <GuideRail steps={steps} />

        <div className="wizard-flow">
          <Section
            eyebrow="Start"
            id="start"
            isActive={isActive('start')}
            isMuted={!isActive('start')}
            {...(isActive('start') ? { title: 'What happens next' } : {})}
          >
            <StartStep
              isBusy={busy === 'start'}
              isDone={!isActive('start')}
              onStart={(agentId, modelId) => {
                setStartedAt(Date.now());
                void run('start', () => session.start(agentId, modelId), 'That analysis could not be started.');
              }}
              state={state}
            />
          </Section>

          {isReached('read') && (
            <Section
              eyebrow="Analyze"
              id="read"
              isActive={isActive('read')}
              isMuted={!isActive('read')}
              {...(isActive('read') ? { title: 'Reading your project' } : {})}
            >
              {state.phase === 'failed' ? (
                <div className="flex flex-col gap-4">
                  <Alert tone="danger" title="Reading your project did not finish">
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
                <ScanStep isDone={!isActive('read')} startedAt={startedAt} state={state} />
              )}
            </Section>
          )}

          {isReached('review') && (
            <Section
              eyebrow="Review"
              id="review"
              isActive={isActive('review')}
              isMuted={!isActive('review')}
              {...(isActive('review') ? { title: 'Your app on AWS' } : {})}
            >
              <ReviewStep
                busy={busy}
                onChangeDecision={(id, value) =>
                  void run(id, () => session.answer(id, value), 'That change could not be applied.')
                }
                onChangeMode={(mode) =>
                  void run('mode', () => session.setMode(mode), 'That size could not be applied.')
                }
                onWrite={(format) => void run('write', () => session.write(format), 'The file could not be written.')}
                state={state}
              />
            </Section>
          )}

          {isReached('deploy') && (
            <Section eyebrow="Deploy" id="deploy" isActive={isActive('deploy')}>
              <DeployStep
                isBusy={
                  busy === 'deploy' || busy === 'pipeline' || busy === 'recheck' || busy === 'verify' ? busy : undefined
                }
                onDeploy={(stage, region, expected) =>
                  void run('deploy', () => session.deploy(stage, region, expected), 'The deploy could not be started.')
                }
                onDismissVerification={() =>
                  void run('dismiss-verify', () => session.dismissVerification(), 'Could not set the result aside.')
                }
                onPipeline={(stage, region) =>
                  void run('pipeline', () => session.pipeline(stage, region), 'The pipeline could not be written.')
                }
                onRecheck={() => void run('recheck', () => session.recheck(), 'Could not re-check the sign-ins.')}
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

const headingFor = (state: WizardState): string => {
  if (state.deployment?.status === 'running') return 'Deploying';
  if (state.deployment?.status === 'repairing') return 'Fixing what went wrong';
  if (state.deployment?.status === 'succeeded') return 'It’s live';
  if (state.deployment?.status === 'failed') return 'The deploy stopped';
  if (state.phase === 'failed') return 'That did not finish';
  if (state.configFile !== undefined) return 'Ready to deploy';
  if (state.phase === 'reviewing') return 'Here’s your app on AWS';
  if (state.phase === 'analysing') return 'Reading your project';
  return 'Put this project on AWS';
};

const ledeFor = (state: WizardState): string => {
  if (state.phase === 'ready') {
    return 'We read your code on this machine, work out the AWS setup it needs, and hand you one file. Nothing runs and nothing is billed unless you press Deploy.';
  }
  if (state.phase === 'reviewing' && state.configFile === undefined) {
    return 'Everything below came from your own code. Look at it, change anything — the file and the price follow.';
  }
  return '';
};
