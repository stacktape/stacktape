// This file is auto-generated. Do not edit manually.
// Source: aws-panorama-packageversion.json

/** Registers a package version. */
export type AwsPanoramaPackageversion = {
  /** An owner account. */
  OwnerAccount?: string;
  /** A package ID. */
  PackageId: string;
  PackageArn?: string;
  /** A package version. */
  PackageVersion: string;
  /** A patch version. */
  PatchVersion: string;
  /** Whether to mark the new version as the latest version. */
  MarkLatest?: boolean;
  IsLatestPatch?: boolean;
  PackageName?: string;
  Status?: "REGISTER_PENDING" | "REGISTER_COMPLETED" | "FAILED" | "DELETING";
  StatusDescription?: string;
  RegisteredTime?: number;
  /** If the version was marked latest, the new version to maker as latest. */
  UpdatedLatestPatchVersion?: string;
};
