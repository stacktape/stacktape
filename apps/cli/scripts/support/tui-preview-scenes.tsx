import { testRender } from '@opentui/solid';
import { scrollbackFeed, type ScrollbackItem } from '@application-services/tui-manager/progress/feed';
import { tuiState } from '@application-services/tui-manager/progress/state';
import type { TuiEvent } from '@application-services/tui-manager/progress/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Scene = {
  name: string;
  width?: number;
  height?: number;
  /** Prepares tuiState; runs before mount. */
  setup: () => void | Promise<void>;
  /** Extra frames: label -> action run before re-capture. */
  followUps?: Array<{ label: string; action: () => void | Promise<void> }>;
};

const baseHeader = () => {
  tuiState.setHeader({ projectName: 'demo-app', stageName: 'production', region: 'eu-west-1', action: 'DEPLOYING' });
};

const cfDetail = (completed: number, cleanup = false) => ({
  kind: 'cloudformation-progress',
  stackAction: 'update',
  status: cleanup ? 'cleanup' : 'active',
  completedCount: completed,
  totalPlanned: 14,
  inProgressCount: cleanup ? 0 : 3,
  inProgressResources: cleanup ? [] : ['web-service', 'main-database', 'cdn'],
  inProgressDetails: cleanup
    ? []
    : [
        { name: 'web-service', action: 'UPDATE' as const, resourceType: 'AWS::ECS::Service', since: 1 },
        { name: 'main-database', action: 'UPDATE' as const, resourceType: 'AWS::RDS::DBCluster', since: 2 },
        { name: 'cdn', action: 'CREATE' as const, resourceType: 'AWS::CloudFront::Distribution', since: 3 }
      ],
  waitingResources: cleanup ? [] : ['DnsRecordSet', 'CertificateValidation'],
  changeCounts: { created: 3, updated: 9, deleted: 2 }
});

const finishedEvent = (overrides: Partial<TuiEvent> = {}): TuiEvent => ({
  id: 'PACKAGE_ARTIFACTS',
  eventType: 'PACKAGE_ARTIFACTS',
  description: 'Packaging workloads',
  status: 'success',
  startTime: Date.now() - 4200,
  endTime: Date.now(),
  duration: 4200,
  finalMessage: '3 workloads packaged',
  children: [],
  ...overrides
});

