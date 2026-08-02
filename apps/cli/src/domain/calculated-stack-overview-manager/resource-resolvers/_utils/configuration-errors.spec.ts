import { describe, expect, test } from 'bun:test';
import { CliError } from '@utils/errors';
import { getHttpApiRouteKey } from './http-api-events';
import { getScheduleEventRule } from '../functions/events/schedule';
import { getHttpApiContainerWorkloadIntegration } from '../multi-container-workloads/events/http-api-gateway';

const expectCliError = (operation: () => unknown, code: string) => {
  try {
    operation();
    expect.unreachable(`Expected ${code}`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CliError);
    if (!(error instanceof CliError)) throw error;
    expect(error.code).toBe(code);
    expect(error.message).not.toContain('\u001B');
  }
};

describe('configuration errors used during resource synthesis', () => {
  test('identifies an invalid method on the HTTP API default route', () => {
    expectCliError(
      () =>
        getHttpApiRouteKey({
          workloadName: 'api',
          method: 'GET',
          path: '*'
        }),
      'CONFIG_HTTP_API_DEFAULT_ROUTE_METHOD_INVALID'
    );
  });

  test('identifies unsupported container HTTP API payload formats', () => {
    expectCliError(
      () =>
        getHttpApiContainerWorkloadIntegration({
          workloadName: 'api',
          workloadType: 'web-service',
          stpHttpApiGatewayName: 'gateway',
          targetedPort: 3000,
          payloadFormat: '2.0'
        }),
      'CONFIG_HTTP_API_CONTAINER_PAYLOAD_FORMAT_UNSUPPORTED'
    );
  });

  test('gives schedule syntax failures a stable code', () => {
    expectCliError(
      () =>
        getScheduleEventRule({
          workloadName: 'worker',
          lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:111111111111:function:worker',
          eventIndex: 0,
          eventDetails: { scheduleRate: 'every minute' }
        }),
      'CONFIG_SCHEDULE_RATE_INVALID'
    );
  });

  test('distinguishes conflicting and malformed schedule input', () => {
    expectCliError(
      () =>
        getScheduleEventRule({
          workloadName: 'worker',
          lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:111111111111:function:worker',
          eventIndex: 0,
          eventDetails: { scheduleRate: 'rate(1 minute)', input: '{}', inputPath: '$' }
        }),
      'CONFIG_SCHEDULE_INPUT_CONFLICT'
    );
    expectCliError(
      () =>
        getScheduleEventRule({
          workloadName: 'worker',
          lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:111111111111:function:worker',
          eventIndex: 0,
          eventDetails: { scheduleRate: 'rate(1 minute)', input: '{' }
        }),
      'CONFIG_SCHEDULE_INPUT_INVALID'
    );
  });
});
