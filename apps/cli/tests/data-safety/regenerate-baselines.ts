/**
 * Regenerates the committed baseline templates under `baselines/<case>/`.
 *
 *   bun tests/data-safety/regenerate-baselines.ts            # v3 and v4 baselines for every case
 *   bun tests/data-safety/regenerate-baselines.ts --v3       # only the templates compiled by the v3 CLI
 *   bun tests/data-safety/regenerate-baselines.ts --v4       # only the current-synthesis templates
 *   bun tests/data-safety/regenerate-baselines.ts --case=serverless-api
 *
 * v3 baselines come from the last published v3 CLI (`stacktape` 3.x on PATH, or `STP_V3_CLI_PATH`). Its
 * `compile-template` command needs a Stacktape login and a connected AWS account, because the stack hash embedded in
 * physical names derives from the AWS account ID. The script therefore compiles against the Stacktape development
 * control plane with the development API key read from `apps/cli/.env.local` (`STACKTAPE_API_KEY`) and the
 * `stacktape-dev` account connection; it only compiles, it never deploys. The produced template is accepted only when
 * its deployment bucket name carries the hash of the committed baseline identity, which proves the account ID.
 *
 *   STP_V3_CLI_PATH                 path to a v3 `stacktape` executable (default: `stacktape` on PATH)
 *   STACKTAPE_API_KEY               development API key (default: read from apps/cli/.env.local)
 *   STP_CUSTOM_TRPC_API_ENDPOINT    control plane (default: https://dev-api.stacktape.com)
 *   STP_DATA_SAFETY_AWS_ACCOUNT     connected account name (default: stacktape-dev)
 *
 * v4 baselines are produced by the spec itself (`STACKTAPE_DATA_SAFETY_UPDATE_V4_BASELINES=1`), so that they come from
 * exactly the synthesis path the test runs. Review the resulting diff: a changed v4 baseline means the next deploy of
 * an unchanged config would update that resource.
 */
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  baselineCaseDirectory,
  baselineIdentity,
  baselineStackHash,
  baselineTemplateFileName,
  baselinesDirectory,
  listBaselineCases,
  manifestPath,
  readManifest
} from './baseline-identity';

const cliRoot = resolve(import.meta.dir, '..', '..');
const developmentEndpoint = 'https://dev-api.stacktape.com';

const parseArguments = (argv: string[]) => {
  const cases: string[] = [];
  let v3 = false;
  let v4 = false;
  for (const argument of argv) {
    if (argument === '--v3') v3 = true;
    else if (argument === '--v4') v4 = true;
    else if (argument.startsWith('--case=')) cases.push(argument.slice('--case='.length));
    else throw new Error(`Unknown argument ${argument}`);
  }
  if (!v3 && !v4) {
    v3 = true;
    v4 = true;
  }
  return { cases, v3, v4 };
};

const redact = (text: string) => text.replace(/stp_live_[A-Za-z0-9_]+/g, '<redacted>');

