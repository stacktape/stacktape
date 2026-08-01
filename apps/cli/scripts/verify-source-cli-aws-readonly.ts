import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const optInVariable = 'STP_SOURCE_CLI_AWS_READONLY';
const profileVariable = 'STP_SOURCE_CLI_AWS_PROFILE';
const expectedAccountVariable = 'STP_SOURCE_CLI_EXPECTED_ACCOUNT_ID';
const projectVariable = 'STP_SOURCE_CLI_PROJECT_NAME';
const stageVariable = 'STP_SOURCE_CLI_STAGE';
const regionVariable = 'STP_SOURCE_CLI_REGION';
const fixtureConfigPath = '_test-stacks/packaging-smoke/stacktape.ts';
const expectedWorkloads = ['catalogReport', 'retryAdvisor'] as const;
const commandTimeoutMs = 30 * 60 * 1000;
const terminationGraceMs = 2_000;

type Environment = Record<string, string | undefined>;

export type SmokeOptions = {
  profile: string;
  expectedAccountId: string;
  projectName: string;
  stage: string;
  region: string;
};

type JsonlEvent = Record<string, unknown> & { type: string };
type JsonlResult = JsonlEvent & {
  type: 'result';
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertSafeName = ({ name, value, minLength = 1 }: { name: string; value: string; minLength?: number }) => {
  assert(value.length >= minLength, `${name} must be at least ${minLength} characters long.`);
  assert(value.length <= 40, `${name} must not exceed 40 characters.`);
  assert(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value),
    `${name} must contain only lowercase letters, numbers, and internal dashes.`
  );
};

const defaultProjectName = () => `v4src-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
const createSmokeInvocationId = () =>
  `source-cli-readonly-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;

export const resolveSmokeOptions = ({
  platform = process.platform,
  env = process.env,
  makeProjectName = defaultProjectName
}: {
  platform?: NodeJS.Platform;
  env?: Environment;
  makeProjectName?: () => string;
} = {}): SmokeOptions => {
  assert(
    platform !== 'win32',
    'The source-built Stacktape CLI cannot run from Windows. Use a Linux/macOS checkout or a WSL-native checkout.'
  );
  assert(
    env[optInVariable] === '1',
    `Refusing to contact AWS without explicit opt-in. Set ${optInVariable}=1 for this read-only smoke.`
  );

  const profile = env[profileVariable]?.trim();
  assert(profile, `${profileVariable} must name the exact local AWS profile to use.`);
  assert(
    ![...profile].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    }),
    `${profileVariable} must not contain control characters.`
  );

  const expectedAccountId = env[expectedAccountVariable]?.trim();
  assert(
    expectedAccountId && /^\d{12}$/.test(expectedAccountId),
    `${expectedAccountVariable} must be the 12-digit account id that this smoke is allowed to read.`
  );

  const projectName = env[projectVariable]?.trim() || makeProjectName();
  const stage = env[stageVariable]?.trim() || 'dev';
  const region = env[regionVariable]?.trim() || 'eu-west-1';
  assertSafeName({ name: projectVariable, value: projectName });
  assertSafeName({ name: stageVariable, value: stage, minLength: 2 });
  assert(
    /^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(region),
    `${regionVariable} must be an explicit AWS region such as eu-west-1.`
  );

  return { profile, expectedAccountId, projectName, stage, region };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseCliJsonl = (stdout: string, command: string) => {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  assert(lines.length > 0, `Source CLI ${command} emitted no JSONL records.`);

  const events = lines.map((line, index): JsonlEvent => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`Source CLI ${command} emitted invalid JSONL on line ${index + 1}: ${line.slice(0, 240)}`, {
        cause: error
      });
    }
    assert(isRecord(value) && typeof value.type === 'string', `Source CLI ${command} emitted an invalid event.`);
    return value as JsonlEvent;
  });

  const results = events.filter((event): event is JsonlResult => event.type === 'result');
  assert(results.length === 1, `Source CLI ${command} must emit exactly one result event; received ${results.length}.`);
  const result = results[0];
  assert(events.at(-1) === result, `Source CLI ${command} emitted records after its result event.`);
  assert(
    typeof result.ok === 'boolean' && typeof result.code === 'string' && typeof result.message === 'string',
    `Source CLI ${command} emitted a malformed result event.`
  );

  return { events, result };
};

