import type {
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from 'aws-lambda';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { SSMClient } from '@aws-sdk/client-ssm';
import { describe, expect, spyOn, test } from 'bun:test';
import handler from './index';

/**
 * The dispatcher picks exactly one resolver out of a wire envelope where every resolver key is optional, then hands
 * that resolver its properties. These are the rules it enforces before invoking anything, exercised through the real
 * handler and observed the way CloudFormation observes it: by the response body sent to the response URL.
 *
 * `globalThis.fetch` and the AWS client prototypes are process-global, so these stubs are genuinely visible to
 * anything else running in the same process. What bounds them is scope, not isolation: each case installs them
 * immediately before one handler call and removes them in a `finally`, `test.serial` keeps these nine cases from
 * overlapping each other, and the helper-Lambda lane runs test files one after another. Stubbing `fetch` captures the
 * CloudFormation response but does not intercept the AWS SDK, which uses a Node HTTP transport of its own — the
 * `send` stubs below are what make an unexpected AWS request fail. Every case here uses `Update` or `Delete`, and the
 * only resolvers involved reach AWS on `Create` (`openSearch`) or with a non-empty payload (`sensitiveData`).
 */

const RESPONSE_URL = 'https://cloudformation-custom-resource-response.example.test/response';
const SERVICE_TOKEN = 'arn:aws:lambda:eu-west-1:123456789012:function:stp-service-lambda';

const openSearchPayload: StpServiceCustomResourceOpenSearchProps = { name: 'search' };
const sensitiveDataPayload: StpServiceCustomResourceSensitiveDataProps[] = [
  { ssmParameterName: '/stp/project-dev/secret', value: 'value' }
];

const lambdaContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'stp-service-lambda',
  functionVersion: '1',
  invokedFunctionArn: SERVICE_TOKEN,
  memoryLimitInMB: '512',
  awsRequestId: 'request-1',
  logGroupName: '/aws/lambda/stp-service-lambda',
  logStreamName: '2026/07/29/[$LATEST]0123456789abcdef',
  getRemainingTimeInMillis: () => 300_000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined
};

// The envelope is untyped JSON on the wire, which is what `ResourceProperties` models; the payloads placed inside it
// are checked against their real resolver property types above.
const resourceProperties = (payload: Record<string, unknown>) => ({ ServiceToken: SERVICE_TOKEN, ...payload });

const sharedEventFields = {
  ServiceToken: SERVICE_TOKEN,
  ResponseURL: RESPONSE_URL,
  StackId: 'arn:aws:cloudformation:eu-west-1:123456789012:stack/project-dev/00000000',
  RequestId: 'request-1',
  LogicalResourceId: 'StpServiceCustomResource',
  ResourceType: 'Custom::StacktapeServiceCustomResource'
};

const deleteEvent = (payload: Record<string, unknown>): CloudFormationCustomResourceDeleteEvent => ({
  ...sharedEventFields,
  RequestType: 'Delete',
  PhysicalResourceId: 'stp-physical-id',
  ResourceProperties: resourceProperties(payload)
});

const updateEvent = (
  payload: Record<string, unknown>,
  previousPayload: Record<string, unknown>
): CloudFormationCustomResourceUpdateEvent => ({
  ...sharedEventFields,
  RequestType: 'Update',
  PhysicalResourceId: 'stp-physical-id',
  ResourceProperties: resourceProperties(payload),
  OldResourceProperties: resourceProperties(previousPayload)
});

const failOnAwsRequest = (clientName: string) => () => {
  throw new Error(`Unexpected AWS request through ${clientName} while dispatching a custom resource.`);
};

/**
 * Runs one handler invocation with everything it could reach stubbed for the duration of that call alone, and returns
 * the response body the handler sent to CloudFormation.
 */