const resolveV3Cli = async () => {
  const executable = process.env.STP_V3_CLI_PATH || Bun.which('stacktape');
  if (!executable) {
    throw new Error('No v3 stacktape CLI found. Install stacktape@3 globally or set STP_V3_CLI_PATH.');
  }
  const version = Bun.spawnSync([executable, '--version'], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
  const output = `${version.stdout.toString()}${version.stderr.toString()}`;
  const match = output.match(/version:\s*(3\.\d+\.\d+)/i);
  if (!match) {
    throw new Error(`${executable} is not a v3 stacktape CLI. Output: ${redact(output).trim().slice(0, 200)}`);
  }
  return { executable, version: match[1] };
};

const loadDevelopmentApiKey = () => {
  if (process.env.STACKTAPE_API_KEY) {
    return process.env.STACKTAPE_API_KEY;
  }
  const envFile = join(cliRoot, '.env.local');
  if (!existsSync(envFile)) {
    throw new Error(`STACKTAPE_API_KEY is not set and ${envFile} does not exist.`);
  }
  const parsed = loadDotenv({ path: envFile, processEnv: {} }).parsed ?? {};
  if (!parsed.STACKTAPE_API_KEY) {
    throw new Error(`${envFile} has no STACKTAPE_API_KEY.`);
  }
  return parsed.STACKTAPE_API_KEY;
};

const compileWithV3 = async ({
  caseName,
  executable
}: {
  caseName: string;
  executable: string;
}): Promise<{ template: Record<string, unknown>; command: string }> => {
  const workingDir = join(baselineCaseDirectory(caseName), 'v3');
  const outputDirectory = await mkdtemp(join(tmpdir(), `stacktape-j2-v3-${caseName}-`));
  const outFile = join(outputDirectory, 'template.yaml');
  const awsAccount = process.env.STP_DATA_SAFETY_AWS_ACCOUNT || 'stacktape-dev';
  const args = [
    'compile-template',
    '--stage',
    baselineIdentity.stage,
    '--region',
    baselineIdentity.region,
    '--projectName',
    baselineIdentity.projectName,
    '--awsAccount',
    awsAccount,
    '--agent',
    '--outFile',
    outFile
  ];
  const command = `stacktape ${args.slice(0, -1).join(' ')} <template>`;
  try {
    const child = Bun.spawn([executable, ...args], {
      cwd: workingDir,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        STACKTAPE_API_KEY: loadDevelopmentApiKey(),
        STP_CUSTOM_TRPC_API_ENDPOINT: process.env.STP_CUSTOM_TRPC_API_ENDPOINT || developmentEndpoint,
        STP_DISABLE_TELEMETRY: '1'
      }
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    const resultLine = stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as { type?: string; ok?: boolean; data?: { result?: Record<string, unknown> } };
        } catch {
          return undefined;
        }
      })
      .find((record) => record?.type === 'result');
    if (exitCode !== 0 || !resultLine?.ok || !resultLine.data?.result) {
      const errors = stdout
        .split('\n')
        .filter((line) => line.includes('"level":"error"'))
        .join('\n');
      throw new Error(
        `v3 compile-template failed for ${caseName} (exit ${exitCode}).\n${redact(errors || stderr).slice(0, 4000)}`
      );
    }
    return { template: resultLine.data.result, command };
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
};

type TemplateResource = { Type: string; Properties?: Record<string, unknown>; DependsOn?: string | string[] };

const referencesAny = (value: unknown, logicalIds: Set<string>): boolean => {
  if (Array.isArray(value)) return value.some((item) => referencesAny(item, logicalIds));
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.Ref === 'string' && logicalIds.has(record.Ref)) return true;
    const getAtt = record['Fn::GetAtt'];
    if (Array.isArray(getAtt) && typeof getAtt[0] === 'string' && logicalIds.has(getAtt[0])) return true;
    return Object.values(record).some((item) => referencesAny(item, logicalIds));
  }
  return false;
};

/**
 * The v3 CLI applies the organization's Console-level alarms to every stack it compiles, so a template compiled in the
 * development organization carries alarms that no baseline config declares and that the offline v4 synthesis cannot
 * know about. They are removed from the baseline together with the notification rules and permissions that only
 * exist for them, and the removal is recorded in the manifest. Everything else in the template is kept verbatim.
 */
const stripOrganizationAlarms = (template: Record<string, unknown>) => {
  const resources = template.Resources as Record<string, TemplateResource>;
  const removed = new Set<string>(
    Object.entries(resources)
      .filter(([, resource]) => resource.Type === 'AWS::CloudWatch::Alarm')
      .map(([logicalId]) => logicalId)
  );
  let grew = removed.size > 0;
  while (grew) {
    grew = false;
    for (const [logicalId, resource] of Object.entries(resources)) {
      if (removed.has(logicalId)) continue;
      const dependsOnly =
        (resource.Type === 'AWS::Events::Rule' || resource.Type === 'AWS::Lambda::Permission') &&
        referencesAny(resource.Properties, removed);
      if (dependsOnly) {
        removed.add(logicalId);
        grew = true;
      }
    }
  }
  for (const logicalId of removed) delete resources[logicalId];
  for (const resource of Object.values(resources)) {
    const dependencies = [resource.DependsOn ?? []].flat();
    if (!dependencies.some((dependency) => removed.has(dependency))) continue;
    const kept = dependencies.filter((dependency) => !removed.has(dependency));
    if (kept.length) resource.DependsOn = kept;
    else delete resource.DependsOn;
  }
  const outputs = template.Outputs as Record<string, { Value: unknown }> | undefined;
  const stackInfoOutput = outputs?.StpStackInfoMap?.Value as { 'Fn::Sub': string | [string, unknown] } | undefined;
  if (stackInfoOutput && removed.size) {
    const sub = stackInfoOutput['Fn::Sub'];
    const document = JSON.parse(Array.isArray(sub) ? sub[0] : sub) as {
      resources: Record<string, { cloudformationChildResources?: Record<string, unknown>; _nestedResources?: unknown }>;
    };
    const prune = (map: typeof document.resources) => {
      for (const resource of Object.values(map)) {
        for (const logicalId of removed) delete resource.cloudformationChildResources?.[logicalId];
        if (resource._nestedResources) prune(resource._nestedResources as typeof document.resources);
      }
    };
    prune(document.resources);
    const rewritten = JSON.stringify(document);
    stackInfoOutput['Fn::Sub'] = Array.isArray(sub) ? [rewritten, sub[1]] : rewritten;
  }
  return [...removed].sort();
};

