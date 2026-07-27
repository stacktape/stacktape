// This file is auto-generated. Do not edit manually.
// Source: aws-licensemanager-grant.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsLicensemanagerGrant = {
  /** Arn of the grant. */
  GrantArn?: string;
  /** Name for the created Grant. */
  GrantName?: string;
  /** License Arn for the grant. */
  LicenseArn?: string;
  /** Home region for the created grant. */
  HomeRegion?: string;
  /** The version of the grant. */
  Version?: string;
  /** @uniqueItems true */
  AllowedOperations?: string[];
  /** @uniqueItems true */
  Principals?: string[];
  Status?: string;
};
