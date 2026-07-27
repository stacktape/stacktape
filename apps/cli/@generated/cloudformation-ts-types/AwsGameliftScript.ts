// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-script.json

/**
 * The AWS::GameLift::Script resource creates a new script record for your Realtime Servers script.
 * Realtime scripts are JavaScript that provide configuration settings and optional custom game logic
 * for your game. The script is deployed when you create a Realtime Servers fleet to host your game
 * sessions. Script logic is executed during an active game session.
 */
export type AwsGameliftScript = {
  /**
   * A descriptive label that is associated with a script. Script names do not need to be unique.
   * @minLength 1
   * @maxLength 1024
   */
  Name?: string;
  /**
   * The location of the Amazon S3 bucket where a zipped file containing your Realtime scripts is
   * stored. The storage location must specify the Amazon S3 bucket name, the zip file name (the "key"),
   * and a role ARN that allows Amazon GameLift to access the Amazon S3 storage location. The S3 bucket
   * must be in the same Region where you want to create a new script. By default, Amazon GameLift
   * uploads the latest version of the zip file; if you have S3 object versioning turned on, you can use
   * the ObjectVersion parameter to specify an earlier version.
   */
  StorageLocation: {
    /**
     * An Amazon S3 bucket identifier. This is the name of the S3 bucket.
     * @minLength 1
     */
    Bucket: string;
    /**
     * The name of the zip file that contains the script files.
     * @minLength 1
     */
    Key: string;
    /**
     * The version of the file, if object versioning is turned on for the bucket. Amazon GameLift uses
     * this information when retrieving files from your S3 bucket. To retrieve a specific version of the
     * file, provide an object version. To retrieve the latest version of the file, do not set this
     * parameter.
     * @minLength 1
     */
    ObjectVersion?: string;
    /**
     * The Amazon Resource Name (ARN) for an IAM role that allows Amazon GameLift to access the S3 bucket.
     * @minLength 1
     */
    RoleArn: string;
  };
  /**
   * The version that is associated with a script. Version strings do not need to be unique.
   * @minLength 1
   * @maxLength 1024
   */
  Version?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * A time stamp indicating when this data object was created. Format is a number expressed in Unix
   * time as milliseconds (for example "1469498468.057").
   */
  CreationTime?: string;
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift script resource and uniquely
   * identifies it. ARNs are unique across all Regions. In a GameLift script ARN, the resource ID
   * matches the Id value.
   * @pattern ^arn:.*:script\/script-\S+
   */
  Arn?: string;
  /**
   * A unique identifier for the Realtime script
   * @pattern ^script-\S+
   */
  Id?: string;
  /**
   * The file size of the uploaded Realtime script, expressed in bytes. When files are uploaded from an
   * S3 location, this value remains at "0".
   * @minimum 1
   */
  SizeOnDisk?: number;
};
