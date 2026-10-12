/**
 * The offline deploy loop: the source CLI deploys each family of the table to one MiniStack container, applies a
 * meaningful update, redeploys unchanged input and deletes the stack, while the real AWS SDK observes the effects on
 * the emulator (code version and configuration, retained data, delivery, absence after delete). No real AWS, no
 * profile, no inherited credentials; every HTTP request outside loopback is refused by the preload.
 *
 * Run through `pnpm --filter @stacktape/cli run test:ministack:deploy`, which builds the self-contained service
 * Lambda the emulator's local Node runtime needs and restores the normal helper artifacts afterwards.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CloudFormationClient, type StackResourceSummary } from '@aws-sdk/client-cloudformation';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import {
  absenceProbes,
  createEffectClients,
  destroyEffectClients,
  families,
  type EffectClients,
  type EffectContext
} from './families';
import {
  cliRoot,
  createFamilyProject,
  describeStackFailure,
  describeStackResources,
  getStackTemplate,
  resourceSnapshot,
  writeStackEvidence,
  runSourceCli,
  writeProjectFiles,
  type DeployStep
} from './harness';

const STEPS: DeployStep[] = ['create', 'update', 'unchanged', 'delete'];
const withoutDeploymentVersion = (template: string) =>
  template.replace(/(StpDeploymentVersion:\s*\n\s*Value: )v\d+/, '$1<version>');
const out = join(cliRoot, '.stacktape', 'ministack', new Date().toISOString().replaceAll(/[:.]/g, '-'));

type FamilyReport = {
  family: string;
  outcome: 'passed' | 'failed' | 'skipped';
  reason?: string;
  steps: Array<{ step: DeployStep; ms: number; checks: string[] }>;
};
const report: { image?: string; imageId?: string; fixtureStartupMs?: number; families: FamilyReport[] } = {
  families: []
};

let ministack: MiniStack;
let clients: EffectClients;
let cloudFormation: CloudFormationClient;

beforeAll(async () => {
  await assert.rejects(fetch('https://sts.amazonaws.com/'), /Tests cannot access external network target/);
  const helpers = await readdir(join(cliRoot, '__stacktape-dist', 'dev', 'helper-lambdas')).catch(() => []);
  assert.ok(
    helpers.some((file) => /^stacktapeServiceLambda-.+\.zip$/.test(file)),
    'Build the helper Lambdas first: pnpm --filter @stacktape/cli run test:ministack:deploy does it.'
  );
  await mkdir(out, { recursive: true });
  ministack = await startMiniStack({ label: 'deploy-loop' });
  report.image = ministack.image;
  report.imageId = ministack.imageId;
  report.fixtureStartupMs = ministack.startupMs;
  clients = createEffectClients(ministack);
  cloudFormation = new CloudFormationClient(ministack.clientConfig());
}, 180_000);

afterAll(async () => {
  // Whatever fails while closing clients or saving logs, the emulator is stopped and the report is written.
  try {
    destroyEffectClients(clients);
    cloudFormation?.destroy();
    await writeFile(join(out, 'ministack.log'), ministack?.logs() ?? '');
  } catch (error) {
    console.error(error);
  } finally {
    try {
      await ministack?.stop();
    } finally {
      await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
      const rows = report.families.map(({ family, outcome, steps }) => ({
        family,
        outcome,
        ...Object.fromEntries(steps.map(({ step, ms }) => [step, `${(ms / 1000).toFixed(1)}s`]))
      }));
      console.log(`MiniStack ${report.imageId} started in ${report.fixtureStartupMs} ms; report in ${out}`);
      console.table(rows);
    }
  }
});

describe('offline deploy loop against MiniStack', () => {
  for (const family of families) {
    const run = family.knownGap ? test.skip : test;
    run(
      family.knownGap ? `${family.name} (known gap: ${family.knownGap})` : family.name,
      async () => {
        const familyReport: FamilyReport = { family: family.name, outcome: 'failed', steps: [] };
        report.families.push(familyReport);
        const project = await createFamilyProject({ familyName: family.name, out, ministack });
        try {
          let previous: StackResourceSummary[] | undefined;
          let previousTemplate: string | undefined;
          for (const step of STEPS) {
            const version = step === 'create' ? 1 : 2;
            if (step === 'create' || step === 'update') {
              await writeProjectFiles(project, { 'stacktape.yml': family.config(version), ...family.files(version) });
            }
            const lookups = (resources: StackResourceSummary[]) => ({
              physical: (logicalId: string) => {
                const id = resources.find((resource) => resource.LogicalResourceId === logicalId)?.PhysicalResourceId;
                assert.ok(id, `the stack has no ${logicalId}`);
                return id;
              },
              physicalOfType: (type: string) =>
                resources.flatMap((resource) =>
                  resource.ResourceType === type && resource.PhysicalResourceId ? [resource.PhysicalResourceId] : []
                )
            });
            if (step === 'delete' && family.beforeDelete && previous) {
              await family.beforeDelete({
                endpoint: ministack.endpoint,
                resources: previous,
                clients,
                ...lookups(previous)
              });
            }
            const result = await runSourceCli({ project, step, ministack });
            const checks: string[] = [];
            familyReport.steps.push({ step, ms: result.ms, checks });
            if (result.exitCode !== 0 || result.timedOut) {
              const failure = await describeStackFailure(cloudFormation, project.stackName);
              throw new Error(
                `${family.name} ${step} ${result.timedOut ? 'timed out' : `exited ${result.exitCode}`}; log: ${result.logPath}\n${failure}\n${result.tail}`
              );
            }
            if (step === 'delete') {
              expect(await describeStackResources(cloudFormation, project.stackName)).toBeUndefined();
              for (const resource of previous ?? []) {
                const probe = absenceProbes[resource.ResourceType ?? ''];
                if (!probe || !resource.PhysicalResourceId) continue;
                await assert.rejects(
                  probe(clients, ministack.endpoint, resource.PhysicalResourceId),
                  (error) => /NotFound|NoSuchBucket|NonExistentQueue|does not exist|not exist|404/i.test(String(error)),
                  `${resource.LogicalResourceId} still exists after delete`
                );
                checks.push(`${resource.LogicalResourceId} absent`);
              }
              continue;
            }
            const resources = await describeStackResources(cloudFormation, project.stackName);
            assert.ok(resources, `the stack is missing after ${step}`);
            await writeStackEvidence({ cloudFormation, logs: clients.logs, s3: clients.s3, project, step, resources });
            if (previous) {
              for (const resource of resources) {
                const prior = previous.find((candidate) => candidate.LogicalResourceId === resource.LogicalResourceId);
                if (prior) {
                  assert.equal(
                    resource.PhysicalResourceId,
                    prior.PhysicalResourceId,
                    `${resource.LogicalResourceId} was replaced by the ${step} step`
                  );
                }
              }
              checks.push('physical IDs preserved');
            }
            const template = await getStackTemplate(cloudFormation, project.stackName);
            if (step === 'unchanged') {
              assert.deepEqual(
                result.changeSummary,
                { creates: 0, updates: 0, deletes: 0, replacements: 0, dangerousChanges: 0 },
                'unchanged input planned resource changes'
              );
              assert.ok(
                result.packagedWorkloads?.every((workload) => workload.skipped),
                'unchanged input repackaged a workload'
              );
              // The CLI's own report is not the proof: the stack must hold exactly the same resources (no additions,
              // removals or replacements) and exactly the same template as before the redeploy.
              assert.deepEqual(
                resourceSnapshot(resources),
                resourceSnapshot(previous ?? []),
                'the unchanged redeploy changed the stack resources'
              );
              // The CLI advances its deployment-version output on every deploy by design; everything else in the
              // template must be byte-identical.
              assert.equal(
                withoutDeploymentVersion(template),
                withoutDeploymentVersion(previousTemplate ?? ''),
                'the unchanged redeploy changed the stack template'
              );
              checks.push('zero planned changes, packaging skipped, identical resources and template');
            }
            const context: EffectContext = {
              step,
              version,
              endpoint: ministack.endpoint,
              resources,
              clients,
              checks,
              ...lookups(resources)
            };
            await family.assertEffects(context);
            previous = resources;
            previousTemplate = template;
          }
          expect(project.controlPlane.unexpectedProcedures).toEqual([]);
          familyReport.outcome = 'passed';
        } finally {
          await project.close();
        }
      },
      600_000
    );
  }
});
