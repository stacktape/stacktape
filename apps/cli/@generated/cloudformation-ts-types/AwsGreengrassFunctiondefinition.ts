// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-functiondefinition.json

/** Resource Type definition for AWS::Greengrass::FunctionDefinition */
export type AwsGreengrassFunctiondefinition = {
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  Name: string;
  InitialVersion?: {
    DefaultConfig?: {
      Execution: {
        IsolationMode?: string;
        RunAs?: {
          Uid?: number;
          Gid?: number;
        };
      };
    };
    /** @uniqueItems false */
    Functions: {
      FunctionArn: string;
      FunctionConfiguration: {
        MemorySize?: number;
        Pinned?: boolean;
        ExecArgs?: string;
        Timeout?: number;
        EncodingType?: string;
        Environment?: {
          Variables?: Record<string, unknown>;
          Execution?: {
            IsolationMode?: string;
            RunAs?: {
              Uid?: number;
              Gid?: number;
            };
          };
          /** @uniqueItems false */
          ResourceAccessPolicies?: {
            ResourceId: string;
            Permission?: string;
          }[];
          AccessSysfs?: boolean;
        };
        Executable?: string;
      };
      Id: string;
    }[];
  };
  Tags?: Record<string, unknown>;
};
