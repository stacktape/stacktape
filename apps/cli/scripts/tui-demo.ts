/**
 * Interactive TUI demo harness. Drives the real presentation layer (progress
 * app, prompts, error rendering, dev dashboard) with synthetic data — no AWS
 * calls, no credentials, no config needed. Run it in a real terminal:
 *
 *   bun scripts/tui-demo.ts deploy    full deploy: phases, CF progress, summary
 *   bun scripts/tui-demo.ts fail      deploy ending in a styled fatal error
 *   bun scripts/tui-demo.ts cancel    long CF update — press `c` to cancel+rollback
 *   bun scripts/tui-demo.ts prompts   all four footer prompt types
 *   bun scripts/tui-demo.ts script    simple mode with two concurrent output streams
 *   bun scripts/tui-demo.ts dev       dev dashboard: workloads, logs, `r` rebuild, `q` quit
 *
 * A second argument slows everything down for inspection, e.g.
 * `bun scripts/tui-demo.ts deploy 3` runs the deploy at one third speed.
 *
 * The OpenTUI Solid views are transformed at runtime via Bun's plugin API (same
 * loader the test preload uses), so this runs without a bundling step.
 */
import { plugin } from 'bun';
import { createStacktapeOpenTuiBuildPlugin } from '@scripts/support/opentui-loader';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { devTuiManager } from '@application-services/tui-manager/dev/manager';
import { CliError, getErrorDetails } from '@utils/errors';

plugin(createStacktapeOpenTuiBuildPlugin());

/** Pacing multiplier from argv[3] — `tui-demo deploy 3` runs 3x slower. */
const SPEED = Math.max(0.1, Number(process.argv[3]) || 1);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms * SPEED));

const HEADER = {
  projectName: 'demo-app',
  stageName: 'production',
  region: 'eu-west-1'
} as const;

const CF_RESOURCES = [
  'WebServiceEcsService',
  'ApiLambdaFunction',
  'HttpApiGateway',
  'WebServiceTargetGroup',
  'MainDatabaseCluster',
  'AssetsBucket',
  'CdnDistribution',
  'ApiLambdaLogGroup',
  'WebServiceTaskDefinition',
  'EventBusRule',
  'WorkerQueue',
  'WorkerLambdaFunction',
  'DnsRecordSet',
  'CertificateValidation'
];

const runInitializePhase = async () => {
  tuiManager.setPhase('INITIALIZE');
  tuiManager.startEvent({ eventType: 'LOAD_CONFIG_FILE', description: 'Loading configuration' });
  await sleep(400);
  tuiManager.finishEvent({ eventType: 'LOAD_CONFIG_FILE', finalMessage: 'Configuration loaded (stacktape.ts)' });

  tuiManager.startEvent({ eventType: 'FETCH_STACK_DATA', description: 'Fetching stack data' });
  tuiManager.startEvent({ eventType: 'FETCH_PREVIOUS_ARTIFACTS', description: 'Fetching previous artifacts' });
  await sleep(700);
  tuiManager.finishEvent({ eventType: 'FETCH_STACK_DATA', finalMessage: 'Stack data fetched' });
  await sleep(250);
  tuiManager.finishEvent({ eventType: 'FETCH_PREVIOUS_ARTIFACTS', finalMessage: 'Previous artifacts fetched' });
  tuiManager.finishPhase();
};

const runPackagePhase = async () => {
  tuiManager.setPhase('BUILD_AND_PACKAGE');
  tuiManager.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });

  const workloads = [
    { id: 'web-service', size: '38.2 MB', buildMs: 3600 },
    { id: 'api-lambda', size: '4.1 MB', buildMs: 2300 },
    { id: 'worker-lambda', size: '2.7 MB', buildMs: 1700 }
  ];
  for (const workload of workloads) {
    tuiManager.startEvent({
      eventType: 'BUILD_CODE',
      description: `Building ${workload.id}`,
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: workload.id
    });
  }

  tuiManager.appendEventOutput({
    eventType: 'PACKAGE_ARTIFACTS',
    lines: ['$ docker build -t web-service .', '#1 [internal] load build definition', '#2 transferring context: 2.1MB']
  });

  await Promise.all(
    workloads.map(async (workload, index) => {
      await sleep(workload.buildMs / 2);
      tuiManager.updateEvent({
        eventType: 'BUILD_CODE',
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: workload.id,
        additionalMessage: 'bundling'
      });
      await sleep(workload.buildMs / 2 + index * 150);
      tuiManager.finishEvent({
        eventType: 'BUILD_CODE',
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: workload.id,
        finalMessage: `${workload.id} packaged (${workload.size})`
      });
    })
  );

  tuiManager.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: '3 workloads packaged' });
  tuiManager.finishPhase();
};

