/**
 * Runs the source CLI (`scripts/dev.ts`) as a child process against one MiniStack container and the J2 control-plane
 * fake, with an isolated HOME, synthetic credentials and the fail-closed preload. The harness observes exit codes, the
 * machine-readable result record and the CloudFormation stack the emulator holds; the family table owns the effect
 * assertions.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  CloudFormationClient,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  GetTemplateCommand,
  ListStackResourcesCommand,
  type StackResourceSummary
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import type { MiniStack } from '@stacktape/ministack/fixture';
import { buildOfflineQualificationEnvironment } from '../../scripts/qualification/offline-aws';
import { startControlPlaneFake, type ControlPlaneFake } from '../cli-process/control-plane-fake';

export const cliRoot = resolve(import.meta.dir, '..', '..');
export const STAGE = 'local';
/** A deploy step must finish well inside this; a hung CLI is a failure, not a wait. */
const CLI_DEADLINE_MS = 180_000;

export type DeployStep = 'create' | 'update' | 'unchanged' | 'diff' | 'rollback' | 'delete';

type JsonlRecord = { type?: string; data?: { result?: Record<string, unknown> } };

export type ChangeSummary = {
  creates: number;
  updates: number;
  deletes: number;
  replacements: number;
  dangerousChanges: number;
};

export type CliStepResult = {
  step: DeployStep;
  exitCode: number;
  timedOut: boolean;
  ms: number;
  changeSummary: ChangeSummary | undefined;
  packagedWorkloads: Array<{ skipped?: boolean }> | undefined;
  /** The last part of stdout and stderr, for failure messages; the whole output is in `logPath`. */
  tail: string;
  logPath: string;
};

export type FamilyProject = {
  projectName: string;
  stackName: string;
  directory: string;
  home: string;
  controlPlane: ControlPlaneFake;
  close: () => Promise<void>;
};

/** A fresh project directory, HOME and control-plane fake for one family. */
export const createFamilyProject = async ({
  familyName,
  out,
  ministack,
  securityScanningEnabled = false
}: {
  familyName: string;
  out: string;
  ministack: MiniStack;
  securityScanningEnabled?: boolean;
}): Promise<FamilyProject> => {
  const projectName = `mini${familyName.replaceAll(/[^a-z0-9]/gi, '')}`.toLowerCase();
  const directory = join(out, familyName);
  const home = join(directory, 'home');
  await mkdir(join(home, 'tmp'), { recursive: true });
  // The project's own manifest: without one the CLI's dependency installer would walk up to apps/cli/package.json
  // and run pnpm for the whole repository workspace from the child's temporary HOME.
  await writeFile(
    join(directory, 'package.json'),
    `${JSON.stringify({ name: projectName, private: true, type: 'module' }, null, 2)}\n`
  );
  const controlPlane = await startControlPlaneFake({
    projectName,
    awsAccountId: ministack.defaultAccount.accountId,
    securityScanningEnabled
  });
  return {
    projectName,
    stackName: `${projectName}-${STAGE}`,
    directory,
    home,
    controlPlane,
    close: () => controlPlane.close()
  };
};

