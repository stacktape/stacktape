import { basename, dirname, isAbsolute, join } from 'node:path';
import { DesiredStatus } from '@aws-sdk/client-ecs';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { getConvexSecretName } from '@domain-services/config-manager/utils/convex';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { buildSSMParameterNameForReferencableParam } from '@shared/naming/ssm-secret-parameters';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { runEcsExecCommand } from '@utils/ssm-session';
import execa from 'execa';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseConvexAdminKey = (output: string) => {
  const candidate = output
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/^Admin key:\s*/i, '').trim())
    .filter(Boolean)
    .filter((line) => !/^Admin key:?$/i.test(line))
    .reverse()
    .find((line) => line.length >= 40 && !/\s/.test(line));
  if (!candidate) {
    throw new ExpectedError(
      'DEPLOYMENT',
      'Unable to parse Convex admin key from the backend container.',
      'Check the convex-backend container logs and try deploying again.'
    );
  }
  return candidate;
};

const getConvexProjectDir = (appDirectory: string) => {
  const absoluteAppDirectory = isAbsolute(appDirectory)
    ? appDirectory
    : join(globalStateManager.workingDir, appDirectory);
  return basename(absoluteAppDirectory) === 'convex' ? dirname(absoluteAppDirectory) : absoluteAppDirectory;
};

const getConvexDeployWorkingDir = (convex: StpConvex) => {
  if (convex.functionsDeployment?.workingDirectory) {
    return isAbsolute(convex.functionsDeployment.workingDirectory)
      ? convex.functionsDeployment.workingDirectory
      : join(globalStateManager.workingDir, convex.functionsDeployment.workingDirectory);
  }
  return getConvexProjectDir(convex.appDirectory);
};

const getBackendEcsTarget = async (convex: StpConvex) => {
  const backendNameChain = [...convex.nameChain, 'backendContainerWorkload'];
  const backendResource = deployedStackOverviewManager.getStpResource({ nameChain: backendNameChain });
  const serviceEntry = Object.entries(backendResource?.cloudformationChildResources || {}).find(
    ([, { cloudformationResourceType }]: any) =>
      cloudformationResourceType === 'AWS::ECS::Service' ||
      cloudformationResourceType === 'Stacktape::ECSBlueGreenV1::Service'
  );
  if (!serviceEntry) {
    throw new ExpectedError(
      'DEPLOYMENT',
      `Unable to find the ECS service for Convex resource '${convex.name}'.`,
      'Wait for the stack to finish deploying and try again.'
    );
  }

  const ecsServiceCfLogicalName = serviceEntry[0];
  const ecsServiceResource: any = stackManager.existingStackResources.find(
    ({ LogicalResourceId }) => LogicalResourceId === ecsServiceCfLogicalName
  );
  const clusterArn = ecsServiceResource?.ecsService?.clusterArn;
  if (!clusterArn) {
    throw new ExpectedError(
      'DEPLOYMENT',
      `Unable to resolve the ECS cluster for Convex resource '${convex.name}'.`,
      'Wait for the stack to finish deploying and try again.'
    );
  }

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const tasks = await awsSdkManager.listEcsTasks({
      ecsClusterName: clusterArn,
      desiredStatus: DesiredStatus.RUNNING
    });
    const task = tasks.find((ecsTask) => ecsTask.containers?.some((container) => container.name === 'convex-backend'));
    if (task?.taskArn) {
      return { clusterArn, taskArn: task.taskArn };
    }
    await wait(10_000);
  }

  throw new ExpectedError(
    'DEPLOYMENT',
    `No running convex-backend task found for Convex resource '${convex.name}'.`,
    'Wait for ECS to start the Convex backend and try deploying again.'
  );
};

const writeSensitiveParam = async ({
  convex,
  paramName,
  value
}: {
  convex: StpConvex;
  paramName: 'adminKey' | 'instanceSecret';
  value: string;
}) => {
  await awsSdkManager.putSsmParameterValue({
    ssmParameterName: buildSSMParameterNameForReferencableParam({
      nameChain: convex.nameChain,
      paramName,
      stackName: globalStateManager.targetStack.stackName,
      region: globalStateManager.region
    }),
    value,
    encrypt: true
  });
};

