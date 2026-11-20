import { Alert } from '@stacktape/ui-react/alert';
import { CommandLine } from '@stacktape/ui-react/command-line';
import { Spinner } from '@stacktape/ui-react/spinner';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import logo from './assets/logo.svg';
import { StepPath, type PathStep, type PathStepStatus } from './components/StepPath';
import { buildDeployModel, type DeployEvent } from './deploy-model';
import { connect, SessionError, type Session, type WizardState } from './session';
import { AnalyzeFailedStep } from './steps/AnalyzeFailedStep';
import { DeployStep } from './steps/DeployStep';
import { EmptyStep } from './steps/EmptyStep';
import { DeployFailedStep, DeployingStep, LiveStep } from './steps/RunStep';
import { StartStep } from './steps/StartStep';
import { Workspace } from './workspace/Workspace';

type Screen = 'start' | 'analyze' | 'analyze-failed' | 'empty' | 'review' | 'deploy' | 'deploying' | 'live' | 'failed';

type Layout = 'start' | 'form' | 'workspace';

/** Which of Review and Deploy the user is on, and whether a deploy's progress or result is in front. */
type View = 'review' | 'deploy' | 'run';

const screenFor = (state: WizardState, view: View): Screen => {
  if (state.phase === 'ready') return 'start';
  if (state.phase === 'analysing') return 'analyze';
  if (state.phase === 'failed') return 'analyze-failed';
  if (Object.keys(state.composition?.resources ?? {}).length === 0) return 'empty';
  const deployment = state.deployment?.status;
  if (view === 'run' && deployment !== undefined) {
    return deployment === 'succeeded' ? 'live' : deployment === 'failed' ? 'failed' : 'deploying';
  }
  return view === 'deploy' ? 'deploy' : 'review';
};

const pathFor = (screen: Screen, onReview: () => void): PathStep[] => {
  const position: Record<Screen, [number, PathStepStatus]> = {
    start: [0, 'current'],
    analyze: [0, 'working'],
    'analyze-failed': [0, 'failed'],
    // Nothing to review: the folder is the result of Analyze, and the way on is another folder.
    empty: [0, 'current'],
    review: [1, 'current'],
    deploy: [2, 'current'],
    deploying: [2, 'working'],
    failed: [2, 'failed'],
    live: [3, 'current']
  };
  const [at, status] = position[screen];
  // Review can be opened again from Deploy, and after a deploy that stopped; not while one runs or once it is live.
  const reviewIsOpen = screen === 'deploy' || screen === 'failed';
  return (['analyze', 'review', 'deploy', 'live'] as const).map((id, index) => ({
    id,
    title: { analyze: 'Analyze', review: 'Review', deploy: 'Deploy', live: 'Live' }[id],
    status: index < at ? 'done' : index === at ? status : 'pending',
    onSelect: id === 'review' && reviewIsOpen ? onReview : undefined
  }));
};

/**
 * How each screen sits under the header. Start is a wide page that fills the window; Deploy, Live and the failures are
 * one centred column; Analyze, Review and Deploying are the two-pane workspace that fills the window.
 */
const LAYOUT: Record<Screen, Layout> = {
  start: 'start',
  analyze: 'workspace',
  'analyze-failed': 'form',
  empty: 'form',
  review: 'workspace',
  deploy: 'form',
  deploying: 'workspace',
  live: 'form',
  failed: 'form'
};

/**
 * The wizard: four steps across the top, one step on the page at a time.
 *
 * Each step shows only itself. What earlier steps decided is one line at most (who read the code, which file was
 * saved), because the user is looking at the result of those steps, not a record of them.
 */
/** The format the file is saved in: the edited one while there is an edit, the picked one otherwise. */
const writtenFormat = (state: WizardState, format: 'yaml' | 'typescript'): 'yaml' | 'typescript' =>
  state.configEdit === undefined ? format : state.configEdit.typescript === undefined ? 'yaml' : 'typescript';

