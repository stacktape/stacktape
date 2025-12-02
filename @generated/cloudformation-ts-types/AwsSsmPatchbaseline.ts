// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-patchbaseline.json

/** Resource Type definition for AWS::SSM::PatchBaseline */
export type AwsSsmPatchbaseline = {
  /**
   * The ID of the patch baseline.
   * @minLength 20
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_\-:/]{20,128}$
   */
  Id?: string;
  /**
   * Set the baseline as default baseline. Only registering to default patch baseline is allowed.
   * @default false
   */
  DefaultBaseline?: boolean;
  /**
   * Defines the operating system the patch baseline applies to. The Default value is WINDOWS.
   * @default "WINDOWS"
   * @enum ["WINDOWS","AMAZON_LINUX","AMAZON_LINUX_2","AMAZON_LINUX_2022","AMAZON_LINUX_2023","UBUNTU","REDHAT_ENTERPRISE_LINUX","SUSE","CENTOS","ORACLE_LINUX","DEBIAN","MACOS","RASPBIAN","ROCKY_LINUX","ALMA_LINUX"]
   */
  OperatingSystem?: "WINDOWS" | "AMAZON_LINUX" | "AMAZON_LINUX_2" | "AMAZON_LINUX_2022" | "AMAZON_LINUX_2023" | "UBUNTU" | "REDHAT_ENTERPRISE_LINUX" | "SUSE" | "CENTOS" | "ORACLE_LINUX" | "DEBIAN" | "MACOS" | "RASPBIAN" | "ROCKY_LINUX" | "ALMA_LINUX";
  /**
   * The description of the patch baseline.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  ApprovalRules?: {
    /**
     * @minItems 0
     * @maxItems 10
     * @uniqueItems false
     */
    PatchRules?: ({
      /**
       * @minLength 0
       * @maxLength 10
       */
      ApproveUntilDate?: string;
      /** @default false */
      EnableNonSecurity?: boolean;
      PatchFilterGroup?: {
        /**
         * @minItems 0
         * @maxItems 5
         * @uniqueItems false
         */
        PatchFilters?: ({
          /**
           * @minItems 0
           * @maxItems 20
           * @uniqueItems false
           */
          Values?: string[];
          /** @enum ["ADVISORY_ID","ARCH","BUGZILLA_ID","CLASSIFICATION","CVE_ID","EPOCH","MSRC_SEVERITY","NAME","PATCH_ID","PATCH_SET","PRIORITY","PRODUCT","PRODUCT_FAMILY","RELEASE","REPOSITORY","SECTION","SECURITY","SEVERITY","VERSION"] */
          Key?: "ADVISORY_ID" | "ARCH" | "BUGZILLA_ID" | "CLASSIFICATION" | "CVE_ID" | "EPOCH" | "MSRC_SEVERITY" | "NAME" | "PATCH_ID" | "PATCH_SET" | "PRIORITY" | "PRODUCT" | "PRODUCT_FAMILY" | "RELEASE" | "REPOSITORY" | "SECTION" | "SECURITY" | "SEVERITY" | "VERSION";
        })[];
      };
      /**
       * @minimum 0
       * @maximum 360
       */
      ApproveAfterDays?: number;
      /** @enum ["CRITICAL","HIGH","INFORMATIONAL","LOW","MEDIUM","UNSPECIFIED"] */
      ComplianceLevel?: "CRITICAL" | "HIGH" | "INFORMATIONAL" | "LOW" | "MEDIUM" | "UNSPECIFIED";
    })[];
  };
  /**
   * Information about the patches to use to update the instances, including target operating systems
   * and source repository. Applies to Linux instances only.
   * @minItems 0
   * @maxItems 20
   * @uniqueItems false
   */
  Sources?: {
    /**
     * @minItems 0
     * @maxItems 20
     * @uniqueItems false
     */
    Products?: string[];
    /**
     * @minLength 1
     * @maxLength 1024
     */
    Configuration?: string;
    /** @pattern ^[a-zA-Z0-9_\-.]{3,50}$ */
    Name?: string;
  }[];
  /**
   * The name of the patch baseline.
   * @minLength 3
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_\-.]{3,128}$
   */
  Name: string;
  /**
   * A list of explicitly rejected patches for the baseline.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems false
   */
  RejectedPatches?: string[];
  /**
   * A list of explicitly approved patches for the baseline.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems false
   */
  ApprovedPatches?: string[];
  /**
   * The action for Patch Manager to take on patches included in the RejectedPackages list.
   * @default "ALLOW_AS_DEPENDENCY"
   * @enum ["ALLOW_AS_DEPENDENCY","BLOCK"]
   */
  RejectedPatchesAction?: "ALLOW_AS_DEPENDENCY" | "BLOCK";
  /**
   * PatchGroups is used to associate instances with a specific patch baseline
   * @uniqueItems false
   */
  PatchGroups?: string[];
  /**
   * Defines the compliance level for approved patches. This means that if an approved patch is reported
   * as missing, this is the severity of the compliance violation. The default value is UNSPECIFIED.
   * @default "UNSPECIFIED"
   * @enum ["CRITICAL","HIGH","MEDIUM","LOW","INFORMATIONAL","UNSPECIFIED"]
   */
  ApprovedPatchesComplianceLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | "UNSPECIFIED";
  /**
   * Indicates whether the list of approved patches includes non-security updates that should be applied
   * to the instances. The default value is 'false'. Applies to Linux instances only.
   * @default false
   */
  ApprovedPatchesEnableNonSecurity?: boolean;
  /** A set of global filters used to include patches in the baseline. */
  GlobalFilters?: {
    /**
     * @minItems 0
     * @maxItems 5
     * @uniqueItems false
     */
    PatchFilters?: ({
      /**
       * @minItems 0
       * @maxItems 20
       * @uniqueItems false
       */
      Values?: string[];
      /** @enum ["ADVISORY_ID","ARCH","BUGZILLA_ID","CLASSIFICATION","CVE_ID","EPOCH","MSRC_SEVERITY","NAME","PATCH_ID","PATCH_SET","PRIORITY","PRODUCT","PRODUCT_FAMILY","RELEASE","REPOSITORY","SECTION","SECURITY","SEVERITY","VERSION"] */
      Key?: "ADVISORY_ID" | "ARCH" | "BUGZILLA_ID" | "CLASSIFICATION" | "CVE_ID" | "EPOCH" | "MSRC_SEVERITY" | "NAME" | "PATCH_ID" | "PATCH_SET" | "PRIORITY" | "PRODUCT" | "PRODUCT_FAMILY" | "RELEASE" | "REPOSITORY" | "SECTION" | "SECURITY" | "SEVERITY" | "VERSION";
    })[];
  };
  /**
   * The compliance status for vendor recommended security updates that are not approved by this patch
   * baseline.
   * @enum ["NON_COMPLIANT","COMPLIANT"]
   */
  AvailableSecurityUpdatesComplianceStatus?: "NON_COMPLIANT" | "COMPLIANT";
  /**
   * Optional metadata that you assign to a resource. Tags enable you to categorize a resource in
   * different ways.
   * @minItems 0
   * @maxItems 1000
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
