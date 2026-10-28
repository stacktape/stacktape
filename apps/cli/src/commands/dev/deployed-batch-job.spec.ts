import { describe, expect, test } from 'bun:test';
import { describeBatchJob, findSubmittedBatchJobId, scopeBatchCall } from './deployed-batch-job';

const stackName = 'shelf-dev';
const queue = `arn:aws:batch:eu-north-1:123456789012:job-queue/${stackName}-batch-onDemand--job-queue`;

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
  test("list jobs only of the stage's queues and job definitions only of the stage", () => {
    expect(scopeBatchCall({ command: 'ListJobs', input: { jobQueue: queue }, stackName })).toEqual({});
    expect(scopeBatchCall({ command: 'ListJobs', input: {}, stackName })).toHaveProperty('refusal');
    expect(
      scopeBatchCall({ command: 'ListJobs', input: { jobQueue: 'other-prod-batch-onDemand--job-queue' }, stackName })
    ).toHaveProperty('refusal');
    expect(
      scopeBatchCall({
        command: 'DescribeJobDefinitions',
        input: { jobDefinitionName: `${stackName}-report-job-definition` },
        stackName
      })
    ).toEqual({});
    expect(scopeBatchCall({ command: 'DescribeJobDefinitions', input: {}, stackName })).toHaveProperty('refusal');
  });

  test('describe only the jobs of the stage', () => {
    const scope = scopeBatchCall({ command: 'DescribeJobs', input: { jobs: ['a', 'b'] }, stackName });
    if (!('filterResponse' in scope) || !scope.filterResponse) throw new Error('DescribeJobs must be filtered');
    expect(
      scope.filterResponse({
        jobs: [
          { jobId: 'a', jobQueue: queue },
          { jobId: 'b', jobQueue: 'arn:aws:batch:eu-north-1:123456789012:job-queue/other-prod-queue' }
        ]
      })
    ).toEqual({ jobs: [{ jobId: 'a', jobQueue: queue }] });
  });
});
