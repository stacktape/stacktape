import { useEffect, useRef, useState } from 'react';
import { Alert } from '@stacktape/ui-react/alert';
import { Button } from '@stacktape/ui-react/button';
import { Spinner } from '@stacktape/ui-react/spinner';
import { StepPath } from './components/StepPath';
import { TerminalLine } from './components/TerminalLine';
import { connect, SessionError, type Session, type WizardState } from './session';
import { stationsFor } from './stations';
import { DeployStep } from './steps/DeployStep';
import { ScanFeed, ScanStep } from './steps/ScanStep';
import { StartStep } from './steps/StartStep';
import { ReviewStep } from './steps/ReviewStep';

/**
 * The wizard: a path across the top, and under it the one step the run is on.
 *
 * The path says where the run is and what is still to come; a finished step leaves its result on its station, with a
 * way back into it where there is something to look at again. Nothing blocks: there is exactly one moment where the
 * wizard waits for a person, the button that starts reading, and one where it must, before spending money.
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
  /** A finished step opened again from its station. */
  const [opened, setOpened] = useState<'analyze' | 'review' | undefined>();
  const deploymentStatus = state?.deployment?.status;
  const current = state === undefined ? undefined : stationsFor(state).find((station) => station.status !== 'done');
  // The step on screen, and for a deploy its outcome: each change replaces the content under the path.
  const view = `${state?.phase}-${state?.configFile === undefined}-${deploymentStatus}`;
  const shownView = useRef(view);

  // A deploy that starts closes a step opened again, so the progress is what is on screen.
  useEffect(() => {
    if (deploymentStatus === 'running') setOpened(undefined);
  }, [deploymentStatus]);

  // New content starts at the top, under the path, wherever the button that led to it was.
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [view]);

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
        <header className="wizard-masthead">
          <h1 className="wizard-title">This wizard is no longer running</h1>
          <p className="wizard-lede">{failure}</p>
        </header>
        <div className="max-w-[480px]">
          <TerminalLine command="stacktape init" />
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

  const stations = stationsFor(state);
  const lede = ledeFor(state);
  const deploying = deploymentStatus === 'running' || deploymentStatus === 'repairing';
  const lock = deploying ? 'deploying' : connectionState === 'reconnecting' ? 'disconnected' : undefined;

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

  const start = (agentId: string, modelId: string, label = 'start') => {
    setStartedAt(Date.now());
    void run(label, () => session.start(agentId, modelId), 'That analysis could not be started.');
  };

  /** The way back into a finished step, under its station. */
  const reopen = (id: 'analyze' | 'review', show: string, hide: string) => (
    <button
      aria-expanded={opened === id}
      className="wizard-disclosure wizard-station-action"
      onClick={() => setOpened(opened === id ? undefined : id)}
      type="button"
    >
      {opened === id ? hide : show}
    </button>
  );
  const stationDone = (id: string) => stations.find((station) => station.id === id)?.status === 'done';

  const review = (
    <ReviewStep
      busy={busy}
      lock={lock}
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
      onRegionChange={(region) =>
        void run('region', () => session.setRegion(region), 'That region could not be chosen.')
      }
      onRestart={(agentId) => start(agentId, 'default')}
      onWrite={(format) => void run('write', () => session.write(format), 'The file could not be written.')}
      state={state}
    />
  );

  return (
    <main className="wizard-shell">
      <header className="wizard-masthead">
        <p className="wizard-project">
          <span className="wizard-project-name">{state.projectName}</span>
          {state.repositoryPath !== undefined && <span className="wizard-code">{state.repositoryPath}</span>}
        </p>
        <h1 className="wizard-title">{headingFor(state)}</h1>
        {lede !== '' && <p className="wizard-lede">{lede}</p>}
      </header>

      <StepPath
        actions={{
          ...(stationDone('analyze') && state.timeline.length > 0
            ? { analyze: reopen('analyze', 'Show what it opened', 'Hide what it opened') }
            : {}),
          ...(stationDone('review') ? { review: reopen('review', 'Show the review', 'Hide the review') } : {})
        }}
        stations={stations}
        walkthrough={state.phase === 'ready'}
      />

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
          If <span className="wizard-code">stacktape init</span> is still running in your terminal, this page reconnects
          by itself. If you stopped it, run it again: a file you already saved stays in your project.
        </Alert>
      )}

      {opened !== undefined && (
        <section aria-label={opened === 'analyze' ? 'What it opened' : 'Review'} className="wizard-reopened">
          {opened === 'analyze' ? <ScanFeed state={state} /> : review}
        </section>
      )}

      {/* A finished deploy stays on its step: its outcome is the Deploy step's last state. */}
      <section aria-label={current?.title ?? 'Deploy'} className="wizard-step" key={current?.id ?? 'deploy'}>
        {state.phase === 'ready' ? (
          <StartStep isBusy={busy === 'start'} onStart={(agentId, modelId) => start(agentId, modelId)} state={state} />
        ) : state.phase === 'analysing' ? (
          <ScanStep startedAt={startedAt} state={state} />
        ) : state.phase === 'failed' ? (
          <div className="flex flex-col gap-4">
            <Alert tone="danger" title="What stopped it">
              {state.error ?? 'The agent stopped before it produced anything.'} Nothing was changed, and nothing you
              picked is lost.
            </Alert>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                isLoading={busy === 'start'}
                onClick={() => start(state.choice?.agentId ?? 'none', state.choice?.modelId ?? 'default')}
                variant="primary"
              >
                Try again
              </Button>
              {state.choice !== undefined && state.choice.agentId !== 'none' && (
                <Button
                  isLoading={busy === 'start-plain'}
                  onClick={() => start('none', 'default', 'start-plain')}
                  variant="secondary"
                >
                  Analyze without an agent
                </Button>
              )}
            </div>
          </div>
        ) : state.configFile === undefined ? (
          review
        ) : (
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
            onConnectCodingAgent={() =>
              void run('coding-agent', () => session.connectCodingAgent(), 'The coding agent could not be connected.')
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
            onSignIn={(request) => session.signIn(request)}
            onVerify={() => void run('verify', () => session.verify(), 'The local try-out could not be started.')}
            state={state}
          />
        )}
      </section>
    </main>
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
    return 'Stacktape reads this project, works out the AWS setup it needs and writes it to one file you can read and change.';
  }
  if (state.phase === 'reviewing' && state.configFile === undefined && !nothingFound(state)) {
    return 'Everything here came from your own code. Change a choice and the file and the price follow.';
  }
  return '';
};