export const footerScenes: Scene[] = [
  {
    name: 'footer/initialize-running',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('INITIALIZE');
      tuiState.startEvent({ eventType: 'FETCH_STACK_DATA', description: 'Fetching stack data' });
      tuiState.startEvent({ eventType: 'FETCH_PREVIOUS_ARTIFACTS', description: 'Fetching previous artifacts' });
    },
    followUps: [
      {
        label: 'timer-tick-1s-later',
        action: () => sleep(1100)
      }
    ]
  },
  {
    name: 'footer/package-children',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
      tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
      for (const id of ['web-service', 'api-lambda', 'worker-lambda']) {
        tuiState.startEvent({
          eventType: 'BUILD_CODE',
          description: `Building ${id}`,
          parentEventType: 'PACKAGE_ARTIFACTS',
          instanceId: id
        });
      }
      tuiState.updateEvent({
        eventType: 'BUILD_CODE',
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: 'web-service',
        additionalMessage: 'bundling'
      });
      tuiState.finishEvent({
        eventType: 'BUILD_CODE',
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: 'api-lambda',
        finalMessage: 'api-lambda packaged (4.1 MB)'
      });
    }
  },
  {
    name: 'footer/cf-mid-deploy',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('DEPLOY');
      tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
      tuiState.updateEvent({
        eventType: 'UPDATE_STACK',
        additionalMessage: 'Progress: 5/14',
        data: cfDetail(5)
      });
    },
    followUps: [
      {
        label: 'next-progress-tick',
        action: () => {
          tuiState.updateEvent({ eventType: 'UPDATE_STACK', additionalMessage: 'Progress: 6/14', data: cfDetail(6) });
          tuiState.flushPendingNotifications();
        }
      },
      {
        label: 'cleanup-phase',
        action: () => {
          tuiState.updateEvent({
            eventType: 'UPDATE_STACK',
            additionalMessage: 'Cleaning up',
            data: cfDetail(14, true)
          });
          tuiState.flushPendingNotifications();
        }
      }
    ]
  },
  {
    name: 'footer/cf-mid-deploy-narrow',
    width: 60,
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('DEPLOY');
      tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
      tuiState.updateEvent({ eventType: 'UPDATE_STACK', additionalMessage: 'Progress: 5/14', data: cfDetail(5) });
    }
  },
  {
    name: 'footer/prompt-confirm',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('INITIALIZE');
      tuiState.setActivePrompt({
        type: 'confirm',
        message: 'Deploy demo-app to stage production?',
        defaultValue: true,
        resolve: () => {},
        reject: () => {}
      });
    }
  },
  {
    name: 'footer/prompt-select',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('INITIALIZE');
      tuiState.setActivePrompt({
        type: 'select',
        message: 'Select a region',
        options: [
          { label: 'eu-west-1 (Ireland)', value: 'eu-west-1' },
          { label: 'us-east-1 (Virginia)', value: 'us-east-1' },
          { label: 'ap-southeast-2 (Sydney)', value: 'ap-southeast-2', description: 'higher latency from EU' }
        ],
        defaultValue: 'eu-west-1',
        resolve: () => {},
        reject: () => {}
      });
    }
  },
  {
    name: 'footer/cancel-offer',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('DEPLOY');
      tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
      tuiState.setCancelDeployment({ message: 'Deployment in progress.', onCancel: () => {} });
    }
  },
  {
    name: 'footer/cancelling',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('DEPLOY');
      tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
      tuiState.setCancelDeployment({ message: 'Deployment in progress.', onCancel: () => {}, isCancelling: true });
    }
  },
  {
    name: 'footer/complete-success',
    setup: () => {
      baseHeader();
      tuiState.setCurrentPhase('POST_DEPLOY');
      tuiState.setComplete(true, 'DEPLOYED', [{ label: 'web-service', url: 'https://demo-app.example.com' }]);
    }
  },
  {
    name: 'footer/simple-mode-script',
    height: 8,
    setup: () => {
      tuiState.setShowPhaseHeaders(false);
      tuiState.setHeader({
        projectName: 'demo-app',
        stageName: 'production',
        region: 'eu-west-1',
        action: 'RUNNING SCRIPT: build-all'
      });
      tuiState.setCurrentPhase('INITIALIZE');
      tuiState.startEvent({ eventType: 'BUILD_CODE', description: 'Running script build-web' });
      tuiState.startEvent({ eventType: 'SYNC_BUCKET', description: 'Running script sync-assets' });
    }
  }
];

