// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-functiondefinitionversion.json

/** Resource Type definition for AWS::Greengrass::FunctionDefinitionVersion */
export type AwsGreengrassFunctiondefinitionversion = {
  Id?: string;
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
  FunctionDefinitionId: string;
};
