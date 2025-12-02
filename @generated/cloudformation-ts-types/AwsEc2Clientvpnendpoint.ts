// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-clientvpnendpoint.json

/** Resource Type definition for AWS::EC2::ClientVpnEndpoint */
export type AwsEc2Clientvpnendpoint = {
  ClientCidrBlock?: string;
  ClientConnectOptions?: {
    Enabled: boolean;
    LambdaFunctionArn?: string;
  };
  Description?: string;
  ClientRouteEnforcementOptions?: {
    Enforced?: boolean;
  };
  /** @uniqueItems false */
  TagSpecifications?: {
    ResourceType: string;
    /** @uniqueItems false */
    Tags: {
      Value: string;
      Key: string;
    }[];
  }[];
  /** @uniqueItems false */
  AuthenticationOptions: {
    MutualAuthentication?: {
      ClientRootCertificateChainArn: string;
    };
    Type: string;
    ActiveDirectory?: {
      DirectoryId: string;
    };
    FederatedAuthentication?: {
      SAMLProviderArn: string;
      SelfServiceSAMLProviderArn?: string;
    };
  }[];
  ServerCertificateArn: string;
  SessionTimeoutHours?: number;
  /** @uniqueItems false */
  DnsServers?: string[];
  /** @uniqueItems false */
  SecurityGroupIds?: string[];
  DisconnectOnSessionTimeout?: boolean;
  ConnectionLogOptions: {
    Enabled: boolean;
    CloudwatchLogGroup?: string;
    CloudwatchLogStream?: string;
  };
  SplitTunnel?: boolean;
  ClientLoginBannerOptions?: {
    Enabled: boolean;
    BannerText?: string;
  };
  VpcId?: string;
  SelfServicePortal?: string;
  TransportProtocol?: string;
  Id?: string;
  VpnPort?: number;
};
