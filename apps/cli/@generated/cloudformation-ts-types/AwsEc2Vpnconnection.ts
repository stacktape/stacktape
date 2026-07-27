// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpnconnection.json

/**
 * Specifies a VPN connection between a virtual private gateway and a VPN customer gateway or a
 * transit gateway and a VPN customer gateway.
 * To specify a VPN connection between a transit gateway and customer gateway, use the
 * ``TransitGatewayId`` and ``CustomerGatewayId`` properties.
 * To specify a VPN connection between a virtual private gateway and customer gateway, use the
 * ``VpnGatewayId`` and ``CustomerGatewayId`` properties.
 * For more information, see [](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html) in the
 * *User Guide*.
 */
export type AwsEc2Vpnconnection = {
  /**
   * The IPv6 CIDR on the AWS side of the VPN connection.
   * Default: ``::/0``
   */
  RemoteIpv6NetworkCidr?: string;
  /**
   * The IPv4 CIDR on the AWS side of the VPN connection.
   * Default: ``0.0.0.0/0``
   */
  RemoteIpv4NetworkCidr?: string;
  /**
   * The tunnel options for the VPN connection.
   * @uniqueItems false
   */
  VpnTunnelOptionsSpecifications?: ({
    /**
     * One or more encryption algorithms that are permitted for the VPN tunnel for phase 2 IKE
     * negotiations.
     * Valid values: ``AES128`` | ``AES256`` | ``AES128-GCM-16`` | ``AES256-GCM-16``
     * @uniqueItems false
     */
    Phase2EncryptionAlgorithms?: ({
      /**
       * The encryption algorithm.
       * @enum ["AES128","AES256","AES128-GCM-16","AES256-GCM-16"]
       */
      Value?: "AES128" | "AES256" | "AES128-GCM-16" | "AES256-GCM-16";
    })[];
    /**
     * One or more Diffie-Hellman group numbers that are permitted for the VPN tunnel for phase 2 IKE
     * negotiations.
     * Valid values: ``2`` | ``5`` | ``14`` | ``15`` | ``16`` | ``17`` | ``18`` | ``19`` | ``20`` |
     * ``21`` | ``22`` | ``23`` | ``24``
     * @uniqueItems false
     */
    Phase2DHGroupNumbers?: ({
      /**
       * The Diffie-Hellmann group number.
       * @enum [2,5,14,15,16,17,18,19,20,21,22,23,24]
       */
      Value?: 2 | 5 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
    })[];
    /**
     * The range of inside IPv6 addresses for the tunnel. Any specified CIDR blocks must be unique across
     * all VPN connections that use the same transit gateway.
     * Constraints: A size /126 CIDR block from the local ``fd00::/8`` range.
     */
    TunnelInsideIpv6Cidr?: string;
    /**
     * The action to take when the establishing the tunnel for the VPN connection. By default, your
     * customer gateway device must initiate the IKE negotiation and bring up the tunnel. Specify
     * ``start`` for AWS to initiate the IKE negotiation.
     * Valid Values: ``add`` | ``start``
     * Default: ``add``
     * @enum ["add","start"]
     */
    StartupAction?: "add" | "start";
    /**
     * The range of inside IP addresses for the tunnel. Any specified CIDR blocks must be unique across
     * all VPN connections that use the same virtual private gateway.
     * Constraints: A size /30 CIDR block from the ``169.254.0.0/16`` range. The following CIDR blocks
     * are reserved and cannot be used:
     * +   ``169.254.0.0/30``
     * +   ``169.254.1.0/30``
     * +   ``169.254.2.0/30``
     * +   ``169.254.3.0/30``
     * +   ``169.254.4.0/30``
     * +   ``169.254.5.0/30``
     * +   ``169.254.169.252/30``
     */
    TunnelInsideCidr?: string;
    /**
     * The IKE versions that are permitted for the VPN tunnel.
     * Valid values: ``ikev1`` | ``ikev2``
     * @uniqueItems false
     */
    IKEVersions?: ({
      /**
       * The IKE version.
       * @enum ["ikev1","ikev2"]
       */
      Value?: "ikev1" | "ikev2";
    })[];
    /** Options for logging VPN tunnel activity. */
    LogOptions?: {
      /** Options for sending VPN tunnel logs to CloudWatch. */
      CloudwatchLogOptions?: {
        BgpLogEnabled?: boolean;
        /**
         * Enable or disable VPN tunnel logging feature. Default value is ``False``.
         * Valid values: ``True`` | ``False``
         */
        LogEnabled?: boolean;
        /**
         * Set log format. Default format is ``json``.
         * Valid values: ``json`` | ``text``
         * @enum ["json","text"]
         */
        LogOutputFormat?: "json" | "text";
        BgpLogGroupArn?: string;
        /** The Amazon Resource Name (ARN) of the CloudWatch log group to send logs to. */
        LogGroupArn?: string;
        /** @enum ["json","text"] */
        BgpLogOutputFormat?: "json" | "text";
      };
    };
    /**
     * One or more Diffie-Hellman group numbers that are permitted for the VPN tunnel for phase 1 IKE
     * negotiations.
     * Valid values: ``2`` | ``14`` | ``15`` | ``16`` | ``17`` | ``18`` | ``19`` | ``20`` | ``21`` |
     * ``22`` | ``23`` | ``24``
     * @uniqueItems false
     */
    Phase1DHGroupNumbers?: ({
      /**
       * The Diffie-Hellmann group number.
       * @enum [2,14,15,16,17,18,19,20,21,22,23,24]
       */
      Value?: 2 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;
    })[];
    /**
     * The number of packets in an IKE replay window.
     * Constraints: A value between 64 and 2048.
     * Default: ``1024``
     * @minimum 64
     * @maximum 2048
     */
    ReplayWindowSize?: number;
    /** Turn on or off tunnel endpoint lifecycle control feature. */
    EnableTunnelLifecycleControl?: boolean;
    /**
     * The margin time, in seconds, before the phase 2 lifetime expires, during which the AWS side of the
     * VPN connection performs an IKE rekey. The exact time of the rekey is randomly selected based on the
     * value for ``RekeyFuzzPercentage``.
     * Constraints: A value between 60 and half of ``Phase2LifetimeSeconds``.
     * Default: ``270``
     * @minimum 60
     */
    RekeyMarginTimeSeconds?: number;
    /**
     * The action to take after DPD timeout occurs. Specify ``restart`` to restart the IKE initiation.
     * Specify ``clear`` to end the IKE session.
     * Valid Values: ``clear`` | ``none`` | ``restart``
     * Default: ``clear``
     * @enum ["clear","none","restart"]
     */
    DPDTimeoutAction?: "clear" | "none" | "restart";
    /**
     * The lifetime for phase 2 of the IKE negotiation, in seconds.
     * Constraints: A value between 900 and 3,600. The value must be less than the value for
     * ``Phase1LifetimeSeconds``.
     * Default: ``3600``
     * @minimum 900
     * @maximum 3600
     */
    Phase2LifetimeSeconds?: number;
    /**
     * One or more integrity algorithms that are permitted for the VPN tunnel for phase 2 IKE
     * negotiations.
     * Valid values: ``SHA1`` | ``SHA2-256`` | ``SHA2-384`` | ``SHA2-512``
     * @uniqueItems false
     */
    Phase2IntegrityAlgorithms?: ({
      /**
       * The integrity algorithm.
       * @enum ["SHA1","SHA2-256","SHA2-384","SHA2-512"]
       */
      Value?: "SHA1" | "SHA2-256" | "SHA2-384" | "SHA2-512";
    })[];
    /**
     * One or more integrity algorithms that are permitted for the VPN tunnel for phase 1 IKE
     * negotiations.
     * Valid values: ``SHA1`` | ``SHA2-256`` | ``SHA2-384`` | ``SHA2-512``
     * @uniqueItems false
     */
    Phase1IntegrityAlgorithms?: ({
      /**
       * The value for the integrity algorithm.
       * @enum ["SHA1","SHA2-256","SHA2-384","SHA2-512"]
       */
      Value?: "SHA1" | "SHA2-256" | "SHA2-384" | "SHA2-512";
    })[];
    /**
     * The pre-shared key (PSK) to establish initial authentication between the virtual private gateway
     * and customer gateway.
     * Constraints: Allowed characters are alphanumeric characters, periods (.), and underscores (_).
     * Must be between 8 and 64 characters in length and cannot start with zero (0).
     */
    PreSharedKey?: string;
    /**
     * The lifetime for phase 1 of the IKE negotiation, in seconds.
     * Constraints: A value between 900 and 28,800.
     * Default: ``28800``
     * @minimum 900
     * @maximum 28800
     */
    Phase1LifetimeSeconds?: number;
    /**
     * The percentage of the rekey window (determined by ``RekeyMarginTimeSeconds``) during which the
     * rekey time is randomly selected.
     * Constraints: A value between 0 and 100.
     * Default: ``100``
     * @minimum 0
     * @maximum 100
     */
    RekeyFuzzPercentage?: number;
    /**
     * One or more encryption algorithms that are permitted for the VPN tunnel for phase 1 IKE
     * negotiations.
     * Valid values: ``AES128`` | ``AES256`` | ``AES128-GCM-16`` | ``AES256-GCM-16``
     * @uniqueItems false
     */
    Phase1EncryptionAlgorithms?: ({
      /**
       * The value for the encryption algorithm.
       * @enum ["AES128","AES256","AES128-GCM-16","AES256-GCM-16"]
       */
      Value?: "AES128" | "AES256" | "AES128-GCM-16" | "AES256-GCM-16";
    })[];
    /**
     * The number of seconds after which a DPD timeout occurs.
     * Constraints: A value greater than or equal to 30.
     * Default: ``30``
     * @minimum 30
     */
    DPDTimeoutSeconds?: number;
  })[];
  /** The ID of the customer gateway at your end of the VPN connection. */
  CustomerGatewayId: string;
  /**
   * The type of IP address assigned to the outside interface of the customer gateway device.
   * Valid values: ``PrivateIpv4`` | ``PublicIpv4`` | ``Ipv6``
   * Default: ``PublicIpv4``
   */
  OutsideIpAddressType?: string;
  /**
   * Indicates whether the VPN connection uses static routes only. Static routes must be used for
   * devices that don't support BGP.
   * If you are creating a VPN connection for a device that does not support Border Gateway Protocol
   * (BGP), you must specify ``true``.
   */
  StaticRoutesOnly?: boolean;
  /**
   * Indicate whether to enable acceleration for the VPN connection.
   * Default: ``false``
   */
  EnableAcceleration?: boolean;
  /**
   * The ID of the transit gateway associated with the VPN connection.
   * You must specify either ``TransitGatewayId`` or ``VpnGatewayId``, but not both.
   */
  TransitGatewayId?: string;
  /** The type of VPN connection. */
  Type: string;
  /**
   * @default "standard"
   * @enum ["standard","large"]
   */
  TunnelBandwidth?: "standard" | "large";
  /**
   * The IPv4 CIDR on the customer gateway (on-premises) side of the VPN connection.
   * Default: ``0.0.0.0/0``
   */
  LocalIpv4NetworkCidr?: string;
  /**
   * The ID of the virtual private gateway at the AWS side of the VPN connection.
   * You must specify either ``TransitGatewayId`` or ``VpnGatewayId``, but not both.
   */
  VpnGatewayId?: string;
  VpnConcentratorId?: string;
  /**
   * Describes the storage location for an instance store-backed AMI.
   * @enum ["Standard","SecretsManager"]
   */
  PreSharedKeyStorage?: "Standard" | "SecretsManager";
  /**
   * The transit gateway attachment ID to use for the VPN tunnel.
   * Required if ``OutsideIpAddressType`` is set to ``PrivateIpv4``.
   */
  TransportTransitGatewayAttachmentId?: string;
  /**
   * The IPv6 CIDR on the customer gateway (on-premises) side of the VPN connection.
   * Default: ``::/0``
   */
  LocalIpv6NetworkCidr?: string;
  VpnConnectionId?: string;
  /**
   * Indicate whether the VPN tunnels process IPv4 or IPv6 traffic.
   * Default: ``ipv4``
   */
  TunnelInsideIpVersion?: string;
  /**
   * Any tags assigned to the VPN connection.
   * @uniqueItems false
   */
  Tags?: {
    /** The tag value. */
    Value: string;
    /** The tag key. */
    Key: string;
  }[];
};
