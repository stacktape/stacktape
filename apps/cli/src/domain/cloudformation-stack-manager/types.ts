import type { CloudformationResource } from '@stacktape/config/cloudformation';

export type AwsCallerIdentity = import('@aws-sdk/client-sts').GetCallerIdentityResponse;

export type StackActionType =
  | 'delete'
  | 'update'
  | 'create'
  | 'rollback'
  | 'dev' // `dev-${DevModeCapableResourceType}`
  | 'deployment-script:run';

export type CloudformationTemplate = import('@generated/cloudform/template').default & {
  Resources: { [resourceName: string]: CloudformationResource };
};

// this is a cloudformation specification.
// I.e this is is how it MUST look like when we are inserting the statement into Cloudformation config.
export interface CloudformationIamRoleStatement {
  Sid?: string;
  Resource: string | string[];
  Effect: string;
  Action: string | string[];
  Principal?: Record<string, any>; // principal parameter is only applicable for policies that are directly attached to resources (i.e bucketPolicy)
  Condition?: Record<string, any>;
}

// type EnvironmentVars = { [varName: string]: string | number | boolean };

// @todo https://trello.com/c/qCTVeZ8o/196-improve-iam-role-statement-type
export type IamRoleStatement = {
  Action: string | string[];
  Effect: string;
  Principal: string;
  Resource: any[];
  Condition?: Record<string, any>;
};

export type StackDetails = import('@aws-sdk/client-cloudformation').Stack & {
  stackOutput: {
    [outputName: string]: string;
  };
};

export type InvokeLambdaReturnValue = Omit<import('@aws-sdk/client-lambda').InvokeCommandOutput, 'Payload'> & {
  Payload: string;
};

export type EnrichedStackResourceInfo = import('@aws-sdk/client-cloudformation').StackResourceSummary & {
  tags?: { key?: string; value?: string }[]; // applicable to and AWS::Lambda::Function
  ecsServiceTaskDefinition?: import('@aws-sdk/client-ecs').TaskDefinition; // applicable to AWS::ECS::Service and Stacktape::ECSBlueGreen::Service
  ecsServiceTaskDefinitionTags?: { key?: string; value?: string }[]; // applicable to AWS::ECS::Service and Stacktape::ECSBlueGreen::Service
  ecsService?: import('@aws-sdk/client-ecs').Service; // applicable to AWS::ECS::Service and Stacktape::ECSBlueGreen::Service
  asgDetail?: import('@aws-sdk/client-auto-scaling').AutoScalingGroup; // applicable to AWS::AutoScaling::AutoScalingGroup
  rdsInstanceDetail?: import('@aws-sdk/client-rds').DBInstance; // applicable to AWS::RDS::DBInstance
  auroraClusterDetail?: import('@aws-sdk/client-rds').DBCluster; // applicable to AWS::RDS::DBCluster
};

export type DriftDetail = {
  resourceLogicalName: string;
  resourceType: string;
  differences: import('@aws-sdk/client-cloudformation').PropertyDifference[];
};
