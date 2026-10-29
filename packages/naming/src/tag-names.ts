import { createHash } from 'node:crypto';

export const tagNames = {
  stackName() {
    return 'stp:stack-name';
  },
  projectName() {
    return 'stp:project-name';
  },
  stage() {
    return 'stp:stage';
  },
  globallyUniqueStackHash() {
    return 'stp:globally-unique-stack-hash';
  },
  /**
   * Set by `stacktape dev` on every stack it creates or updates, from the first create on. Unlike the dev-stack output
   * of the full template, a stack tag survives a rollback to the bootstrap template.
   */
  devStack() {
    return 'stp:dev-stack';
  },
  /**
   * Set on a secret that `stacktape dev` generated (a database password), with the dev stack's name. A deployment that
   * is not a dev session removes it and the user tags (see `devSecretUser`). A CLI up to 4.0.0-preview.11 deletes the
   * secrets that still have it with that stage.
   */
  devGeneratedSecret() {
    return 'stp:dev-generated-for';
  },
  /**
   * One tag per dev stage that uses a dev-generated secret, with the dev stack's name as value; the key carries a hash
   * of the name, which keeps it within the 128 characters a tag key may have. Deleting a stage removes its tag and
   * keeps the secret.
   */
  devSecretUser(stackName: string) {
    return `stp:dev-used-by:${createHash('sha256').update(stackName).digest('hex').slice(0, 16)}`;
  },
  devSecretUserPrefix() {
    return 'stp:dev-used-by:';
  },
  codeDigest() {
    return 'stp:code-digest';
  },
  /** The function package and maps. `codeDigest` also covers its shared layers for runtime/source-map identity. */
  artifactDigest() {
    return 'stp:artifact-digest';
  },
  /** The shared chunk layers a function runs with, as `<layer number>:<content hash>` pairs separated by `/`. */
  sharedLayers() {
    return 'stp:shared-layers';
  },
  autoscalingGroupName() {
    return 'stp:asg-name';
  },
  awsEcsClusterName() {
    return 'aws:ecs:clusterName';
  },
  awsCloudformationLogicalName() {
    return 'aws:cloudformation:logical-id';
  },
  cfAttributionLogicalName() {
    return 'stp:cf:attributionLogicalName';
  }
};
