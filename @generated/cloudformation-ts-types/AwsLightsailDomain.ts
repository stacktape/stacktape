// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-domain.json

/** Resource Type definition for AWS::Lightsail::Domain */
export type AwsLightsailDomain = {
  /** The name of the domain to manage in Lightsail. */
  DomainName: string;
  /**
   * An array of key-value pairs containing information about the domain entries.
   * @uniqueItems true
   */
  DomainEntries?: ({
    /** The ID of the domain recordset entry. */
    Id?: string;
    /** The name of the domain entry. */
    Name: string;
    /** The target AWS name server (e.g., ns-111.awsdns-11.com). */
    Target: string;
    /**
     * When true, specifies whether the domain entry is an alias used by the Lightsail load balancer,
     * Lightsail container service, Lightsail content delivery network (CDN) distribution, or another AWS
     * resource. You can include an alias (A type) record in your request, which points to the DNS name of
     * a load balancer, container service, CDN distribution, or other AWS resource and routes traffic to
     * that resource.
     */
    IsAlias?: boolean;
    /**
     * The type of domain entry (e.g., A, CNAME, MX, NS, SOA, SRV, TXT).
     * @enum ["A","AAAA","CNAME","MX","NS","SOA","SRV","TXT"]
     */
    Type: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "SOA" | "SRV" | "TXT";
  })[];
  /**
   * The Amazon Resource Name (ARN) of the domain (read-only).
   * @pattern ^arn:.+:lightsail:[a-z0-9-]+:[0-9]{12}:Domain/[a-zA-Z0-9][a-zA-Z0-9-_.]{0,253}[a-zA-Z0-9]$
   */
  Arn?: string;
  /** The support code. Include this code in your email to support when you have questions (read-only). */
  SupportCode?: string;
  /** The timestamp when the domain was created (read-only). */
  CreatedAt?: string;
  /** The AWS Region and Availability Zone where the domain was created (read-only). */
  Location?: {
    /** The Availability Zone. */
    AvailabilityZone?: string;
    /** The AWS Region name. */
    RegionName?: string;
  };
  /**
   * The Lightsail resource type (read-only).
   * @enum ["Domain"]
   */
  ResourceType?: "Domain";
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /** The key name of the tag. */
    Key: string;
    /** The value for the tag. */
    Value?: string;
  }[];
};
