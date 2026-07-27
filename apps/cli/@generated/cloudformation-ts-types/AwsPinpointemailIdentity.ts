// This file is auto-generated. Do not edit manually.
// Source: aws-pinpointemail-identity.json

/** Resource Type definition for AWS::PinpointEmail::Identity */
export type AwsPinpointemailIdentity = {
  Id?: string;
  IdentityDNSRecordName3?: string;
  IdentityDNSRecordName1?: string;
  IdentityDNSRecordName2?: string;
  IdentityDNSRecordValue3?: string;
  IdentityDNSRecordValue2?: string;
  IdentityDNSRecordValue1?: string;
  FeedbackForwardingEnabled?: boolean;
  DkimSigningEnabled?: boolean;
  /** @uniqueItems false */
  Tags?: {
    Value?: string;
    Key?: string;
  }[];
  Name: string;
  MailFromAttributes?: {
    MailFromDomain?: string;
    BehaviorOnMxFailure?: string;
  };
};
