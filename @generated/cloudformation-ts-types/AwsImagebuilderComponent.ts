// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-component.json

/** Resource schema for AWS::ImageBuilder::Component */
export type AwsImagebuilderComponent = {
  /** The Amazon Resource Name (ARN) of the component. */
  Arn?: string;
  /** The name of the component. */
  Name: string;
  /** The version of the component. */
  Version: string;
  /** The description of the component. */
  Description?: string;
  /** The change description of the component. */
  ChangeDescription?: string;
  /**
   * The type of the component denotes whether the component is used to build the image or only to test
   * it.
   * @enum ["BUILD","TEST"]
   */
  Type?: "BUILD" | "TEST";
  /**
   * The platform of the component.
   * @enum ["Windows","Linux","macOS"]
   */
  Platform: "Windows" | "Linux" | "macOS";
  /**
   * The data of the component.
   * @minLength 1
   * @maxLength 16000
   */
  Data?: string;
  /** The KMS key identifier used to encrypt the component. */
  KmsKeyId?: string;
  /** The encryption status of the component. */
  Encrypted?: boolean;
  /** The tags associated with the component. */
  Tags?: Record<string, string>;
  /** The uri of the component. */
  Uri?: string;
  /** The operating system (OS) version supported by the component. */
  SupportedOsVersions?: string[];
  /** The latest version references of the component. */
  LatestVersion?: {
    /** The latest version ARN of the created component. */
    Arn?: string;
    /** The latest version ARN of the created component, with the same major version. */
    Major?: string;
    /** The latest version ARN of the created component, with the same minor version. */
    Minor?: string;
    /** The latest version ARN of the created component, with the same patch version. */
    Patch?: string;
  };
};
