import type { DevModeConfig } from './shared';
import type { SupportedAWSRegion } from './aws-regions';

/**
 * #### Cost warning: an MSK Serverless cluster has a substantial always-on charge.
 *
 * ---
 *
 * AWS's US East (Ohio) pricing example charges about **$0.75 per cluster-hour**, or **$558 for a 31-day month**,
 * before partition, data-transfer, storage, Lambda invocation/duration, or PrivateLink charges. Every deployed stage creates and
 * pays for its own cluster. Prefer SQS or Kinesis unless Kafka protocol compatibility is a real requirement.
 *
 * Creates an Amazon MSK Serverless cluster with IAM authentication. Stacktape chooses the VPC, subnets, and secure
 * networking defaults; there are no broker sizes or capacity settings to manage.
 *
 * Kafka topics are deliberately not deployment resources. Create them with a Kafka AdminClient after deployment.
 * Workloads connected with `connectTo` receive the cluster ARN, name, and IAM bootstrap brokers and are permitted to
 * create and use topics, but not to alter or delete existing topics.
 */
export interface KafkaCluster {
  type: 'kafka-cluster';
  properties?: KafkaClusterProps;
}

export interface KafkaClusterProps {
  /**
   * #### Development-mode behavior.
   *
   * ---
   *
   * Stacktape does not emulate Kafka locally and does not deploy this costly cluster during `stacktape dev` by
   * default. Set `remote: true` only when the dev session should use a cluster deployed in AWS.
   */
  dev?: DevModeConfig;
}

/** Regions in which AWS currently offers MSK Serverless. */
export const MSK_SERVERLESS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'ca-central-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'eu-central-1',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3'
] as const satisfies readonly SupportedAWSRegion[];

export type MskServerlessRegion = (typeof MSK_SERVERLESS_REGIONS)[number];
