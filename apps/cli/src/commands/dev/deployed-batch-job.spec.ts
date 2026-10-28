import { describe, expect, test } from 'bun:test';
import { describeBatchJob, findSubmittedBatchJobId, getBatchScope, scopeBatchCall } from './deployed-batch-job';

// r2qq finding 8: status showed only the state machine's RUNNING, not whether Batch queued, pulled or ran the job.
describe('the Batch job behind a batch job run', () => {
  test('is the job the newest Batch task of the execution submitted', () => {
    const submitted = (jobId: string) => ({
      type: 'TaskSubmitted',
      taskSubmittedEventDetails: { resourceType: 'batch', output: JSON.stringify({ JobId: jobId, JobName: 'report' }) }
    });
    expect(
      findSubmittedBatchJobId([{ type: 'TaskStateEntered' }, submitted('second-attempt'), submitted('first-attempt')])
    ).toBe('second-attempt');
    expect(
      findSubmittedBatchJobId([
        {
          type: 'TaskFailed',
          taskFailedEventDetails: { resourceType: 'batch', cause: JSON.stringify({ JobId: 'failed' }) }
        }
      ])
    ).toBe('failed');
    expect(findSubmittedBatchJobId([{ type: 'ExecutionStarted' }])).toBeUndefined();
  });

  test('reports its status, reason, log stream and exit code', () => {
    expect(
      describeBatchJob({
        jobId: 'abc',
        status: 'FAILED',
        statusReason: 'Essential container in task exited',
        startedAt: 1_761_660_000_000,
        container: { logStreamName: 'batch/default/abc', exitCode: 1, reason: undefined }
      })
    ).toEqual({
      jobId: 'abc',
      status: 'FAILED',
      statusReason: 'Essential container in task exited',
      logStream: 'batch/default/abc',
      exitCode: 1,
      startedAt: new Date(1_761_660_000_000).toISOString()
    });
    expect(describeBatchJob({ jobId: 'queued', status: 'RUNNABLE' })).toEqual({ jobId: 'queued', status: 'RUNNABLE' });
  });
});

describe('Batch reads of a dev agent', () => {
  // #386 review: a prefix check let stack shelf-dev read the queues, definitions and jobs of stack shelf-dev-other.
  const arn = (kind: string, name: string, { region = 'eu-north-1', account = '123456789012' } = {}) =>
    `arn:aws:batch:${region}:${account}:${kind}/${name}`;
  const queue = arn('job-queue', 'shelf-dev-batch-onDemand--job-queue');
  const otherQueue = arn('job-queue', 'shelf-dev-other-batch-onDemand--job-queue');
  const definition = 'shelf-dev-report-job-definition';
  const otherDefinition = 'shelf-dev-other-report-job-definition';
  const scope = getBatchScope([
    { ResourceType: 'AWS::Batch::JobQueue', PhysicalResourceId: queue },
    { ResourceType: 'AWS::Batch::JobDefinition', PhysicalResourceId: `${arn('job-definition', definition)}:3` },
    { ResourceType: 'AWS::Lambda::Function', PhysicalResourceId: 'shelf-dev-api' }
  ]);
  const refused = (command: string, input: Record<string, unknown>, region = 'eu-north-1') =>
    'refusal' in scopeBatchCall({ command, input, region, scope });

  test("list jobs only of the stack's own queues", () => {
    expect(refused('ListJobs', { jobQueue: queue })).toBeFalse();
    expect(refused('ListJobs', { jobQueue: 'shelf-dev-batch-onDemand--job-queue' })).toBeFalse();
    expect(refused('ListJobs', { jobQueue: otherQueue })).toBeTrue();
    expect(refused('ListJobs', { jobQueue: 'shelf-dev-other-batch-onDemand--job-queue' })).toBeTrue();
    expect(
      refused('ListJobs', {
        jobQueue: arn('job-queue', 'shelf-dev-batch-onDemand--job-queue', { region: 'us-east-1' })
      })
    ).toBeTrue();
    expect(refused('ListJobs', {})).toBeTrue();
  });

  test("describe only the stack's own job definitions, in its region and account", () => {
    expect(refused('DescribeJobDefinitions', { jobDefinitionName: definition })).toBeFalse();
    expect(
      refused('DescribeJobDefinitions', {
        jobDefinitions: [`${definition}:3`, arn('job-definition', `${definition}:4`)]
      })
    ).toBeFalse();
    expect(refused('DescribeJobDefinitions', { jobDefinitionName: otherDefinition })).toBeTrue();
    expect(refused('DescribeJobDefinitions', { jobDefinitions: [`${definition}:3`, otherDefinition] })).toBeTrue();
    expect(
      refused('DescribeJobDefinitions', {
        jobDefinitions: [arn('job-definition', `${definition}:3`, { account: '999999999999' })]
      })
    ).toBeTrue();
    expect(refused('DescribeJobDefinitions', {})).toBeTrue();
  });

  // #386 re-review: a name of the stack's queue with region us-east-1 passed, and us-east-1 was queried unfiltered.
  test("go only to the stack's region, with names resolved to the stack's ARNs", () => {
    expect(refused('ListJobs', { jobQueue: 'shelf-dev-batch-onDemand--job-queue' }, 'us-east-1')).toBeTrue();
    expect(refused('DescribeJobs', { jobs: ['a'] }, 'us-east-1')).toBeTrue();
    expect(refused('DescribeJobDefinitions', { jobDefinitionName: definition }, 'us-east-1')).toBeTrue();
    expect(
      scopeBatchCall({
        command: 'ListJobs',
        input: { jobQueue: 'shelf-dev-batch-onDemand--job-queue', jobStatus: 'RUNNABLE' },
        region: 'eu-north-1',
        scope
      })
    ).toMatchObject({ input: { jobQueue: queue, jobStatus: 'RUNNABLE' } });
    expect(
      scopeBatchCall({
        command: 'DescribeJobDefinitions',
        input: { jobDefinitions: [`${definition}:3`] },
        region: 'eu-north-1',
        scope
      })
    ).toMatchObject({ input: { jobDefinitions: [`${arn('job-definition', definition)}:3`] } });
    // A stack without Batch resources reads none.
    expect(
      'refusal' in
        scopeBatchCall({ command: 'DescribeJobs', input: {}, region: 'eu-north-1', scope: getBatchScope([]) })
    ).toBeTrue();
  });

  test("describe only jobs on the stack's queues with its job definitions", () => {
    const scoped = scopeBatchCall({
      command: 'DescribeJobs',
      input: { jobs: ['a', 'b', 'c'] },
      region: 'eu-north-1',
      scope
    });
    if (!('filterResponse' in scoped) || !scoped.filterResponse) throw new Error('DescribeJobs must be filtered');
    const own = { jobId: 'a', jobQueue: queue, jobDefinition: `${arn('job-definition', definition)}:3` };
    expect(
      scoped.filterResponse({
        jobs: [
          own,
          { jobId: 'b', jobQueue: otherQueue, jobDefinition: `${arn('job-definition', otherDefinition)}:1` },
          { jobId: 'c', jobQueue: queue, jobDefinition: `${arn('job-definition', otherDefinition)}:1` }
        ]
      })
    ).toEqual({ jobs: [own] });
  });
});
