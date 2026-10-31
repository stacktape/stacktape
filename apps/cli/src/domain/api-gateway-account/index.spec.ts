import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import {
  API_GATEWAY_CLOUDWATCH_ROLE_NAME,
  ensureApiGatewayCloudWatchRole,
  templateNeedsApiGatewayCloudWatchRole
} from './index';

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
    [
      'REST deployment stage with method logging',
      {
        Deployment: {
          Type: 'AWS::ApiGateway::Deployment',
          Properties: { StageName: 'prod', StageDescription: { MethodSettings: [{ LoggingLevel: 'INFO' }] } }
        }
      },
      true
    ],
    [
      'REST deployment stage with logging level',
      {
        Deployment: {
          Type: 'AWS::ApiGateway::Deployment',
          Properties: { StageName: 'prod', StageDescription: { LoggingLevel: 'ERROR' } }
        }
      },
      true
    ],
    [
      'REST deployment stage with access logs',
      {
        Deployment: {
          Type: 'AWS::ApiGateway::Deployment',
          Properties: { StageName: 'prod', StageDescription: { AccessLogSetting: { DestinationArn: 'arn' } } }
        }
      },
      true
    ],
    [
      'REST deployment stage with data trace',
      {
        Deployment: {
          Type: 'AWS::ApiGateway::Deployment',
          Properties: { StageName: 'prod', StageDescription: { DataTraceEnabled: true } }
        }
      },
      true
    ],
    [
      'REST deployment stage without logs',
      {
        Deployment: {
          Type: 'AWS::ApiGateway::Deployment',
          Properties: { StageName: 'prod', StageDescription: { MethodSettings: [{ LoggingLevel: 'OFF' }] } }
        }
      },
      false
    ],
    [
      'REST deployment without a stage',
      { Deployment: { Type: 'AWS::ApiGateway::Deployment', Properties: { RestApiId: { Ref: 'Api' } } } },
      false
    ],
    [
      'SAM REST API with method logging',
      {
        Api: {
          Type: 'AWS::Serverless::Api',
          Properties: {
            StageName: 'prod',
            MethodSettings: [{ HttpMethod: '*', ResourcePath: '/*', LoggingLevel: 'INFO' }]
          }
        }
      },
      true
    ],
    [
      'SAM REST API with access logs',
      {
        Api: {
          Type: 'AWS::Serverless::Api',
          Properties: { StageName: 'prod', AccessLogSetting: { DestinationArn: 'arn', Format: '$context.requestId' } }
        }
      },
      true
    ],
    ['SAM REST API without logs', { Api: { Type: 'AWS::Serverless::Api', Properties: { StageName: 'prod' } } }, false],
    [
      'SAM HTTP API with access logs',
      {
        Api: {
          Type: 'AWS::Serverless::HttpApi',
          Properties: { AccessLogSettings: { DestinationArn: 'arn', Format: '$context.requestId' } }
        }
      },
      false
    ],
    ['no API stages', { Bucket: { Type: 'AWS::S3::Bucket' } }, false]
  ] as const)('%s: %p', (_, resources, expected) => {
    expect(templateNeedsApiGatewayCloudWatchRole(templateWith(resources))).toBe(expected);
  });
});

