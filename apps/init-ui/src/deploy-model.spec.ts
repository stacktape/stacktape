import { describe, expect, it } from 'bun:test';
import {
  buildDeployModel,
  clock,
  groupResources,
  ownerOf,
  spokenDuration,
  SHARED_GROUP,
  type DeployEvent,
  type DeployResource
} from './deploy-model';

const event = (overrides: Partial<DeployEvent>): DeployEvent => ({ type: 'event', status: 'started', ...overrides });
const at = (seconds: number) => new Date(Date.parse('2026-11-20T10:00:00.000Z') + seconds * 1000).toISOString();

describe('the deploy phases', () => {
  it('lists every phase from the start, and marks one done only once the next one starts', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', message: 'Loading configuration' }),
        event({ phase: 'BUILD_AND_PACKAGE', eventType: 'PACKAGE_ARTIFACTS', message: 'Packaging workloads' })
      ],
      []
    );

    expect(model.phases.map((phase) => [phase.label, phase.status])).toEqual([
      ['Getting ready', 'done'],
      ['Building your code', 'running'],
      ['Uploading', 'pending'],
      ['Creating AWS resources', 'pending'],
      ['Finishing up', 'pending']
    ]);
    expect(model.current?.id).toBe('BUILD_AND_PACKAGE');
  });

  it('stops the last phase spinning once the deploy has stopped, and fails the phase it broke in', () => {
    const events = [
      event({ phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', message: 'Loading configuration' }),
      event({ phase: 'DEPLOY', eventType: 'UPDATE_STACK', message: 'Deploying infrastructure resources' })
    ];

    expect(buildDeployModel(events, [], 'succeeded').phases.map((phase) => phase.status)).toEqual(['done', 'done']);
    expect(buildDeployModel(events, [], 'failed').phases.map((phase) => phase.status)).toEqual(['done', 'failed']);
  });

  it('times each phase from its first event to the next phase, and the last one to the end of the deploy', () => {
    const events = [
      event({ phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', ts: at(0) }),
      event({ phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', status: 'completed', ts: at(4) }),
      event({ phase: 'DEPLOY', eventType: 'UPDATE_STACK', ts: at(10) }),
      { type: 'result', ts: at(370), ok: true }
    ];

    const running = buildDeployModel(events.slice(0, 3), []);
    expect(
      running.phases
        .filter((phase) => phase.startedAt !== undefined)
        .map((phase) => [phase.id, phase.startedAt, phase.endedAt])
    ).toEqual([
      ['INITIALIZE', Date.parse(at(0)), Date.parse(at(10))],
      ['DEPLOY', Date.parse(at(10)), undefined]
    ]);
    expect(buildDeployModel(events, [], 'succeeded').phases.at(-1)?.endedAt).toBe(Date.parse(at(370)));
  });

  it('names an update and a rollback for what CloudFormation is doing', () => {
    const tick = (stackAction: string) =>
      event({
        phase: 'DEPLOY',
        eventType: 'UPDATE_STACK',
        status: 'running',
        detail: { kind: 'cloudformation-progress', stackAction }
      });
    expect(buildDeployModel([tick('update')], []).phases.find((phase) => phase.id === 'DEPLOY')?.label).toBe(
      'Updating AWS resources'
    );
    expect(buildDeployModel([tick('rollback')], []).phases.find((phase) => phase.id === 'DEPLOY')?.label).toBe(
      'Rolling back AWS resources'
    );
  });
});

describe('the steps of a phase', () => {
  it('turns each workload into one row, with its functions under it and what it built', () => {
    const child = (
      eventType: string,
      status: 'started' | 'completed',
      message: string,
      instanceId: string,
      ts: string
    ) =>
      event({
        phase: 'BUILD_AND_PACKAGE',
        eventType,
        status,
        message,
        instanceId,
        parentEventType: 'PACKAGE_ARTIFACTS',
        ts
      });
    const model = buildDeployModel(
      [
        event({
          phase: 'BUILD_AND_PACKAGE',
          eventType: 'PACKAGE_ARTIFACTS',
          message: 'Packaging workloads',
          ts: at(0)
        }),
        child('BUILD_NEXTJS_PROJECT', 'started', 'Building Nextjs project', 'app', at(0)),
        child('BUILD_NEXTJS_PROJECT', 'completed', 'Building Nextjs project', 'app', at(30)),
        child('BUILD_CODE', 'started', 'Identifying shared resources', 'app.serverFunction', at(31)),
        child('BUILD_CODE', 'completed', 'Lambda bundle · 9.8 MB (3.1 MB zipped)', 'app.serverFunction', at(35)),
        child('BUILD_IMAGE', 'started', 'Building docker image', 'api-service-container', at(1)),
        event({
          phase: 'BUILD_AND_PACKAGE',
          eventType: 'RESOLVE_CONFIG',
          message: 'Preparing infrastructure template',
          ts: at(36)
        }),
        event({
          phase: 'BUILD_AND_PACKAGE',
          eventType: 'RESOLVE_CONFIG',
          status: 'completed',
          message: 'Infrastructure template prepared (63 AWS resources)',
          ts: at(37)
        })
      ],
      []
    );
    const steps = model.phases.find((phase) => phase.id === 'BUILD_AND_PACKAGE')!.steps;

    expect(steps.map((step) => [step.label, step.status, step.detail])).toEqual([
      ['app', 'done', undefined],
      ['api-service-container', 'running', 'Docker image'],
      ['CloudFormation template', 'done', '63 AWS resources']
    ]);
    expect(steps[0]!.children.map((step) => [step.label, step.detail])).toEqual([
      ['serverFunction', 'Lambda bundle · 9.8 MB (3.1 MB zipped)']
    ]);
    expect([steps[0]!.startedAt, steps[0]!.endedAt]).toEqual([Date.parse(at(0)), Date.parse(at(35))]);
  });

  it('keeps the CLI’s own words only when they add something', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', eventType: 'LOAD_AWS_CREDENTIALS', message: 'Loading AWS credentials' }),
        event({
          phase: 'INITIALIZE',
          eventType: 'LOAD_AWS_CREDENTIALS',
          status: 'completed',
          message: 'AWS credentials loaded (profile default)'
        }),
        event({ phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', message: 'Loading configuration' }),
        event({
          phase: 'INITIALIZE',
          eventType: 'LOAD_CONFIG_FILE',
          status: 'completed',
          message: 'Loading configuration'
        })
      ],
      []
    );
    expect(model.phases[0]!.steps.map((step) => [step.label, step.detail])).toEqual([
      ['AWS credentials', 'profile default'],
      ['Configuration', undefined]
    ]);
  });

  it('finishes the steps of a phase that is over, and fails the one that was running when the deploy broke', () => {
    const events = [
      event({ phase: 'UPLOAD', eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS', message: 'Uploading deployment artifacts' }),
      event({ phase: 'UPLOAD', eventType: 'SYNC_BUCKET', message: 'Syncing directories into buckets' })
    ];
    expect(buildDeployModel(events, [], 'failed').phases[0]!.steps.map((step) => step.status)).toEqual(['failed']);
    expect(buildDeployModel(events, [], 'succeeded').phases[0]!.steps.map((step) => step.status)).toEqual(['done']);
  });
});

describe('the deploy log', () => {
  it('starts a section per phase and puts each AWS resource where it happened', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', eventType: 'LOAD_CONFIG_FILE', message: 'Loading configuration', ts: at(0) }),
        event({
          phase: 'DEPLOY',
          eventType: 'UPDATE_STACK',
          message: 'Deploying infrastructure resources',
          ts: at(10)
        }),
        { type: 'log', level: 'warn', message: 'Bucket name already taken, adding a suffix', ts: at(40) },
        { type: 'result', ok: true, ts: at(600) }
      ],
      ['a line straight from stderr'],
      'succeeded',
      [
        {
          id: 'MainDatabaseDbInstance',
          type: 'AWS::RDS::DBInstance',
          action: 'CREATE',
          status: 'complete',
          startedAt: at(12),
          endedAt: at(500)
        }
      ]
    );

    expect(model.log.map((entry) => [entry.kind, entry.level, entry.source, entry.text])).toEqual([
      ['section', 'info', undefined, 'Getting ready'],
      ['line', 'info', undefined, 'Loading configuration'],
      ['section', 'info', undefined, 'Creating AWS resources'],
      ['line', 'info', undefined, 'Deploying infrastructure resources'],
      ['line', 'info', 'AWS::RDS::DBInstance', 'Creating MainDatabaseDbInstance'],
      ['line', 'warn', undefined, 'Bucket name already taken, adding a suffix'],
      ['line', 'success', 'AWS::RDS::DBInstance', 'Created MainDatabaseDbInstance in 8 min 8 s'],
      ['line', 'success', undefined, 'Deploy finished'],
      ['line', 'output', 'stderr', 'a line straight from stderr']
    ]);
    expect(model.notices).toEqual([{ level: 'warn', message: 'Bucket name already taken, adding a suffix' }]);
  });

  it('shows build output under the workload that printed it, without blank lines', () => {
    const model = buildDeployModel(
      [
        {
          type: 'output',
          instanceId: 'app',
          lines: ['▲ Next.js 15.3.2', '', 'Creating an optimized production build ...']
        }
      ],
      []
    );
    expect(model.log.map((entry) => [entry.level, entry.source, entry.text])).toEqual([
      ['output', 'app', '▲ Next.js 15.3.2'],
      ['output', 'app', 'Creating an optimized production build ...']
    ]);
  });
});

const resource = (
  id: string,
  status: DeployResource['status'],
  startedAt?: string,
  endedAt?: string
): DeployResource => ({
  id,
  action: 'CREATE',
  status,
  ...(startedAt === undefined ? {} : { startedAt }),
  ...(endedAt === undefined ? {} : { endedAt })
});

describe('the AWS resources by part of the app', () => {
  it('finds the part a logical ID belongs to, by its name at the start or inside', () => {
    const names = ['mainDatabase', 'app', 'apiGateway', 'api'];
    expect(ownerOf('MainDatabaseDbInstance', names)).toBe('mainDatabase');
    expect(ownerOf('DatabaseFreeStorageForMainDatabase0Alarm', names)).toBe('mainDatabase');
    expect(ownerOf('ApiGatewayStage', names)).toBe('apiGateway');
    expect(ownerOf('ApiService', names)).toBe('api');
    expect(ownerOf('StpVpc', names)).toBe(SHARED_GROUP);
  });

  it('groups in the configuration’s order with the shared ones last, and counts what is done', () => {
    const groups = groupResources(
      [
        resource('StpVpc', 'complete', at(0), at(14)),
        resource('MainDatabaseDbSubnetGroup', 'complete', at(50), at(53)),
        resource('MainDatabaseDbInstance', 'in-progress', at(60)),
        resource('AppBucketBucket', 'complete', undefined, at(23))
      ],
      ['mainDatabase', 'app']
    );
    expect(groups.map((group) => [group.name, group.status, group.done, group.running, group.endedAt])).toEqual([
      ['mainDatabase', 'running', 1, 1, undefined],
      ['app', 'done', 1, 0, Date.parse(at(23))],
      [SHARED_GROUP, 'done', 1, 0, Date.parse(at(14))]
    ]);
    expect(groups[0]!.startedAt).toBe(Date.parse(at(50)));
  });
});

describe('times', () => {
  it('says a duration aloud and runs a clock', () => {
    expect(spokenDuration(400)).toBe('<1 s');
    expect(spokenDuration(4200)).toBe('4 s');
    expect(spokenDuration(72_000)).toBe('1 min 12 s');
    expect(spokenDuration(180_000)).toBe('3 min');
    expect(clock(42_000)).toBe('0:42');
    expect(clock(3_725_000)).toBe('1:02:05');
  });
});
