// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-customergateway.json

/** Specifies a customer gateway. */
export type AwsEc2Customergateway = {
  /** The type of VPN connection that this customer gateway supports (``ipsec.1``). */
  Type: string;
  CustomerGatewayId?: string;
  /**
   * The IP address for the customer gateway device's outside interface. The address must be static. If
   * ``OutsideIpAddressType`` in your VPN connection options is set to ``PrivateIpv4``, you can use an
   * RFC6598 or RFC1918 private IPv4 address. If ``OutsideIpAddressType`` is set to ``Ipv6``, you can
   * use an IPv6 address.
   */
  IpAddress: string;
  /**
   * For customer gateway devices that support BGP, specify the device's ASN. You must specify either
   * ``BgpAsn`` or ``BgpAsnExtended`` when creating the customer gateway. If the ASN is larger than
   * ``2,147,483,647``, you must use ``BgpAsnExtended``.
   * Valid values: ``2,147,483,648`` to ``4,294,967,295``
   * @minimum 2147483648
   * @maximum 4294967294
   */
  BgpAsnExtended?: number;
  /**
   * For customer gateway devices that support BGP, specify the device's ASN. You must specify either
   * ``BgpAsn`` or ``BgpAsnExtended`` when creating the customer gateway. If the ASN is larger than
   * ``2,147,483,647``, you must use ``BgpAsnExtended``.
   * Default: 65000
   * Valid values: ``1`` to ``2,147,483,647``
   * @default 65000
   */
  BgpAsn?: number;
  /**
   * One or more tags for the customer gateway.
   * @uniqueItems false
   */
  Tags?: {
    /** The tag value. */
    Value: string;
    /** The tag key. */
    Key: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) for the customer gateway certificate.
   * @pattern ^arn:(aws[a-zA-Z-]*)?:acm:[a-z]{2}((-gov)|(-iso([a-z]{1})?))?-[a-z]+-\d{1}:\d{12}:certificate\/[a-zA-Z0-9-_]+$
   */
  CertificateArn?: string;
  /** The name of customer gateway device. */
  DeviceName?: string;
};
