// This file is auto-generated. Do not edit manually.
// Source: alexa-ask-skill.json

/** Resource Type definition for Alexa::ASK::Skill */
export type AlexaAskSkill = {
  AuthenticationConfiguration: {
    ClientId: string;
    RefreshToken: string;
    ClientSecret: string;
  };
  Id?: string;
  VendorId: string;
  SkillPackage: {
    S3BucketRole?: string;
    Overrides?: {
      Manifest?: Record<string, unknown>;
    };
    S3ObjectVersion?: string;
    S3Bucket: string;
    S3Key: string;
  };
};