export const writeProjectFiles = async (
  project: FamilyProject,
  files: Record<string, string | Record<string, unknown>>
) => {
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(project.directory, name)), { recursive: true });
    await writeFile(
      join(project.directory, name),
      typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`
    );
  }
};

const parseTerminalResult = (stdout: string) =>
  stdout
    .split('\n')
    .filter(Boolean)
    .map((line): JsonlRecord | undefined => {
      try {
        return JSON.parse(line) as JsonlRecord;
      } catch {
        return undefined;
      }
    })
    .findLast((record) => record?.type === 'result');

/** One `deploy` or `delete` of the project through the source CLI. */
export const runSourceCli = async ({
  project,
  step,
  ministack,
  logName = step,
  scannerPath
}: {
  project: FamilyProject;
  step: DeployStep;
  ministack: MiniStack;
  logName?: string;
  scannerPath?: string;
}): Promise<CliStepResult> => {
  const invocationId = `${project.projectName}-${step}-${randomUUID().slice(0, 8)}`;
  const account = ministack.defaultAccount;
  const env = {
    ...buildOfflineQualificationEnvironment({
      endpoint: ministack.endpoint,
      invocationId,
      homeDirectory: project.home
    }),
    ...ministack.childEnvironment(account),
    MINISTACK_ENDPOINT: ministack.endpoint,
    MINISTACK_ACCESS_KEY_ID: account.credentials.accessKeyId,
    MINISTACK_SECRET_ACCESS_KEY: account.credentials.secretAccessKey,
    // MiniStack has no usable Cost Explorer or Budgets; the CLI allows skipping discovery only on loopback endpoints.
    STP_SKIP_COST_DISCOVERY: '1',
    STP_CUSTOM_TRPC_API_ENDPOINT: project.controlPlane.endpoint,
    ...(scannerPath ? { STACKTAPE_TRIVY_PATH: scannerPath } : {})
  };
  const args = [
    process.execPath,
    '--preload',
    join(import.meta.dir, 'offline-preload.ts'),
    join(cliRoot, 'scripts', 'dev.ts'),
    step === 'delete' || step === 'diff' || step === 'rollback' ? step : 'deploy',
    '--stage',
    STAGE,
    '--region',
    ministack.region,
    '--projectName',
    project.projectName,
    '--awsAccount',
    'cli-process-account',
    '--currentWorkingDirectory',
    project.directory,
    ...(step === 'diff' || step === 'rollback' ? [] : ['--autoConfirmOperation']),
    ...(step === 'rollback' ? ['--targetVersion', 'v000001'] : []),
    '--outputFormat',
    'jsonl'
  ];
  const started = performance.now();
  const child = Bun.spawn(args, { cwd: cliRoot, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, CLI_DEADLINE_MS);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  clearTimeout(timer);
  const ms = Math.round(performance.now() - started);
  const logPath = join(project.directory, `${logName}.log`);
  await writeFile(logPath, `${stdout}\n${stderr}`);
  const result = parseTerminalResult(stdout)?.data?.result;
  return {
    step,
    exitCode,
    timedOut,
    ms,
    changeSummary: (result?.changePlan as { summary?: ChangeSummary } | undefined)?.summary,
    packagedWorkloads: result?.packagedWorkloads as CliStepResult['packagedWorkloads'],
    tail: `${stdout}\n${stderr}`.slice(-3_000),
    logPath
  };
};

/**
 * The stack's resources, or `undefined` once the stack is gone. AWS answers a deleted stack's name with "does not
 * exist"; MiniStack keeps answering with the DELETE_COMPLETE stack and an empty resource list.
 */
export const describeStackResources = async (
  cloudFormation: CloudFormationClient,
  stackName: string
): Promise<StackResourceSummary[] | undefined> => {
  try {
    const [stack] = (await cloudFormation.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks ?? [];
    if (!stack || stack.StackStatus === 'DELETE_COMPLETE') return undefined;
    return (
      (await cloudFormation.send(new ListStackResourcesCommand({ StackName: stackName }))).StackResourceSummaries ?? []
    );
  } catch (error) {
    if (/does not exist/i.test(String(error))) return undefined;
    throw error;
  }
};

/** A stable picture of the stack: every resource with its type and physical ID, sorted by logical ID. */
export const resourceSnapshot = (resources: StackResourceSummary[]) =>
  resources
    .map(({ LogicalResourceId, ResourceType, PhysicalResourceId }) => ({
      logicalId: LogicalResourceId ?? '',
      type: ResourceType ?? '',
      physicalId: PhysicalResourceId ?? ''
    }))
    .toSorted((a, b) => a.logicalId.localeCompare(b.logicalId));

/** The template CloudFormation currently holds for the stack. */
export const getStackTemplate = async (cloudFormation: CloudFormationClient, stackName: string) =>
  (await cloudFormation.send(new GetTemplateCommand({ StackName: stackName }))).TemplateBody ?? '';

/** Resource events of a failed step, for the failure message. */
export const describeStackFailure = async (cloudFormation: CloudFormationClient, stackName: string) => {
  try {
    const events =
      (await cloudFormation.send(new DescribeStackEventsCommand({ StackName: stackName }))).StackEvents ?? [];
    return events
      .filter((event) => /FAILED/.test(event.ResourceStatus ?? ''))
      .map((event) => `${event.LogicalResourceId} ${event.ResourceStatus}: ${event.ResourceStatusReason ?? ''}`)
      .join('\n');
  } catch (error) {
    return String(error);
  }
};

/** The stack's resources, events, template and every function's log lines after a step, for diagnosis. */
export const writeStackEvidence = async ({
  cloudFormation,
  logs,
  s3,
  project,
  step,
  resources
}: {
  cloudFormation: CloudFormationClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  project: FamilyProject;
  step: DeployStep;
  resources: StackResourceSummary[];
}) => {
  const buckets: Record<string, string[]> = {};
  for (const resource of resources) {
    if (resource.ResourceType !== 'AWS::S3::Bucket' || !resource.PhysicalResourceId) continue;
    buckets[resource.PhysicalResourceId] = await s3
      .send(new ListObjectsV2Command({ Bucket: resource.PhysicalResourceId }))
      .then((output) => (output.Contents ?? []).map((object) => object.Key ?? ''))
      .catch((error) => [String(error)]);
  }
  const [events, template] = await Promise.all([
    cloudFormation.send(new DescribeStackEventsCommand({ StackName: project.stackName })).catch(String),
    cloudFormation.send(new GetTemplateCommand({ StackName: project.stackName })).catch(String)
  ]);
  const functionLogs: Record<string, string[]> = {};
  for (const resource of resources) {
    if (resource.ResourceType !== 'AWS::Lambda::Function' || !resource.PhysicalResourceId) continue;
    const lines = await logs
      .send(new FilterLogEventsCommand({ logGroupName: `/aws/lambda/${resource.PhysicalResourceId}` }))
      .then((output) => (output.events ?? []).map((event) => event.message ?? ''))
      .catch((error) => [String(error)]);
    functionLogs[resource.PhysicalResourceId] = lines;
  }
  await writeFile(
    join(project.directory, `${step}-stack.json`),
    `${JSON.stringify({ resources, buckets, events, template, functionLogs }, null, 2)}\n`
  );
};
