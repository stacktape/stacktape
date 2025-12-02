// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-linkassociation.json

/**
 * The AWS::NetworkManager::LinkAssociation type associates a link to a device. The device and link
 * must be in the same global network and the same site.
 */
export type AwsNetworkmanagerLinkassociation = {
  /** The ID of the global network. */
  GlobalNetworkId: string;
  /** The ID of the device */
  DeviceId: string;
  /** The ID of the link */
  LinkId: string;
};