export function App() {
  const [session, setSession] = useState<Session | undefined>();
  const [state, setState] = useState<WizardState | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [actionFailure, setActionFailure] = useState<string | undefined>();
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting'>('connected');
  const [busy, setBusy] = useState<string | undefined>();
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [view, setView] = useState<View>('review');
  const [format, setFormat] = useState<'yaml' | 'typescript'>('yaml');
  const [stage, setStage] = useState('dev');
  /** The analysis result is still being told on the workspace: the navigation stays on Analyze until it ends. */
  const [isRevealing, setRevealing] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const connected = await connect();
        setSession(connected);
        setState(connected.state);
        // A reload lands where the run is: on its deploy, its saved file, or the review.
        setView(
          connected.state.deployment !== undefined
            ? 'run'
            : connected.state.configFile !== undefined
              ? 'deploy'
              : 'review'
        );
        if (connected.state.configFile !== undefined) setFormat(connected.state.configFile.format);
        if (connected.state.deployment !== undefined) setStage(connected.state.deployment.stage);
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

  const deploymentStatus = state?.deployment?.status;
  // A deploy that starts, from this tab or another, brings its progress to the front.
  useEffect(() => {
    if (deploymentStatus === 'running') setView('run');
  }, [deploymentStatus]);

  const run = useCallback(async (label: string, action: () => Promise<unknown>, whenItFails: string) => {
    setBusy(label);
    setActionFailure(undefined);
    try {
      await action();
      return true;
    } catch (error) {
      setActionFailure(error instanceof SessionError ? error.message : whenItFails);
      return false;
    } finally {
      setBusy(undefined);
    }
  }, []);

  const screen = state === undefined ? undefined : screenFor(state, view);

  // A new step starts at its top: on a phone the deploy's progress is long, and Live must not open halfway down its
  // card. Analyze becoming Review is the one exception: it is the same workspace, changing in place.
  const shownScreen = useRef<Screen | undefined>(undefined);
  useLayoutEffect(() => {
    if (screen === undefined) return;
    const before = shownScreen.current;
    shownScreen.current = screen;
    if (before === undefined || before === screen || (before === 'analyze' && screen === 'review')) return;
    window.scrollTo({ top: 0 });
  }, [screen]);

  // On the Deploy step the file has to be on disk. A setting changed there (the region, the migration) recomposes it,
  // which drops the old file; it is written again here, once per configuration, so the target check can run.
  const rewroteFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state === undefined || session === undefined || screen !== 'deploy') return;
    if (state.configFile !== undefined || busy !== undefined || connectionState !== 'connected') return;
    const key = `${state.region}|${state.configEdit?.typescript ?? state.configEdit?.yaml ?? state.composition?.configText?.yaml ?? ''}`;
    if (rewroteFor.current === key) return;
    rewroteFor.current = key;
    void run('write', () => session.write(writtenFormat(state, format)), 'The file could not be saved.');
  }, [state, session, screen, busy, connectionState, format, run]);

  const model = useMemo(() => {
    const deployment = state?.deployment;
    return deployment === undefined
      ? undefined
      : buildDeployModel(
          deployment.events as DeployEvent[],
          deployment.lines,
          deployment.status === 'running' || deployment.status === 'repairing'
            ? undefined
            : deployment.status === 'succeeded'
              ? 'succeeded'
              : 'failed'
        );
  }, [state?.deployment]);

  if (failure !== undefined) {
    return (
      <Frame layout="form">
        <div className="w-enter">
          <header className="w-hero">
            <h1 className="w-title">This wizard is no longer running</h1>
            <p className="w-lede">{failure}</p>
          </header>
          <p className="w-field-label">Start it again in your project’s folder</p>
          <CommandLine command="stacktape init" label="Copy the command" />
        </div>
      </Frame>
    );
  }

  if (state === undefined || session === undefined || screen === undefined) {
    return (
      <Frame layout="form">
        <div className="flex items-center gap-3 text-[var(--w-muted)]">
          <Spinner /> Connecting to stacktape init…
        </div>
      </Frame>
    );
  }

  const isLocked = connectionState === 'reconnecting';
  const deployment = state.deployment;
  const startAnalysis = (agentId: string, modelId: string, label = 'start') => {
    setStartedAt(Date.now());
    void run(label, () => session.start(agentId, modelId), 'That analysis could not be started.');
  };
  const deployTo = (deployStage: string, region: string, expected: Parameters<Session['deploy']>[2]) => {
    void run(
      'deploy',
      async () => {
        await session.deploy(deployStage, region, expected);
        if (expected.kind !== 'check') setView('run');
      },
      'The deploy could not be started.'
    );
  };
  const backToReview = () => {
    setView('review');
    window.scrollTo({ top: 0 });
  };
  const retryExpectation = (): Parameters<Session['deploy']>[2] => {
    const target = state.deployTarget;
    return target?.status === 'absent'
      ? { kind: 'create' }
      : target?.status === 'updateable'
        ? { kind: 'update', stackId: target.stackId }
        : { kind: 'check' };
  };

  return (
    <Frame
      connectionState={connectionState}
      layout={LAYOUT[screen]}
      path={pathFor(screen === 'review' && isRevealing ? 'analyze' : screen, backToReview)}
      projectName={state.projectName}
      repositoryPath={state.repositoryPath}
    >
      {(isLocked || actionFailure !== undefined) && (
        <div className="w-banners">
          {isLocked && (
            <Alert tone="warning" title="Lost the connection to stacktape init">
              It reconnects by itself while <span className="w-code">stacktape init</span> runs in your terminal. If you
              stopped it, run it again. A saved file stays in your project.
            </Alert>
          )}
          {actionFailure !== undefined && (
            <Alert tone="danger" title={actionFailure}>
              Nothing else changed. Try again, or look at the terminal running{' '}
              <span className="w-code">stacktape init</span>.
            </Alert>
          )}
        </div>
      )}

      {screen === 'start' && (
        <StartStep
          isBusy={busy === 'start'}
          isLocked={isLocked}
          onStart={(agentId, modelId) => startAnalysis(agentId, modelId)}
          state={state}
        />
      )}
      {screen === 'analyze-failed' && (
        <AnalyzeFailedStep
          busy={busy}
          onRetry={() => startAnalysis(state.choice?.agentId ?? 'none', state.choice?.modelId ?? 'default')}
          onWithoutAi={() => startAnalysis('none', 'default', 'start-plain')}
          state={state}
        />
      )}
      {screen === 'empty' && (
        <EmptyStep busy={busy} onAnalyzeWithAgent={(agentId) => startAnalysis(agentId, 'default')} state={state} />
      )}
      {(screen === 'analyze' || screen === 'review') && (
        // One element for both screens: Analyze turns into Review in place.
        <Workspace
          busy={busy}
          format={format}
          isLocked={isLocked || deploymentStatus === 'running' || deploymentStatus === 'repairing'}
          onConfigText={(yaml) =>
            void run('config-text', () => session.setConfigText(yaml), 'The edited file could not be sent.')
          }
          onContinue={() =>
            void (async () => {
              const ok = await run(
                'write',
                () => session.write(writtenFormat(state, format)),
                'The file could not be saved.'
              );
              if (ok) {
                setView('deploy');
                window.scrollTo({ top: 0 });
              }
            })()
          }
          onDecision={(id, value) => void run(id, () => session.answer(id, value), 'That change could not be applied.')}
          onFormatChange={setFormat}
          onSetting={(change) =>
            void run('setting', () => session.setSetting(change), 'That setting could not be applied.')
          }
          onRegion={(region) => void run('region', () => session.setRegion(region), 'That region could not be chosen.')}
          onRevealing={setRevealing}
          session={session}
          startedAt={startedAt}
          state={state}
        />
      )}
      {screen === 'deploy' && (
        <DeployStep
          busy={busy}
          isLocked={isLocked}
          onAwsKeys={(id, secret) =>
            void run('aws-keys', () => session.saveAwsKeys(id, secret), 'The keys could not be saved.')
          }
          onAwsProfile={(profile) =>
            void run('aws-profile', () => session.setAwsProfile(profile), 'That AWS profile could not be used.')
          }
          onDismissSecret={async (name, dismissed) => {
            await run(
              `dismiss-${name}`,
              () => session.dismissSecret(name, dismissed),
              dismissed ? 'The secret could not be removed.' : 'The secret could not be put back.'
            );
          }}
          onCheckTarget={async (checkStage, region) => {
            try {
              await session.deploy(checkStage, region, { kind: 'check' });
            } catch {
              // The target line says "could not be checked" from the state; nothing more to show here.
            }
          }}
          onConfirmSecrets={() => void run('secrets', () => session.confirmSecrets(), 'Could not record that.')}
          onDecision={(id, value) => void run(id, () => session.answer(id, value), 'That change could not be applied.')}
          onDeploy={deployTo}
          onDismissVerification={() =>
            void run('dismiss-verify', () => session.dismissVerification(), 'Could not set the result aside.')
          }
          onLoadEnvironment={session.readEnvironmentValues}
          onRecheck={() => void run('recheck', () => session.recheck(), 'Could not check again.')}
          onRegion={(region) => void run('region', () => session.setRegion(region), 'That region could not be chosen.')}
          onSecret={async (name, value) => {
            try {
              const next = await session.setSecret(name, value);
              return next.secrets?.set.includes(name) === true;
            } catch (error) {
              setActionFailure(error instanceof SessionError ? error.message : 'The secret could not be saved.');
              return false;
            }
          }}
          onStageChange={setStage}
          onVerify={() => void run('verify', () => session.verify(), 'The local try-out could not be started.')}
          stage={stage}
          state={state}
        />
      )}
      {screen === 'deploying' && model !== undefined && <DeployingStep model={model} state={state} />}
      {screen === 'failed' && model !== undefined && deployment !== undefined && (
        <DeployFailedStep
          busy={busy}
          model={model}
          onBackToFile={() => {
            setView('review');
            setTimeout(() => document.getElementById('config-file')?.scrollIntoView({ behavior: 'smooth' }), 50);
          }}
          onDeployAgain={() => deployTo(deployment.stage, deployment.region, retryExpectation())}
          state={state}
        />
      )}
      {screen === 'live' && model !== undefined && (
        <LiveStep
          busy={busy}
          model={model}
          onConnectCodingAgent={() =>
            void run('coding-agent', () => session.connectCodingAgent(), 'The coding agent could not be connected.')
          }
          onConsoleConnection={async (action) => {
            let next: WizardState | undefined;
            await run(
              `console-${action}`,
              async () => {
                next = await session.consoleConnection(action);
              },
              action === 'connect'
                ? 'Connecting to the Console could not be started.'
                : 'Could not set the offer aside.'
            );
            return next;
          }}
          onPipeline={(pipelineStage, region) =>
            void run('pipeline', () => session.pipeline(pipelineStage, region), 'The pipeline could not be written.')
          }
          onRecheck={() => void run('recheck', () => session.recheck(), 'Could not check again.')}
          onSignIn={(request) => session.signIn(request)}
          state={state}
        />
      )}
    </Frame>
  );
}

function Frame({
  path,
  projectName,
  repositoryPath,
  connectionState,
  layout,
  children
}: {
  path?: PathStep[];
  projectName?: string;
  repositoryPath?: string | undefined;
  connectionState?: 'connected' | 'reconnecting';
  layout: Layout;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="w-top">
        <div className="w-top-inner">
          <div className="w-brand">
            <img alt="" src={logo} />
            <span className="w-brand-name">Stacktape</span>
            {projectName !== undefined && (
              <span className="w-brand-project" title={repositoryPath ?? projectName}>
                {projectName}
              </span>
            )}
          </div>
          {path !== undefined ? <StepPath steps={path} /> : <span />}
          {connectionState === undefined ? (
            <span />
          ) : (
            <span className={`w-top-side${connectionState === 'reconnecting' ? ' is-reconnecting' : ''}`}>
              <span aria-hidden className="w-top-dot" />
              {connectionState === 'reconnecting' ? 'Reconnecting to stacktape init…' : 'Running on this machine'}
            </span>
          )}
        </div>
      </header>
      <main className={`w-main is-${layout}`}>{children}</main>
    </>
  );
}
