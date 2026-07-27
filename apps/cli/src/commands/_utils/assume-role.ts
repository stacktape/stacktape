import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { arns } from '@shared/naming/arns';
import { getRoleArnFromSessionArn } from '@shared/naming/utils';
import { awsSdkManager } from '@utils/aws-sdk-manager';

export const SESSION_DURATION_SECONDS = 3600;
export const DEV_SESSION_DURATION_SECONDS = 3600; // 1 hour (matches default IAM role MaxSessionDuration)

export const addCallerToAssumeRolePolicy = async ({ roleName }: { roleName: string }) => {
  const callerIdentityArn = globalStateManager.credentials.identity.arn.includes(':assumed-role')
    ? getRoleArnFromSessionArn(globalStateManager.credentials.identity.arn)
    : globalStateManager.credentials.identity.arn;

  return awsSdkManager.addUserToRolePrincipals({
    userArn: callerIdentityArn,
    roleName
  });
};

export const getLocalInvokeAwsCredentials = async ({
  assumeRoleOfWorkload,
  isDevStack = false
}: {
  assumeRoleOfWorkload: string;
  isDevStack?: boolean;
}) => {
  await eventManager.startEvent({
    eventType: 'ASSUME_ROLE',
    description: `Assuming role of ${assumeRoleOfWorkload}`
  });
  const workloadRoleName = deployedStackOverviewManager.getIamRoleNameOfDeployedResource(assumeRoleOfWorkload);

  await addCallerToAssumeRolePolicy({ roleName: workloadRoleName });

  // Wait for IAM trust policy propagation (eventual consistency)
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const durationSeconds = isDevStack ? DEV_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
  const roleArn = arns.iamRole({
    accountId: globalStateManager.targetAwsAccount.awsAccountId,
    roleAwsName: workloadRoleName
  });

  const getCredentials = () =>
    awsSdkManager.getAssumedRoleCredentials({
      durationSeconds,
      roleArn,
      roleSessionName: `local-assume-by-${globalStateManager.userData.id}`,
      retry: { count: 10, delaySeconds: 5 }
    });

  let credentials: Awaited<ReturnType<typeof awsSdkManager.getAssumedRoleCredentials>>;
  try {
    credentials = await getCredentials();
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    const isAssumeRoleAccessDenied =
      errMessage.includes('AccessDenied') && errMessage.includes('sts:AssumeRole') && errMessage.includes(roleArn);

    if (!isAssumeRoleAccessDenied) {
      throw err;
    }

    // Re-apply trust policy and wait longer. IAM propagation can lag.
    await addCallerToAssumeRolePolicy({ roleName: workloadRoleName });
    await new Promise((resolve) => setTimeout(resolve, 8000));
    credentials = await getCredentials();
  }
  await eventManager.finishEvent({ eventType: 'ASSUME_ROLE' });

  return {
    AWS_ACCESS_KEY_ID: credentials.accessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
    AWS_SESSION_TOKEN: credentials.sessionToken
  };
};