const outputTail = (value: string) => value.trim().slice(-4_000);

const runSourceCli = async ({
  cliDirectory,
  command,
  args,
  env
}: {
  cliDirectory: string;
  command: 'package' | 'synth' | 'validate';
  args: string[];
  env: Environment;
}) => {
  const child = Bun.spawn({
    cmd: [process.execPath, 'run', 'dev', command, ...args],
    cwd: cliDirectory,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
    detached: true
  });
  const stdoutPromise = new Response(child.stdout).text();
  const stderrPromise = new Response(child.stderr).text();
  let timedOut = false;
  let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
  const signalProcessGroup = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {}
    try {
      child.kill(signal);
    } catch {}
  };
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    signalProcessGroup('SIGTERM');
    forceKillTimer = setTimeout(() => signalProcessGroup('SIGKILL'), terminationGraceMs);
  }, commandTimeoutMs);
  const [exitCode, stdout, stderr] = await Promise.all([child.exited, stdoutPromise, stderrPromise]).finally(() => {
    clearTimeout(timeoutTimer);
    if (forceKillTimer) clearTimeout(forceKillTimer);
  });
  assert(!timedOut, `Source CLI ${command} exceeded ${commandTimeoutMs / 60_000} minutes.`);

  let parsed: ReturnType<typeof parseCliJsonl>;
  try {
    parsed = parseCliJsonl(stdout, command);
  } catch (error) {
    throw new Error(
      `Could not verify source CLI ${command} output.${stderr.trim() ? `\nStderr:\n${outputTail(stderr)}` : ''}`,
      { cause: error }
    );
  }
  assert(
    exitCode === 0,
    `Source CLI ${command} exited with ${exitCode}. Result: ${parsed.result.code}: ${parsed.result.message}${
      stderr.trim() ? `\nStderr:\n${outputTail(stderr)}` : ''
    }`
  );
  assert(parsed.result.ok, `Source CLI ${command} failed: ${parsed.result.code}: ${parsed.result.message}`);
  assert(parsed.result.code === 'OK', `Source CLI ${command} returned unexpected code ${parsed.result.code}.`);
  return parsed;
};

const getCommandResult = (result: JsonlResult) => {
  assert(isRecord(result.data) && 'result' in result.data, 'CLI result event has no command result payload.');
  return result.data.result;
};

const assertPackagedWorkloads = (result: JsonlResult) => {
  const packagedWorkloads = getCommandResult(result);
  assert(Array.isArray(packagedWorkloads), 'Package command did not return its packaged workloads.');
  const names = packagedWorkloads
    .map((workload) => (isRecord(workload) && typeof workload.jobName === 'string' ? workload.jobName : undefined))
    .filter((name): name is string => Boolean(name))
    .sort();
  assert(
    JSON.stringify(names) === JSON.stringify([...expectedWorkloads].sort()),
    `Expected exactly ${expectedWorkloads.join(', ')} to be packaged; received ${names.join(', ') || '<none>'}.`
  );
};

const completedEvent = (events: JsonlEvent[], eventType: string, instanceId?: string) =>
  events.find(
    (event) =>
      event.type === 'event' &&
      event.eventType === eventType &&
      event.status === 'completed' &&
      (instanceId === undefined || event.instanceId === instanceId)
  );

const assertPackagingStages = (events: JsonlEvent[]) => {
  assert(completedEvent(events, 'PACKAGE_ARTIFACTS'), 'Packaging never completed its PACKAGE_ARTIFACTS stage.');
  const layerEvent = completedEvent(events, 'BUILD_CODE', 'shared-lambda-layer');
  assert(layerEvent, 'Packaging did not complete the shared Lambda layer build.');
  assert(
    typeof layerEvent.message === 'string' && /\bCreated 1 shared layer\b/.test(layerEvent.message),
    `Expected exactly one shared Lambda layer; received: ${String(layerEvent.message)}`
  );

  for (const workload of expectedWorkloads) {
    const workloadEvent = completedEvent(events, 'BUILD_CODE', workload);
    assert(workloadEvent, `Packaging did not complete ${workload}.`);
    assert(
      typeof workloadEvent.message === 'string' && /\+ 1 shared layer\b/.test(workloadEvent.message),
      `${workload} was not packaged with the one shared layer: ${String(workloadEvent.message)}`
    );
  }
};

