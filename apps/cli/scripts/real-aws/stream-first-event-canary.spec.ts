import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { resolveStreamEventOptions, validateStreamEventRecoveryState } from './stream-first-event-canary';

const valid = {
  STP_AWS_STREAM_EVENT_DEPLOY: '1',
  STP_AWS_STREAM_EVENT_CONFIRM_DISPOSABLE: 'this-is-a-disposable-test-account',
  STP_AWS_STREAM_EVENT_PROFILE: 'stacktape-e2e',
  STP_AWS_STREAM_EVENT_EXPECTED_ACCOUNT_ID: '123456789012',
  STP_AWS_STREAM_EVENT_STATE_FILE: '/tmp/stream-event-state.json',
  STP_AWS_STREAM_EVENT_OWNER: 'run1'
};

test('the stream canary requires the exact disposable-account and recovery opt-in', () => {
  expect(resolveStreamEventOptions(valid)).toMatchObject({
    accountId: '123456789012',
    profile: 'stacktape-e2e',
    region: 'eu-west-1',
    networkSuffix: 'run1',
    runs: 2
  });
  for (const override of [
    { STP_AWS_STREAM_EVENT_DEPLOY: undefined },
    { STP_AWS_STREAM_EVENT_CONFIRM_DISPOSABLE: undefined },
    { STP_AWS_STREAM_EVENT_PROFILE: 'stacktape-dev' },
    { STP_AWS_STREAM_EVENT_EXPECTED_ACCOUNT_ID: '12345' },
    { STP_AWS_STREAM_EVENT_STATE_FILE: 'relative.json' },
    { STP_AWS_STREAM_EVENT_OWNER: '../unsafe' },
    { STP_AWS_STREAM_EVENT_REPORT: 'relative-report.json' },
    { STP_AWS_STREAM_EVENT_REGION: 'eu-north-1; rm -rf /' },
    { STP_AWS_STREAM_EVENT_RUNS: '9' },
    { AWS_ENDPOINT_URL_DYNAMODB: 'http://127.0.0.1:4566' }
  ])
    expect(() => resolveStreamEventOptions({ ...valid, ...override })).toThrow();
});

test('recovery refuses foreign identities, names and directories', () => {
  const options = resolveStreamEventOptions(valid);
  const state = {
    accountId: options.accountId,
    owner: options.owner,
    region: options.region,
    projectName: 'stream-run1-abc123',
    directory: join(tmpdir(), 'stacktape-stream-event-x'),
    createAttempted: true,
    agentPorts: [7801]
  };
  expect(validateStreamEventRecoveryState(state, options)).toEqual(state);
  for (const override of [
    { accountId: '999999999999' },
    { projectName: 'stream-other-abc123' },
    { directory: '/home' },
    { createAttempted: 'yes' },
    { agentPorts: [22] }
  ])
    expect(() => validateStreamEventRecoveryState({ ...state, ...override }, options)).toThrow();
});
