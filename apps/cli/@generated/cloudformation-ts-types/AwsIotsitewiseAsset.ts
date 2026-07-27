// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-asset.json

/** Resource schema for AWS::IoTSiteWise::Asset */
export type AwsIotsitewiseAsset = {
  /**
   * The ID of the asset
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  AssetId?: string;
  /**
   * The External ID of the asset
   * @minLength 2
   * @maxLength 128
   * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
   */
  AssetExternalId?: string;
  /** The ID of the asset model from which to create the asset. */
  AssetModelId: string;
  /** The ARN of the asset */
  AssetArn?: string;
  /** A unique, friendly name for the asset. */
  AssetName: string;
  /** A description for the asset */
  AssetDescription?: string;
  AssetProperties?: ({
    /**
     * Customer provided actual UUID for property
     * @minLength 36
     * @maxLength 36
     * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
     */
    Id?: string;
    /**
     * String-friendly customer provided external ID
     * @minLength 2
     * @maxLength 128
     * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
     */
    ExternalId?: string;
    /**
     * Customer provided ID for property.
     * @minLength 1
     * @maxLength 256
     * @pattern [^\u0000-\u001F\u007F]+
     */
    LogicalId?: string;
    /** The property alias that identifies the property. */
    Alias?: string;
    /**
     * The MQTT notification state (ENABLED or DISABLED) for this asset property.
     * @enum ["ENABLED","DISABLED"]
     */
    NotificationState?: "ENABLED" | "DISABLED";
    /**
     * The unit of measure (such as Newtons or RPM) of the asset property. If you don't specify a value
     * for this parameter, the service uses the value of the assetModelProperty in the asset model.
     */
    Unit?: string;
  })[];
  AssetHierarchies?: {
    /**
     * Customer provided actual UUID for property
     * @minLength 36
     * @maxLength 36
     * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
     */
    Id?: string;
    /**
     * String-friendly customer provided external ID
     * @minLength 2
     * @maxLength 128
     * @pattern [a-zA-Z0-9_][a-zA-Z_\-0-9.:]*[a-zA-Z0-9_]+
     */
    ExternalId?: string;
    /**
     * The LogicalID of a hierarchy in the parent asset's model.
     * @minLength 1
     * @maxLength 256
     * @pattern [^\u0000-\u001F\u007F]+
     */
    LogicalId?: string;
    /** The ID of the child asset to be associated. */
    ChildAssetId: string;
  }[];
  /**
   * A list of key-value pairs that contain metadata for the asset.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
