import { describe, expect, test } from 'bun:test';
import type { CodeBuildClient } from '@aws-sdk/client-codebuild';
import {
  BatchGetProjectsCommand,
  ComputeType,
  CreateProjectCommand,
  StartBuildCommand
} from '@aws-sdk/client-codebuild';
import type { StacktapeArgs } from 'src/config/cli/types';
import { AwsCodeBuild } from '../../src/aws/codebuild';

type Send = CodeBuildClient['send'];

const codeBuildWith = ({ send, debug = () => undefined }: { send: Send; debug?: (message: string) => void }) =>
  new AwsCodeBuild({
    createClient: () => ({ send }) as CodeBuildClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    },
    printer: { debug },
    region: 'eu-west-1'
  });

describe('AWS CodeBuild operations', () => {
  test('preserves the complete remote-deployment request and buildspec', async () => {
    let request: StartBuildCommand | undefined;
    const codeBuild = codeBuildWith({
      send: (async (command: StartBuildCommand) => {
        request = command;
        return { build: { arn: 'arn:build/1', id: 'build-1' } };
      }) as Send
    });
    const commandArgs = {
      stage: 'dev',
      region: 'eu-west-1',
      preserveTempFiles: true
    } satisfies StacktapeArgs;

    await codeBuild.startDeployment({
      additionalBuildCommands: ['pnpm test'],
      additionalInstallCommands: ['echo custom-install'],
      apiKeySsmParameterName: '/stacktape/invocations/key',
      codebuildBuildImage: 'custom/build-image:1',
      codebuildProjectName: 'stacktape-runner',
      codebuildRoleArn: 'arn:aws:iam::123456789012:role/stacktape-codebuild',
      commandArgs,
      computeTypeOverride: ComputeType.BUILD_GENERAL1_LARGE,
      gitInfo: {
        branch: 'feature',
        commit: 'abc123',
        gitUrl: 'https://github.com/stacktape/stacktape',
        hasUncommitedChanges: false,
        username: 'maintainer'
      },
      invocationId: 'invocation-1',
      logGroupName: '/stacktape/operations',
      projectZipBucketName: 'stacktape-artifacts',
      projectZipS3Key: 'projects/invocation-1.zip',
      stackName: 'project-dev',
      stacktapeTrpcEndpoint: 'https://api.example.com',
      systemId: 'developer-machine',
      useStacktapeVersion: '4.0.0-dev.0'
    });

    expect(request).toBeInstanceOf(StartBuildCommand);
    expect(request?.input).toMatchObject({
      computeTypeOverride: 'BUILD_GENERAL1_LARGE',
      imageOverride: 'custom/build-image:1',
      logsConfigOverride: {
        cloudWatchLogs: {
          groupName: '/stacktape/operations',
          status: 'ENABLED',
          streamName: 'project-dev/deploy/invocation-1'
        }
      },
      privilegedModeOverride: true,
      projectName: 'stacktape-runner',
      sourceLocationOverride: 'stacktape-artifacts/projects/invocation-1.zip',
      sourceTypeOverride: 'S3'
    });
    expect(
      Object.fromEntries(
        request!.input.environmentVariablesOverride!.map(({ name, value, type }) => [name, { type, value }])
      )
    ).toMatchObject({
      BASH_ENV: { type: 'PLAINTEXT', value: '/root/.local/bashrc' },
      STACKTAPE_API_KEY: { type: 'PARAMETER_STORE', value: '/stacktape/invocations/key' },
      STP_CODEBUILD: { type: 'PLAINTEXT', value: 'TRUE' },
      STP_CUSTOM_TRPC_API_ENDPOINT: { type: 'PLAINTEXT', value: 'https://api.example.com' },
      STP_GIT_BRANCH_NAME: { type: 'PLAINTEXT', value: 'feature' },
      STP_GIT_COMMIT_SHA: { type: 'PLAINTEXT', value: 'abc123' },
      STP_GIT_URL: { type: 'PLAINTEXT', value: 'https://github.com/stacktape/stacktape' },
      STP_GIT_USER_NAME: { type: 'PLAINTEXT', value: 'maintainer' },
      STP_INVOCATION_ID: { type: 'PLAINTEXT', value: 'invocation-1' },
      STP_ORIGINAL_SYSTEM_ID: { type: 'PLAINTEXT', value: 'developer-machine' }
    });

    const buildspec = JSON.parse(request!.input.buildspecOverride!);
    expect(buildspec.phases.install['on-failure']).toBe('RETRY-2');
    expect(buildspec.phases.install.commands).toEqual([
      'if [ -z "${CODEBUILD_ATTEMPT+x}" ]; then export CODEBUILD_ATTEMPT=1; else CODEBUILD_ATTEMPT=$((CODEBUILD_ATTEMPT+1)); export CODEBUILD_ATTEMPT; fi',
      'echo "Install Phase - Attempt #${CODEBUILD_ATTEMPT}"',
      'docker run --privileged --rm public.ecr.aws/vend/tonistiigi/binfmt:latest --install arm64',
      'echo custom-install',
      'yum install -y libatomic',
      'curl -fsSL https://get.pnpm.io/install.sh | sh -',
      'curl -fsSL https://bun.sh/install | bash',
      'export STACKTAPE_VERSION="4.0.0-dev.0"',
      'curl -L https://installs.stacktape.com/linux.sh | sh',
      'echo "export PATH="/root/.stacktape/bin:/root/.local/bin:/root/.local/share/pnpm:/root/.bun/bin:$PATH"" >> /root/.local/bashrc',
      '. /root/.local/bashrc'
    ]);
    expect(buildspec.phases.install.finally).toEqual([
      'if [ "$CODEBUILD_ATTEMPT" -ge 3 ] || [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then   echo "Running cleanup…"; aws ssm delete-parameters --names "/stacktape/invocations/key"; else   echo "Install failed on attempt #${CODEBUILD_ATTEMPT}, sleeping 10s before retry…";   sleep 10; fi'
    ]);
    expect(buildspec.phases.build).toEqual({
      'on-failure': 'ABORT',
      commands: [
        'if [ -f package.json ] && [ ! -d node_modules ]; then if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; elif [ -f yarn.lock ] && [ -f .yarnrc.yml ]; then corepack yarn install --immutable; elif [ -f yarn.lock ]; then corepack yarn install --frozen-lockfile; elif [ -f bun.lock ] || [ -f bun.lockb ]; then bun install --frozen-lockfile; elif [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; else npm install; fi; fi',
        'pnpm test',
        'stacktape deploy --stage dev --region eu-west-1 --preserveTempFiles'
      ]
    });
  });

  test('creates the bootstrap project and logs an explicitly absent project', async () => {
    const requests: (BatchGetProjectsCommand | CreateProjectCommand)[] = [];
    const debugMessages: string[] = [];
    const codeBuild = codeBuildWith({
      debug: (message) => debugMessages.push(message),
      send: (async (command: BatchGetProjectsCommand | CreateProjectCommand) => {
        requests.push(command);
        return command instanceof BatchGetProjectsCommand
          ? { projectsNotFound: ['stacktape-runner'] }
          : { project: { name: 'stacktape-runner' } };
      }) as Send
    });

    await expect(codeBuild.getProject({ projectName: 'stacktape-runner' })).resolves.toBeUndefined();
    await codeBuild.createProject({
      logGroupName: '/stacktape/operations',
      projectName: 'stacktape-runner',
      serviceRoleArn: 'arn:aws:iam::123456789012:role/stacktape-codebuild'
    });

    expect(debugMessages).toEqual(['Codebuild project with name stacktape-runner could not be found.']);
    expect(requests[0].input).toEqual({ names: ['stacktape-runner'] });
    expect(requests[1].input).toMatchObject({
      artifacts: { type: 'NO_ARTIFACTS' },
      environment: {
        computeType: 'BUILD_GENERAL1_MEDIUM',
        image: 'aws/codebuild/amazonlinux2-x86_64-standard:5.0',
        type: 'LINUX_CONTAINER'
      },
      logsConfig: {
        cloudWatchLogs: { groupName: '/stacktape/operations', status: 'ENABLED', streamName: 'test' }
      },
      name: 'stacktape-runner',
      serviceRole: 'arn:aws:iam::123456789012:role/stacktape-codebuild',
      source: { type: 'NO_SOURCE' }
    });
    expect(JSON.parse((requests[1] as CreateProjectCommand).input.source.buildspec!)).toEqual({
      env: { shell: 'bash' },
      phases: {
        build: { 'on-failure': 'ABORT', commands: ['/root/.stacktape/bin/stacktape help'] },
        install: { 'on-failure': 'ABORT', commands: ['curl -L https://installs.stacktape.com/linux.sh | sh'] }
      },
      version: '0.2'
    });
  });
});
