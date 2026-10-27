import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { wait } from '@utils/misc';

// One role per account: IAM is global, and every region's API Gateway account settings can point at it.
export const API_GATEWAY_CLOUDWATCH_ROLE_NAME = 'stacktape-api-gateway-cloudwatch-logs';
const MANAGED_POLICY_PATH = 'policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs';
const REGISTRATION_TIMEOUT_MS = 150_000;
/** API Gateway accepts about one `UpdateAccount` request per 20 seconds and answers faster ones with 429. */
const REGISTRATION_RETRY_MS = 20_000;
const RETRYABLE_REGISTRATION_ERRORS = new Set(['BadRequestException', 'TooManyRequestsException']);

type TemplateResource = { Type: string; Properties?: Record<string, any> };

const isLoggingOn = (settings: { LoggingLevel?: string; DataTraceEnabled?: boolean } | undefined) =>
  !!settings && ((!!settings.LoggingLevel && settings.LoggingLevel !== 'OFF') || !!settings.DataTraceEnabled);

/**
 * Whether a stage in the template writes access or execution logs that API Gateway delivers with the account's
 * CloudWatch role: WebSocket stages (`AWS::ApiGatewayV2::Stage` of a `WEBSOCKET` API) and REST stages. HTTP API stages
 * deliver access logs without that role.
 */
export const templateNeedsApiGatewayCloudWatchRole = (template: CloudFormationTemplate) => {
  const resources = (template.Resources ?? {}) as Record<string, TemplateResource>;
  return Object.values(resources).some(({ Type, Properties = {} }) => {
    if (Type === 'AWS::ApiGateway::Stage') {
      return !!Properties.AccessLogSetting || (Properties.MethodSettings ?? []).some(isLoggingOn);
    }
    if (Type !== 'AWS::ApiGatewayV2::Stage') return false;
    const logs =
      !!Properties.AccessLogSettings ||
      isLoggingOn(Properties.DefaultRouteSettings) ||
      Object.values(Properties.RouteSettings ?? {}).some(isLoggingOn);
    const apiLogicalName = Properties.ApiId?.Ref;
    return logs && resources[apiLogicalName]?.Properties?.ProtocolType === 'WEBSOCKET';
  });
};

const getOrCreateRole = async () => {
  const roleName = API_GATEWAY_CLOUDWATCH_ROLE_NAME;
  const existing = await awsSdkManager.iam.getRole({ roleName });
  if (existing) return existing;
  try {
    return await awsSdkManager.iam.createRole({
      roleName,
      description: 'Created by Stacktape. Lets API Gateway write REST and WebSocket API logs to CloudWatch Logs.',
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { Service: 'apigateway.amazonaws.com' }, Action: 'sts:AssumeRole' }]
      }
    });
  } catch (error) {
    // A deployment to another region may have created it in the meantime.
    const created = await awsSdkManager.iam.getRole({ roleName });
    if (created) return created;
    throw error;
  }
};

const registerRole = async (roleArn: string) => {
  const deadline = Date.now() + REGISTRATION_TIMEOUT_MS;
  while (true) {
    try {
      await awsSdkManager.apiGatewayAccount.setCloudWatchRoleArn(roleArn);
      return;
    } catch (error) {
      // A new role or policy attachment takes a few seconds before API Gateway can assume it.
      if (!RETRYABLE_REGISTRATION_ERRORS.has((error as Error).name) || Date.now() > deadline) throw error;
      await wait(REGISTRATION_RETRY_MS);
    }
  }
};

const REQUIRED_ACTIONS = `apigateway:GET and apigateway:PATCH on /account, and iam:GetRole, iam:CreateRole, iam:AttachRolePolicy and iam:PassRole on role ${API_GATEWAY_CLOUDWATCH_ROLE_NAME}`;
const ALTERNATIVES =
  'Alternatively, set a role in the API Gateway console (Settings) of this region, or set `logging.disabled: true` on the WebSocket API.';

/** Fails when the registered role is in this account and no longer exists; API Gateway would reject the logs then. */
const checkRegisteredRoleExists = async (roleArn: string) => {
  const [, , , , accountId, resource = ''] = roleArn.split(':');
  if (!resource.startsWith('role/')) return;
  let role: Awaited<ReturnType<typeof awsSdkManager.iam.getRole>>;
  try {
    // A role of another account cannot be looked up here.
    if (accountId !== globalStateManager.targetAwsAccount.awsAccountId) return;
    role = await awsSdkManager.iam.getRole({ roleName: resource.split('/').at(-1)! });
  } catch {
    // Without iam:GetRole the deployment decides.
    return;
  }
  if (role) return;
  throw new CliError({
    category: 'AWS',
    code: 'API_GATEWAY_CLOUDWATCH_ROLE_MISSING',
    message: `The API Gateway settings of ${awsSdkManager.region} name the CloudWatch Logs role ${roleArn}, which no longer exists. API access logs cannot be written, so the deployment would fail.`,
    hints: [
      `Create the role again, with the AWS managed policy AmazonAPIGatewayPushToCloudWatchLogs and a trust policy for apigateway.amazonaws.com, or set another role in the API Gateway console (Settings). Stacktape does not replace a role that someone set.`,
      'Alternatively, set `logging.disabled: true` on the WebSocket API.'
    ]
  });
};

/**
 * WebSocket and REST API stages with logs fail to deploy until the region's API Gateway account settings name a
 * CloudWatch role, which new accounts do not have. Registers a Stacktape-owned role when none is set; never replaces a
 * role that is already set.
 */
export const ensureApiGatewayCloudWatchRole = async (template: CloudFormationTemplate) => {
  if (!templateNeedsApiGatewayCloudWatchRole(template)) return;

  const { region } = awsSdkManager;
  let registeredRoleArn: string | undefined;
  try {
    registeredRoleArn = await awsSdkManager.apiGatewayAccount.getCloudWatchRoleArn();
  } catch (error) {
    // A principal without apigateway:GET on /account may still deploy where a role is set.
    tuiManager.warn(
      `Stacktape could not read the API Gateway settings of ${region} (${(error as Error).message}), so it cannot check the CloudWatch Logs role that API access logs need. If none is set, the deployment fails on the API stage.`
    );
    return;
  }
  if (registeredRoleArn) {
    await checkRegisteredRoleExists(registeredRoleArn);
    return;
  }

  try {
    const role = await getOrCreateRole();
    const partition = role.Arn.split(':')[1];
    await awsSdkManager.iam.attachManagedPolicyToRole({
      roleName: role.RoleName,
      policyArn: `arn:${partition}:iam::aws:${MANAGED_POLICY_PATH}`
    });
    await registerRole(role.Arn);
    tuiManager.info(
      `API Gateway in ${region} had no CloudWatch Logs role, so Stacktape set it to IAM role ${role.RoleName}. API access logs need it.`
    );
  } catch (error) {
    throw new CliError({
      category: 'AWS',
      code: 'API_GATEWAY_CLOUDWATCH_ROLE_SETUP_FAILED',
      message: `API access logs need a CloudWatch Logs role in the API Gateway settings of ${region}, and Stacktape could not set one up: ${(error as Error).message}`,
      hints: [`Stacktape needs ${REQUIRED_ACTIONS}.`, ALTERNATIVES],
      cause: error
    });
  }
};
