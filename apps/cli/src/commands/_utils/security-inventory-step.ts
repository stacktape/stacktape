import type { StackContext } from '@domain-services/stack-context';
import type { SecurityInventoryPointer } from '@stacktape/console-api/security';
import { globalStateManager } from '@application-services/global-state-manager';
import { parseImageTag } from '@domain-services/deployment-artifact-manager/utils';
import {
  buildSecurityInventory,
  SECURITY_INVENTORY_ARTIFACT_NAME,
  type SecurityInventoryResult,
  securityInventoryS3Key
} from '@domain-services/security-inventory';
import {
  type CycloneDxDocument,
  inventoryContentDigest,
  parseCycloneDx
} from '@domain-services/security-inventory/cyclonedx';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { createHash } from 'node:crypto';
import { fsPaths } from 'src/config/runtime-paths';

/**
 * The deployment's dependency inventory as a step of `deploy`: started once the artifacts are uploaded so it runs
 * while CloudFormation works, uploaded and reported only after the deployment succeeded. Every failure here is a
 * warning; the deployment itself never depends on the inventory.
 */

type Printer = { info: (message: string) => void; warn: (message: string) => void; debug: (message: string) => void };

/** The parts of the artifact manager the inventory needs; typed narrowly so the step can be exercised on its own. */
export type InventoryArtifacts = {
  deploymentBucketName: string;
  successfullyUploadedImages: Array<{ tag: string; name: string }>;
  previouslyUploadedImageTagsUsedInDeployment: string[];
  previousObjects: Array<{ name: string; version: string | null; s3Key: string }>;
  getImageUrlForJob: (args: { tag: string }) => string;
  uploadToDeploymentBucket: (args: {
    artifactPath: string;
    s3Key: string;
    artifactName: string;
    contentType: string;
    metadata?: Record<string, string>;
  }) => Promise<{ s3Key: string }>;
};

const numericVersion = (version: string | null) => Number.parseInt((version ?? '').replaceAll(/\D/g, ''), 10) || 0;

/** The inventory object a redeploy with unchanged dependencies reports instead of uploading a new one. */
export type PreviousInventory = {
  document: CycloneDxDocument;
  s3Key: string;
  version: string | null;
  sha256: string;
  sizeBytes: number;
};

/** The deployment's inventory, or the previous object it reuses because the recorded packages are the same. */
export type InventoryStepResult = SecurityInventoryResult & { reuses?: PreviousInventory };

/** The newest inventory this stack uploaded before, for images this deployment did not rebuild. */
const loadPreviousInventory = async (artifacts: InventoryArtifacts): Promise<PreviousInventory | null> => {
  const latest = artifacts.previousObjects
    .filter((object) => object.name === SECURITY_INVENTORY_ARTIFACT_NAME)
    .toSorted((a, b) => numericVersion(b.version) - numericVersion(a.version))[0];
  if (!latest) return null;
  try {
    const text = await awsSdkManager.s3.getObjectText({
      bucketName: artifacts.deploymentBucketName,
      s3Key: latest.s3Key
    });
    return {
      document: parseCycloneDx(text),
      s3Key: latest.s3Key,
      version: latest.version,
      sha256: createHash('sha256').update(text).digest('hex'),
      sizeBytes: Buffer.byteLength(text)
    };
  } catch {
    return null;
  }
};

/**
 * An inventory that records exactly the packages of the previous one is the same inventory: the deployment reports the
 * object already in the bucket instead of writing a new version of it, so an unchanged redeploy uploads nothing but
 * its templates and retention keeps counting real changes.
 */
export const reusableInventory = ({
  inventory,
  previous
}: {
  inventory: Pick<SecurityInventoryResult, 'contentSha256'>;
  previous: PreviousInventory | null;
}): PreviousInventory | undefined =>
  previous && inventoryContentDigest(previous.document) === inventory.contentSha256 ? previous : undefined;

