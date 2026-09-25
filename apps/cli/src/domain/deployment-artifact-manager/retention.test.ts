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

  test('never deletes something this deployment just uploaded', () => {
    const artifacts = ['v1', 'v2', 'v3', 'v4', 'v5'].map((version) => objectArtifact('api', version));
    const usage = { ...noUsage, uploadedObjects: [{ s3Key: 'api/v1.zip', name: 'api' }] };

    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage }))).not.toContain('api/v1.zip');
  });

  test('never deletes something this deployment reused rather than re-uploading', () => {
    /*
     * The shared-layer case. A layer whose content has not changed is not uploaded again, so nothing in
     * the upload records mentions it — but the template being deployed points straight at it. Deleting
     * it breaks the deployment doing the deleting.
     */
    const artifacts = ['hash-a', 'hash-b', 'hash-c', 'hash-d', 'hash-e'].map((hash) =>
      objectArtifact('shared-layer-1', hash)
    );
    const usage = { ...noUsage, reusedS3Keys: ['shared-layer-1/hash-a.zip'] };

    const obsolete = namesOf(selectObsoleteArtifacts({ artifacts, usage }));

    expect(obsolete).not.toContain('shared-layer-1/hash-a.zip');
    expect(obsolete).toContain('shared-layer-1/hash-b.zip');
  });

  test('a reused artifact is safe even when the keep window would not have covered it', () => {
    // Layer keys carry a content hash where other artifacts carry a version, so the window sorts them by
    // hash and the referenced one can sort anywhere. Being referenced has to outrank the window.
    const artifacts = Array.from({ length: 30 }, (_, index) =>
      objectArtifact('shared-layer-1', `hash-${String(index).padStart(2, '0')}`)
    );
    const usage = { ...noUsage, versionsToKeepPerName: 26, reusedS3Keys: ['shared-layer-1/hash-00.zip'] };

    expect(namesOf(selectObsoleteArtifacts({ artifacts, usage }))).not.toContain('shared-layer-1/hash-00.zip');
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
