import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
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
/** A trust policy that nobody changed for this long has propagated; AWS took up to about 3 minutes in tests. */
const TRUST_SETTLED_AFTER_MS = 5 * 60_000;
/** How long a denial may last, once the trust has settled, before it counts as the developer's own permissions. */
const SETTLED_TRUST_DENIAL_MS = 30_000;
/** Reasons AWS names when the caller's own policies deny a call; waiting for the trust policy does not help. */
const PERMISSIONS_DENIAL_REASON =
  /identity-based policy|permissions boundary|service control policy|resource control policy|session policy|explicit deny/i;

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

/**
 * What to do after AWS denied assuming a workload's role. STS gives the same message while a changed trust policy
 * propagates and when the caller's own IAM permissions lack `sts:AssumeRole`: a dev stack's roles trust the account
 * and name the developer in a condition, and with such a trust the developer's identity policy must allow the call too.
 * The latter never passes, so it is recognized by the reason in the message, by the policy simulator when the caller
 * may use it, or by a denial that lasts after the trust has settled.
 */
export const judgeAssumeRoleDenial = ({
  message,
  simulation,
  trustSettled,
  waitedMs
}: {
  message: string;
  /** The policy simulator's decision on the caller's own policies, when it ran. */
  simulation?: 'allowed' | 'explicitDeny' | 'implicitDeny';
  /** The role trusted the caller long before this call, so AWS has accepted that trust. */
  trustSettled: boolean;
  waitedMs: number;
}): { verdict: 'wait' | 'timeout' } | { verdict: 'permissions'; reason: string } => {
  if (PERMISSIONS_DENIAL_REASON.test(message))
    return { verdict: 'permissions', reason: 'AWS says your policies deny it' };
  if (simulation === 'implicitDeny' || simulation === 'explicitDeny') {
    return {
      verdict: 'permissions',
      reason:
        simulation === 'explicitDeny'
          ? 'the IAM policy simulator finds a statement in your policies that denies it'
          : 'the IAM policy simulator finds no statement in your policies that allows it'
    };
  }
  if (trustSettled && simulation !== 'allowed' && waitedMs >= SETTLED_TRUST_DENIAL_MS) {
    return {
      verdict: 'permissions',
      reason: `AWS still denies it ${Math.round(waitedMs / 1000)} s after the role's trust policy, unchanged for minutes, allowed you`
    };
  }
  return { verdict: waitedMs > TRUST_PROPAGATION_TIMEOUT_MS ? 'timeout' : 'wait' };
};

/** The IAM user or role whose policies decide the caller's permissions, or `undefined` for other principals. */
const getCallerPolicySourceArn = (identityArn: string) => {
  if (/^arn:[\w-]+:iam::\d+:user\//.test(identityArn)) return identityArn;
  // The session ARN has no role path; the simulator then fails, and the denial is judged without it.
  if (identityArn.includes(':assumed-role/')) return getRoleArnFromSessionArn(identityArn);
  return undefined;
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
  let trustSettled = false;
  if (devTrustStatement) {
    const trustChanged = await awsSdkManager.iam.addAssumeRolePolicyStatement({
      roleName: workloadRoleName,
      statement: devTrustStatement
    });
    // The dev stack's template holds the trust. CloudFormation last changed the role at this time.
    const roleUpdatedAt = stackManager.existingStackResources
      .find(
        ({ ResourceType, PhysicalResourceId }) =>
          ResourceType === 'AWS::IAM::Role' && PhysicalResourceId === workloadRoleName
      )
      ?.LastUpdatedTimestamp?.getTime();
    trustSettled = !trustChanged && roleUpdatedAt !== undefined && Date.now() - roleUpdatedAt > TRUST_SETTLED_AFTER_MS;
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
  let simulated = false;
  let simulation: 'allowed' | 'explicitDeny' | 'implicitDeny' | undefined;
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
      const principalArn = getCallerPolicySourceArn(globalStateManager.credentials.identity.arn);
      // Developers often may not use the simulator; then the denial is judged without it.
      if (!simulated && principalArn) {
        simulated = true;
        simulation = await awsSdkManager.iam
          .simulatePrincipalPolicy({ principalArn, action: 'sts:AssumeRole', resourceArn: roleArn })
          .catch(() => undefined);
      }
      const waitedMs = Date.now() - startedAt;
      const judgement = judgeAssumeRoleDenial({
        message: error instanceof Error ? error.message : String(error),
        simulation,
        trustSettled,
        waitedMs
      });
      if (judgement.verdict === 'permissions') {
        const statement = JSON.stringify({ Effect: 'Allow', Action: 'sts:AssumeRole', Resource: roleArn });
        throw new CliError({
          category: 'AWS',
          code: 'AWS_ASSUME_ROLE_NOT_PERMITTED',
          message: `Your AWS credentials may not assume the role of ${assumeRoleOfWorkload} (${workloadRoleName}), which its local container runs with: ${judgement.reason}. The role trusts you; your own IAM permissions must allow sts:AssumeRole on it too.`,
          hints: [
            `Add this statement to the IAM policy of ${principalArn ?? 'your AWS identity'}, or ask your AWS administrator to: ${statement}`,
            'Local containers of other workloads need the same permission on their roles.'
          ]
        });
      }
      if (judgement.verdict === 'timeout') {
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
