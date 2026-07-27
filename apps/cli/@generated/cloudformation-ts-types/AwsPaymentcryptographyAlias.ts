// This file is auto-generated. Do not edit manually.
// Source: aws-paymentcryptography-alias.json

/** Definition of AWS::PaymentCryptography::Alias Resource Type */
export type AwsPaymentcryptographyAlias = {
  /**
   * @minLength 7
   * @maxLength 256
   * @pattern ^alias/[a-zA-Z0-9/_-]+$
   */
  AliasName: string;
  /**
   * @minLength 70
   * @maxLength 150
   * @pattern ^arn:aws:payment-cryptography:[a-z]{2}-[a-z]{1,16}-[0-9]+:[0-9]{12}:key/[0-9a-zA-Z]{16,64}$
   */
  KeyArn?: string;
};
