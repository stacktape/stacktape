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
   * Set on a secret that `stacktape dev` generated (a database password), with the dev stack's name. Deleting that
   * stage deletes the secret; a deployment of another stage that uses the secret removes the tag, so the secret stays.
   */
  devGeneratedSecret() {
    return 'stp:dev-generated-for';
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
