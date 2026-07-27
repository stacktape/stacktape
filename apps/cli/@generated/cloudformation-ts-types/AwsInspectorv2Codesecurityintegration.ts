// This file is auto-generated. Do not edit manually.
// Source: aws-inspectorv2-codesecurityintegration.json

/** Inspector CodeSecurityIntegration resource schema */
export type AwsInspectorv2Codesecurityintegration = {
  /**
   * Code Security Integration name
   * @minLength 1
   * @maxLength 60
   * @pattern ^[a-zA-Z0-9-_$:.]*$
   */
  Name?: string;
  /** Integration Type */
  Type?: "GITLAB_SELF_MANAGED" | "GITHUB";
  /** Create Integration Details */
  CreateIntegrationDetails?: {
    gitlabSelfManaged: {
      /** @pattern ^https://[-a-zA-Z0-9()@:%_+.~#?&//=]{1,1024}$ */
      instanceUrl: string;
      accessToken: string;
    };
  };
  /** Update Integration Details */
  UpdateIntegrationDetails?: unknown | unknown;
  /** Integration Status */
  Status?: "PENDING" | "IN_PROGRESS" | "ACTIVE" | "INACTIVE" | "DISABLING";
  /** Reason for the current status */
  StatusReason?: string;
  /**
   * Code Security Integration ARN
   * @pattern ^arn:(aws[a-zA-Z-]*)?:inspector2:[a-z]{2}(-gov)?-[a-z]+-\d{1}:\d{12}:codesecurity-integration/[a-f0-9-]{36}$
   */
  Arn?: string;
  /**
   * Authorization URL for OAuth flow
   * @pattern ^https://[-a-zA-Z0-9()@:%_+.~#?&//=]{1,1024}$
   */
  AuthorizationUrl?: string;
  /** Creation timestamp */
  CreatedAt?: string;
  /** Last update timestamp */
  LastUpdatedAt?: string;
  Tags?: Record<string, string>;
};
