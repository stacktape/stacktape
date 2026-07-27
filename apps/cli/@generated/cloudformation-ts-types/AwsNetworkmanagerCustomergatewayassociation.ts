// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-customergatewayassociation.json

/**
 * The AWS::NetworkManager::CustomerGatewayAssociation type associates a customer gateway with a
 * device and optionally, with a link.
 */
export type AwsNetworkmanagerCustomergatewayassociation = {
  /** The ID of the global network. */
  GlobalNetworkId: string;
  /** The Amazon Resource Name (ARN) of the customer gateway. */
  CustomerGatewayArn: string;
  /** The ID of the device */
  DeviceId: string;
  /** The ID of the link */
  LinkId?: string;
};
