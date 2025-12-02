// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-endpointauthorization.json

/**
 * Describes an endpoint authorization for authorizing Redshift-managed VPC endpoint access to a
 * cluster across AWS accounts.
 */
export type AwsRedshiftEndpointauthorization = {
  /** The status of the authorization action. */
  Status?: string;
  /** The AWS account ID of the grantee of the cluster. */
  Grantee?: string;
  /** The target AWS account ID to grant or revoke access for. */
  Account: string;
  /** The AWS account ID of the cluster owner. */
  Grantor?: string;
  /** The number of Redshift-managed VPC endpoints created for the authorization. */
  EndpointCount?: number;
  /** The time (UTC) when the authorization was created. */
  AuthorizeTime?: string;
  /** The VPCs allowed access to the cluster. */
  AllowedVPCs?: string[];
  /**
   * Indicates whether to force the revoke action. If true, the Redshift-managed VPC endpoints
   * associated with the endpoint authorization are also deleted.
   */
  Force?: boolean;
  /** Indicates whether all VPCs in the grantee account are allowed access to the cluster. */
  AllowedAllVPCs?: boolean;
  /** The virtual private cloud (VPC) identifiers to grant or revoke access to. */
  VpcIds?: string[];
  /**
   * The cluster identifier.
   * @pattern ^(?=^[a-z][a-z0-9]*(-[a-z0-9]+)*$).{1,63}$
   */
  ClusterIdentifier: string;
  /** The status of the cluster. */
  ClusterStatus?: string;
};
