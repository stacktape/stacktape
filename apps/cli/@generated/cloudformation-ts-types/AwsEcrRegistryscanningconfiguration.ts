// This file is auto-generated. Do not edit manually.
// Source: aws-ecr-registryscanningconfiguration.json

/** The scanning configuration for a private registry. */
export type AwsEcrRegistryscanningconfiguration = {
  /** The scanning rules associated with the registry. */
  Rules: ({
    /**
     * The details of a scanning repository filter. For more information on how to use filters, see [Using
     * filters](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html#image-scanning-filters)
     * in the *Amazon Elastic Container Registry User Guide*.
     * @minItems 0
     * @maxItems 100
     */
    RepositoryFilters: {
      /** The filter to use when scanning. */
      Filter: string;
      /** The type associated with the filter. */
      FilterType: "WILDCARD";
    }[];
    /**
     * The frequency that scans are performed at for a private registry. When the ``ENHANCED`` scan type
     * is specified, the supported scan frequencies are ``CONTINUOUS_SCAN`` and ``SCAN_ON_PUSH``. When the
     * ``BASIC`` scan type is specified, the ``SCAN_ON_PUSH`` scan frequency is supported. If scan on push
     * is not specified, then the ``MANUAL`` scan frequency is set by default.
     */
    ScanFrequency: "SCAN_ON_PUSH" | "CONTINUOUS_SCAN";
  })[];
  /** The type of scanning configured for the registry. */
  ScanType: "BASIC" | "ENHANCED";
  RegistryId?: string;
};