const runUploadPhase = async () => {
  tuiManager.setPhase('UPLOAD');
  tuiManager.startEvent({ eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS', description: 'Uploading deployment artifacts' });
  for (let uploaded = 1; uploaded <= 3; uploaded++) {
    await sleep(500);
    tuiManager.updateEvent({
      eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      additionalMessage: `${uploaded}/3 uploaded`
    });
  }
  tuiManager.finishEvent({ eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS', finalMessage: 'Artifacts uploaded (45.0 MB)' });
  tuiManager.finishPhase();
};

const emitCfProgress = ({ completed, cleanup = false }: { completed: number; cleanup?: boolean }) => {
  const total = CF_RESOURCES.length;
  const inProgress = cleanup ? [] : CF_RESOURCES.slice(completed, Math.min(completed + 3, total));
  tuiManager.updateEvent({
    eventType: 'UPDATE_STACK',
    additionalMessage: cleanup ? 'Cleaning up' : `Progress: ${completed}/${total}`,
    detail: {
      kind: 'cloudformation-progress',
      stackAction: 'update',
      status: cleanup ? 'cleanup' : 'active',
      completedCount: completed,
      totalPlanned: total,
      inProgressCount: inProgress.length,
      inProgressResources: inProgress,
      waitingResources: cleanup ? [] : CF_RESOURCES.slice(completed + 3, completed + 6),
      changeCounts: { created: 3, updated: 9, deleted: 2 }
    }
  });
};

const runDeploy = async () => {
  tuiManager.showCommandHeader({ ...HEADER, action: 'DEPLOYING' });
  tuiManager.start({ phases: 'deploy' });

  const confirmed = await tuiManager.promptConfirm({
    message: 'Deploy demo-app to the production stage?',
    defaultValue: true
  });
  if (!confirmed) {
    await tuiManager.stop();
    return;
  }

  await runInitializePhase();
  await runPackagePhase();
  await runUploadPhase();

  tuiManager.setPhase('DEPLOY');
  tuiManager.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
  for (let completed = 0; completed <= CF_RESOURCES.length; completed++) {
    emitCfProgress({ completed });
    await sleep(600);
  }
  emitCfProgress({ completed: CF_RESOURCES.length, cleanup: true });
  await sleep(900);
  tuiManager.finishEvent({
    eventType: 'UPDATE_STACK',
    finalMessage: 'Stack updated (3 created, 9 updated, 2 deleted)'
  });
  tuiManager.finishPhase();

  tuiManager.setPhase('POST_DEPLOY');
  tuiManager.startEvent({ eventType: 'DELETE_OBSOLETE_ARTIFACTS', description: 'Deleting obsolete artifacts' });
  await sleep(600);
  tuiManager.finishEvent({ eventType: 'DELETE_OBSOLETE_ARTIFACTS', finalMessage: 'Obsolete artifacts deleted' });
  tuiManager.warn('Hook "notify-slack" took longer than expected (4.2s).');
  tuiManager.finishPhase();

  tuiManager.setPendingCompletion({
    success: true,
    message: 'DEPLOYED',
    links: [
      { label: 'web-service', url: 'https://demo-app.example.com' },
      { label: 'api-lambda', url: 'https://api.demo-app.example.com' }
    ],
    consoleUrl: 'https://console.stacktape.com/projects/demo-app/production'
  });
  tuiManager.commitPendingCompletion();
  await tuiManager.stop();
};

const runFail = async () => {
  tuiManager.showCommandHeader({ ...HEADER, action: 'DEPLOYING' });
  tuiManager.start({ phases: 'deploy' });

  await runInitializePhase();
  await runPackagePhase();
  await runUploadPhase();

  tuiManager.setPhase('DEPLOY');
  tuiManager.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
  for (let completed = 0; completed <= 5; completed++) {
    emitCfProgress({ completed });
    await sleep(600);
  }
  tuiManager.finishEvent({
    eventType: 'UPDATE_STACK',
    status: 'error',
    finalMessage: 'Stack update failed — rolled back'
  });

  const error = new CliError({
    category: 'STACK',
    code: 'STACK_UPDATE_FAILED',
    message:
      'Resource MainDatabaseCluster (part of main-database): `db.r6g.16xlarge` is unavailable in eu-west-1. The stack was rolled back to its previous working state.',
    hints: [
      'Choose an `instanceSize` available in eu-west-1.',
      'Re-run with `--logLevel debug` for the full CloudFormation event stream.'
    ]
  });
  error.details = getErrorDetails(error);

  // Mirrors applicationManager.gracefullyHandleError: capture -> stop -> display.
  tuiManager.setFatalError(error);
  await tuiManager.stop();
  tuiManager.error(error);
  process.exitCode = 1;
};

const runCancel = async () => {
  tuiManager.showCommandHeader({ ...HEADER, action: 'DEPLOYING' });
  tuiManager.start({ phases: 'deploy' });

  await runInitializePhase();
  await runPackagePhase();
  await runUploadPhase();

  let cancelled = false;
  tuiManager.setPhase('DEPLOY');
  tuiManager.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
  tuiManager.setCancelDeployment({
    message: 'Deployment in progress.',
    onCancel: () => {
      cancelled = true;
    }
  });

  for (let completed = 0; completed <= CF_RESOURCES.length; completed++) {
    if (cancelled) break;
    emitCfProgress({ completed });
    // Slow ticks so there is time to press `c` (or Ctrl+C) mid-deploy.
    await sleep(2500);
  }

  if (cancelled) {
    tuiManager.updateCancelDeployment({ isCancelling: true });
    for (let remaining = 4; remaining >= 0; remaining--) {
      tuiManager.updateEvent({
        eventType: 'UPDATE_STACK',
        additionalMessage: `Rolling back — ${remaining} resources remaining`
      });
      await sleep(900);
    }
    tuiManager.finishEvent({
      eventType: 'UPDATE_STACK',
      status: 'warning',
      finalMessage: 'Stack rolled back to previous state'
    });
    await tuiManager.stop();
    return;
  }

  tuiManager.clearCancelDeployment();
  tuiManager.finishEvent({ eventType: 'UPDATE_STACK', finalMessage: 'Stack updated' });
  tuiManager.finishPhase();
  tuiManager.setPendingCompletion({ success: true, message: 'DEPLOYED', links: [] });
  tuiManager.commitPendingCompletion();
  await tuiManager.stop();
};

const runPrompts = async () => {
  tuiManager.showCommandHeader({ ...HEADER, action: 'VALIDATING', subtitle: 'prompt showcase' });
  tuiManager.start();

  const region = await tuiManager.promptSelect({
    message: 'Select a region',
    options: [
      { label: 'eu-west-1 (Ireland)', value: 'eu-west-1' },
      { label: 'us-east-1 (Virginia)', value: 'us-east-1' },
      { label: 'ap-southeast-2 (Sydney)', value: 'ap-southeast-2', description: 'higher latency from EU' }
    ],
    defaultValue: 'eu-west-1'
  });

  const resources = await tuiManager.promptMultiSelect({
    message: 'Select resources to deploy',
    options: [
      { label: 'web-service (container)', value: 'web-service' },
      { label: 'api-lambda (function)', value: 'api-lambda' },
      { label: 'main-database (postgres)', value: 'main-database' }
    ],
    defaultValues: ['web-service', 'api-lambda']
  });

  const projectName = await tuiManager.promptText({
    message: 'Project name',
    placeholder: 'my-project',
    defaultValue: 'demo-app'
  });

  const apiKey = await tuiManager.promptText({
    message: 'API key',
    isPassword: true,
    description: 'Input is masked; the transcript keeps it masked too.',
    defaultValue: 'sk-demo-123'
  });

  const confirmed = await tuiManager.promptConfirm({ message: 'Proceed with these answers?', defaultValue: true });

  tuiManager.info(`region=${region} resources=${resources.join(',')} project=${projectName}`);
  tuiManager.info(`api key length: ${apiKey.length}, confirmed: ${confirmed}`);
  await tuiManager.stop();
};

const runScript = async () => {
  tuiManager.showCommandHeader({ ...HEADER, action: 'RUNNING SCRIPT: build-all' });
  tuiManager.start();
  tuiManager.setPhase('INITIALIZE');

  tuiManager.startEvent({ eventType: 'BUILD_CODE', description: 'Running script build-web' });
  tuiManager.startEvent({ eventType: 'SYNC_BUCKET', description: 'Running script sync-assets' });

  const webLines = [
    '> vite build',
    'transforming modules...',
    'rendering chunks...',
    'dist/index.html          1.2 kB',
    'dist/assets/index.js   142.7 kB gzip: 45.9 kB',
    'built in 3.42s'
  ];
  const syncLines = [
    'scanning ./public (312 files)',
    'uploading 17 changed files',
    'invalidating 3 CDN paths',
    'sync complete'
  ];

  // Two events streaming at once — output lines get their [source] prefix.
  await Promise.all([
    (async () => {
      for (const line of webLines) {
        tuiManager.appendEventOutput({ eventType: 'BUILD_CODE', lines: [line] });
        await sleep(450);
      }
      tuiManager.finishEvent({ eventType: 'BUILD_CODE', finalMessage: 'build-web finished' });
    })(),
    (async () => {
      for (const line of syncLines) {
        tuiManager.appendEventOutput({ eventType: 'SYNC_BUCKET', lines: [line] });
        await sleep(650);
      }
      tuiManager.finishEvent({ eventType: 'SYNC_BUCKET', finalMessage: 'sync-assets finished' });
    })()
  ]);

  tuiManager.setPendingCompletion({ success: true, message: 'SCRIPTS FINISHED', links: [] });
  tuiManager.commitPendingCompletion();
  await tuiManager.stop();
};

const runDevDashboard = async () => {
  // The dev dashboard's quit path goes through applicationManager.handleExitSignal,
  // which reads command/args from globalStateManager — give it just enough state.
  Object.assign(globalStateManager, { rawCommands: ['dev'], rawArgs: {} });

  devTuiManager.start({ projectName: HEADER.projectName, stageName: 'dev' });
  devTuiManager.setRebuildHandler(async (workloadName) => {
    const names = workloadName ? [workloadName] : ['web-service', 'api-lambda'];
    devTuiManager.startRebuild(names);
    for (const name of names) {
      devTuiManager.setRebuildStep(name, 'stopping');
      await sleep(500);
      devTuiManager.setRebuildStep(name, 'packaging', 'bundling source');
      devTuiManager.bufferRebuildLog(name, 'transforming 214 modules');
      await sleep(1200);
      devTuiManager.setRebuildStep(name, 'starting');
      await sleep(600);
      devTuiManager.setRebuildDone(name, '38.2 MB');
    }
    await devTuiManager.finishRebuild();
  });
  devTuiManager.startRenderer();

  devTuiManager.addSetupStep('config', 'Load configuration');
  devTuiManager.addSetupStep('aws', 'Connect to AWS');
  devTuiManager.addLocalResource({ name: 'main-database', type: 'postgres' });
  devTuiManager.addWorkload({ name: 'web-service', type: 'container' });
  devTuiManager.addWorkload({ name: 'api-lambda', type: 'function' });
  devTuiManager.addHook({ name: 'generate-prisma-client' });

  devTuiManager.setSetupStepStatus('config', 'done', 'stacktape.ts');
  await sleep(600);
  devTuiManager.setSetupStepStatus('aws', 'done', 'account 123456789999');
  devTuiManager.setLocalResourceStatus('main-database', 'starting');
  await sleep(900);
  devTuiManager.setLocalResourceStatus('main-database', 'running', { port: 5432 });
  devTuiManager.setHookStatus('generate-prisma-client', 'running');
  await sleep(800);
  devTuiManager.setHookStatus('generate-prisma-client', 'success', { duration: 812 });

  devTuiManager.setWorkloadStatus('web-service', 'starting', { statusMessage: 'building image' });
  devTuiManager.setWorkloadStatus('api-lambda', 'starting');
  await sleep(1500);
  devTuiManager.setWorkloadStatus('api-lambda', 'running', { url: 'http://localhost:3001' });
  await sleep(900);
  devTuiManager.setWorkloadStatus('web-service', 'running', { url: 'http://localhost:3000', size: '38.2 MB' });
  devTuiManager.transitionToRunning();

  const logPool = [
    { source: 'web-service', message: 'GET / 200 12ms' },
    { source: 'web-service', message: 'GET /api/products 200 48ms' },
    { source: 'api-lambda', message: 'invoked getProducts (34ms, 128MB)' },
    { source: 'main-database', message: 'checkpoint complete, wrote 118 buffers' },
    { source: 'web-service', message: 'POST /api/cart 201 61ms' },
    { source: 'api-lambda', message: 'warn: retrying DynamoDB call (throttled)' }
  ];
  let tick = 0;
  const logInterval = setInterval(() => {
    const entry = logPool[tick % logPool.length];
    const level = entry.message.startsWith('warn') ? 'warn' : 'info';
    devTuiManager.log(entry.source, entry.message, level);
    if (tick % 9 === 8) devTuiManager.systemLog('watching for file changes');
    tick++;
  }, 800);
  logInterval.unref();

  // Runs until `q` (dev dashboard quit) or Ctrl+C.
  await new Promise(() => {});
};

const scenarios: Record<string, () => Promise<void>> = {
  deploy: runDeploy,
  fail: runFail,
  cancel: runCancel,
  prompts: runPrompts,
  script: runScript,
  dev: runDevDashboard
};

const main = async () => {
  const scenario = process.argv[2];
  const run = scenarios[scenario];
  if (!run) {
    console.info(`Usage: bun scripts/tui-demo.ts <${Object.keys(scenarios).join('|')}> [speed-multiplier]`);
    process.exitCode = 1;
    return;
  }

  process.on('SIGINT', () => {
    process.exit(130);
  });

  tuiManager.init();
  await run();
};

void main();
