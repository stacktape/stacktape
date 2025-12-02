// This file is auto-generated. Do not edit manually.
// Source: aws-appsync-sourceapiassociation.json

/** Resource Type definition for AWS::AppSync::SourceApiAssociation */
export type AwsAppsyncSourceapiassociation = {
  /** Identifier of the Source GraphQLApi to associate. It could be either GraphQLApi ApiId or ARN */
  SourceApiIdentifier?: string;
  /** Identifier of the Merged GraphQLApi to associate. It could be either GraphQLApi ApiId or ARN */
  MergedApiIdentifier?: string;
  /** Description of the SourceApiAssociation. */
  Description?: string;
  /** Customized configuration for SourceApiAssociation. */
  SourceApiAssociationConfig?: unknown;
  /** Id of the SourceApiAssociation. */
  AssociationId?: string;
  /** ARN of the SourceApiAssociation. */
  AssociationArn?: string;
  /** GraphQLApiId of the source API in the association. */
  SourceApiId?: string;
  /**
   * ARN of the source API in the association.
   * @pattern ^arn:aws(-(cn|us-gov))?:[a-z-]+:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$
   */
  SourceApiArn?: string;
  /** GraphQLApiId of the Merged API in the association. */
  MergedApiId?: string;
  /**
   * ARN of the Merged API in the association.
   * @pattern ^arn:aws(-(cn|us-gov))?:[a-z-]+:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$
   */
  MergedApiArn?: string;
  /**
   * Current status of SourceApiAssociation.
   * @enum ["MERGE_SCHEDULED","MERGE_FAILED","MERGE_SUCCESS","MERGE_IN_PROGRESS","AUTO_MERGE_SCHEDULE_FAILED","DELETION_SCHEDULED","DELETION_IN_PROGRESS","DELETION_FAILED"]
   */
  SourceApiAssociationStatus?: "MERGE_SCHEDULED" | "MERGE_FAILED" | "MERGE_SUCCESS" | "MERGE_IN_PROGRESS" | "AUTO_MERGE_SCHEDULE_FAILED" | "DELETION_SCHEDULED" | "DELETION_IN_PROGRESS" | "DELETION_FAILED";
  /** Current SourceApiAssociation status details. */
  SourceApiAssociationStatusDetail?: string;
  /** Date of last schema successful merge. */
  LastSuccessfulMergeDate?: string;
};