export const scrollbackItems: Array<{ name: string; item: ScrollbackItem }> = [
  {
    name: 'scrollback/header',
    item: {
      kind: 'header',
      header: { projectName: 'demo-app', stageName: 'production', region: 'eu-west-1', action: 'DEPLOYING' }
    }
  },
  { name: 'scrollback/phase-header', item: { kind: 'phase-header', name: 'Build & Package' } },
  { name: 'scrollback/event-plain', item: { kind: 'event', event: finishedEvent() } },
  {
    name: 'scrollback/event-with-children',
    item: {
      kind: 'event',
      event: finishedEvent({
        children: [
          {
            id: 'BUILD_CODE-web-service',
            eventType: 'BUILD_CODE',
            description: 'Building web-service',
            status: 'success',
            startTime: Date.now() - 3600,
            endTime: Date.now(),
            duration: 3600,
            finalMessage: 'web-service packaged (38.2 MB)',
            instanceId: 'web-service',
            children: []
          },
          {
            id: 'BUILD_CODE-api-lambda',
            eventType: 'BUILD_CODE',
            description: 'Building api-lambda',
            status: 'success',
            startTime: Date.now() - 2300,
            endTime: Date.now(),
            duration: 2300,
            finalMessage: 'api-lambda packaged (4.1 MB)',
            instanceId: 'api-lambda',
            children: []
          }
        ]
      })
    }
  },
  {
    name: 'scrollback/event-cf-finished',
    item: {
      kind: 'event',
      event: finishedEvent({
        id: 'UPDATE_STACK',
        eventType: 'UPDATE_STACK',
        description: 'Updating CloudFormation stack',
        finalMessage: 'Stack updated (3 created, 9 updated, 2 deleted)',
        duration: 92000,
        data: cfDetail(14, true) as any
      })
    }
  },
  {
    name: 'scrollback/output-line',
    item: { kind: 'output-line', line: 'dist/assets/index.js   142.7 kB gzip: 45.9 kB' }
  },
  {
    name: 'scrollback/output-line-sourced',
    item: { kind: 'output-line', source: 'build-web', line: 'dist/assets/index.js   142.7 kB gzip: 45.9 kB' }
  },
  {
    name: 'scrollback/message-info',
    item: { kind: 'message', type: 'info', text: 'Issues: enabled (default policy).' }
  },
  {
    name: 'scrollback/message-warn',
    item: { kind: 'message', type: 'warn', text: 'Hook "notify-slack" took longer than expected (4.2s).' }
  },
  {
    name: 'scrollback/prompt-answer',
    item: { kind: 'prompt-answer', message: 'Deploy demo-app to stage production?', answer: 'yes' }
  },
  {
    name: 'scrollback/error',
    item: {
      kind: 'error',
      header: { projectName: 'demo-app', stageName: 'production', region: 'eu-west-1', action: 'DEPLOYING' },
      error: {
        errorType: 'STACK',
        message:
          'Resource MainDatabaseCluster (part of main-database): The specified instance class `db.r6g.16xlarge` is not available in eu-west-1. Stack was rolled back to its previous working state.',
        hints: [
          'Use `instanceSize` supported in the target region.',
          'Run with `--logLevel debug` to see the full CloudFormation event stream.'
        ],
        isExpected: true
      }
    }
  },
  {
    name: 'scrollback/summary-success',
    item: {
      kind: 'summary',
      header: { projectName: 'demo-app', stageName: 'production', region: 'eu-west-1', action: 'DEPLOYING' },
      summary: {
        success: true,
        message: 'DEPLOYED',
        links: [
          { label: 'web-service', url: 'https://demo-app.example.com' },
          { label: 'api-lambda', url: 'https://api.demo-app.example.com' }
        ],
        consoleUrl: 'https://console.stacktape.com/projects/demo-app/production'
      },
      phases: [
        { id: 'INITIALIZE', name: 'Initialize', status: 'success', duration: 1400, events: [] },
        { id: 'BUILD_AND_PACKAGE', name: 'Build & Package', status: 'success', duration: 4300, events: [] },
        { id: 'UPLOAD', name: 'Upload', status: 'success', duration: 1500, events: [] },
        {
          id: 'DEPLOY',
          name: 'Deploy',
          status: 'success',
          duration: 9800,
          events: [finishedEvent({ id: 'UPDATE_STACK', eventType: 'UPDATE_STACK', data: cfDetail(14, true) as any })]
        },
        { id: 'POST_DEPLOY', name: 'Finalize', status: 'success', duration: 700, events: [] }
      ],
      totalDurationMs: 17800
    }
  }
];

export const renderAllScenes = async (): Promise<string> => {
  const out: string[] = [];
  const { ProgressDashboard } = await import('@application-services/tui-manager/progress/views/dashboard');
  const { ScrollbackItemView } = await import('@application-services/tui-manager/progress/views/scrollback-items');

  for (const scene of footerScenes) {
    tuiState.reset();
    scrollbackFeed.reset();
    await scene.setup();
    tuiState.flushPendingNotifications();
    const width = scene.width ?? 100;
    const height = scene.height ?? 12;
    const setup = await testRender(() => <ProgressDashboard onQuit={() => {}} onCancel={() => {}} />, {
      width,
      height
    });
    tuiState.flushPendingNotifications();
    await sleep(30);
    await setup.renderOnce();
    out.push(`\n===== ${scene.name} (${width}x${height}) =====`);
    out.push(setup.captureCharFrame());
    for (const followUp of scene.followUps ?? []) {
      await followUp.action();
      await sleep(30);
      await setup.renderOnce();
      out.push(`----- ${scene.name} :: ${followUp.label} -----`);
      out.push(setup.captureCharFrame());
    }
    setup.renderer.destroy();
  }

  for (const entry of scrollbackItems) {
    const setup = await testRender(() => <ScrollbackItemView item={entry.item} width={100} />, {
      width: 100,
      height: 16
    });
    await sleep(20);
    await setup.renderOnce();
    out.push(`\n===== ${entry.name} (100 wide) =====`);
    out.push(setup.captureCharFrame().replace(/\n+$/g, '\n'));
    setup.renderer.destroy();
  }

  tuiState.reset();
  return out.join('\n');
};
