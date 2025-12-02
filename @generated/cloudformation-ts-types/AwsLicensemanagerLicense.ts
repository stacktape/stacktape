// This file is auto-generated. Do not edit manually.
// Source: aws-licensemanager-license.json

/** Resource Type definition for AWS::LicenseManager::License */
export type AwsLicensemanagerLicense = {
  /**
   * ProductSKU of the license.
   * @minLength 1
   * @maxLength 1024
   */
  ProductSKU?: string;
  Issuer: {
    Name: string;
    SignKey?: string;
  };
  /** Name for the created license. */
  LicenseName: string;
  /** Product name for the created license. */
  ProductName: string;
  /** Home region for the created license. */
  HomeRegion: string;
  Validity: {
    /** Validity begin date for the license. */
    Begin: string;
    /** Validity begin date for the license. */
    End: string;
  };
  /** @uniqueItems true */
  Entitlements: {
    Name: string;
    Value?: string;
    MaxCount?: number;
    Overage?: boolean;
    Unit: string;
    AllowCheckIn?: boolean;
  }[];
  /** Beneficiary of the license. */
  Beneficiary?: string;
  ConsumptionConfiguration: {
    RenewType?: string;
    ProvisionalConfiguration?: {
      MaxTimeToLiveInMinutes: number;
    };
    BorrowConfiguration?: {
      MaxTimeToLiveInMinutes: number;
      AllowEarlyCheckIn: boolean;
    };
  };
  /** @uniqueItems true */
  LicenseMetadata?: {
    Name: string;
    Value: string;
  }[];
  /** Amazon Resource Name is a unique name for each resource. */
  LicenseArn?: string;
  Status?: string;
  /** The version of the license. */
  Version?: string;
};
