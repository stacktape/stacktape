// This file is auto-generated. Do not edit manually.
// Source: aws-inspectorv2-codesecurityscanconfiguration.json

/** Inspector CodeSecurityScanConfiguration resource schema */
export type AwsInspectorv2Codesecurityscanconfiguration = {
  /**
   * Code Security Scan Configuration name
   * @minLength 1
   * @maxLength 60
   * @pattern ^[a-zA-Z0-9-_$:.]*$
   */
  Name?: string;
  /** Configuration Level */
  Level?: "ORGANIZATION" | "ACCOUNT";
  /** Code Security Scan Configuration */
  Configuration?: {
    periodicScanConfiguration?: {
      frequency?: "WEEKLY" | "MONTHLY" | "NEVER";
      /**
       * @minLength 1
       * @maxLength 256
       */
      frequencyExpression?: string;
    };
    continuousIntegrationScanConfiguration?: {
      /**
       * @minItems 1
       * @maxItems 2
       */
      supportedEvents: ("PULL_REQUEST" | "PUSH")[];
    };
    /**
     * @minItems 1
     * @maxItems 3
     */
    ruleSetCategories: ("SAST" | "IAC" | "SCA")[];
  };
  /** Scope Settings */
  ScopeSettings?: {
    projectSelectionScope?: "ALL";
  };
  /**
   * Code Security Scan Configuration ARN
   * @pattern ^arn:(aws[a-zA-Z-]*)?:inspector2:[a-z]{2}(-gov)?-[a-z]+-\d{1}:\d{12}:owner/(\d{12}|o-[a-z0-9]{10,32})/codesecurity-configuration/[a-f0-9-]{36}$
   */
  Arn?: string;
  Tags?: Record<string, string>;
};
