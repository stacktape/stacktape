// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkinsightsaccessscope.json

/** Resource schema for AWS::EC2::NetworkInsightsAccessScope */
export type AwsEc2Networkinsightsaccessscope = {
  NetworkInsightsAccessScopeId?: string;
  NetworkInsightsAccessScopeArn?: string;
  CreatedDate?: string;
  UpdatedDate?: string;
  Tags?: {
    Key: string;
    Value?: string;
  }[];
  MatchPaths?: ({
    Source?: {
      PacketHeaderStatement?: {
        SourceAddresses?: string[];
        DestinationAddresses?: string[];
        SourcePorts?: string[];
        DestinationPorts?: string[];
        SourcePrefixLists?: string[];
        DestinationPrefixLists?: string[];
        Protocols?: ("tcp" | "udp")[];
      };
      ResourceStatement?: {
        Resources?: string[];
        ResourceTypes?: string[];
      };
    };
    Destination?: {
      PacketHeaderStatement?: {
        SourceAddresses?: string[];
        DestinationAddresses?: string[];
        SourcePorts?: string[];
        DestinationPorts?: string[];
        SourcePrefixLists?: string[];
        DestinationPrefixLists?: string[];
        Protocols?: ("tcp" | "udp")[];
      };
      ResourceStatement?: {
        Resources?: string[];
        ResourceTypes?: string[];
      };
    };
    ThroughResources?: {
      ResourceStatement?: {
        Resources?: string[];
        ResourceTypes?: string[];
      };
    }[];
  })[];
  ExcludePaths?: ({
    Source?: {
      PacketHeaderStatement?: {
        SourceAddresses?: string[];
        DestinationAddresses?: string[];
        SourcePorts?: string[];
        DestinationPorts?: string[];
        SourcePrefixLists?: string[];
        DestinationPrefixLists?: string[];
        Protocols?: ("tcp" | "udp")[];
      };
      ResourceStatement?: {
        Resources?: string[];
        ResourceTypes?: string[];
      };
    };
    Destination?: {
      PacketHeaderStatement?: {
        SourceAddresses?: string[];
        DestinationAddresses?: string[];
        SourcePorts?: string[];
        DestinationPorts?: string[];
        SourcePrefixLists?: string[];
        DestinationPrefixLists?: string[];
        Protocols?: ("tcp" | "udp")[];
      };
      ResourceStatement?: {
        Resources?: string[];
        ResourceTypes?: string[];
      };
    };
    ThroughResources?: {
      ResourceStatement?: {
        Resources?: string[];
        ResourceTypes?: string[];
      };
    }[];
  })[];
};
