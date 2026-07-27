// This file is auto-generated. Do not edit manually.
// Source: aws-datazone-formtype.json

/** Create and manage form types in Amazon Datazone */
export type AwsDatazoneFormtype = {
  /**
   * The ID of the Amazon DataZone domain in which this metadata form type is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainIdentifier: string;
  /** The model of this Amazon DataZone metadata form type. */
  Model: {
    /**
     * @minLength 1
     * @maxLength 100000
     */
    Smithy?: string;
  };
  /**
   * The description of this Amazon DataZone metadata form type.
   * @minLength 0
   * @maxLength 2048
   */
  Description?: string;
  /**
   * The name of this Amazon DataZone metadata form type.
   * @minLength 1
   * @maxLength 128
   * @pattern ^(?![0-9_])\w+$|^_\w*[a-zA-Z0-9]\w*$
   */
  Name: string;
  /**
   * The ID of the Amazon DataZone project that owns this metadata form type.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  OwningProjectIdentifier: string;
  /**
   * The ID of the Amazon DataZone domain in which this metadata form type is created.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  DomainId?: string;
  /**
   * The ID of the project that owns this Amazon DataZone metadata form type.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  OwningProjectId?: string;
  /**
   * The revision of this Amazon DataZone metadata form type.
   * @minLength 1
   * @maxLength 64
   */
  Revision?: string;
  /**
   * The ID of this Amazon DataZone metadata form type.
   * @minLength 1
   * @maxLength 385
   * @pattern ^(?!\.)[\w\.]*\w$
   */
  FormTypeIdentifier?: string;
  /**
   * The status of this Amazon DataZone metadata form type.
   * @enum ["ENABLED","DISABLED"]
   */
  Status?: "ENABLED" | "DISABLED";
  /** The timestamp of when this Amazon DataZone metadata form type was created. */
  CreatedAt?: string;
  /**
   * The user who created this Amazon DataZone metadata form type.
   * @pattern ^[a-zA-Z0-9_-]{1,36}$
   */
  CreatedBy?: string;
};
