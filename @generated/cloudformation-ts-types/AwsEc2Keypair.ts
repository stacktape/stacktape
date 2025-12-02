// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-keypair.json

/**
 * Specifies a key pair for use with an EC2long instance as follows:
 * +  To import an existing key pair, include the ``PublicKeyMaterial`` property.
 * +  To create a new key pair, omit the ``PublicKeyMaterial`` property.
 * When you import an existing key pair, you specify the public key material for the key. We assume
 * that you have the private key material for the key. CFNlong does not create or return the private
 * key material when you import a key pair.
 * When you create a new key pair, the private key is saved to SYSlong Parameter Store, using a
 * parameter with the following name: ``/ec2/keypair/{key_pair_id}``. For more information about
 * retrieving private key, and the required permissions, see [Create a key pair
 * using](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html#create-key-pair-cloudformation)
 * in the *User Guide*.
 * When CFN deletes a key pair that was created or imported by a stack, it also deletes the parameter
 * that was used to store the private key material in Parameter Store.
 */
export type AwsEc2Keypair = {
  /**
   * A unique name for the key pair.
   * Constraints: Up to 255 ASCII characters
   */
  KeyName: string;
  /**
   * The type of key pair. Note that ED25519 keys are not supported for Windows instances.
   * If the ``PublicKeyMaterial`` property is specified, the ``KeyType`` property is ignored, and the
   * key type is inferred from the ``PublicKeyMaterial`` value.
   * Default: ``rsa``
   * @default "rsa"
   * @enum ["rsa","ed25519"]
   */
  KeyType?: "rsa" | "ed25519";
  /**
   * The format of the key pair.
   * Default: ``pem``
   * @default "pem"
   * @enum ["pem","ppk"]
   */
  KeyFormat?: "pem" | "ppk";
  /**
   * The public key material. The ``PublicKeyMaterial`` property is used to import a key pair. If this
   * property is not specified, then a new key pair will be created.
   */
  PublicKeyMaterial?: string;
  KeyFingerprint?: string;
  KeyPairId?: string;
  /**
   * The tags to apply to the key pair.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag value.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
