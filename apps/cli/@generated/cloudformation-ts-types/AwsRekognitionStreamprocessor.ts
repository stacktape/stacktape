// This file is auto-generated. Do not edit manually.
// Source: aws-rekognition-streamprocessor.json

/**
 * The AWS::Rekognition::StreamProcessor type is used to create an Amazon Rekognition StreamProcessor
 * that you can use to analyze streaming videos.
 */
export type AwsRekognitionStreamprocessor = {
  Arn?: string;
  /**
   * Name of the stream processor. It's an identifier you assign to the stream processor. You can use it
   * to manage the stream processor.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_.\-]+
   */
  Name?: string;
  /**
   * The KMS key that is used by Rekognition to encrypt any intermediate customer metadata and store in
   * the customer's S3 bucket.
   */
  KmsKeyId?: string;
  /**
   * ARN of the IAM role that allows access to the stream processor, and provides Rekognition read
   * permissions for KVS stream and write permissions to S3 bucket and SNS topic.
   * @maxLength 2048
   * @pattern arn:aws(-[\w]+)*:iam::[0-9]{12}:role/.*
   */
  RoleArn: string;
  KinesisVideoStream: {
    /**
     * ARN of the Kinesis Video Stream that streams the source video.
     * @maxLength 2048
     * @pattern (^arn:([a-z\d-]+):kinesisvideo:([a-z\d-]+):\d{12}:.+$)
     */
    Arn: string;
  };
  FaceSearchSettings?: {
    /**
     * The ID of a collection that contains faces that you want to search for.
     * @maxLength 255
     * @pattern \A[a-zA-Z0-9_\.\-]+$
     */
    CollectionId: string;
    /**
     * Minimum face match confidence score percentage that must be met to return a result for a recognized
     * face. The default is 80. 0 is the lowest confidence. 100 is the highest confidence. Values between
     * 0 and 100 are accepted.
     * @minimum 0
     * @maximum 100
     */
    FaceMatchThreshold?: number;
  };
  ConnectedHomeSettings?: {
    Labels: string[];
    /**
     * Minimum object class match confidence score that must be met to return a result for a recognized
     * object.
     * @minimum 0
     * @maximum 100
     */
    MinConfidence?: number;
  };
  KinesisDataStream?: {
    /**
     * ARN of the Kinesis Data Stream stream.
     * @maxLength 2048
     * @pattern (^arn:([a-z\d-]+):kinesis:([a-z\d-]+):\d{12}:.+$)
     */
    Arn: string;
  };
  S3Destination?: {
    /**
     * Name of the S3 bucket.
     * @maxLength 63
     */
    BucketName: string;
    /**
     * The object key prefix path where the results will be stored. Default is no prefix path
     * @maxLength 256
     */
    ObjectKeyPrefix?: string;
  };
  NotificationChannel?: {
    /**
     * ARN of the SNS topic.
     * @maxLength 2048
     */
    Arn: string;
  };
  DataSharingPreference?: {
    /** Flag to enable data-sharing */
    OptIn: boolean;
  };
  /**
   * The PolygonRegionsOfInterest specifies a set of polygon areas of interest in the video frames to
   * analyze, as part of connected home feature. Each polygon is in turn, an ordered list of Point
   * @minItems 0
   * @uniqueItems true
   */
  PolygonRegionsOfInterest?: {
    /** The X coordinate of the point. */
    X: number;
    /** The Y coordinate of the point. */
    Y: number;
  }[][];
  /**
   * The BoundingBoxRegionsOfInterest specifies an array of bounding boxes of interest in the video
   * frames to analyze, as part of connected home feature. If an object is partially in a region of
   * interest, Rekognition will tag it as detected if the overlap of the object with the
   * region-of-interest is greater than 20%.
   * @minItems 0
   * @uniqueItems true
   */
  BoundingBoxRegionsOfInterest?: {
    /**
     * @minimum 0
     * @maximum 100
     */
    Height: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    Width: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    Left: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    Top: number;
  }[];
  /** Current status of the stream processor. */
  Status?: string;
  /** Detailed status message about the stream processor. */
  StatusMessage?: string;
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
     * @minLength 1
     * @maxLength 128
     * @pattern \A(?!aws:)[a-zA-Z0-9+\-=\._\:\/@]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern \A[a-zA-Z0-9+\-=\._\:\/@]+$
     */
    Value: string;
  }[];
};