export const assertSynthesizedTemplate = async ({
  templatePath,
  projectName,
  stage,
  requireSharedLayer
}: {
  templatePath: string;
  projectName: string;
  stage: string;
  requireSharedLayer: boolean;
}) => {
  const template: unknown = parseYaml(await readFile(templatePath, 'utf8'));
  assert(isRecord(template) && isRecord(template.Resources), 'Synth did not write a CloudFormation Resources map.');
  const functions = Object.values(template.Resources).filter(
    (resource): resource is Record<string, unknown> => isRecord(resource) && resource.Type === 'AWS::Lambda::Function'
  );
  const expectedNames = expectedWorkloads.map((name) => `${projectName}-${stage}-${name}`).sort();
  const namedFunctions = functions.flatMap((resource) => {
    const properties = resource.Properties;
    if (!isRecord(properties) || typeof properties.FunctionName !== 'string') return [];
    return [{ functionName: properties.FunctionName, resource }];
  });
  const workloadFunctions = namedFunctions.filter(({ functionName }) => expectedNames.includes(functionName));
  const functionNames = workloadFunctions.map(({ functionName }) => functionName).sort();
  assert(
    JSON.stringify(functionNames) === JSON.stringify(expectedNames),
    `Synthesized workload Lambda names differ from the requested stack: ${functionNames.join(', ') || '<none>'}.`
  );

  if (requireSharedLayer) {
    const layers = Object.entries(template.Resources).filter(
      (entry): entry is [string, Record<string, unknown>] =>
        isRecord(entry[1]) && entry[1].Type === 'AWS::Lambda::LayerVersion'
    );
    assert(
      layers.length === 1,
      `Expected one shared Lambda layer in the validated template; received ${layers.length}.`
    );
    const [layerLogicalId] = layers[0];

    for (const { resource } of workloadFunctions) {
      assert(isRecord(resource.Properties), 'Validated Lambda has no Properties map.');
      const configuredLayers = resource.Properties.Layers;
      assert(Array.isArray(configuredLayers), `${String(resource.Properties.FunctionName)} has no Lambda layer.`);
      assert(configuredLayers.length === 1, `${String(resource.Properties.FunctionName)} must use exactly one layer.`);
      const layerReference = configuredLayers[0];
      assert(isRecord(layerReference), `${String(resource.Properties.FunctionName)} has an invalid layer reference.`);
      const getAtt = layerReference['Fn::GetAtt'];
      const referencesSharedLayer =
        (Array.isArray(getAtt) && getAtt[0] === layerLogicalId && getAtt[1] === 'LayerVersionArn') ||
        getAtt === `${layerLogicalId}.LayerVersionArn`;
      assert(
        referencesSharedLayer,
        `${String(resource.Properties.FunctionName)} does not reference shared layer ${layerLogicalId}.`
      );
    }
  }
};

const assertThoroughValidation = (events: JsonlEvent[], result: JsonlResult) => {
  for (const eventType of ['PACKAGE_ARTIFACTS', 'VALIDATE_TEMPLATE']) {
    assert(completedEvent(events, eventType), `Thorough validation never completed ${eventType}.`);
  }
  assertPackagingStages(events);

  const validation = getCommandResult(result);
  assert(isRecord(validation) && validation.valid === true, 'Validate did not return valid: true.');
  assert(isRecord(validation.checked), 'Validate did not report its checked stages.');
  for (const stage of ['config', 'resources', 'template', 'packaging', 'cloudformation']) {
    assert(validation.checked[stage] === true, `Validate did not report ${stage} as checked.`);
  }
  assert(Array.isArray(validation.packagedWorkloads), 'Thorough validation did not return packaged workloads.');
  assert(validation.packagedWorkloads.length === 2, 'Thorough validation did not package exactly two workloads.');
};

