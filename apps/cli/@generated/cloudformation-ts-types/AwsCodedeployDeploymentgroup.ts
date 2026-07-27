// This file is auto-generated. Do not edit manually.
// Source: aws-codedeploy-deploymentgroup.json

/** Resource Type definition for AWS::CodeDeploy::DeploymentGroup */
export type AwsCodedeployDeploymentgroup = {
  OnPremisesTagSet?: {
    /** @uniqueItems true */
    OnPremisesTagSetList?: {
      /** @uniqueItems true */
      OnPremisesTagGroup?: {
        Value?: string;
        Type?: string;
        Key?: string;
      }[];
    }[];
  };
  ApplicationName: string;
  DeploymentStyle?: {
    DeploymentOption?: string;
    DeploymentType?: string;
  };
  ServiceRoleArn: string;
  BlueGreenDeploymentConfiguration?: {
    GreenFleetProvisioningOption?: {
      Action?: string;
    };
    DeploymentReadyOption?: {
      WaitTimeInMinutes?: number;
      ActionOnTimeout?: string;
    };
    TerminateBlueInstancesOnDeploymentSuccess?: {
      TerminationWaitTimeInMinutes?: number;
      Action?: string;
    };
  };
  /** @uniqueItems true */
  AutoScalingGroups?: string[];
  Ec2TagSet?: {
    /** @uniqueItems true */
    Ec2TagSetList?: {
      /** @uniqueItems true */
      Ec2TagGroup?: {
        Value?: string;
        Type?: string;
        Key?: string;
      }[];
    }[];
  };
  OutdatedInstancesStrategy?: string;
  /** @uniqueItems true */
  TriggerConfigurations?: {
    TriggerTargetArn?: string;
    TriggerName?: string;
    /** @uniqueItems true */
    TriggerEvents?: string[];
  }[];
  Deployment?: {
    Description?: string;
    Revision: {
      S3Location?: {
        BundleType?: string;
        Bucket: string;
        ETag?: string;
        Version?: string;
        Key: string;
      };
      GitHubLocation?: {
        Repository: string;
        CommitId: string;
      };
      RevisionType?: string;
    };
    IgnoreApplicationStopFailures?: boolean;
  };
  DeploymentConfigName?: string;
  AlarmConfiguration?: {
    /** @uniqueItems true */
    Alarms?: {
      Name?: string;
    }[];
    IgnorePollAlarmFailure?: boolean;
    Enabled?: boolean;
  };
  /** @uniqueItems true */
  Ec2TagFilters?: {
    Value?: string;
    Type?: string;
    Key?: string;
  }[];
  TerminationHookEnabled?: boolean;
  /** @uniqueItems true */
  ECSServices?: {
    ServiceName: string;
    ClusterName: string;
  }[];
  AutoRollbackConfiguration?: {
    /** @uniqueItems true */
    Events?: string[];
    Enabled?: boolean;
  };
  LoadBalancerInfo?: {
    /** @uniqueItems true */
    TargetGroupInfoList?: {
      Name?: string;
    }[];
    /** @uniqueItems true */
    ElbInfoList?: {
      Name?: string;
    }[];
    /** @uniqueItems true */
    TargetGroupPairInfoList?: {
      ProdTrafficRoute?: {
        /** @uniqueItems true */
        ListenerArns?: string[];
      };
      TestTrafficRoute?: {
        /** @uniqueItems true */
        ListenerArns?: string[];
      };
      /** @uniqueItems true */
      TargetGroups?: {
        Name?: string;
      }[];
    }[];
  };
  Id?: string;
  DeploymentGroupName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** @uniqueItems true */
  OnPremisesInstanceTagFilters?: {
    Value?: string;
    Type?: string;
    Key?: string;
  }[];
};
