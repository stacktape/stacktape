import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import type { CloudformationTemplate } from '@domain-services/cloudformation-stack-manager/types';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import type { StackContext } from '@domain-services/stack-context';
import { templateManager } from '@domain-services/template-manager';
import { finalizeTemplate } from '@domain-services/template-manager/finalize';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getConfigManagerContext } from '../../src/commands/_utils/initialization';
import { Bucket, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from '@stacktape/config-authoring';

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
      packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' })
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

const protectedAwsEnvironment = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_PROFILE',
  'AWS_EC2_METADATA_DISABLED'
] as const;

/** Keeps this suite credential-free and offline: the stack lookups finalization needs are answered locally. */
const withoutAwsAccess = async <Result>(operation: () => Promise<Result>) => {
  if (!awsSdkManager.isInitialized) {
    awsSdkManager.init({
      credentials: { accessKeyId: 'characterization-forbidden', secretAccessKey: 'characterization-forbidden' },
      region: 'eu-west-1'
    });
  }
  const { cloudFormation } = awsSdkManager;
  const originalEnvironment = Object.fromEntries(protectedAwsEnvironment.map((name) => [name, process.env[name]]));
  const originalGetDetails = cloudFormation.getDetails;
  const originalGetResources = cloudFormation.getResources;

  process.env.AWS_ACCESS_KEY_ID = 'characterization-forbidden';
  process.env.AWS_SECRET_ACCESS_KEY = 'characterization-forbidden';
  process.env.AWS_SESSION_TOKEN = 'characterization-forbidden';
  process.env.AWS_PROFILE = '__stacktape_characterization_forbidden__';
  process.env.AWS_EC2_METADATA_DISABLED = 'true';
  cloudFormation.getDetails = async () => null;
  cloudFormation.getResources = async () => [];

  try {
    return await operation();
  } finally {
    cloudFormation.getDetails = originalGetDetails;
    cloudFormation.getResources = originalGetResources;
    for (const name of protectedAwsEnvironment) {
      const value = originalEnvironment[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
};

/**
 * Runs one CLI invocation: resolve every resource once, then finalize as many times as a hot-swap fallback would.
 *
 * `beforeSecondFinalization` stands in for the repackaging step — it changes the artifact state the registered
 * override function reads, exactly as producing a new package version does.
 */
const finalizeInOneInvocation = async ({
  passes,
  stage = 'finalization',
  beforeSecondFinalization
}: {
  passes: number;
  stage?: string;
  beforeSecondFinalization?: (artifactState: ArtifactState) => void;
}) =>
  withoutAwsAccess(async () => {
    const artifactState: ArtifactState = { digest: 'digest-before-repackaging' };
    calculatedStackOverviewManager.reset();
    configManager.reset();
    templateManager.reset();
    eventManager.reset();
    eventManager.setSilentMode(true);

    await applicationManager.init();
    const helperLambda = {
      digest: 'characterization',
      artifactPath: 'characterization-helper.zip',
      handler: 'index.default',
      size: 10
    };
    globalStateManager.operationStart = new Date();
    globalStateManager.rawCommands = ['deploy'];
    globalStateManager.rawArgs = {
      stage,
      region: 'eu-west-1',
      projectName: 'characterization',
      currentWorkingDirectory: join(import.meta.dir, 'fixtures', 'dense-application')
    };
    globalStateManager.additionalArgs = {};
    const compiledConfig = createFixtureConfig();
    globalStateManager.presetConfig = compiledConfig.config;
    globalStateManager.persistedState = {
      systemId: 'characterization-system',
      cliArgsDefaults: {},
      otherDefaults: {}
    };
    globalStateManager.systemId = globalStateManager.persistedState.systemId;
    globalStateManager.awsConfigFileContent = {};
    globalStateManager.availableAwsProfiles = [];
    globalStateManager.helperLambdaDetails = {
      batchJobTriggerLambda: helperLambda,
      stacktapeServiceLambda: helperLambda,
      cdnOriginRequestLambda: helperLambda,
      cdnOriginResponseLambda: helperLambda
    };
    globalStateManager.localTargetAwsAccount = {
      id: 'characterization-account',
      organizationId: 'characterization-organization',
      awsAccountId: '123456789999',
      connectionMode: 'BASIC',
      name: 'characterization',
      state: 'ACTIVE',
      primaryRegions: ['eu-west-1'],
      defaultRegion: 'eu-west-1'
    };
    globalStateManager.initializedDomainServices = [];
    globalStateManager.isInitialized = true;
    globalStateManager.targetStack = {
      stackName: `characterization-${stage}`,
      globallyUniqueStackHash: 'xxxxxxxx',
      stage,
      projectName: 'characterization',
      projectId: 'characterization-project'
    };
    const stackContext: StackContext = {
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      command: globalStateManager.command,
      globallyUniqueStackHash: globalStateManager.targetStack.globallyUniqueStackHash,
      invocationId: globalStateManager.invocationId,
      projectName: globalStateManager.targetStack.projectName,
      region: globalStateManager.region,
      stackName: globalStateManager.targetStack.stackName,
      stage: globalStateManager.targetStack.stage,
      workingDir: globalStateManager.workingDir
    };

    await eventManager.init();
    await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });
    configManager.transforms = compiledConfig.transforms;
    configManager.finalTransform = compiledConfig.finalTransform;
    await ec2Manager.init({
      instanceTypes: configManager.allUsedEc2InstanceTypes,
      openSearchInstanceTypes: configManager.allUsedOpenSearchVersionsAndInstanceTypes
    });

    deploymentArtifactManager.deploymentBucketName = 'stp-deployment-bucket-xxxxxxxx';
    deploymentArtifactManager.repositoryName = 'xxxxxxxx-stp-container-repository';
    deploymentArtifactManager.repositoryUrl =
      '123456789999.dkr.ecr.eu-west-1.amazonaws.com/xxxxxxxx-stp-container-repository';

    await stackManager.init({
      stackName: globalStateManager.targetStack.stackName,
      commandModifiesStack: false,
      commandRequiresDeployedStack: false
    });
    await Promise.all([
      templateManager.init({ stackDetails: undefined, stackName: stackContext.stackName }),
      calculatedStackOverviewManager.init({ context: stackContext })
    ]);
    await calculatedStackOverviewManager.resolveAllResources();

    // Registered the way every artifact-dependent override is: it reads the current artifact state when it runs, and
    // it appends to an array — the shape that makes a repeated pass duplicate content (Convex does this to
    // `Policies`).
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const bucket = template.Resources[cfLogicalNames.bucket('files')] as any;
      bucket.Metadata = {
        ...(bucket.Metadata || {}),
        ArtifactDigests: [...((bucket.Metadata?.ArtifactDigests as string[]) || []), artifactState.digest]
      };
    });

    const templates: CloudformationTemplate[] = [];
    for (let pass = 0; pass < passes; pass++) {
      if (pass === 1) {
        beforeSecondFinalization?.(artifactState);
      }
      await finalizeTemplate();
      templates.push(templateManager.getTemplate());
    }
    return templates;
  });

const bucketOf = (template: CloudformationTemplate) => template.Resources[cfLogicalNames.bucket('files')] as any;

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
