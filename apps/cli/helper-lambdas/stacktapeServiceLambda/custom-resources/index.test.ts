import type {
  StpServiceCustomResourceOpenSearchProps,
  StpServiceCustomResourceSensitiveDataProps
} from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type {
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent,
  Context
} from 'aws-lambda';
import { describe, expect, test } from 'bun:test';
import handler from './index';

/** Resolver wire-envelope validation through the real handler and an HTTP CloudFormation callback.
 * These empty Update/Delete resolvers need no AWS request. The normal preload refuses nonlocal requests.
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

const respondTo = async (event: CloudFormationCustomResourceEvent) => {
  let response: CloudFormationCustomResourceResponse | undefined;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: async (request) => {
      response = (await request.json()) as CloudFormationCustomResourceResponse;
      return new Response(null, { status: 200 });
    }
  });
  try {
    await handler(
      { ...event, ResponseURL: `http://127.0.0.1:${server.port}/response` },
      lambdaContext,
      () => undefined
    );
    expect(response).toBeDefined();
    return response!;
  } finally {
    await server.stop(true);
  }
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
});
