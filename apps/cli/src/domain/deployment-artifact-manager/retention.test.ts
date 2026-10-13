import { describe, expect, test } from 'bun:test';
import type { DeploymentArtifactUsage } from './retention';
import { selectObsoleteArtifacts } from './retention';

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
