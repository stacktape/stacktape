// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkinterfaceattachment.json

/** Resource Type definition for AWS::EC2::NetworkInterfaceAttachment */
export type AwsEc2Networkinterfaceattachment = {
  /** The ID of the network interface attachment. */
  AttachmentId?: string;
  /**
   * Whether to delete the network interface when the instance terminates. By default, this value is set
   * to true.
   * @default true
   */
  DeleteOnTermination?: boolean;
  /**
   * The network interface's position in the attachment order. For example, the first attached network
   * interface has a DeviceIndex of 0.
   */
  DeviceIndex: string;
  /** The ID of the instance to which you will attach the ENI. */
  InstanceId: string;
  /** The ID of the ENI that you want to attach. */
  NetworkInterfaceId: string;
  EnaSrdSpecification?: {
    EnaSrdEnabled?: boolean;
    EnaSrdUdpSpecification?: {
      EnaSrdUdpEnabled?: boolean;
    };
  };
  /** The number of ENA queues to be created with the instance. */
  EnaQueueCount?: number;
};
