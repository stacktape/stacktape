// This file is auto-generated. Do not edit manually.
// Source: aws-healthimaging-datastore.json

/** Definition of AWS::HealthImaging::Datastore Resource Type */
export type AwsHealthimagingDatastore = {
  DatastoreArn?: string;
  DatastoreName?: string;
  DatastoreId?: string;
  DatastoreStatus?: "CREATING" | "CREATE_FAILED" | "ACTIVE" | "DELETING" | "DELETED";
  KmsKeyArn?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  Tags?: Record<string, string>;
};
