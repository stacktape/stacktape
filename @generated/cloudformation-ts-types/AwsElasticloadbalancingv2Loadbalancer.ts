// This file is auto-generated. Do not edit manually.
// Source: aws-elasticloadbalancingv2-loadbalancer.json

/** Specifies an Application Load Balancer, a Network Load Balancer, or a Gateway Load Balancer. */
export type AwsElasticloadbalancingv2Loadbalancer = {
  /**
   * The IP address type. Internal load balancers must use ``ipv4``.
   * [Application Load Balancers] The possible values are ``ipv4`` (IPv4 addresses), ``dualstack``
   * (IPv4 and IPv6 addresses), and ``dualstack-without-public-ipv4`` (public IPv6 addresses and private
   * IPv4 and IPv6 addresses).
   * Application Load Balancer authentication supports IPv4 addresses only when connecting to an
   * Identity Provider (IdP) or Amazon Cognito endpoint. Without a public IPv4 address the load balancer
   * can't complete the authentication process, resulting in HTTP 500 errors.
   * [Network Load Balancers and Gateway Load Balancers] The possible values are ``ipv4`` (IPv4
   * addresses) and ``dualstack`` (IPv4 and IPv6 addresses).
   */
  IpAddressType?: string;
  /**
   * [Network Load Balancers with UDP listeners] Indicates whether to use an IPv6 prefix from each
   * subnet for source NAT. The IP address type must be ``dualstack``. The default value is ``off``.
   */
  EnablePrefixForIpv6SourceNat?: string;
  /**
   * [Application Load Balancers and Network Load Balancers] The IDs of the security groups for the load
   * balancer.
   * @uniqueItems true
   */
  SecurityGroups?: string[];
  /**
   * The load balancer attributes. Attributes that you do not modify retain their current values.
   * @uniqueItems true
   */
  LoadBalancerAttributes?: {
    /** The value of the attribute. */
    Value?: string;
    /**
     * The name of the attribute.
     * The following attributes are supported by all load balancers:
     * +  ``deletion_protection.enabled`` - Indicates whether deletion protection is enabled. The value
     * is ``true`` or ``false``. The default is ``false``.
     * +  ``load_balancing.cross_zone.enabled`` - Indicates whether cross-zone load balancing is
     * enabled. The possible values are ``true`` and ``false``. The default for Network Load Balancers and
     * Gateway Load Balancers is ``false``. The default for Application Load Balancers is ``true``, and
     * can't be changed.
     * The following attributes are supported by both Application Load Balancers and Network Load
     * Balancers:
     * +  ``access_logs.s3.enabled`` - Indicates whether access logs are enabled. The value is ``true``
     * or ``false``. The default is ``false``.
     * +  ``access_logs.s3.bucket`` - The name of the S3 bucket for the access logs. This attribute is
     * required if access logs are enabled. The bucket must exist in the same region as the load balancer
     * and have a bucket policy that grants Elastic Load Balancing permissions to write to the bucket.
     * +  ``access_logs.s3.prefix`` - The prefix for the location in the S3 bucket for the access logs.
     * +  ``ipv6.deny_all_igw_traffic`` - Blocks internet gateway (IGW) access to the load balancer. It
     * is set to ``false`` for internet-facing load balancers and ``true`` for internal load balancers,
     * preventing unintended access to your internal load balancer through an internet gateway.
     * +  ``zonal_shift.config.enabled`` - Indicates whether zonal shift is enabled. The possible values
     * are ``true`` and ``false``. The default is ``false``.
     * The following attributes are supported by only Application Load Balancers:
     * +  ``idle_timeout.timeout_seconds`` - The idle timeout value, in seconds. The valid range is
     * 1-4000 seconds. The default is 60 seconds.
     * +  ``client_keep_alive.seconds`` - The client keep alive value, in seconds. The valid range is
     * 60-604800 seconds. The default is 3600 seconds.
     * +  ``connection_logs.s3.enabled`` - Indicates whether connection logs are enabled. The value is
     * ``true`` or ``false``. The default is ``false``.
     * +  ``connection_logs.s3.bucket`` - The name of the S3 bucket for the connection logs. This
     * attribute is required if connection logs are enabled. The bucket must exist in the same region as
     * the load balancer and have a bucket policy that grants Elastic Load Balancing permissions to write
     * to the bucket.
     * +  ``connection_logs.s3.prefix`` - The prefix for the location in the S3 bucket for the
     * connection logs.
     * +  ``routing.http.desync_mitigation_mode`` - Determines how the load balancer handles requests
     * that might pose a security risk to your application. The possible values are ``monitor``,
     * ``defensive``, and ``strictest``. The default is ``defensive``.
     * +  ``routing.http.drop_invalid_header_fields.enabled`` - Indicates whether HTTP headers with
     * invalid header fields are removed by the load balancer (``true``) or routed to targets (``false``).
     * The default is ``false``.
     * +  ``routing.http.preserve_host_header.enabled`` - Indicates whether the Application Load
     * Balancer should preserve the ``Host`` header in the HTTP request and send it to the target without
     * any change. The possible values are ``true`` and ``false``. The default is ``false``.
     * +  ``routing.http.x_amzn_tls_version_and_cipher_suite.enabled`` - Indicates whether the two
     * headers (``x-amzn-tls-version`` and ``x-amzn-tls-cipher-suite``), which contain information about
     * the negotiated TLS version and cipher suite, are added to the client request before sending it to
     * the target. The ``x-amzn-tls-version`` header has information about the TLS protocol version
     * negotiated with the client, and the ``x-amzn-tls-cipher-suite`` header has information about the
     * cipher suite negotiated with the client. Both headers are in OpenSSL format. The possible values
     * for the attribute are ``true`` and ``false``. The default is ``false``.
     * +  ``routing.http.xff_client_port.enabled`` - Indicates whether the ``X-Forwarded-For`` header
     * should preserve the source port that the client used to connect to the load balancer. The possible
     * values are ``true`` and ``false``. The default is ``false``.
     * +  ``routing.http.xff_header_processing.mode`` - Enables you to modify, preserve, or remove the
     * ``X-Forwarded-For`` header in the HTTP request before the Application Load Balancer sends the
     * request to the target. The possible values are ``append``, ``preserve``, and ``remove``. The
     * default is ``append``.
     * +  If the value is ``append``, the Application Load Balancer adds the client IP address (of the
     * last hop) to the ``X-Forwarded-For`` header in the HTTP request before it sends it to targets.
     * +  If the value is ``preserve`` the Application Load Balancer preserves the ``X-Forwarded-For``
     * header in the HTTP request, and sends it to targets without any change.
     * +  If the value is ``remove``, the Application Load Balancer removes the ``X-Forwarded-For``
     * header in the HTTP request before it sends it to targets.
     * +  ``routing.http2.enabled`` - Indicates whether clients can connect to the load balancer using
     * HTTP/2. If ``true``, clients can connect using HTTP/2 or HTTP/1.1. However, all client requests are
     * subject to the stricter HTTP/2 header validation rules. For example, message header names must
     * contain only alphanumeric characters and hyphens. If ``false``, clients must connect using
     * HTTP/1.1. The default is ``true``.
     * +  ``waf.fail_open.enabled`` - Indicates whether to allow a WAF-enabled load balancer to route
     * requests to targets if it is unable to forward the request to AWS WAF. The possible values are
     * ``true`` and ``false``. The default is ``false``.
     * The following attributes are supported by only Network Load Balancers:
     * +  ``dns_record.client_routing_policy`` - Indicates how traffic is distributed among the load
     * balancer Availability Zones. The possible values are ``availability_zone_affinity`` with 100
     * percent zonal affinity, ``partial_availability_zone_affinity`` with 85 percent zonal affinity, and
     * ``any_availability_zone`` with 0 percent zonal affinity.
     * +  ``secondary_ips.auto_assigned.per_subnet`` - The number of secondary IP addresses to configure
     * for your load balancer nodes. Use to address port allocation errors if you can't add targets. The
     * valid range is 0 to 7. The default is 0. After you set this value, you can't decrease it.
     */
    Key?: string;
  }[];
  /** The minimum capacity for a load balancer. */
  MinimumLoadBalancerCapacity?: {
    /** The number of capacity units. */
    CapacityUnits: number;
  };
  /**
   * Indicates whether to enable stabilization when creating or updating an LCU reservation. This
   * ensures that the final stack status reflects the status of the LCU reservation. The default is
   * ``false``.
   * @default false
   */
  EnableCapacityReservationProvisionStabilize?: boolean;
  /**
   * The nodes of an Internet-facing load balancer have public IP addresses. The DNS name of an
   * Internet-facing load balancer is publicly resolvable to the public IP addresses of the nodes.
   * Therefore, Internet-facing load balancers can route requests from clients over the internet.
   * The nodes of an internal load balancer have only private IP addresses. The DNS name of an internal
   * load balancer is publicly resolvable to the private IP addresses of the nodes. Therefore, internal
   * load balancers can route requests only from clients with access to the VPC for the load balancer.
   * The default is an Internet-facing load balancer.
   * You can't specify a scheme for a Gateway Load Balancer.
   */
  Scheme?: string;
  DNSName?: string;
  /**
   * The name of the load balancer. This name must be unique per region per account, can have a maximum
   * of 32 characters, must contain only alphanumeric characters or hyphens, must not begin or end with
   * a hyphen, and must not begin with "internal-".
   * If you don't specify a name, AWS CloudFormation generates a unique physical ID for the load
   * balancer. If you specify a name, you cannot perform updates that require replacement of this
   * resource, but you can perform other updates. To replace the resource, specify a new name.
   */
  Name?: string;
  LoadBalancerName?: string;
  LoadBalancerFullName?: string;
  /**
   * The IDs of the subnets. You can specify only one subnet per Availability Zone. You must specify
   * either subnets or subnet mappings, but not both. To specify an Elastic IP address, specify subnet
   * mappings instead of subnets.
   * [Application Load Balancers] You must specify subnets from at least two Availability Zones.
   * [Application Load Balancers on Outposts] You must specify one Outpost subnet.
   * [Application Load Balancers on Local Zones] You can specify subnets from one or more Local Zones.
   * [Network Load Balancers and Gateway Load Balancers] You can specify subnets from one or more
   * Availability Zones.
   * @uniqueItems true
   */
  Subnets?: string[];
  /** The type of load balancer. The default is ``application``. */
  Type?: string;
  CanonicalHostedZoneID?: string;
  /**
   * The tags to assign to the load balancer.
   * @uniqueItems false
   */
  Tags?: {
    /** The value of the tag. */
    Value?: string;
    /** The key of the tag. */
    Key: string;
  }[];
  LoadBalancerArn?: string;
  /**
   * The IDs of the subnets. You can specify only one subnet per Availability Zone. You must specify
   * either subnets or subnet mappings, but not both.
   * [Application Load Balancers] You must specify subnets from at least two Availability Zones. You
   * can't specify Elastic IP addresses for your subnets.
   * [Application Load Balancers on Outposts] You must specify one Outpost subnet.
   * [Application Load Balancers on Local Zones] You can specify subnets from one or more Local Zones.
   * [Network Load Balancers] You can specify subnets from one or more Availability Zones. You can
   * specify one Elastic IP address per subnet if you need static IP addresses for your internet-facing
   * load balancer. For internal load balancers, you can specify one private IP address per subnet from
   * the IPv4 range of the subnet. For internet-facing load balancer, you can specify one IPv6 address
   * per subnet.
   * [Gateway Load Balancers] You can specify subnets from one or more Availability Zones. You can't
   * specify Elastic IP addresses for your subnets.
   * @uniqueItems true
   */
  SubnetMappings?: {
    /** The ID of the subnet. */
    SubnetId: string;
    /**
     * [Network Load Balancers] The allocation ID of the Elastic IP address for an internet-facing load
     * balancer.
     */
    AllocationId?: string;
    /** [Network Load Balancers] The private IPv4 address for an internal load balancer. */
    PrivateIPv4Address?: string;
    /** [Network Load Balancers] The IPv6 address. */
    IPv6Address?: string;
    /**
     * [Network Load Balancers with UDP listeners] The IPv6 prefix to use for source NAT. Specify an IPv6
     * prefix (/80 netmask) from the subnet CIDR block or ``auto_assigned`` to use an IPv6 prefix selected
     * at random from the subnet CIDR block.
     */
    SourceNatIpv6Prefix?: string;
  }[];
  /**
   * Indicates whether to evaluate inbound security group rules for traffic sent to a Network Load
   * Balancer through privatelink. The default is ``on``.
   * You can't configure this property on a Network Load Balancer unless you associated a security
   * group with the load balancer when you created it.
   */
  EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic?: string;
  /** The ID of the IPv4 IPAM pool. */
  Ipv4IpamPoolId?: string;
};