const respondTo = async (event: CloudFormationCustomResourceEvent) => {
  const requests: { url: string; body: CloudFormationCustomResourceResponse }[] = [];
  // `fetch` may be an inherited global rather than an own property, so the exact descriptor is captured and put back.
  const originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  // `fetch` carries a `preconnect` static alongside the call signature; the real one is kept so the stub is a
  // complete stand-in rather than a narrowed one.
  const captureCloudformationResponse: typeof globalThis.fetch = Object.assign(
    async (input: Parameters<typeof globalThis.fetch>[0], init: Parameters<typeof globalThis.fetch>[1]) => {
      const body = init?.body;
      if (typeof body !== 'string') {
        throw new Error('Expected the CloudFormation response body to be a JSON string.');
      }
      requests.push({ url: input instanceof Request ? input.url : String(input), body: JSON.parse(body) });
      return new Response(null, { status: 200 });
    },
    { preconnect: globalThis.fetch.preconnect }
  );

  // `mockRestore` also clears the recorded calls, so each count is read before the spy is taken down. Every step
  // registers how to undo itself the moment it succeeds, and the stack unwinds in reverse — a failure part-way
  // through setup, or in the handler, still leaves no prototype spy or `fetch` override behind.
  const undoStack: (() => void)[] = [];
  const awsCallCounts: Record<string, number> = {};

  try {
    const cloudWatchSend = spyOn(CloudWatchLogsClient.prototype, 'send').mockImplementation(
      failOnAwsRequest('CloudWatchLogsClient')
    );
    undoStack.push(() => {
      awsCallCounts.CloudWatchLogsClient = cloudWatchSend.mock.calls.length;
      cloudWatchSend.mockRestore();
    });

    const ssmSend = spyOn(SSMClient.prototype, 'send').mockImplementation(failOnAwsRequest('SSMClient'));
    undoStack.push(() => {
      awsCallCounts.SSMClient = ssmSend.mock.calls.length;
      ssmSend.mockRestore();
    });

    Object.defineProperty(globalThis, 'fetch', {
      value: captureCloudformationResponse,
      configurable: true,
      writable: true
    });
    undoStack.push(() => {
      if (originalFetchDescriptor) {
        Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'fetch');
      }
    });

    await handler(event, lambdaContext, () => undefined);
  } finally {
    undoStack.reverse().forEach((undo) => undo());
  }

  expect(awsCallCounts).toEqual({ CloudWatchLogsClient: 0, SSMClient: 0 });
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe(RESPONSE_URL);
  return requests[0].body;
};

describe('custom-resource dispatcher', () => {
  test.serial('resolves a delete for the selected resolver', async () => {
    const response = await respondTo(deleteEvent({ openSearch: openSearchPayload }));

    expect(response.Status).toBe('SUCCESS');
    expect(response.Reason).toBe('Custom resource success');
    expect(response.LogicalResourceId).toBe('StpServiceCustomResource');
    // The resolver's own return value reaches CloudFormation, and its physical id falls back when it returns none.
    expect(response.Data).toEqual({ res: 'ok' });
    expect(response.PhysicalResourceId).toBe('stpservicecustomresource');
  });

  test.serial('resolves an update for the selected resolver', async () => {
    const response = await respondTo(updateEvent({ openSearch: openSearchPayload }, {}));

    expect(response.Status).toBe('SUCCESS');
    expect(response.Reason).toBe('Custom resource success');
  });

  test.serial('selects one resolver when the same key is in both the current and the previous properties', async () => {
    const response = await respondTo(
      updateEvent({ openSearch: openSearchPayload }, { openSearch: { name: 'search-before' } })
    );

    // Detecting it twice would make the resolver count two and fail the resource.
    expect(response.Status).toBe('SUCCESS');
    expect(response.Reason).toBe('Custom resource success');
  });

  test.serial('fails when the selected resolver appears only in the previous properties', async () => {
    const response = await respondTo(updateEvent({}, { openSearch: openSearchPayload }));

    expect(response.Status).toBe('FAILED');
    expect(response.Reason).toContain(
      'Missing current properties for Stacktape custom-resource resolver "openSearch".'
    );
  });

  test.serial('fails when the current properties name the resolver but carry no payload', async () => {
    const response = await respondTo(updateEvent({ openSearch: null }, { openSearch: openSearchPayload }));

    expect(response.Status).toBe('FAILED');
    expect(response.Reason).toContain(
      'Missing current properties for Stacktape custom-resource resolver "openSearch".'
    );
  });

  test.serial('fails when no resolver is named at all', async () => {
    const response = await respondTo(deleteEvent({}));

    expect(response.Status).toBe('FAILED');
    expect(response.Reason).toContain('Each stacktape custom resource can target only one resolver');
  });

  test.serial('fails when the current and previous properties name different resolvers', async () => {
    const response = await respondTo(
      updateEvent({ openSearch: openSearchPayload }, { sensitiveData: sensitiveDataPayload })
    );

    expect(response.Status).toBe('FAILED');
    expect(response.Reason).toContain('"openSearch"');
    expect(response.Reason).toContain('"sensitiveData"');
  });

  test.serial('updates a resolver that had no previous properties at all', async () => {
    // `sensitiveData` introduced by an update has nothing to clean up, and CloudFormation sends no previous payload
    // for it. Both lists are empty here, so the resolver reaches no AWS API while still running that branch.
    const emptySensitiveData: StpServiceCustomResourceSensitiveDataProps[] = [];
    const response = await respondTo(updateEvent({ sensitiveData: emptySensitiveData }, {}));

    expect(response.Status).toBe('SUCCESS');
    expect(response.Reason).toBe('Custom resource success');
  });

  test.serial('treats an empty payload as present rather than missing', async () => {
    // An empty list is a resource that currently holds no sensitive data — a valid state, not a broken resource, so
    // the guard has to be a nullish check rather than a truthy one. Deleting an empty list touches no AWS API.
    const emptySensitiveData: StpServiceCustomResourceSensitiveDataProps[] = [];
    const response = await respondTo(deleteEvent({ sensitiveData: emptySensitiveData }));

    expect(response.Status).toBe('SUCCESS');
    expect(response.Reason).toBe('Custom resource success');
  });
});
