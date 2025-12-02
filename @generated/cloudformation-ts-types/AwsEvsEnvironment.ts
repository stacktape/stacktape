// This file is auto-generated. Do not edit manually.
// Source: aws-evs-environment.json

/** An environment created within the EVS service */
export type AwsEvsEnvironment = {
  /**
   * The name of an EVS environment
   * @pattern ^[a-zA-Z0-9_-]{1,100}$
   */
  EnvironmentName?: string;
  KmsKeyId?: string;
  /**
   * @minLength 12
   * @maxLength 21
   * @pattern ^vpc-[a-f0-9]{8}([a-f0-9]{9})?$
   */
  VpcId: string;
  /**
   * @minLength 15
   * @maxLength 24
   * @pattern ^subnet-[a-f0-9]{8}([a-f0-9]{9})?$
   */
  ServiceAccessSubnetId: string;
  /** @enum ["VCF-5.2.1"] */
  VcfVersion: "VCF-5.2.1";
  TermsAccepted: boolean;
  /** The license information for an EVS environment */
  LicenseInfo: {
    /** @pattern ^[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}$ */
    SolutionKey: string;
    /** @pattern ^[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}$ */
    VsanKey: string;
  };
  /**
   * The initial Vlan configuration only required upon creation. Modification after creation will have
   * no effect
   */
  InitialVlans?: {
    VmkManagement: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    VmManagement: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    VMotion: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    VSan: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    VTep: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    EdgeVTep: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    NsxUpLink: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    Hcx: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    IsHcxPublic?: boolean;
    HcxNetworkAclId?: string;
    ExpansionVlan1: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
    ExpansionVlan2: {
      /** @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[1-2][0-9]|[0-9])$ */
      Cidr: string;
    };
  };
  /**
   * The initial hosts for environment only required upon creation. Modification after creation will
   * have no effect
   * @minItems 4
   * @maxItems 4
   */
  Hosts?: {
    HostName: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^[a-zA-Z0-9_-]+$
     */
    KeyName: string;
    /** @enum ["i4i.metal"] */
    InstanceType: "i4i.metal";
    /**
     * @minLength 1
     * @maxLength 25
     * @pattern ^pg-[a-f0-9]{8}([a-f0-9]{9})?$
     */
    PlacementGroupId?: string;
    /**
     * @minLength 1
     * @maxLength 25
     * @pattern ^h-[a-f0-9]{8}([a-f0-9]{9})?$
     */
    DedicatedHostId?: string;
  }[];
  ConnectivityInfo: {
    /**
     * @minItems 2
     * @maxItems 2
     */
    PrivateRouteServerPeerings: string[];
  };
  VcfHostnames: {
    VCenter: string;
    Nsx: string;
    NsxManager1: string;
    NsxManager2: string;
    NsxManager3: string;
    NsxEdge1: string;
    NsxEdge2: string;
    SddcManager: string;
    CloudBuilder: string;
  };
  SiteId: string;
  /** @pattern ^(env-[a-zA-Z0-9]{10})$ */
  EnvironmentId?: string;
  /**
   * @minLength 1
   * @maxLength 1011
   * @pattern ^arn:aws:evs:[a-z]{2}-[a-z]+-[0-9]:[0-9]{12}:environment/[a-zA-Z0-9_-]+$
   */
  EnvironmentArn?: string;
  EnvironmentState?: "CREATING" | "CREATED" | "DELETING" | "DELETED" | "CREATE_FAILED";
  StateDetails?: string;
  Checks?: ({
    /** @enum ["KEY_REUSE","KEY_COVERAGE","REACHABILITY","VCF_VERSION","HOST_COUNT"] */
    Type: "KEY_REUSE" | "KEY_COVERAGE" | "REACHABILITY" | "VCF_VERSION" | "HOST_COUNT";
    Result: "PASSED" | "FAILED" | "UNKNOWN";
    ImpairedSince?: string;
  })[];
  Credentials?: {
    SecretArn?: string;
  }[];
  ServiceAccessSecurityGroups?: {
    SecurityGroups?: string[];
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  CreatedAt?: string;
  ModifiedAt?: string;
};
