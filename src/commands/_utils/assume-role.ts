import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { arns } from '@shared/naming/arns';
import { getRoleArnFromSessionArn } from '@shared/naming/utils';
import { awsSdkManager } from '@utils/aws-sdk-manager';

export const SESSION_DURATION_SECONDS = 3600;

export const addCallerToAssumeRolePolicy = async ({ roleName }: { roleName: string }) => {
  const callerIdentityArn = globalStateManager.credentials.identity.arn.includes(':assumed-role')
    ? getRoleArnFromSessionArn(globalStateManager.credentials.identity.arn)
    : globalStateManager.credentials.identity.arn;

  return awsSdkManager.addUserToRolePrincipals({
    userArn: callerIdentityArn,
    roleName
  });
};

export const getLocalInvokeAwsCredentials = async ({ assumeRoleOfWorkload }: { assumeRoleOfWorkload: string }) => {
  await eventManager.startEvent({
    eventType: 'ASSUME_ROLE',
    description: `Assuming role of ${assumeRoleOfWorkload}`
  });
  const workloadRoleName = deployedStackOverviewManager.getIamRoleNameOfDeployedResource(assumeRoleOfWorkload);

  await addCallerToAssumeRolePolicy({ roleName: workloadRoleName });

  const credentials = await awsSdkManager.getAssumedRoleCredentials({
    durationSeconds: SESSION_DURATION_SECONDS,
    roleArn: arns.iamRole({
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      roleAwsName: workloadRoleName
    }),
    roleSessionName: `local-assume-by-${globalStateManager.userData.id}`,
    retry: { count: 6, delaySeconds: 5 }
  });
  await eventManager.finishEvent({ eventType: 'ASSUME_ROLE' });

  return {
    AWS_ACCESS_KEY_ID: credentials.accessKeyId,
    AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
    AWS_SESSION_TOKEN: credentials.sessionToken
  };
};
