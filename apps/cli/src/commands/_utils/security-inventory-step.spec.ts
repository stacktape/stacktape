import { describe, expect, test } from 'bun:test';
import { inventoryContentDigest, type CycloneDxDocument } from '@domain-services/security-inventory/cyclonedx';
import type { SecurityInventoryResult } from '@domain-services/security-inventory';
import {
  type InventoryArtifacts,
  type PreviousInventory,
  reusableInventory,
  uploadSecurityInventory
} from './security-inventory-step';

const document = ({ version, components }: { version: string; components: string[] }): CycloneDxDocument =>
  ({
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: `urn:uuid:${version}`,
    version: 1,
    metadata: {
      timestamp: `2026-10-0${version.at(-1)}T10:00:00.000Z`,
      tools: { components: [{ type: 'application', name: 'trivy', version: '0.60.0' }] },
      component: { type: 'application', name: 'orders-production', version }
    },
    components: components.map((name) => ({
      type: 'library',
      name,
      version: '1.0.0',
      'bom-ref': `pkg:npm/${name}@1.0.0`
    }))
  }) as CycloneDxDocument;

const previousFor = (doc: CycloneDxDocument): PreviousInventory => ({
  document: doc,
  s3Key: 'security-inventory/v000002.json',
  version: 'v000002',
  sha256: 'previous-sha256',
  sizeBytes: 1234
});

const inventoryFor = (doc: CycloneDxDocument): SecurityInventoryResult => ({
  filePath: '/tmp/security-inventory.cdx.json',
  sha256: 'new-sha256',
  contentSha256: inventoryContentDigest(doc),
  sizeBytes: 1300,
  specVersion: '1.6',
  summary: { componentCount: doc.components?.length ?? 0, workloads: [], ecosystems: {} },
  generator: { tool: 'trivy', version: '0.60.0' },
  warnings: []
});

const artifactsWithUploads = () => {
  const uploads: string[] = [];
  const artifacts: InventoryArtifacts = {
    deploymentBucketName: 'stp-deployment-bucket-00000000',
    successfullyUploadedImages: [],
    previouslyUploadedImageTagsUsedInDeployment: [],
    previousObjects: [{ name: 'security-inventory', version: 'v000002', s3Key: 'security-inventory/v000002.json' }],
    getImageUrlForJob: ({ tag }) => tag,
    uploadToDeploymentBucket: async ({ s3Key }) => {
      uploads.push(s3Key);
      return { s3Key };
    }
  };
  return { artifacts, uploads };
};

const silent = { info: () => {}, warn: () => {}, debug: () => {} };

describe('security inventory of a redeploy', () => {
  test('the same packages under a new deployment version are the same inventory', () => {
    const previous = document({ version: 'v000002', components: ['express', 'pg'] });
    const current = document({ version: 'v000003', components: ['pg', 'express'] });
    expect(inventoryContentDigest(current)).toBe(inventoryContentDigest(previous));
    expect(reusableInventory({ inventory: inventoryFor(current), previous: previousFor(previous) })).toEqual(
      previousFor(previous)
    );
  });

  test('a changed package set is a new inventory', () => {
    const previous = document({ version: 'v000002', components: ['express', 'pg'] });
    const current = document({ version: 'v000003', components: ['express', 'pg', 'left-pad'] });
    expect(reusableInventory({ inventory: inventoryFor(current), previous: previousFor(previous) })).toBeUndefined();
    expect(reusableInventory({ inventory: inventoryFor(current), previous: null })).toBeUndefined();
  });

  test('an unchanged redeploy uploads no inventory and reports the previous object', async () => {
    const previous = document({ version: 'v000002', components: ['express', 'pg'] });
    const current = document({ version: 'v000003', components: ['express', 'pg'] });
    const { artifacts, uploads } = artifactsWithUploads();
    const inventory = inventoryFor(current);

    const pointer = await uploadSecurityInventory({
      inventory: { ...inventory, reuses: reusableInventory({ inventory, previous: previousFor(previous) }) },
      deploymentArtifacts: artifacts,
      version: 'v000003',
      tui: silent
    });

    expect(uploads).toEqual([]);
    expect(pointer).toMatchObject({
      bucket: 'stp-deployment-bucket-00000000',
      key: 'security-inventory/v000002.json',
      sha256: 'previous-sha256',
      sizeBytes: 1234,
      componentCount: 2
    });
  });

  test('a changed inventory is uploaded under the new version with both digests', async () => {
    const current = document({ version: 'v000003', components: ['express', 'pg', 'left-pad'] });
    const { artifacts, uploads } = artifactsWithUploads();
    const inventory = inventoryFor(current);

    const pointer = await uploadSecurityInventory({
      inventory,
      deploymentArtifacts: artifacts,
      version: 'v000003',
      tui: silent
    });

    expect(uploads).toEqual(['security-inventory/v000003.json']);
    expect(pointer).toMatchObject({ key: 'security-inventory/v000003.json', sha256: 'new-sha256', sizeBytes: 1300 });
  });
});
