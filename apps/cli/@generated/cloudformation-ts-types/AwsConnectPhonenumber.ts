// This file is auto-generated. Do not edit manually.
// Source: aws-connect-phonenumber.json

/** Resource Type definition for AWS::Connect::PhoneNumber */
export type AwsConnectPhonenumber = {
  /**
   * The ARN of the target the phone number is claimed to.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:(instance|traffic-distribution-group)/[-a-zA-Z0-9]*$
   */
  TargetArn: string;
  /**
   * The phone number ARN
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:phone-number/[-a-zA-Z0-9]*$
   */
  PhoneNumberArn?: string;
  /**
   * The description of the phone number.
   * @minLength 1
   * @maxLength 500
   */
  Description?: string;
  /**
   * The phone number type
   * @pattern TOLL_FREE|DID|UIFN|SHARED|THIRD_PARTY_DID|THIRD_PARTY_TF|SHORT_CODE
   */
  Type?: string;
  /**
   * The phone number country code.
   * @pattern ^[A-Z]{2}
   */
  CountryCode?: string;
  /**
   * The phone number prefix.
   * @pattern ^\+[0-9]{1,15}
   */
  Prefix?: string;
  /**
   * The phone number e164 address.
   * @pattern ^\+[0-9]{2,15}
   */
  Address?: string;
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The source phone number arn. */
  SourcePhoneNumberArn?: string;
};
