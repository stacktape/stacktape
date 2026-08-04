import type { TuiManager as Printer } from '@application-services/tui-manager';
import type { GitInformation } from '@utils/git-info-manager/types';
import type { StacktapeArgs, StacktapeCommand } from 'src/config/cli/types';
import type { BatchGetBuildsCommandInput, CodeBuildClient } from '@aws-sdk/client-codebuild';
import {
  ArtifactsType,
  BatchGetBuildsCommand,
  BatchGetProjectsCommand,
  BuildPhaseType,
  ComputeType,
  CreateProjectCommand,
  EnvironmentType,
  EnvironmentVariableType,
  SourceType,
  StartBuildCommand,
  StatusType
} from '@aws-sdk/client-codebuild';
import { createWaiter, WaiterState } from '@aws-sdk/util-waiter';
import { getForwardableOperationInvocationEnv } from '@application-services/operation-invocation-context';
import { consoleLinks } from '@stacktape/naming/console-links';
import { transformToCliArgs } from '@utils/cli';
import { CliError } from '@utils/errors';
import { kebabCase } from 'change-case';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

const getOperationInvocationEnvironmentVariables = () =>
  Object.entries(getForwardableOperationInvocationEnv()).map(([name, value]) => ({
    name,
    value,
    type: EnvironmentVariableType.PLAINTEXT
  }));

export class AwsCodeBuild {
  readonly #createClient: () => CodeBuildClient;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #printer?: Pick<Printer, 'debug'>;
  readonly #region: string;