const assertBaselineIdentity = (caseName: string, template: Record<string, unknown>) => {
  const resources = template.Resources as Record<string, { Properties?: { BucketName?: string } }> | undefined;
  const bucketName = resources?.StpDeploymentBucket?.Properties?.BucketName;
  const expected = `stp-deployment-bucket-${baselineStackHash}`;
  if (bucketName !== expected) {
    throw new Error(
      `${caseName}: the compiled template carries deployment bucket ${bucketName}, expected ${expected}. The CLI compiled under a different account, region, project or stage than the committed baseline identity.`
    );
  }
};

const writeTemplate = async (caseName: string, producer: 'v3' | 'v4', template: unknown) => {
  const path = join(baselineCaseDirectory(caseName), baselineTemplateFileName(producer));
  await writeFile(path, `${JSON.stringify(template, null, 2)}\n`);
  return path;
};

/** The committed templates are formatted like every other JSON file in the repository, so `pnpm fmt` never churns them. */
const formatBaselines = () => {
  const oxfmt = join(cliRoot, '..', '..', 'node_modules', '.bin', 'oxfmt');
  const result = Bun.spawnSync([oxfmt, baselinesDirectory], { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) {
    throw new Error(`oxfmt failed on ${baselinesDirectory}: ${result.stderr.toString().slice(0, 500)}`);
  }
};

const main = async () => {
  const { cases: selectedCases, v3, v4 } = parseArguments(process.argv.slice(2));
  const allCases = await listBaselineCases();
  const cases = selectedCases.length ? selectedCases : allCases;
  for (const caseName of cases) {
    if (!allCases.includes(caseName)) {
      throw new Error(`Unknown baseline case ${caseName}. Known cases: ${allCases.join(', ')}`);
    }
  }
  const manifest = await readManifest();
  manifest.identity = baselineIdentity;
  manifest.stackHash = baselineStackHash;

  if (v3) {
    const cli = await resolveV3Cli();
    console.log(`Compiling v3 baselines with stacktape ${cli.version} (${cli.executable})`);
    for (const caseName of cases) {
      const { template, command } = await compileWithV3({ caseName, executable: cli.executable });
      assertBaselineIdentity(caseName, template);
      const removedOrganizationAlarms = stripOrganizationAlarms(template);
      const path = await writeTemplate(caseName, 'v3', template);
      manifest.cases[caseName] = {
        ...manifest.cases[caseName],
        v3: {
          producer: `stacktape ${cli.version}`,
          producedAt: new Date().toISOString(),
          command,
          removedOrganizationAlarms
        }
      };
      console.log(`  ${caseName}: wrote ${path}`);
    }
  }

  if (v4) {
    console.log('Synthesizing v4 baselines through the data-safety spec');
    const spec = join(import.meta.dir, 'change-plan-compatibility.spec.ts');
    const child = Bun.spawn(['bun', 'test', spec], {
      cwd: cliRoot,
      stdin: 'ignore',
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, STACKTAPE_DATA_SAFETY_UPDATE_V4_BASELINES: '1' }
    });
    await child.exited;
    for (const caseName of cases) {
      const path = join(baselineCaseDirectory(caseName), baselineTemplateFileName('v4'));
      const written = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
      assertBaselineIdentity(caseName, written);
      manifest.cases[caseName] = {
        ...manifest.cases[caseName],
        v4: {
          producer: 'current synthesis (synthesizeFixture)',
          producedAt: new Date().toISOString(),
          command:
            'STACKTAPE_DATA_SAFETY_UPDATE_V4_BASELINES=1 bun test tests/data-safety/change-plan-compatibility.spec.ts'
        }
      };
    }
    // The spec is expected to fail against the baselines it has just replaced only when the v3 comparison changed;
    // the exit code is reported and the written templates are kept for review either way.
    if (child.exitCode !== 0) {
      console.log(`The data-safety spec exited with ${child.exitCode} while writing v4 baselines. Review the diff.`);
    }
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  formatBaselines();
  console.log(`Updated ${manifestPath}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
