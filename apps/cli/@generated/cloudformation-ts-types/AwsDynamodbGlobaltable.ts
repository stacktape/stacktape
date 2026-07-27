// This file is auto-generated. Do not edit manually.
// Source: aws-dynamodb-globaltable.json

/** Version: None. Resource Type definition for AWS::DynamoDB::GlobalTable */
export type AwsDynamodbGlobaltable = {
  /** @enum ["EVENTUAL","STRONG"] */
  MultiRegionConsistency?: "EVENTUAL" | "STRONG";
  TableId?: string;
  SSESpecification?: {
    SSEEnabled: boolean;
    SSEType?: string;
  };
  StreamSpecification?: {
    StreamViewType: string;
  };
  WarmThroughput?: unknown | unknown;
  /**
   * @minItems 1
   * @uniqueItems true
   */
  Replicas: ({
    SSESpecification?: {
      KMSMasterKeyId: unknown | unknown | unknown;
    };
    KinesisStreamSpecification?: {
      /** @enum ["MICROSECOND","MILLISECOND"] */
      ApproximateCreationDateTimePrecision?: "MICROSECOND" | "MILLISECOND";
      StreamArn: string;
    };
    ContributorInsightsSpecification?: {
      /** @enum ["ACCESSED_AND_THROTTLED_KEYS","THROTTLED_KEYS"] */
      Mode?: "ACCESSED_AND_THROTTLED_KEYS" | "THROTTLED_KEYS";
      Enabled: boolean;
    };
    PointInTimeRecoverySpecification?: {
      PointInTimeRecoveryEnabled?: boolean;
      /**
       * @minimum 1
       * @maximum 35
       */
      RecoveryPeriodInDays?: number;
    };
    ReplicaStreamSpecification?: {
      ResourcePolicy: {
        PolicyDocument: Record<string, unknown>;
      };
    };
    /** @uniqueItems true */
    GlobalSecondaryIndexes?: ({
      /**
       * @minLength 3
       * @maxLength 255
       */
      IndexName: string;
      ContributorInsightsSpecification?: {
        /** @enum ["ACCESSED_AND_THROTTLED_KEYS","THROTTLED_KEYS"] */
        Mode?: "ACCESSED_AND_THROTTLED_KEYS" | "THROTTLED_KEYS";
        Enabled: boolean;
      };
      ReadProvisionedThroughputSettings?: {
        /** @minimum 1 */
        ReadCapacityUnits?: number;
        ReadCapacityAutoScalingSettings?: {
          /** @minimum 1 */
          MinCapacity: number;
          /** @minimum 1 */
          SeedCapacity?: number;
          TargetTrackingScalingPolicyConfiguration: {
            /** @minimum 0 */
            ScaleOutCooldown?: number;
            TargetValue: number;
            DisableScaleIn?: boolean;
            /** @minimum 0 */
            ScaleInCooldown?: number;
          };
          /** @minimum 1 */
          MaxCapacity: number;
        };
      };
      ReadOnDemandThroughputSettings?: {
        /** @minimum 1 */
        MaxReadRequestUnits?: number;
      };
    })[];
    Region: string;
    ResourcePolicy?: {
      PolicyDocument: Record<string, unknown>;
    };
    ReadProvisionedThroughputSettings?: {
      /** @minimum 1 */
      ReadCapacityUnits?: number;
      ReadCapacityAutoScalingSettings?: {
        /** @minimum 1 */
        MinCapacity: number;
        /** @minimum 1 */
        SeedCapacity?: number;
        TargetTrackingScalingPolicyConfiguration: {
          /** @minimum 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
          DisableScaleIn?: boolean;
          /** @minimum 0 */
          ScaleInCooldown?: number;
        };
        /** @minimum 1 */
        MaxCapacity: number;
      };
    };
    TableClass?: string;
    DeletionProtectionEnabled?: boolean;
    /** @uniqueItems true */
    Tags?: {
      Value: string;
      Key: string;
    }[];
    ReadOnDemandThroughputSettings?: {
      /** @minimum 1 */
      MaxReadRequestUnits?: number;
    };
  })[];
  WriteProvisionedThroughputSettings?: {
    WriteCapacityAutoScalingSettings?: {
      /** @minimum 1 */
      MinCapacity: number;
      /** @minimum 1 */
      SeedCapacity?: number;
      TargetTrackingScalingPolicyConfiguration: {
        /** @minimum 0 */
        ScaleOutCooldown?: number;
        TargetValue: number;
        DisableScaleIn?: boolean;
        /** @minimum 0 */
        ScaleInCooldown?: number;
      };
      /** @minimum 1 */
      MaxCapacity: number;
    };
  };
  WriteOnDemandThroughputSettings?: {
    /** @minimum 1 */
    MaxWriteRequestUnits?: number;
  };
  /**
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  GlobalTableWitnesses?: {
    Region?: string;
  }[];
  TableName?: string;
  /**
   * @minItems 1
   * @uniqueItems true
   */
  AttributeDefinitions: {
    AttributeType: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    AttributeName: string;
  }[];
  BillingMode?: string;
  /** @uniqueItems true */
  GlobalSecondaryIndexes?: ({
    /**
     * @minLength 3
     * @maxLength 255
     */
    IndexName: string;
    Projection: {
      /**
       * @maxItems 20
       * @uniqueItems true
       */
      NonKeyAttributes?: string[];
      ProjectionType?: string;
    };
    /**
     * @minItems 1
     * @maxItems 8
     * @uniqueItems true
     */
    KeySchema: {
      KeyType: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      AttributeName: string;
    }[];
    WarmThroughput?: unknown | unknown;
    WriteProvisionedThroughputSettings?: {
      WriteCapacityAutoScalingSettings?: {
        /** @minimum 1 */
        MinCapacity: number;
        /** @minimum 1 */
        SeedCapacity?: number;
        TargetTrackingScalingPolicyConfiguration: {
          /** @minimum 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
          DisableScaleIn?: boolean;
          /** @minimum 0 */
          ScaleInCooldown?: number;
        };
        /** @minimum 1 */
        MaxCapacity: number;
      };
    };
    WriteOnDemandThroughputSettings?: {
      /** @minimum 1 */
      MaxWriteRequestUnits?: number;
    };
  })[];
  /**
   * @minItems 1
   * @maxItems 2
   * @uniqueItems true
   */
  KeySchema: {
    KeyType: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    AttributeName: string;
  }[];
  /** @uniqueItems true */
  LocalSecondaryIndexes?: {
    /**
     * @minLength 3
     * @maxLength 255
     */
    IndexName: string;
    Projection: {
      /**
       * @maxItems 20
       * @uniqueItems true
       */
      NonKeyAttributes?: string[];
      ProjectionType?: string;
    };
    /**
     * @maxItems 2
     * @uniqueItems true
     */
    KeySchema: {
      KeyType: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      AttributeName: string;
    }[];
  }[];
  Arn?: string;
  StreamArn?: string;
  TimeToLiveSpecification?: {
    Enabled: boolean;
    AttributeName?: string;
  };
};
