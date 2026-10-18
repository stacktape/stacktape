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
  codeDigest() {
    return 'stp:code-digest';
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
