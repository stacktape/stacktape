// This file is auto-generated. Do not edit manually.
// Source: aws-glue-devendpoint.json

/** Resource Type definition for AWS::Glue::DevEndpoint */
export type AwsGlueDevendpoint = {
  ExtraJarsS3Path?: string;
  PublicKey?: string;
  NumberOfNodes?: number;
  Arguments?: Record<string, unknown>;
  SubnetId?: string;
  /** @uniqueItems false */
  PublicKeys?: string[];
  /** @uniqueItems false */
  SecurityGroupIds?: string[];
  RoleArn: string;
  WorkerType?: string;
  EndpointName?: string;
  GlueVersion?: string;
  ExtraPythonLibsS3Path?: string;
  SecurityConfiguration?: string;
  Id?: string;
  NumberOfWorkers?: number;
  Tags?: Record<string, unknown>;
};
