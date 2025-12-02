// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-eipassociation.json

/**
 * Associates an Elastic IP address with an instance or a network interface. Before you can use an
 * Elastic IP address, you must allocate it to your account. For more information about working with
 * Elastic IP addresses, see [Elastic IP address concepts and
 * rules](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-eips.html#vpc-eip-overview).
 * You must specify ``AllocationId`` and either ``InstanceId``, ``NetworkInterfaceId``, or
 * ``PrivateIpAddress``.
 */
export type AwsEc2Eipassociation = {
  /**
   * The primary or secondary private IP address to associate with the Elastic IP address. If no private
   * IP address is specified, the Elastic IP address is associated with the primary private IP address.
   */
  PrivateIpAddress?: string;
  /**
   * The ID of the instance. The instance must have exactly one attached network interface. You can
   * specify either the instance ID or the network interface ID, but not both.
   */
  InstanceId?: string;
  /** The allocation ID. This is required. */
  AllocationId?: string;
  Id?: string;
  /**
   * The ID of the network interface. If the instance has more than one network interface, you must
   * specify a network interface ID.
   * You can specify either the instance ID or the network interface ID, but not both.
   */
  NetworkInterfaceId?: string;
  EIP?: unknown | unknown;
};