export const buildCliEnvironment = ({
  profile,
  invocationId,
  inheritedEnvironment = process.env
}: {
  profile: string;
  invocationId: string;
  inheritedEnvironment?: Environment;
}): Environment => {
  assert(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(invocationId),
    'The source CLI smoke invocation id must be path-safe.'
  );
  const env: Environment = {
    ...inheritedEnvironment,
    AWS_PROFILE: profile,
    AWS_DEFAULT_PROFILE: profile,
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    AWS_SDK_LOAD_CONFIG: '1',
    SKIP_LOADING_ENV: '1',
    STP_DISABLE_TELEMETRY: '1',
    STP_INVOCATION_ID: invocationId
  };
  // The smoke must prove and use the named profile, never ambient credentials or endpoint redirection.
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_SECURITY_TOKEN']) {
    delete env[name];
  }
  for (const name of Object.keys(env)) {
    if (name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_')) delete env[name];
  }
  return env;
};

const verifyIdentity = async ({ profile, region, expectedAccountId }: SmokeOptions) => {
  const stsDnsSuffix = region.startsWith('cn-') ? 'amazonaws.com.cn' : 'amazonaws.com';
  const client = new STSClient({
    region,
    credentials: fromIni({ profile }),
    endpoint: `https://sts.${region}.${stsDnsSuffix}`
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const identity = await client.send(new GetCallerIdentityCommand({}), { abortSignal: controller.signal });
    assert(identity.Account, `STS did not return an account id for profile ${profile}.`);
    assert(
      identity.Account === expectedAccountId,
      `Profile ${profile} resolved to AWS account ${identity.Account}, not explicitly allowed account ${expectedAccountId}.`
    );
  } finally {
    clearTimeout(timeout);
    client.destroy();
  }
};

export const verifySourceCliAwsReadonly = async () => {
  const options = resolveSmokeOptions();
  await verifyIdentity(options);

  const cliDirectory = join(import.meta.dir, '..');
  const invocationId = createSmokeInvocationId();
  const cliBuildDirectory = join(cliDirectory, '.stacktape', invocationId);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'stacktape-source-cli-aws-readonly-'));

  try {
    const synthesizedTemplatePath = join(temporaryDirectory, 'compiled-template.yaml');
    const validatedTemplatePath = join(temporaryDirectory, 'validated-template.yaml');
    const commonArgs = [
      '--configPath',
      fixtureConfigPath,
      '--projectName',
      options.projectName,
      '--stage',
      options.stage,
      '--region',
      options.region,
      '--profile',
      options.profile,
      '--agent'
    ];
    const env = buildCliEnvironment({ profile: options.profile, invocationId });

    const packageRun = await runSourceCli({ cliDirectory, command: 'package', args: commonArgs, env });
    assertPackagedWorkloads(packageRun.result);
    assertPackagingStages(packageRun.events);

    await runSourceCli({
      cliDirectory,
      command: 'synth',
      args: [...commonArgs, '--outFile', synthesizedTemplatePath],
      env
    });
    await assertSynthesizedTemplate({
      templatePath: synthesizedTemplatePath,
      projectName: options.projectName,
      stage: options.stage,
      requireSharedLayer: false
    });

    const validateRun = await runSourceCli({
      cliDirectory,
      command: 'validate',
      args: [...commonArgs, '--withPackage', '--thorough', '--outFile', validatedTemplatePath],
      env
    });
    assertThoroughValidation(validateRun.events, validateRun.result);
    await assertSynthesizedTemplate({
      templatePath: validatedTemplatePath,
      projectName: options.projectName,
      stage: options.stage,
      requireSharedLayer: true
    });

    console.info(
      `Verified source CLI package, synth, and thorough validation for ${options.projectName}-${options.stage} ` +
        `in ${options.region} using the explicitly verified ${options.profile} profile. No AWS resources were changed.`
    );
  } finally {
    await Promise.all([
      rm(temporaryDirectory, { recursive: true, force: true }),
      rm(cliBuildDirectory, { recursive: true, force: true })
    ]);
  }
};

if (import.meta.main) {
  verifySourceCliAwsReadonly().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
