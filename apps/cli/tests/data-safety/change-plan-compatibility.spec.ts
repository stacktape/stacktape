/**
 * Data safety on update and upgrade (J2.2 / F3).
 *
 * For every baseline case, the current CLI synthesizes the case's v4 config under the baseline stack identity, and the
 * product's own change plan is computed offline twice: once against the template the last v3 CLI compiled for the v3
 * config, and once against the v4 template committed when the baselines were last regenerated. Neither update may
 * destroy or replace a database, bucket, table, file system, user pool, stream or queue.
 *
 * `bun tests/data-safety/regenerate-baselines.ts` refreshes the committed templates; see its header for the exact
 * procedure and credentials the v3 compile needs.
 */
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { ResourceImpact } from '@aws-cdk/cloudformation-diff';
import { serialize } from '@utils/misc';
import { describe, expect, test } from 'bun:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { synthesizeFixture } from '../characterization/synthesis-fixture';
import {
  baselineCaseDirectory,
  baselineIdentity,
  baselineStackHash,
  baselineTemplateFileName,
  listBaselineCases,
  readBaselineTemplate
} from './baseline-identity';
import { computeOfflineChangePlan, statefulCloudformationTypes } from './change-plan-check';
import { expectedV3UpgradeChanges } from './expected-v3-upgrade-changes';

const updateV4Baselines = process.env.STACKTAPE_DATA_SAFETY_UPDATE_V4_BASELINES === '1';
const templateOutputDirectory = process.env.STACKTAPE_DATA_SAFETY_TEMPLATE_OUTPUT_DIR;

const synthesizeCurrent = async (caseName: string) => {
  const workingDir = join(baselineCaseDirectory(caseName), 'v4');
  const template = await synthesizeFixture({
    configPath: join(workingDir, 'stacktape.yml'),
    workingDir,
    identity: baselineIdentity
  });
  const calculatedStackInfoMap = serialize(calculatedStackOverviewManager.stackInfoMap);
  if (templateOutputDirectory) {
    await mkdir(templateOutputDirectory, { recursive: true });
    await writeFile(join(templateOutputDirectory, `${caseName}.json`), `${JSON.stringify(template, null, 2)}\n`);
  }
  return { template, calculatedStackInfoMap };
};

const describeDrift = (drift: { logicalId: string; type: string; problem: string; detail?: string }[]) =>
  drift.map(
    ({ logicalId, type, problem, detail }) => `${logicalId} (${type}): ${problem}${detail ? ` [${detail}]` : ''}`
  );

describe('data safety: updates and the v3 upgrade keep stateful resources', async () => {
  const cases = await listBaselineCases();
  expect(cases.length).toBeGreaterThan(0);

  for (const caseName of cases) {
    describe(caseName, () => {
      test('the current template keeps the baseline stack identity', async () => {
        const { template } = await synthesizeCurrent(caseName);
        const deploymentBucket = template.Resources.StpDeploymentBucket as { Properties: { BucketName: string } };
        expect(deploymentBucket.Properties.BucketName).toBe(`stp-deployment-bucket-${baselineStackHash}`);
        if (updateV4Baselines) {
          await writeFile(
            join(baselineCaseDirectory(caseName), baselineTemplateFileName('v4')),
            `${JSON.stringify(template, null, 2)}\n`
          );
        }
      });

      test('updating a stack deployed by the current v4 keeps every stateful resource', async () => {
        const { template, calculatedStackInfoMap } = await synthesizeCurrent(caseName);
        const baseline = await readBaselineTemplate(caseName, 'v4');
        const result = computeOfflineChangePlan({
          baselineTemplate: baseline,
          currentTemplate: template,
          calculatedStackInfoMap,
          identity: baselineIdentity
        });

        expect(result.plan.safety.protectedResourceChanges).toEqual([]);
        expect(describeDrift(result.statefulDrift)).toEqual([]);
        // The committed v4 baseline is the current synthesis at the time of the last regeneration. Any change at all
        // means a resource would be updated on the next deploy without a config change; review it, then regenerate.
        expect(result.replacedOrRemoved).toEqual([]);
        expect(result.plan.summary).toMatchObject({ creates: 0, updates: 0, deletes: 0, replacements: 0 });
      });

      test('upgrading a stack deployed by the last v3 CLI keeps every stateful resource', async () => {
        const { template, calculatedStackInfoMap } = await synthesizeCurrent(caseName);
        const baseline = await readBaselineTemplate(caseName, 'v3');
        const result = computeOfflineChangePlan({
          baselineTemplate: baseline,
          currentTemplate: template,
          calculatedStackInfoMap,
          identity: baselineIdentity
        });

        // The stateful resources of the v3 stack must all survive with their logical IDs and physical names.
        expect(result.plan.safety.protectedResourceChanges).toEqual([]);
        expect(describeDrift(result.statefulDrift)).toEqual([]);
        const baselineStateful = Object.entries(baseline.Resources)
          .filter(([, resource]) => (statefulCloudformationTypes as readonly string[]).includes(resource.Type))
          .map(([logicalId]) => logicalId)
          .sort();
        expect(baselineStateful.length).toBeGreaterThan(0);
        for (const logicalId of baselineStateful) {
          expect(template.Resources[logicalId]?.Type).toBe(baseline.Resources[logicalId].Type);
        }

        // Everything else the upgrade replaces or removes is an intended v3 → v4 change documented in the upgrade
        // guide. A new entry here is either a bug or a change the guide must describe.
        const expected = expectedV3UpgradeChanges[caseName] ?? {};
        const unexpected = result.replacedOrRemoved.filter(
          ({ logicalId, impact }) =>
            !(expected[logicalId] && (impact === ResourceImpact.MAY_REPLACE || expected[logicalId] === impact))
        );
        expect(unexpected).toEqual([]);
        const stale = Object.keys(expected).filter(
          (logicalId) => !result.replacedOrRemoved.some((change) => change.logicalId === logicalId)
        );
        expect(stale).toEqual([]);
      });
    });
  }
});
