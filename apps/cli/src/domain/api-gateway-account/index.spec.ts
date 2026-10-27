import { describe, expect, test } from 'bun:test';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { templateNeedsApiGatewayCloudWatchRole } from './index';

const templateWith = (resources: Record<string, { Type: string; Properties?: Record<string, unknown> }>) =>
  ({ Resources: resources }) as unknown as CloudFormationTemplate;

const api = (ProtocolType: 'WEBSOCKET' | 'HTTP') => ({ Type: 'AWS::ApiGatewayV2::Api', Properties: { ProtocolType } });
const v2Stage = (properties: Record<string, unknown>) => ({
  Type: 'AWS::ApiGatewayV2::Stage',
  Properties: { ApiId: { Ref: 'Api' }, StageName: 'default', ...properties }
});
const accessLogs = { AccessLogSettings: { DestinationArn: 'arn', Format: '{}' } };

describe('templateNeedsApiGatewayCloudWatchRole', () => {
  test.each([
    ['WebSocket stage with access logs', { Api: api('WEBSOCKET'), Stage: v2Stage(accessLogs) }, true],
    ['WebSocket stage without logs', { Api: api('WEBSOCKET'), Stage: v2Stage({}) }, false],
    [
      'WebSocket stage with execution logs',
      { Api: api('WEBSOCKET'), Stage: v2Stage({ DefaultRouteSettings: { LoggingLevel: 'ERROR' } }) },
      true
    ],
    [
      'WebSocket stage with logging level OFF',
      { Api: api('WEBSOCKET'), Stage: v2Stage({ DefaultRouteSettings: { LoggingLevel: 'OFF' } }) },
      false
    ],
    ['HTTP API stage with access logs', { Api: api('HTTP'), Stage: v2Stage(accessLogs) }, false],
    [
      'REST stage with access logs',
      { Stage: { Type: 'AWS::ApiGateway::Stage', Properties: { AccessLogSetting: { DestinationArn: 'arn' } } } },
      true
    ],
    [
      'REST stage with method logging',
      { Stage: { Type: 'AWS::ApiGateway::Stage', Properties: { MethodSettings: [{ LoggingLevel: 'INFO' }] } } },
      true
    ],
    ['REST stage without logs', { Stage: { Type: 'AWS::ApiGateway::Stage', Properties: {} } }, false],
    ['no API stages', { Bucket: { Type: 'AWS::S3::Bucket' } }, false]
  ] as const)('%s: %p', (_, resources, expected) => {
    expect(templateNeedsApiGatewayCloudWatchRole(templateWith(resources))).toBe(expected);
  });
});