  constructor({
    createClient,
    getErrorHandler,
    printer,
    region
  }: {
    createClient: () => CodeBuildClient;
    getErrorHandler: ErrorHandlerFactory;
    printer?: Pick<Printer, 'debug'>;
    region: string;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
    this.#printer = printer;
    this.#region = region;
  }

  getProject = async ({ projectName }: { projectName: string }) => {
    const errorHandler = this.#getErrorHandler(`Cannot retrieve information about codebuild project ${projectName}`);
    const result = await this.#createClient()
      .send(new BatchGetProjectsCommand({ names: [projectName] }))
      .catch(errorHandler);

    if ((result.projectsNotFound || []).includes(projectName)) {
      this.#printer?.debug(`Codebuild project with name ${projectName} could not be found.`);
    }
    return result.projects?.[0];
  };

  createProject = async ({
    projectName,
    serviceRoleArn,
    logGroupName
  }: {
    projectName: string;
    serviceRoleArn: string;
    logGroupName: string;
  }) => {
    const errorHandler = this.#getErrorHandler('Unable to create codebuild project.');
    const result = await this.#createClient()
      .send(
        new CreateProjectCommand({
          artifacts: { type: ArtifactsType.NO_ARTIFACTS },
          name: projectName,
          environment: {
            computeType: ComputeType.BUILD_GENERAL1_MEDIUM,
            type: EnvironmentType.LINUX_CONTAINER,
            image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0'
          },
          serviceRole: serviceRoleArn,
          source: {
            type: SourceType.NO_SOURCE,
            buildspec: JSON.stringify({
              version: '0.2',
              env: { shell: 'bash' },
              phases: {
                install: {
                  'on-failure': 'ABORT',
                  commands: ['curl -L https://installs.stacktape.com/linux.sh | sh']
                },
                build: {
                  'on-failure': 'ABORT',
                  commands: ['/root/.stacktape/bin/stacktape help']
                }
              }
            })
          },
          logsConfig: {
            cloudWatchLogs: {
              status: 'ENABLED',
              groupName: logGroupName,
              streamName: 'test'
            }
          }
        })
      )
      .catch(errorHandler);
    return result.project;
  };

  startDeployment = async ({
    codebuildProjectName,
    projectZipBucketName,
    projectZipS3Key,
    commandArgs,
    logGroupName,
    gitInfo,
    stackName,
    apiKeySsmParameterName,
    systemId,
    invocationId,
    useStacktapeVersion,
    codebuildBuildImage,
    additionalBuildCommands = [],
    additionalInstallCommands = [],
    stacktapeTrpcEndpoint,
    computeTypeOverride
  }: {
    codebuildProjectName: string;
    codebuildRoleArn: string;
    projectZipBucketName: string;
    projectZipS3Key: string;
    commandArgs: StacktapeArgs;
    logGroupName: string;
    gitInfo: GitInformation;
    stackName: string;
    apiKeySsmParameterName: string;
    systemId: string;
    invocationId: string;
    useStacktapeVersion?: string;
    additionalBuildCommands?: string[];
    additionalInstallCommands?: string[];
    computeTypeOverride?: ComputeType;
    codebuildBuildImage?: string;
    stacktapeTrpcEndpoint?: string;
  }) => {
    const errorHandler = this.#getErrorHandler('Failure when starting codebuild deployment.');
    const bashInitiationFile = '/root/.local/bashrc';
    const poetryCodebuildInstallationPath = '/root/.local/bin';
    const stacktapeCodebuildInstallationPath = '/root/.stacktape/bin';
    const pnpmHome = '/root/.local/share/pnpm';
    const bunHome = '/root/.bun/bin';

    const { build } = await this.#createClient()
      .send(
        new StartBuildCommand({
          projectName: codebuildProjectName,
          sourceTypeOverride: SourceType.S3,
          sourceLocationOverride: `${projectZipBucketName}/${projectZipS3Key}`,
          environmentVariablesOverride: [
            {
              name: 'STACKTAPE_API_KEY',
              value: apiKeySsmParameterName,
              type: EnvironmentVariableType.PARAMETER_STORE
            },
            { name: 'STP_CODEBUILD', value: 'TRUE', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_USER_NAME', value: gitInfo.username || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_BRANCH_NAME', value: gitInfo.branch || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_COMMIT_SHA', value: gitInfo.commit || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_GIT_URL', value: gitInfo.gitUrl || '', type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_INVOCATION_ID', value: invocationId, type: EnvironmentVariableType.PLAINTEXT },
            { name: 'STP_ORIGINAL_SYSTEM_ID', value: systemId, type: EnvironmentVariableType.PLAINTEXT },
            ...getOperationInvocationEnvironmentVariables(),
            { name: 'BASH_ENV', value: bashInitiationFile, type: EnvironmentVariableType.PLAINTEXT },
            ...(stacktapeTrpcEndpoint
              ? [
                  {
                    name: 'STP_CUSTOM_TRPC_API_ENDPOINT',
                    value: stacktapeTrpcEndpoint,
                    type: EnvironmentVariableType.PLAINTEXT
                  }
                ]
              : [])
          ],
          privilegedModeOverride: true,
          logsConfigOverride: {
            cloudWatchLogs: {
              status: 'ENABLED',
              groupName: logGroupName,
              streamName: `${stackName}/${kebabCase('deploy' as StacktapeCommand)}/${invocationId}`
            }
          },
          ...(computeTypeOverride ? { computeTypeOverride } : {}),
          imageOverride: codebuildBuildImage || 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
          buildspecOverride: JSON.stringify({
            version: '0.2',
            env: { shell: 'bash' },
            phases: {
              install: {
                'on-failure': 'RETRY-2',
                commands: [
                  'if [ -z "${CODEBUILD_ATTEMPT+x}" ]; then export CODEBUILD_ATTEMPT=1; else CODEBUILD_ATTEMPT=$((CODEBUILD_ATTEMPT+1)); export CODEBUILD_ATTEMPT; fi',
                  'echo "Install Phase - Attempt #${CODEBUILD_ATTEMPT}"',
                  'docker run --privileged --rm public.ecr.aws/vend/tonistiigi/binfmt:latest --install arm64',
                  ...additionalInstallCommands,
                  'yum install -y libatomic',
                  'curl -fsSL https://get.pnpm.io/install.sh | sh -',
                  'curl -fsSL https://bun.sh/install | bash',
                  ...(useStacktapeVersion ? [`export STACKTAPE_VERSION="${useStacktapeVersion}"`] : []),
                  'curl -L https://installs.stacktape.com/linux.sh | sh',
                  `echo "export PATH="${stacktapeCodebuildInstallationPath}:${poetryCodebuildInstallationPath}:${pnpmHome}:${bunHome}:\$PATH"" >> ${bashInitiationFile}`,
                  `. ${bashInitiationFile}`
                ],
                finally: [
                  'if [ "$CODEBUILD_ATTEMPT" -ge 3 ] || [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then ' +
                    `  echo "Running cleanup…"; aws ssm delete-parameters --names "${apiKeySsmParameterName}"; ` +
                    'else ' +
                    '  echo "Install failed on attempt #${CODEBUILD_ATTEMPT}, sleeping 10s before retry…"; ' +
                    '  sleep 10; ' +
                    'fi'
                ]
              },
              build: {
                'on-failure': 'ABORT',
                commands: [
                  'if [ -f package.json ] && [ ! -d node_modules ]; then ' +
                    'if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; ' +
                    'elif [ -f yarn.lock ] && [ -f .yarnrc.yml ]; then corepack yarn install --immutable; ' +
                    'elif [ -f yarn.lock ]; then corepack yarn install --frozen-lockfile; ' +
                    'elif [ -f bun.lock ] || [ -f bun.lockb ]; then bun install --frozen-lockfile; ' +
                    'elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; ' +
                    'else npm install; fi; fi',
                  ...additionalBuildCommands,
                  'stacktape deploy '.concat(transformToCliArgs(commandArgs).join(' '))
                ]
              }
            }
          })
        })
      )
      .catch(errorHandler);
    return build;
  };

  getBuild = async ({ buildId }: { buildId: string }) => {
    const errorHandler = this.#getErrorHandler(`Error getting codebuild deployment with buildId ${buildId}.`);
    return (
      await this.#createClient()
        .send(new BatchGetBuildsCommand({ ids: [buildId] }))
        .catch(errorHandler)
    ).builds.at(0);
  };

  getBuilds = async ({ buildIds }: { buildIds: string[] }) => {
    const errorHandler = this.#getErrorHandler('Error getting codebuild builds.');
    const { builds } = await this.#createClient()
      .send(new BatchGetBuildsCommand({ ids: buildIds }))
      .catch(errorHandler);
    return builds;
  };

  waitForBuildPhase = async ({ buildId, awsAccountId }: { buildId: string; awsAccountId: string }) => {
    const errorHandler = this.#getErrorHandler(
      `Codebuild deployment with buildId ${buildId} failed to reach desired state.`
    );
    const failureStatusTypes = [
      StatusType.FAILED,
      StatusType.FAULT,
      StatusType.STOPPED,
      StatusType.TIMED_OUT,
      'CLIENT_ERROR'
    ];
    const waiterInput: BatchGetBuildsCommandInput = { ids: [buildId] };
    const waiterResult = await createWaiter(
      { client: this.#createClient(), maxWaitTime: 1500, minDelay: 1, maxDelay: 1 },
      waiterInput,
      async (codebuildClient, input) => {
        const {
          builds: [build]
        } = await codebuildClient.send(new BatchGetBuildsCommand(input));
        if (failureStatusTypes.includes(build.buildStatus as StatusType)) {
          const lastPhase = build.phases.find(({ phaseStatus }) =>
            failureStatusTypes.includes(phaseStatus as StatusType)
          );
          const additionalMessage = (lastPhase.contexts || [])
            .map(({ statusCode, message }) => `[Status code ${statusCode}]: ${message}`)
            .join('\n');
          throw new CliError({
            category: 'CODEBUILD',
            code: 'CODEBUILD_START_FAILED',
            message: `Start of codebuild deployment failed in phase "${
              lastPhase.phaseType
            }" with status before stacktape operation could be started.${
              additionalMessage ? `\nAdditional message: ${additionalMessage}.` : ''
            }`,
            hints: `Deployment logs: ${consoleLinks.codebuildDeployment(
              this.#region,
              awsAccountId,
              build.projectName,
              buildId
            )}`
          });
        }

        if (build.phases.find(({ phaseType }) => phaseType === BuildPhaseType.BUILD)) {
          return {
            state: WaiterState.SUCCESS,
            reason: `Build successfully reached "${BuildPhaseType.BUILD}" phase`
          };
        }
        return { state: WaiterState.RETRY, reason: 'Build in progress' };
      }
    );
    if (waiterResult.state !== WaiterState.SUCCESS) {
      throw errorHandler(new Error(waiterResult.reason));
    }
  };
}
