// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-storageprofile.json

/** Definition of AWS::Deadline::StorageProfile Resource Type */
export type AwsDeadlineStorageprofile = {
  /**
   * @minLength 1
   * @maxLength 100
   */
  DisplayName: string;
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  /**
   * @minItems 0
   * @maxItems 20
   */
  FileSystemLocations?: ({
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[0-9A-Za-z ]*$
     */
    Name: string;
    /**
     * @minLength 0
     * @maxLength 1024
     */
    Path: string;
    Type: "SHARED" | "LOCAL";
  })[];
  OsFamily: "WINDOWS" | "LINUX" | "MACOS";
  /** @pattern ^sp-[0-9a-f]{32}$ */
  StorageProfileId?: string;
};
