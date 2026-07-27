// This file is auto-generated. Do not edit manually.
// Source: aws-panorama-package.json

/** Creates a package and storage location in an Amazon S3 access point. */
export type AwsPanoramaPackage = {
  /** A name for the package. */
  PackageName: string;
  PackageId?: string;
  Arn?: string;
  /** A storage location. */
  StorageLocation?: {
    /** The location's bucket. */
    Bucket?: string;
    /** The location's repo prefix. */
    RepoPrefixLocation?: string;
    /** The location's generated prefix. */
    GeneratedPrefixLocation?: string;
    /** The location's binary prefix. */
    BinaryPrefixLocation?: string;
    /** The location's manifest prefix. */
    ManifestPrefixLocation?: string;
  };
  CreatedTime?: number;
  /** Tags for the package. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^.+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^.+$
     */
    Value: string;
  }[];
};
