// This file is auto-generated. Do not edit manually.
// Source: aws-rolesanywhere-profile.json

/** Definition of AWS::RolesAnywhere::Profile Resource Type */
export type AwsRolesanywhereProfile = {
  /**
   * @minimum 900
   * @maximum 43200
   */
  DurationSeconds?: number;
  Enabled?: boolean;
  ManagedPolicyArns?: string[];
  Name: string;
  ProfileArn?: string;
  /** @pattern [a-f0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12} */
  ProfileId?: string;
  RequireInstanceProperties?: boolean;
  RoleArns: string[];
  SessionPolicy?: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  AttributeMappings?: ({
    MappingRules: {
      Specifier: string;
    }[];
    CertificateField: "x509Subject" | "x509Issuer" | "x509SAN";
  })[];
  AcceptRoleSessionName?: boolean;
};
