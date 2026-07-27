// This file is auto-generated. Do not edit manually.
// Source: aws-rekognition-collection.json

/**
 * The AWS::Rekognition::Collection type creates an Amazon Rekognition Collection. A collection is a
 * logical grouping of information about detected faces which can later be referenced for searches on
 * the group
 */
export type AwsRekognitionCollection = {
  Arn?: string;
  CollectionId: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 0
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 128
     * @pattern \A(?!aws:)[a-zA-Z0-9+\-=\._\:\/@]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     * @pattern \A[a-zA-Z0-9+\-=\._\:\/@]+$
     */
    Value: string;
  }[];
};
