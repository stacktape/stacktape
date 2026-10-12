import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { Bucket, LambdaFunction, JsBundleLambdaPackaging, defineConfig } from '@stacktape/config-authoring';
import { synthesizeFixture, withCredentiallessSynthesisBoundary } from './synthesis-fixture';

/**
 * A deploy can finalize the same template twice. `prepareArtifactsForStackDeployment` finalizes once and shows the
 * user the resulting diff; if `--hotSwap` then turns out to be impossible, the jobs that were skipped on the
 * assumption of a hot-swap are repackaged and the template is finalized again so that what is deployed matches the
 * artifacts that now exist.
 *
 * Finalization mutates the template in place and is not idempotent: `DependsOn` is concatenated, template override
 * functions append to arrays such as an IAM role's `Policies`, and customer-authored resource and final transforms are
 * under no obligation to be repeatable. Running the second pass over the first pass's output therefore deploys a
 * template that differs from the reviewed diff.
 *
 * These tests drive the real `resolveAllResources` → `finalizeTemplate` path twice in one invocation, with
 * deliberately non-idempotent transforms and an override whose artifact value changes between the passes — the shape
 * of the actual fallback.
 */

/** Stands in for the artifact state an override reads back after packaging. Per invocation, so tests stay unordered. */
type ArtifactState = { digest: string };

const NON_IDEMPOTENT_TAG = { Key: 'stacktape:transform-pass', Value: 'applied' };

const createFixtureConfig = () =>
  defineConfig(() => {
    const files = new Bucket({
      transforms: {
        // Appends rather than replaces: two applications leave two tags behind.
        bucket: (properties) => ({
          ...properties,
          Tags: [...((properties.Tags as unknown[]) || []), NON_IDEMPOTENT_TAG]
        })
      }
    });
    const api = new LambdaFunction({
      packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' })
    });

    return {
      resources: { files, api },
      finalTransform: (template) => ({
        ...template,
        Metadata: {
          ...template.Metadata,
          // Also appends: the marker list counts how many times the whole-template transform ran.
          FinalTransformPasses: [...(((template.Metadata as any)?.FinalTransformPasses as unknown[]) || []), 'applied']
        }
      })
    };
  })({
    projectName: 'characterization',
    stage: 'finalization',
    region: 'eu-west-1',
    cliArgs: {} as any,
    command: 'deploy',
    awsProfile: '',
    user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
  });

/** Runs finalization twice in one real invocation, including the artifact update made by hot-swap fallback. */
const finalizeInOneInvocation = async ({
  passes,
  stage = 'finalization',
  beforeSecondFinalization
}: {
  passes: number;
  stage?: string;
  beforeSecondFinalization?: (artifactState: ArtifactState) => void;
}) => {
  const artifactState: ArtifactState = { digest: 'digest-before-repackaging' };
  const first = await synthesizeFixture({
    compiledConfig: createFixtureConfig(),
    workingDir: join(import.meta.dir, 'fixtures', 'dense-application'),
    synthesisContext: { stackName: `characterization-${stage}`, stage },
    beforeFinalize: () => {
      templateManager.addFinalTemplateOverrideFn(async (template) => {
        const bucket = template.Resources[cfLogicalNames.bucket('files')] as any;
        bucket.Metadata = {
          ...(bucket.Metadata || {}),
          ArtifactDigests: [...((bucket.Metadata?.ArtifactDigests as string[]) || []), artifactState.digest]
        };
      });
    }
  });
  const templates: CloudFormationTemplate[] = [first];
  for (let pass = 1; pass < passes; pass++) {
    if (pass === 1) beforeSecondFinalization?.(artifactState);
    await withCredentiallessSynthesisBoundary(() => finalizeTemplate());
    templates.push(templateManager.getTemplate());
  }
  return templates;
};

const bucketOf = (template: CloudFormationTemplate) => template.Resources[cfLogicalNames.bucket('files')] as any;

describe('finalizing a template more than once in one invocation', () => {
  test('reproduces the first template exactly when nothing changed in between', async () => {
    const [first, second] = await finalizeInOneInvocation({ passes: 2 });

    // The strongest statement of the invariant: a second pass over unchanged inputs is a no-op on the output, so a
    // hot-swap fallback cannot deploy anything the user did not see in the reviewed diff.
    expect(second).toEqual(first);
  });

  test('applies resource transforms, final transforms and overrides once per pass, not once per template', async () => {
    const [first, second] = await finalizeInOneInvocation({ passes: 2 });

    // Each of these appends. Applied to the previous pass's output they would double; applied to the pre-finalization
    // baseline they stay at one.
    expect(bucketOf(first).Properties.Tags).toEqual([NON_IDEMPOTENT_TAG]);
    expect(bucketOf(second).Properties.Tags).toEqual([NON_IDEMPOTENT_TAG]);
    expect((first.Metadata as any).FinalTransformPasses).toEqual(['applied']);
    expect((second.Metadata as any).FinalTransformPasses).toEqual(['applied']);
    expect(bucketOf(first).Metadata.ArtifactDigests).toHaveLength(1);
    expect(bucketOf(second).Metadata.ArtifactDigests).toHaveLength(1);
  });

  test('lets the second pass observe the artifact state produced after the first one', async () => {
    const [first, second] = await finalizeInOneInvocation({
      passes: 2,
      // What repackaging the skipped jobs amounts to, as far as the template is concerned.
      beforeSecondFinalization: (artifactState) => {
        artifactState.digest = 'digest-after-repackaging';
      }
    });

    expect(bucketOf(first).Metadata.ArtifactDigests).toEqual(['digest-before-repackaging']);
    // Rewinding the template must not also rewind what the override functions read.
    expect(bucketOf(second).Metadata.ArtifactDigests).toEqual(['digest-after-repackaging']);
    // Nothing from the first pass survives anywhere in the deployed template.
    expect(JSON.stringify(second)).not.toContain('digest-before-repackaging');
  });

  test('does not reuse a previous invocation baseline after a reset', async () => {
    const [firstInvocation] = await finalizeInOneInvocation({ passes: 1, stage: 'finalization' });
    const [secondInvocation] = await finalizeInOneInvocation({ passes: 1, stage: 'other' });

    // Each invocation resolves its own resources, so restoring a stale baseline here would deploy the previous
    // invocation's stack under this invocation's name.
    expect(bucketOf(firstInvocation).Properties.BucketName).toContain('characterization-finalization');
    expect(bucketOf(secondInvocation).Properties.BucketName).toContain('characterization-other');
    expect(JSON.stringify(secondInvocation)).not.toContain('characterization-finalization');
  });
});
