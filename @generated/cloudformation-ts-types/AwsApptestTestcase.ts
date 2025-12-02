// This file is auto-generated. Do not edit manually.
// Source: aws-apptest-testcase.json

/** Represents a Test Case that can be captured and executed */
export type AwsApptestTestcase = {
  CreationTime?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   */
  Description?: string;
  LastUpdateTime?: string;
  LatestVersion?: {
    Version: number;
    Status: "Active" | "Deleting";
  };
  /** @pattern ^[A-Za-z][A-Za-z0-9_\-]{1,59}$ */
  Name: string;
  Status?: "Active" | "Deleting";
  /**
   * @minItems 1
   * @maxItems 20
   */
  Steps: ({
    /** @pattern ^[A-Za-z][A-Za-z0-9_\-]{1,59}$ */
    Name: string;
    /**
     * @minLength 0
     * @maxLength 1000
     */
    Description?: string;
    Action: {
      ResourceAction: {
        M2ManagedApplicationAction: {
          /** @pattern ^\S{1,1000}$ */
          Resource: string;
          ActionType: "Configure" | "Deconfigure";
          Properties?: {
            ForceStop?: boolean;
            /** @pattern ^\S{1,1000}$ */
            ImportDataSetLocation?: string;
          };
        };
      } | {
        M2NonManagedApplicationAction: {
          /** @pattern ^\S{1,1000}$ */
          Resource: string;
          ActionType: "Configure" | "Deconfigure";
        };
      } | {
        CloudFormationAction: {
          /** @pattern ^\S{1,1000}$ */
          Resource: string;
          ActionType?: "Create" | "Delete";
        };
      };
    } | {
      MainframeAction: {
        /** @pattern ^\S{1,1000}$ */
        Resource: string;
        ActionType: {
          Batch: {
            /** @pattern ^\S{1,1000}$ */
            BatchJobName: string;
            BatchJobParameters?: Record<string, string>;
            ExportDataSetNames?: string[];
          };
        } | {
          Tn3270: {
            Script: {
              /**
               * @minLength 0
               * @maxLength 1024
               */
              ScriptLocation: string;
              Type: "Selenium";
            };
            ExportDataSetNames?: string[];
          };
        };
        Properties?: {
          /** @pattern ^\S{1,1000}$ */
          DmsTaskArn?: string;
        };
      };
    } | {
      CompareAction: {
        Input: {
          File: {
            /** @pattern ^\S{1,1000}$ */
            SourceLocation: string;
            /** @pattern ^\S{1,1000}$ */
            TargetLocation: string;
            FileMetadata: {
              DataSets: ({
                Type: "PS";
                /** @pattern ^\S{1,100}$ */
                Name: string;
                /** @pattern ^\S{1,50}$ */
                Ccsid: string;
                Format: "FIXED" | "VARIABLE" | "LINE_SEQUENTIAL";
                Length: number;
              })[];
            } | {
              DatabaseCDC: {
                SourceMetadata: {
                  Type: "z/OS-DB2";
                  CaptureTool: "Precisely" | "AWS DMS";
                };
                TargetMetadata: {
                  Type: "PostgreSQL";
                  CaptureTool: "Precisely" | "AWS DMS";
                };
              };
            };
          };
        };
        Output?: {
          File: {
            /**
             * @minLength 0
             * @maxLength 1024
             */
            FileLocation?: string;
          };
        };
      };
    };
  })[];
  Tags?: Record<string, string>;
  /** @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9/][A-Za-z0-9:_/+=,@.-]{0,1023}$ */
  TestCaseArn?: string;
  /** @pattern ^[A-Za-z0-9:/\-]{1,100}$ */
  TestCaseId?: string;
  TestCaseVersion?: number;
};
