// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-transitgatewayregistration.json

/**
 * The AWS::NetworkManager::TransitGatewayRegistration type registers a transit gateway in your global
 * network. The transit gateway can be in any AWS Region, but it must be owned by the same AWS account
 * that owns the global network. You cannot register a transit gateway in more than one global
 * network.
 */
export type AwsNetworkmanagerTransitgatewayregistration = {
  /** The ID of the global network. */
  GlobalNetworkId: string;
  /** The Amazon Resource Name (ARN) of the transit gateway. */
  TransitGatewayArn: string;
};
