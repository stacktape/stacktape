// This file is auto-generated. Do not edit manually.
// Source: aws-inspectorv2-filter.json

/** Inspector Filter resource schema */
export type AwsInspectorv2Filter = {
  /**
   * Findings filter name.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  /**
   * Findings filter description.
   * @minLength 1
   * @maxLength 512
   */
  Description?: string;
  /** Findings filter criteria. */
  FilterCriteria: {
    AwsAccountId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    CodeVulnerabilityDetectorName?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    CodeVulnerabilityDetectorTags?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    CodeVulnerabilityFilePath?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    ComponentId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    ComponentType?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    Ec2InstanceImageId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    Ec2InstanceSubnetId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    Ec2InstanceVpcId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    EcrImageArchitecture?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    EcrImageHash?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    EcrImagePushedAt?: {
      EndInclusive?: number;
      StartInclusive?: number;
    }[];
    EcrImageRegistry?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    EcrImageRepositoryName?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    EcrImageTags?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    EpssScore?: {
      LowerInclusive?: number;
      UpperInclusive?: number;
    }[];
    ExploitAvailable?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    FindingArn?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    FindingStatus?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    FindingType?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    FirstObservedAt?: {
      EndInclusive?: number;
      StartInclusive?: number;
    }[];
    FixAvailable?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    InspectorScore?: {
      LowerInclusive?: number;
      UpperInclusive?: number;
    }[];
    LambdaFunctionExecutionRoleArn?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    LambdaFunctionLastModifiedAt?: {
      EndInclusive?: number;
      StartInclusive?: number;
    }[];
    LambdaFunctionLayers?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    LambdaFunctionName?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    LambdaFunctionRuntime?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    LastObservedAt?: {
      EndInclusive?: number;
      StartInclusive?: number;
    }[];
    NetworkProtocol?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    PortRange?: {
      BeginInclusive?: number;
      EndInclusive?: number;
    }[];
    RelatedVulnerabilities?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    ResourceId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    ResourceTags?: {
      Comparison: "EQUALS";
      Key?: string;
      Value?: string;
    }[];
    ResourceType?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    Severity?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    Title?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    UpdatedAt?: {
      EndInclusive?: number;
      StartInclusive?: number;
    }[];
    VendorSeverity?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    VulnerabilityId?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    VulnerabilitySource?: ({
      Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
      Value: string;
    })[];
    VulnerablePackages?: ({
      Architecture?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
      Epoch?: {
        LowerInclusive?: number;
        UpperInclusive?: number;
      };
      FilePath?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
      Name?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
      Release?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
      SourceLambdaLayerArn?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
      SourceLayerHash?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
      Version?: {
        Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS";
        Value: string;
      };
    })[];
  };
  /** Findings filter action. */
  FilterAction: "NONE" | "SUPPRESS";
  /**
   * Findings filter ARN.
   * @minLength 1
   * @maxLength 128
   */
  Arn?: string;
  Tags?: Record<string, string>;
};
