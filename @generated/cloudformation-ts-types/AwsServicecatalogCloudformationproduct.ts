// This file is auto-generated. Do not edit manually.
// Source: aws-servicecatalog-cloudformationproduct.json

/** Resource Type definition for AWS::ServiceCatalog::CloudFormationProduct */
export type AwsServicecatalogCloudformationproduct = {
  Owner: string;
  Description?: string;
  ProductName?: string;
  SupportEmail?: string;
  ProductType?: string;
  ProvisioningArtifactNames?: string;
  Name: string;
  ReplaceProvisioningArtifacts?: boolean;
  SupportDescription?: string;
  Distributor?: string;
  ProvisioningArtifactIds?: string;
  AcceptLanguage?: string;
  SupportUrl?: string;
  Id?: string;
  SourceConnection?: {
    ConnectionParameters: {
      CodeStar?: {
        ArtifactPath: string;
        ConnectionArn: string;
        Repository: string;
        Branch: string;
      };
    };
    Type: string;
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** @uniqueItems false */
  ProvisioningArtifactParameters?: {
    Type?: string;
    Description?: string;
    Info: Record<string, unknown>;
    DisableTemplateValidation?: boolean;
    Name?: string;
  }[];
};
