import { describe, expect, test } from 'bun:test';
import type { DeploymentArtifactUsage } from './retention';
import { keepLayersOfRetainedReleases, selectObsoleteArtifacts } from './retention';

const noUsage: DeploymentArtifactUsage = {
  uploadedObjects: [],
  uploadedImages: [],
  reusedS3Keys: [],
  reusedImageTags: [],
  versionsToKeepPerName: 3,
  registryCacheTags: []
};

const objectArtifact = (name: string, version: string) => ({
  name,
  version,
  s3Key: `${name}/${version}.zip`
});
const imageArtifact = (name: string, version: string) => ({ name, version, tag: `${name}--${version}` });
const namesOf = (artifacts: { s3Key?: string; tag?: string }[]) =>
  artifacts.map((artifact) => artifact.s3Key ?? artifact.tag).toSorted();

describe('what a deployment may delete', () => {
  test('keeps the newest versions of each artifact and drops the rest', () => {
    const artifacts = ['v1', 'v2', 'v3', 'v4', 'v5'].map((version) => objectArtifact('api', version));

    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage: noUsage }))).toEqual(['api/v1.zip', 'api/v2.zip']);
  });

  test('counts versions per artifact name, not across the stack', () => {
    const artifacts = [
      ...['v1', 'v2', 'v3', 'v4'].map((version) => objectArtifact('api', version)),
      ...['v3', 'v4'].map((version) => objectArtifact('worker', version))
    ];

    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage: noUsage }))).toEqual(['api/v1.zip']);
  });

  test('the same protection applies to container images', () => {
    const artifacts = ['v1', 'v2', 'v3', 'v4'].map((version) => imageArtifact('api', version));
    const usage = { ...noUsage, reusedImageTags: ['api--v1'] };

    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage }))).toEqual([]);
  });

  test('a version uploaded now takes a slot from the history rather than growing it', () => {
    // The listing already contains what this run uploaded, so without this the kept count would drift
    // up by one on every deploy that changed something.
    const artifacts = ['v1', 'v2', 'v3', 'v4'].map((version) => objectArtifact('api', version));
    const withUpload = { ...noUsage, uploadedObjects: [{ s3Key: 'api/v4.zip', name: 'api' }] };

    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage: noUsage }))).toEqual(['api/v1.zip']);
    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage: withUpload }))).toEqual(['api/v1.zip', 'api/v2.zip']);
  });
});

describe('shared layers of retained releases', () => {
  const bucket = 'stp-deployment-bucket-abc123';
  const layerOf = (s3Key: string) => ({
    Resources: {
      SharedChunkLayer1: {
        Type: 'AWS::Lambda::LayerVersion',
        Properties: { Content: { S3Bucket: bucket, S3Key: s3Key } }
      }
    }
  });

  test('a layer the hash-ordered window drops stays while a retained release uses it', () => {
    // previousVersionsToKeep: 1 keeps releases v2 and v3. Their layers are `b…` and `f…`; the window over hashes
    // keeps `f…` and `e…` and would drop `b…`, which v2 still needs.
    const artifacts = ['a1', 'b2', 'e5', 'f6'].map((hash) => ({
      name: 'shared-layer-1',
      version: hash,
      s3Key: `shared-layer-1/${hash}.zip`
    }));
    const obsolete = selectObsoleteArtifacts({
      artifacts,
      usage: { ...noUsage, versionsToKeepPerName: 2, reusedS3Keys: ['shared-layer-1/f6.zip'] }
    });
    expect(namesOf(obsolete)).toEqual(['shared-layer-1/a1.zip', 'shared-layer-1/b2.zip']);

    const kept = keepLayersOfRetainedReleases({
      obsolete,
      retainedTemplates: [layerOf('shared-layer-1/b2.zip'), layerOf('shared-layer-1/f6.zip')],
      deploymentBucketName: bucket
    });

    expect(namesOf(kept)).toEqual(['shared-layer-1/a1.zip']);
  });
});