const ensureConvexAdminKey = async (convex: StpConvex) => {
  const convexSecretName = getConvexSecretName({ nameChain: convex.nameChain });
  const { SecretString } = await awsSdkManager.getSecretValue({ secretId: convexSecretName });
  if (!SecretString) {
    throw new ExpectedError(
      'DEPLOYMENT',
      `Secret '${convexSecretName}' is empty.`,
      'Recreate the Convex secret or delete it and deploy again so Stacktape can regenerate it.'
    );
  }

  let secretValue: { instanceSecret?: string; dbPassword?: string; adminKey?: string };
  try {
    secretValue = JSON.parse(SecretString);
  } catch {
    throw new ExpectedError(
      'DEPLOYMENT',
      `Secret '${convexSecretName}' must be a JSON secret with instanceSecret and dbPassword keys.`,
      'Fix the secret value or delete it and deploy again so Stacktape can regenerate it.'
    );
  }

  if (!secretValue.instanceSecret) {
    throw new ExpectedError(
      'DEPLOYMENT',
      `Secret '${convexSecretName}' is missing instanceSecret.`,
      'Fix the secret value or delete it and deploy again so Stacktape can regenerate it.'
    );
  }

  if (!secretValue.adminKey) {
    const { clusterArn, taskArn } = await getBackendEcsTarget(convex);
    let result: Awaited<ReturnType<typeof runEcsExecCommand>> | undefined;
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      result = await runEcsExecCommand({
        clusterArn,
        taskArn,
        containerName: 'convex-backend',
        command: `/bin/sh -lc '/convex/generate_key "$INSTANCE_NAME" "$INSTANCE_SECRET"'`
      });
      if (result.exitCode === 0) {
        break;
      }
      await wait(10_000);
    }
    if (!result || result.exitCode !== 0) {
      throw new ExpectedError(
        'DEPLOYMENT',
        `Failed to generate a Convex admin key for '${convex.name}'.`,
        'Check that ECS Exec is enabled and the convex-backend task is healthy, then deploy again.'
      );
    }
    secretValue.adminKey = parseConvexAdminKey(result.output);
    await awsSdkManager.updateExistingSecret(convexSecretName, JSON.stringify(secretValue));
  }

  await Promise.all([
    writeSensitiveParam({ convex, paramName: 'adminKey', value: secretValue.adminKey }),
    writeSensitiveParam({ convex, paramName: 'instanceSecret', value: secretValue.instanceSecret })
  ]);

  return secretValue.adminKey;
};

const runConvexDeploy = async ({ convex, url, adminKey }: { convex: StpConvex; url: string; adminKey: string }) => {
  const cwd = getConvexDeployWorkingDir(convex);
  const env = {
    ...process.env,
    CONVEX_SELF_HOSTED_URL: url,
    CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey
  };
  const result = convex.functionsDeployment?.command
    ? await execa.command(convex.functionsDeployment.command, {
        cwd,
        env,
        reject: false,
        shell: true,
        timeout: 10 * 60 * 1000
      })
    : await execa('npx', ['convex', 'deploy', '--codegen', 'disable', '--typecheck', 'try'], {
        cwd,
        env,
        reject: false,
        timeout: 10 * 60 * 1000
      });
  if (result.exitCode !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new ExpectedError(
      'DEPLOYMENT',
      `Convex function deploy failed for '${convex.name}'.`,
      output ||
        'Set convex.functionsDeployment.command to customize the deploy command, or set enabled: false to deploy functions separately.'
    );
  }
};

const prepareConvexDeployment = async ({ convex, url }: { convex: StpConvex; url: string }) => {
  const adminKey = await ensureConvexAdminKey(convex);
  if (convex.functionsDeployment?.enabled === false) {
    tuiManager.info(
      `Skipping Convex function deploy for ${tuiManager.prettyResourceName(
        convex.name
      )} because functionsDeployment.enabled is false.`
    );
    return;
  }
  await runConvexDeploy({ convex, url, adminKey });
};

export const deployConvexFunctions = async () => {
  const convexes = configManager.convexes;
  if (!convexes.length) {
    return;
  }

  const spinner = tuiManager.createSpinner({ text: 'Preparing Convex deployment' });
  try {
    for (const convex of convexes) {
      const url = deployedStackOverviewManager.getStpResourceReferenceableParameter({
        nameChain: convex.nameChain,
        referencableParamName: 'url'
      });
      if (!url || typeof url !== 'string') {
        throw new ExpectedError(
          'DEPLOYMENT',
          `Unable to resolve Convex URL for '${convex.name}'.`,
          'Check the deployed stack info and try again.'
        );
      }
      await prepareConvexDeployment({ convex, url });
    }
    spinner.success({ text: 'Convex deployment prepared' });
  } catch (error) {
    spinner.error('Convex deployment preparation failed');
    throw error;
  }
};
