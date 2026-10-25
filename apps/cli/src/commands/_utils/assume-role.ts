import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { arns, getRoleArnFromSessionArn } from '@stacktape/naming/arns';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { getDeveloperTrustStatement } from 'src/aws/iam';

export const SESSION_DURATION_SECONDS = 3600;
export const DEV_SESSION_DURATION_SECONDS = 3600; // 1 hour (matches default IAM role MaxSessionDuration)

/**
 * How long AWS may take to accept a role's changed trust policy. A dev stack's template trusts the developer already, so
 * this wait happens only when the trust is added here.
 */
const TRUST_PROPAGATION_TIMEOUT_MS = 300_000;
const ASSUME_ROLE_RETRY_DELAY_MS = 5000;

const addCallerToAssumeRolePolicy = async ({ roleName }: { roleName: string }) => {
  const callerIdentityArn = globalStateManager.credentials.identity.arn.includes(':assumed-role')
    ? getRoleArnFromSessionArn(globalStateManager.credentials.identity.arn)
    : globalStateManager.credentials.identity.arn;

  return awsSdkManager.iam.addUserToRolePrincipals({
    userArn: callerIdentityArn,
    roleName
  });
};

const isAssumeRoleAccessDenied = (error: unknown, roleArn: string) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('AccessDenied') && message.includes('sts:AssumeRole') && message.includes(roleArn);
};

export const getLocalInvokeAwsCredentials = async ({
  assumeRoleOfWorkload,
  isDevStack = false,
  onWaitingForTrust
}: {
  assumeRoleOfWorkload: string;
  isDevStack?: boolean;
  /** Called once when AWS does not accept the role's trust in the developer yet and the call waits for it. */
  onWaitingForTrust?: () => void;
}) => {
  await operationReporter.startEvent({
    eventType: 'ASSUME_ROLE',
    description: `Assuming role of ${assumeRoleOfWorkload}`
  });
  const workloadRoleName = deployedStackOverviewManager.getIamRoleNameOfDeployedResource(assumeRoleOfWorkload);

  // A dev stack's container roles trust the developer in their template; adding the same statement changes nothing.
  // Other stacks name the caller as principal.
  const devTrustStatement = isDevStack
    ? getDeveloperTrustStatement(globalStateManager.credentials.identity.arn)
    : undefined;
  if (devTrustStatement) {
    await awsSdkManager.iam.addAssumeRolePolicyStatement({ roleName: workloadRoleName, statement: devTrustStatement });
  } else {
    await addCallerToAssumeRolePolicy({ roleName: workloadRoleName });
  }

  const durationSeconds = isDevStack ? DEV_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
  const roleArn = arns.iamRole({
    accountId: globalStateManager.targetAwsAccount.awsAccountId,
    roleAwsName: workloadRoleName
  });

  // AWS accepts a new trust after a while. A short, fixed retry interval uses the role as soon as it does.
  const startedAt = Date.now();
  let reportedWaiting = false;
  let credentials: Awaited<ReturnType<typeof awsSdkManager.sts.assumeRoleCredentials>> | undefined;
  while (!credentials) {
    try {
      credentials = await awsSdkManager.sts.assumeRoleCredentials({
        durationSeconds,
        roleArn,
        roleSessionName: `local-assume-by-${globalStateManager.userData.id}`
      });
    } catch (error) {
      if (!isAssumeRoleAccessDenied(error, roleArn)) throw error;
      const waitedMs = Date.now() - startedAt;
      if (waitedMs > TRUST_PROPAGATION_TIMEOUT_MS) {
        throw new CliError({
          category: 'AWS',
          code: 'AWS_ASSUME_ROLE_TRUST_TIMEOUT',
          message: `AWS did not let you assume the role of ${assumeRoleOfWorkload} (${workloadRoleName}) within ${
            TRUST_PROPAGATION_TIMEOUT_MS / 1000
          } s.`,
          hints: [
            'Run the command again; AWS usually accepts a changed trust policy within a few minutes.',
            'Check that your credentials allow sts:AssumeRole on this role and that no permissions boundary or SCP denies it.'
          ]
        });
      }
      if (!reportedWaiting) {
        reportedWaiting = true;
        onWaitingForTrust?.();
      }
      await new Promise((resolve) => setTimeout(resolve, ASSUME_ROLE_RETRY_DELAY_MS));
    }
  }
  await operationReporter.finishEvent({ eventType: 'ASSUME_ROLE' });

  return {
    AWS_ACCESS_KEY_ID: credentials.accessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
    AWS_SESSION_TOKEN: credentials.sessionToken
  };
};
