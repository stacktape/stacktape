import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { exec } from '@utils/exec';
import fsExtra from 'fs-extra';
import { getStacktapeVersion } from '../../utils/versioning';
import {
  carryOverComponents,
  type CycloneDxDocument,
  type InventoryPart,
  type InventorySummary,
  mergeInventoryParts,
  parseCycloneDx,
  summarizeInventory
} from './cyclonedx';
import { ensureTrivyBinary, TRIVY_DOWNLOAD_SIZE_HINT, TRIVY_VERSION, trivyCacheDirectory } from './trivy';

/**
 * Builds the dependency inventory of one deployment: the packages the source tree's lockfiles declare, plus the
 * packages inside every container image this deployment rebuilt, plus the packages of images that were not rebuilt,
 * carried over from the previous inventory. The result is one CycloneDX file that the CLI uploads to the stack's
 * deployment bucket and points the Console at.
 */

export const SECURITY_INVENTORY_ARTIFACT_NAME = 'security-inventory';

/** Versioned like the other deployment artifacts, so the usual retention keeps the last few inventories. */
export const securityInventoryS3Key = (version: string) => `${SECURITY_INVENTORY_ARTIFACT_NAME}/${version}.json`;

export type SecurityInventoryImage = {
  workload: string;
  /** A reference the local Docker daemon resolves, for example the tag the image was pushed under. */
  imageRef: string;
  artifactDigest: string;
};

export type SecurityInventoryCarryOver = { workload: string; artifactDigest: string };

export type SecurityInventoryResult = {
  filePath: string;
  sha256: string;
  sizeBytes: number;
  specVersion: string;
  summary: InventorySummary;
  generator: { tool: 'trivy'; version: string };
  /** Parts that could not be produced; the inventory is still valid for what it covers. */
  warnings: string[];
};

type Logger = { info: (message: string) => void; debug: (message: string) => void };

const runTrivy = async ({ binaryPath, args, cwd }: { binaryPath: string; args: string[]; cwd: string }) => {
  await exec(binaryPath, args, {
    cwd,
    disableStdout: true,
    disableStderr: true,
    safeCommandDescription: `trivy ${args[0]}`
  }).catch((err: unknown) => {
    const details = err instanceof Error ? err.message : String(err);
    throw new Error(`trivy ${args[0]} failed: ${details.split('\n').slice(-3).join(' ').trim()}`);
  });
};

/** Flags shared by both scan modes: inventory only, no vulnerability database, no network lookups, quiet output. */
const inventoryFlags = ({ outputPath, cacheDirectory }: { outputPath: string; cacheDirectory: string }) => [
  '--format',
  'cyclonedx',
  '--output',
  outputPath,
  '--cache-dir',
  cacheDirectory,
  '--offline-scan',
  '--skip-db-update',
  '--skip-java-db-update',
  '--timeout',
  '10m',
  '--quiet'
];

export const buildSecurityInventory = async ({
  workingDirectory,
  outputDirectory,
  application,
  images,
  carryOver,
  previousInventory,
  log
}: {
  /** The directory holding the Stacktape configuration; lockfiles are read from its tree. */
  workingDirectory: string;
  outputDirectory: string;
  application: { name: string; version: string };
  images: SecurityInventoryImage[];
  carryOver: SecurityInventoryCarryOver[];
  previousInventory: CycloneDxDocument | null;
  log: Logger;
}): Promise<SecurityInventoryResult> => {
  const { binaryPath, downloaded } = await ensureTrivyBinary({
    onDownloadStart: ({ version }) =>
      log.info(`Security inventory: downloading Trivy ${version} (${TRIVY_DOWNLOAD_SIZE_HINT}, once per machine).`)
  });
  if (downloaded) log.debug(`Trivy ${TRIVY_VERSION} is ready at ${binaryPath}.`);
  const cacheDirectory = trivyCacheDirectory();
  await fsExtra.ensureDir(outputDirectory);
  const parts: InventoryPart[] = [];
  const warnings: string[] = [];

  const projectOutput = join(outputDirectory, 'security-inventory-project.cdx.json');
  await runTrivy({
    binaryPath,
    cwd: workingDirectory,
    args: [
      'fs',
      ...inventoryFlags({ outputPath: projectOutput, cacheDirectory }),
      // Lockfiles describe the dependencies; installed trees, build output and Stacktape's own state do not add facts.
      '--skip-dirs',
      '**/node_modules',
      '--skip-dirs',
      '.stacktape',
      '--skip-dirs',
      '.git',
      workingDirectory
    ]
  });
  parts.push({
    workload: null,
    source: 'filesystem',
    document: parseCycloneDx(await fsExtra.readFile(projectOutput, 'utf8'))
  });

  for (const image of images) {
    const imageOutput = join(outputDirectory, `security-inventory-${image.workload}.cdx.json`);
    try {
      await runTrivy({
        binaryPath,
        cwd: workingDirectory,
        args: [
          'image',
          ...inventoryFlags({ outputPath: imageOutput, cacheDirectory }),
          '--image-src',
          'docker',
          image.imageRef
        ]
      });
      parts.push({
        workload: image.workload,
        artifactDigest: image.artifactDigest,
        source: 'image',
        document: parseCycloneDx(await fsExtra.readFile(imageOutput, 'utf8'))
      });
    } catch (err) {
      warnings.push(`The image of ${image.workload} could not be read: ${err instanceof Error ? err.message : err}`);
    }
  }

  for (const unchanged of carryOver) {
    const components = previousInventory ? carryOverComponents({ previous: previousInventory, ...unchanged }) : [];
    if (components.length) {
      parts.push({
        workload: unchanged.workload,
        artifactDigest: unchanged.artifactDigest,
        source: 'carried-over',
        document: { bomFormat: 'CycloneDX', specVersion: previousInventory!.specVersion, components }
      });
    } else {
      warnings.push(
        `The image of ${unchanged.workload} was not rebuilt and no earlier inventory describes it; its packages are not listed until it is rebuilt.`
      );
    }
  }

  const document = mergeInventoryParts({
    parts,
    application,
    tools: [
      { name: 'trivy', version: TRIVY_VERSION },
      { name: 'stacktape', version: getStacktapeVersion() }
    ]
  });
  const text = JSON.stringify(document);
  const filePath = join(outputDirectory, 'security-inventory.cdx.json');
  await fsExtra.writeFile(filePath, text);
  return {
    filePath,
    sha256: createHash('sha256').update(text).digest('hex'),
    sizeBytes: Buffer.byteLength(text),
    specVersion: document.specVersion,
    summary: summarizeInventory(document),
    generator: { tool: 'trivy', version: TRIVY_VERSION },
    warnings
  };
};
