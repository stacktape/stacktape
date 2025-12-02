// This file is auto-generated. Do not edit manually.
// Source: aws-dms-replicationtask.json

/** Resource Type definition for AWS::DMS::ReplicationTask */
export type AwsDmsReplicationtask = {
  ReplicationTaskSettings?: string;
  CdcStartPosition?: string;
  CdcStopPosition?: string;
  MigrationType: string;
  TargetEndpointArn: string;
  ReplicationInstanceArn: string;
  TaskData?: string;
  CdcStartTime?: number;
  ResourceIdentifier?: string;
  TableMappings: string;
  ReplicationTaskIdentifier?: string;
  SourceEndpointArn: string;
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