describe('ensureApiGatewayCloudWatchRole', () => {
  const websocketTemplate = templateWith({ Api: api('WEBSOCKET'), Stage: v2Stage(accessLogs) });
  const registeredRole = 'arn:aws:iam::123456789012:role/team/api-gateway-logs';
  let warnings: string[];

  beforeEach(() => {
    awsSdkManager.init({ credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, region: 'eu-north-1' });
    warnings = [];
    spyOn(tuiManager, 'warn').mockImplementation((message: string) => void warnings.push(message));
    spyOn(tuiManager, 'info').mockImplementation(() => {});
    // An own property shadows the class getter, which bun's spyOn cannot replace.
    Object.defineProperty(globalStateManager, 'targetAwsAccount', {
      configurable: true,
      value: { awsAccountId: '123456789012' }
    });
  });
  afterEach(() => {
    mock.restore();
    delete (globalStateManager as { targetAwsAccount?: unknown }).targetAwsAccount;
  });

  const denied = () =>
    Object.assign(new Error('User is not authorized to perform: apigateway:GET'), { name: 'AccessDeniedException' });

  test('warns and continues when the account settings cannot be read', async () => {
    spyOn(awsSdkManager.apiGatewayAccount, 'getCloudWatchRoleArn').mockRejectedValue(denied());
    const createRole = spyOn(awsSdkManager.iam, 'createRole');

    await ensureApiGatewayCloudWatchRole(websocketTemplate);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('could not read the API Gateway settings of eu-north-1');
    expect(createRole).not.toHaveBeenCalled();
  });

  test('keeps a registered role that exists', async () => {
    spyOn(awsSdkManager.apiGatewayAccount, 'getCloudWatchRoleArn').mockResolvedValue(registeredRole);
    const getRole = spyOn(awsSdkManager.iam, 'getRole').mockResolvedValue({ Arn: registeredRole } as never);
    const setRole = spyOn(awsSdkManager.apiGatewayAccount, 'setCloudWatchRoleArn');

    await ensureApiGatewayCloudWatchRole(websocketTemplate);
    expect(getRole).toHaveBeenCalledWith({ roleName: 'api-gateway-logs' });
    expect(setRole).not.toHaveBeenCalled();
  });

  test('stops before the deployment when the registered role no longer exists, without replacing it', async () => {
    spyOn(awsSdkManager.apiGatewayAccount, 'getCloudWatchRoleArn').mockResolvedValue(registeredRole);
    spyOn(awsSdkManager.iam, 'getRole').mockResolvedValue(undefined);
    const setRole = spyOn(awsSdkManager.apiGatewayAccount, 'setCloudWatchRoleArn');

    const error = await ensureApiGatewayCloudWatchRole(websocketTemplate).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe('API_GATEWAY_CLOUDWATCH_ROLE_MISSING');
    expect(setRole).not.toHaveBeenCalled();
  });

  test.each([
    ['iam:GetRole is denied', 'arn:aws:iam::123456789012:role/api-gateway-logs'],
    ['the role belongs to another account', 'arn:aws:iam::999999999999:role/api-gateway-logs']
  ])('continues when %s', async (_, roleArn) => {
    spyOn(awsSdkManager.apiGatewayAccount, 'getCloudWatchRoleArn').mockResolvedValue(roleArn);
    const getRole = spyOn(awsSdkManager.iam, 'getRole').mockRejectedValue(denied());

    await ensureApiGatewayCloudWatchRole(websocketTemplate);
    expect(getRole).toHaveBeenCalledTimes(roleArn.includes('999999999999') ? 0 : 1);
  });

  test('creates and registers the Stacktape role when none is set', async () => {
    const roleArn = `arn:aws:iam::123456789012:role/${API_GATEWAY_CLOUDWATCH_ROLE_NAME}`;
    spyOn(awsSdkManager.apiGatewayAccount, 'getCloudWatchRoleArn').mockResolvedValue(undefined);
    spyOn(awsSdkManager.iam, 'getRole').mockResolvedValue(undefined);
    spyOn(awsSdkManager.iam, 'createRole').mockResolvedValue({
      Arn: roleArn,
      RoleName: API_GATEWAY_CLOUDWATCH_ROLE_NAME
    } as never);
    const attach = spyOn(awsSdkManager.iam, 'attachManagedPolicyToRole').mockResolvedValue();
    const setRole = spyOn(awsSdkManager.apiGatewayAccount, 'setCloudWatchRoleArn').mockResolvedValue({} as never);

    await ensureApiGatewayCloudWatchRole(websocketTemplate);
    expect(attach).toHaveBeenCalledWith({
      roleName: API_GATEWAY_CLOUDWATCH_ROLE_NAME,
      policyArn: 'arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs'
    });
    expect(setRole).toHaveBeenCalledWith(roleArn);
  });
});
