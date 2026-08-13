import { describe, expect, it } from 'bun:test';
import { buildDeployModel, extractUrls, type DeployEvent } from './deploy-model';

const event = (overrides: Partial<DeployEvent>): DeployEvent => ({ type: 'event', status: 'started', ...overrides });

describe('the deploy model', () => {
  it('marks a phase done only once the next one starts', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', message: 'Loading configuration' }),
        event({ phase: 'BUILD_AND_PACKAGE', message: 'Building api' })
      ],
      []
    );

    expect(model.phases.map((phase) => [phase.label, phase.status])).toEqual([
      ['Getting ready', 'done'],
      ['Building your code', 'running']
    ]);
  });

  it('stops the last phase spinning once the deploy has stopped', () => {
    const events = [
      event({ phase: 'INITIALIZE', message: 'Loading configuration' }),
      event({ phase: 'DEPLOY', message: 'Creating resources' })
    ];

    expect(buildDeployModel(events, [], false).phases.map((phase) => phase.status)).toEqual(['done', 'running']);
    // Nothing in the stream says a phase ended — only the deploy ending does.
    expect(buildDeployModel(events, [], true).phases.map((phase) => phase.status)).toEqual(['done', 'done']);
  });

  it('keeps CloudFormation progress on the phase that reported it', () => {
    const model = buildDeployModel(
      [
        event({ phase: 'INITIALIZE', message: 'Loading configuration' }),
        event({
          phase: 'DEPLOY',
          status: 'running',
          message: 'Creating resources',
          detail: {
            kind: 'cloudformation-progress',
            percent: 42,
            completedCount: 5,
            totalPlanned: 12,
            inProgressResources: ['ApiFunction', 'CacheCluster']
          }
        })
      ],
      []
    );

    const deploy = model.phases.find((phase) => phase.id === 'DEPLOY');
    expect(deploy?.cloudformation).toEqual({
      percent: 42,
      completed: 5,
      total: 12,
      inProgress: ['ApiFunction', 'CacheCluster']
    });
  });

  it('surfaces warnings and errors separately from the log', () => {
    const model = buildDeployModel(
      [
        { type: 'log', level: 'info', message: 'Using profile default' },
        { type: 'log', level: 'warn', message: 'Bucket name already taken, adding a suffix' },
        { type: 'log', level: 'error', message: 'Stack rolled back' }
      ],
      ['a line straight from stderr']
    );

    expect(model.notices).toEqual([
      { level: 'warn', message: 'Bucket name already taken, adding a suffix' },
      { level: 'error', message: 'Stack rolled back' }
    ]);
    // Everything is still in the log, including the unparsed output.
    expect(model.log).toContain('Using profile default');
    expect(model.log).toContain('a line straight from stderr');
  });

  it('finds the endpoints a deploy produced, and ignores the consoles', () => {
    expect(
      extractUrls([
        'Web service URL: https://api-abc.eu-west-1.elb.amazonaws.com',
        'Open https://console.aws.amazon.com/cloudformation/home to watch',
        'Docs: https://docs.stacktape.com/deploying'
      ])
    ).toEqual(['https://api-abc.eu-west-1.elb.amazonaws.com']);
  });
});