export const startSecurityInventory = ({
  deploymentArtifacts,
  stackContext,
  version,
  tui
}: {
  deploymentArtifacts: InventoryArtifacts;
  stackContext: StackContext;
  version: string;
  tui: Printer;
}): Promise<InventoryStepResult | null> =>
  (async () => {
    const images = deploymentArtifacts.successfullyUploadedImages.map(({ tag, name }) => ({
      workload: name,
      imageRef: deploymentArtifacts.getImageUrlForJob({ tag }),
      artifactDigest: parseImageTag(tag).digest
    }));
    const carryOver = deploymentArtifacts.previouslyUploadedImageTagsUsedInDeployment.map((tag) => {
      const { jobName, digest } = parseImageTag(tag);
      return { workload: jobName, artifactDigest: digest };
    });
    // Needed for the images this deployment did not rebuild, and to make sure the new inventory covers no less.
    const previous = await loadPreviousInventory(deploymentArtifacts);
    const inventory = await buildSecurityInventory({
      workingDirectory: stackContext.workingDir,
      outputDirectory: fsPaths.absoluteTempFolderPath({ invocationId: globalStateManager.invocationId }),
      application: { name: stackContext.stackName, version },
      images,
      carryOver,
      previousInventory: previous?.document ?? null,
      log: tui
    });
    const reuses = reusableInventory({ inventory, previous });
    return reuses ? { ...inventory, reuses } : inventory;
  })().catch((err: unknown) => {
    tui.warn(
      `Security inventory: not recorded for this deployment (${err instanceof Error ? err.message : String(err)}).`
    );
    return null;
  });

const describeCoverage = (inventory: SecurityInventoryResult) => {
  const images = inventory.summary.workloads.filter(({ source }) => source === 'image').length;
  const carried = inventory.summary.workloads.filter(({ source }) => source === 'carried-over').length;
  const parts = ['the source tree'];
  if (images) parts.push(`${images} rebuilt ${images === 1 ? 'image' : 'images'}`);
  if (carried) parts.push(`${carried} unchanged ${carried === 1 ? 'image' : 'images'}`);
  return parts.join(', ');
};

/** Uploads the inventory next to the other deployment artifacts and returns what the report tells the Console. */
export const uploadSecurityInventory = async ({
  inventory,
  deploymentArtifacts,
  version,
  tui
}: {
  inventory: InventoryStepResult | null;
  deploymentArtifacts: InventoryArtifacts;
  version: string;
  tui: Printer;
}): Promise<SecurityInventoryPointer | null> => {
  if (!inventory) return null;
  try {
    let s3Key: string;
    let sha256: string;
    let sizeBytes: number;
    if (inventory.reuses) {
      ({ s3Key, sha256, sizeBytes } = inventory.reuses);
      for (const warning of inventory.warnings) tui.warn(`Security inventory: ${warning}`);
      tui.info(
        `Security inventory: unchanged since ${inventory.reuses.version ?? 'the previous deployment'} (${inventory.summary.componentCount} packages); the recorded inventory stays in effect.`
      );
    } else {
      ({ s3Key } = await deploymentArtifacts.uploadToDeploymentBucket({
        artifactPath: inventory.filePath,
        s3Key: securityInventoryS3Key(version),
        artifactName: SECURITY_INVENTORY_ARTIFACT_NAME,
        contentType: 'application/json',
        metadata: { 'stacktape-sha256': inventory.sha256, 'stacktape-content-sha256': inventory.contentSha256 }
      }));
      ({ sha256, sizeBytes } = inventory);
      for (const warning of inventory.warnings) tui.warn(`Security inventory: ${warning}`);
      tui.info(
        `Security inventory: ${inventory.summary.componentCount} packages recorded from ${describeCoverage(inventory)}.`
      );
    }
    return {
      bucket: deploymentArtifacts.deploymentBucketName,
      key: s3Key,
      sha256,
      sizeBytes,
      format: 'cyclonedx-json',
      specVersion: inventory.specVersion,
      componentCount: inventory.summary.componentCount,
      generator: inventory.generator,
      workloads: inventory.summary.workloads.map(({ name, source, componentCount, artifactDigest }) => ({
        name,
        source,
        componentCount,
        ...(artifactDigest ? { artifactDigest } : {})
      }))
    };
  } catch (err) {
    tui.warn(
      `Security inventory: could not be uploaded to the deployment bucket (${err instanceof Error ? err.message : String(err)}).`
    );
    return null;
  }
};
