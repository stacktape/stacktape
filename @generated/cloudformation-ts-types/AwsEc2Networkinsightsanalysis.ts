// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-networkinsightsanalysis.json

/** Resource schema for AWS::EC2::NetworkInsightsAnalysis */
export type AwsEc2Networkinsightsanalysis = {
  /** @enum ["running","failed","succeeded"] */
  Status?: "running" | "failed" | "succeeded";
  /** @uniqueItems false */
  ReturnPathComponents?: {
    /** @uniqueItems false */
    AdditionalDetails?: {
      ServiceName?: string;
      AdditionalDetailType?: string;
      /** @uniqueItems false */
      LoadBalancers?: {
        Id?: string;
        Arn?: string;
      }[];
      Component?: {
        Id?: string;
        Arn?: string;
      };
    }[];
    InboundHeader?: {
      /** @uniqueItems false */
      DestinationPortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      SourcePortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      DestinationAddresses?: string[];
      Protocol?: string;
      /** @uniqueItems false */
      SourceAddresses?: string[];
    };
    Vpc?: {
      Id?: string;
      Arn?: string;
    };
    DestinationVpc?: {
      Id?: string;
      Arn?: string;
    };
    SecurityGroupRule?: {
      PortRange?: {
        From?: number;
        To?: number;
      };
      Cidr?: string;
      PrefixListId?: string;
      SecurityGroupId?: string;
      Protocol?: string;
      Direction?: string;
    };
    TransitGateway?: {
      Id?: string;
      Arn?: string;
    };
    ElasticLoadBalancerListener?: {
      Id?: string;
      Arn?: string;
    };
    /** @uniqueItems false */
    Explanations?: {
      VpnGateway?: {
        Id?: string;
        Arn?: string;
      };
      PacketField?: string;
      TransitGatewayAttachment?: {
        Id?: string;
        Arn?: string;
      };
      /** @uniqueItems false */
      Protocols?: string[];
      IngressRouteTable?: {
        Id?: string;
        Arn?: string;
      };
      ClassicLoadBalancerListener?: {
        InstancePort?: number;
        LoadBalancerPort?: number;
      };
      VpcPeeringConnection?: {
        Id?: string;
        Arn?: string;
      };
      Address?: string;
      Port?: number;
      /** @uniqueItems false */
      Addresses?: string[];
      ElasticLoadBalancerListener?: {
        Id?: string;
        Arn?: string;
      };
      TransitGatewayRouteTable?: {
        Id?: string;
        Arn?: string;
      };
      ExplanationCode?: string;
      InternetGateway?: {
        Id?: string;
        Arn?: string;
      };
      SourceVpc?: {
        Id?: string;
        Arn?: string;
      };
      AttachedTo?: {
        Id?: string;
        Arn?: string;
      };
      PrefixList?: {
        Id?: string;
        Arn?: string;
      };
      TransitGatewayRouteTableRoute?: {
        PrefixListId?: string;
        ResourceId?: string;
        State?: string;
        ResourceType?: string;
        RouteOrigin?: string;
        DestinationCidr?: string;
        AttachmentId?: string;
      };
      ComponentRegion?: string;
      LoadBalancerTargetGroup?: {
        Id?: string;
        Arn?: string;
      };
      NetworkInterface?: {
        Id?: string;
        Arn?: string;
      };
      CustomerGateway?: {
        Id?: string;
        Arn?: string;
      };
      DestinationVpc?: {
        Id?: string;
        Arn?: string;
      };
      SecurityGroup?: {
        Id?: string;
        Arn?: string;
      };
      TransitGateway?: {
        Id?: string;
        Arn?: string;
      };
      RouteTable?: {
        Id?: string;
        Arn?: string;
      };
      State?: string;
      LoadBalancerListenerPort?: number;
      vpcEndpoint?: {
        Id?: string;
        Arn?: string;
      };
      Subnet?: {
        Id?: string;
        Arn?: string;
      };
      /** @uniqueItems false */
      Cidrs?: string[];
      Destination?: {
        Id?: string;
        Arn?: string;
      };
      /** @uniqueItems false */
      SecurityGroups?: {
        Id?: string;
        Arn?: string;
      }[];
      ComponentAccount?: string;
      VpnConnection?: {
        Id?: string;
        Arn?: string;
      };
      Vpc?: {
        Id?: string;
        Arn?: string;
      };
      NatGateway?: {
        Id?: string;
        Arn?: string;
      };
      Direction?: string;
      LoadBalancerTargetPort?: number;
      LoadBalancerTarget?: {
        Address?: string;
        Instance?: {
          Id?: string;
          Arn?: string;
        };
        Port?: number;
        AvailabilityZone?: string;
      };
      /** @uniqueItems false */
      LoadBalancerTargetGroups?: {
        Id?: string;
        Arn?: string;
      }[];
      Component?: {
        Id?: string;
        Arn?: string;
      };
      MissingComponent?: string;
      RouteTableRoute?: {
        Origin?: string;
        destinationPrefixListId?: string;
        destinationCidr?: string;
        NetworkInterfaceId?: string;
        TransitGatewayId?: string;
        VpcPeeringConnectionId?: string;
        instanceId?: string;
        State?: string;
        egressOnlyInternetGatewayId?: string;
        NatGatewayId?: string;
        gatewayId?: string;
      };
      /** @uniqueItems false */
      AvailabilityZones?: string[];
      /** @uniqueItems false */
      PortRanges?: {
        From?: number;
        To?: number;
      }[];
      Acl?: {
        Id?: string;
        Arn?: string;
      };
      SecurityGroupRule?: {
        PortRange?: {
          From?: number;
          To?: number;
        };
        Cidr?: string;
        PrefixListId?: string;
        SecurityGroupId?: string;
        Protocol?: string;
        Direction?: string;
      };
      SubnetRouteTable?: {
        Id?: string;
        Arn?: string;
      };
      LoadBalancerArn?: string;
      AclRule?: {
        PortRange?: {
          From?: number;
          To?: number;
        };
        Cidr?: string;
        RuleAction?: string;
        Egress?: boolean;
        RuleNumber?: number;
        Protocol?: string;
      };
    }[];
    ServiceName?: string;
    SequenceNumber?: number;
    SourceVpc?: {
      Id?: string;
      Arn?: string;
    };
    OutboundHeader?: {
      /** @uniqueItems false */
      DestinationPortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      SourcePortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      DestinationAddresses?: string[];
      Protocol?: string;
      /** @uniqueItems false */
      SourceAddresses?: string[];
    };
    AclRule?: {
      PortRange?: {
        From?: number;
        To?: number;
      };
      Cidr?: string;
      RuleAction?: string;
      Egress?: boolean;
      RuleNumber?: number;
      Protocol?: string;
    };
    TransitGatewayRouteTableRoute?: {
      PrefixListId?: string;
      ResourceId?: string;
      State?: string;
      ResourceType?: string;
      RouteOrigin?: string;
      DestinationCidr?: string;
      AttachmentId?: string;
    };
    Component?: {
      Id?: string;
      Arn?: string;
    };
    Subnet?: {
      Id?: string;
      Arn?: string;
    };
    RouteTableRoute?: {
      Origin?: string;
      destinationPrefixListId?: string;
      destinationCidr?: string;
      NetworkInterfaceId?: string;
      TransitGatewayId?: string;
      VpcPeeringConnectionId?: string;
      instanceId?: string;
      State?: string;
      egressOnlyInternetGatewayId?: string;
      NatGatewayId?: string;
      gatewayId?: string;
    };
  }[];
  NetworkInsightsAnalysisId?: string;
  /** @uniqueItems false */
  FilterOutArns?: string[];
  NetworkInsightsPathId: string;
  NetworkPathFound?: boolean;
  /** @uniqueItems true */
  SuggestedAccounts?: string[];
  /** @uniqueItems false */
  FilterInArns?: string[];
  NetworkInsightsAnalysisArn?: string;
  StatusMessage?: string;
  StartDate?: string;
  /** @uniqueItems false */
  AlternatePathHints?: {
    ComponentArn?: string;
    ComponentId?: string;
  }[];
  /** @uniqueItems false */
  Explanations?: {
    VpnGateway?: {
      Id?: string;
      Arn?: string;
    };
    PacketField?: string;
    TransitGatewayAttachment?: {
      Id?: string;
      Arn?: string;
    };
    /** @uniqueItems false */
    Protocols?: string[];
    IngressRouteTable?: {
      Id?: string;
      Arn?: string;
    };
    ClassicLoadBalancerListener?: {
      InstancePort?: number;
      LoadBalancerPort?: number;
    };
    VpcPeeringConnection?: {
      Id?: string;
      Arn?: string;
    };
    Address?: string;
    Port?: number;
    /** @uniqueItems false */
    Addresses?: string[];
    ElasticLoadBalancerListener?: {
      Id?: string;
      Arn?: string;
    };
    TransitGatewayRouteTable?: {
      Id?: string;
      Arn?: string;
    };
    ExplanationCode?: string;
    InternetGateway?: {
      Id?: string;
      Arn?: string;
    };
    SourceVpc?: {
      Id?: string;
      Arn?: string;
    };
    AttachedTo?: {
      Id?: string;
      Arn?: string;
    };
    PrefixList?: {
      Id?: string;
      Arn?: string;
    };
    TransitGatewayRouteTableRoute?: {
      PrefixListId?: string;
      ResourceId?: string;
      State?: string;
      ResourceType?: string;
      RouteOrigin?: string;
      DestinationCidr?: string;
      AttachmentId?: string;
    };
    ComponentRegion?: string;
    LoadBalancerTargetGroup?: {
      Id?: string;
      Arn?: string;
    };
    NetworkInterface?: {
      Id?: string;
      Arn?: string;
    };
    CustomerGateway?: {
      Id?: string;
      Arn?: string;
    };
    DestinationVpc?: {
      Id?: string;
      Arn?: string;
    };
    SecurityGroup?: {
      Id?: string;
      Arn?: string;
    };
    TransitGateway?: {
      Id?: string;
      Arn?: string;
    };
    RouteTable?: {
      Id?: string;
      Arn?: string;
    };
    State?: string;
    LoadBalancerListenerPort?: number;
    vpcEndpoint?: {
      Id?: string;
      Arn?: string;
    };
    Subnet?: {
      Id?: string;
      Arn?: string;
    };
    /** @uniqueItems false */
    Cidrs?: string[];
    Destination?: {
      Id?: string;
      Arn?: string;
    };
    /** @uniqueItems false */
    SecurityGroups?: {
      Id?: string;
      Arn?: string;
    }[];
    ComponentAccount?: string;
    VpnConnection?: {
      Id?: string;
      Arn?: string;
    };
    Vpc?: {
      Id?: string;
      Arn?: string;
    };
    NatGateway?: {
      Id?: string;
      Arn?: string;
    };
    Direction?: string;
    LoadBalancerTargetPort?: number;
    LoadBalancerTarget?: {
      Address?: string;
      Instance?: {
        Id?: string;
        Arn?: string;
      };
      Port?: number;
      AvailabilityZone?: string;
    };
    /** @uniqueItems false */
    LoadBalancerTargetGroups?: {
      Id?: string;
      Arn?: string;
    }[];
    Component?: {
      Id?: string;
      Arn?: string;
    };
    MissingComponent?: string;
    RouteTableRoute?: {
      Origin?: string;
      destinationPrefixListId?: string;
      destinationCidr?: string;
      NetworkInterfaceId?: string;
      TransitGatewayId?: string;
      VpcPeeringConnectionId?: string;
      instanceId?: string;
      State?: string;
      egressOnlyInternetGatewayId?: string;
      NatGatewayId?: string;
      gatewayId?: string;
    };
    /** @uniqueItems false */
    AvailabilityZones?: string[];
    /** @uniqueItems false */
    PortRanges?: {
      From?: number;
      To?: number;
    }[];
    Acl?: {
      Id?: string;
      Arn?: string;
    };
    SecurityGroupRule?: {
      PortRange?: {
        From?: number;
        To?: number;
      };
      Cidr?: string;
      PrefixListId?: string;
      SecurityGroupId?: string;
      Protocol?: string;
      Direction?: string;
    };
    SubnetRouteTable?: {
      Id?: string;
      Arn?: string;
    };
    LoadBalancerArn?: string;
    AclRule?: {
      PortRange?: {
        From?: number;
        To?: number;
      };
      Cidr?: string;
      RuleAction?: string;
      Egress?: boolean;
      RuleNumber?: number;
      Protocol?: string;
    };
  }[];
  /** @uniqueItems false */
  ForwardPathComponents?: {
    /** @uniqueItems false */
    AdditionalDetails?: {
      ServiceName?: string;
      AdditionalDetailType?: string;
      /** @uniqueItems false */
      LoadBalancers?: {
        Id?: string;
        Arn?: string;
      }[];
      Component?: {
        Id?: string;
        Arn?: string;
      };
    }[];
    InboundHeader?: {
      /** @uniqueItems false */
      DestinationPortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      SourcePortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      DestinationAddresses?: string[];
      Protocol?: string;
      /** @uniqueItems false */
      SourceAddresses?: string[];
    };
    Vpc?: {
      Id?: string;
      Arn?: string;
    };
    DestinationVpc?: {
      Id?: string;
      Arn?: string;
    };
    SecurityGroupRule?: {
      PortRange?: {
        From?: number;
        To?: number;
      };
      Cidr?: string;
      PrefixListId?: string;
      SecurityGroupId?: string;
      Protocol?: string;
      Direction?: string;
    };
    TransitGateway?: {
      Id?: string;
      Arn?: string;
    };
    ElasticLoadBalancerListener?: {
      Id?: string;
      Arn?: string;
    };
    /** @uniqueItems false */
    Explanations?: {
      VpnGateway?: {
        Id?: string;
        Arn?: string;
      };
      PacketField?: string;
      TransitGatewayAttachment?: {
        Id?: string;
        Arn?: string;
      };
      /** @uniqueItems false */
      Protocols?: string[];
      IngressRouteTable?: {
        Id?: string;
        Arn?: string;
      };
      ClassicLoadBalancerListener?: {
        InstancePort?: number;
        LoadBalancerPort?: number;
      };
      VpcPeeringConnection?: {
        Id?: string;
        Arn?: string;
      };
      Address?: string;
      Port?: number;
      /** @uniqueItems false */
      Addresses?: string[];
      ElasticLoadBalancerListener?: {
        Id?: string;
        Arn?: string;
      };
      TransitGatewayRouteTable?: {
        Id?: string;
        Arn?: string;
      };
      ExplanationCode?: string;
      InternetGateway?: {
        Id?: string;
        Arn?: string;
      };
      SourceVpc?: {
        Id?: string;
        Arn?: string;
      };
      AttachedTo?: {
        Id?: string;
        Arn?: string;
      };
      PrefixList?: {
        Id?: string;
        Arn?: string;
      };
      TransitGatewayRouteTableRoute?: {
        PrefixListId?: string;
        ResourceId?: string;
        State?: string;
        ResourceType?: string;
        RouteOrigin?: string;
        DestinationCidr?: string;
        AttachmentId?: string;
      };
      ComponentRegion?: string;
      LoadBalancerTargetGroup?: {
        Id?: string;
        Arn?: string;
      };
      NetworkInterface?: {
        Id?: string;
        Arn?: string;
      };
      CustomerGateway?: {
        Id?: string;
        Arn?: string;
      };
      DestinationVpc?: {
        Id?: string;
        Arn?: string;
      };
      SecurityGroup?: {
        Id?: string;
        Arn?: string;
      };
      TransitGateway?: {
        Id?: string;
        Arn?: string;
      };
      RouteTable?: {
        Id?: string;
        Arn?: string;
      };
      State?: string;
      LoadBalancerListenerPort?: number;
      vpcEndpoint?: {
        Id?: string;
        Arn?: string;
      };
      Subnet?: {
        Id?: string;
        Arn?: string;
      };
      /** @uniqueItems false */
      Cidrs?: string[];
      Destination?: {
        Id?: string;
        Arn?: string;
      };
      /** @uniqueItems false */
      SecurityGroups?: {
        Id?: string;
        Arn?: string;
      }[];
      ComponentAccount?: string;
      VpnConnection?: {
        Id?: string;
        Arn?: string;
      };
      Vpc?: {
        Id?: string;
        Arn?: string;
      };
      NatGateway?: {
        Id?: string;
        Arn?: string;
      };
      Direction?: string;
      LoadBalancerTargetPort?: number;
      LoadBalancerTarget?: {
        Address?: string;
        Instance?: {
          Id?: string;
          Arn?: string;
        };
        Port?: number;
        AvailabilityZone?: string;
      };
      /** @uniqueItems false */
      LoadBalancerTargetGroups?: {
        Id?: string;
        Arn?: string;
      }[];
      Component?: {
        Id?: string;
        Arn?: string;
      };
      MissingComponent?: string;
      RouteTableRoute?: {
        Origin?: string;
        destinationPrefixListId?: string;
        destinationCidr?: string;
        NetworkInterfaceId?: string;
        TransitGatewayId?: string;
        VpcPeeringConnectionId?: string;
        instanceId?: string;
        State?: string;
        egressOnlyInternetGatewayId?: string;
        NatGatewayId?: string;
        gatewayId?: string;
      };
      /** @uniqueItems false */
      AvailabilityZones?: string[];
      /** @uniqueItems false */
      PortRanges?: {
        From?: number;
        To?: number;
      }[];
      Acl?: {
        Id?: string;
        Arn?: string;
      };
      SecurityGroupRule?: {
        PortRange?: {
          From?: number;
          To?: number;
        };
        Cidr?: string;
        PrefixListId?: string;
        SecurityGroupId?: string;
        Protocol?: string;
        Direction?: string;
      };
      SubnetRouteTable?: {
        Id?: string;
        Arn?: string;
      };
      LoadBalancerArn?: string;
      AclRule?: {
        PortRange?: {
          From?: number;
          To?: number;
        };
        Cidr?: string;
        RuleAction?: string;
        Egress?: boolean;
        RuleNumber?: number;
        Protocol?: string;
      };
    }[];
    ServiceName?: string;
    SequenceNumber?: number;
    SourceVpc?: {
      Id?: string;
      Arn?: string;
    };
    OutboundHeader?: {
      /** @uniqueItems false */
      DestinationPortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      SourcePortRanges?: {
        From?: number;
        To?: number;
      }[];
      /** @uniqueItems false */
      DestinationAddresses?: string[];
      Protocol?: string;
      /** @uniqueItems false */
      SourceAddresses?: string[];
    };
    AclRule?: {
      PortRange?: {
        From?: number;
        To?: number;
      };
      Cidr?: string;
      RuleAction?: string;
      Egress?: boolean;
      RuleNumber?: number;
      Protocol?: string;
    };
    TransitGatewayRouteTableRoute?: {
      PrefixListId?: string;
      ResourceId?: string;
      State?: string;
      ResourceType?: string;
      RouteOrigin?: string;
      DestinationCidr?: string;
      AttachmentId?: string;
    };
    Component?: {
      Id?: string;
      Arn?: string;
    };
    Subnet?: {
      Id?: string;
      Arn?: string;
    };
    RouteTableRoute?: {
      Origin?: string;
      destinationPrefixListId?: string;
      destinationCidr?: string;
      NetworkInterfaceId?: string;
      TransitGatewayId?: string;
      VpcPeeringConnectionId?: string;
      instanceId?: string;
      State?: string;
      egressOnlyInternetGatewayId?: string;
      NatGatewayId?: string;
      gatewayId?: string;
    };
  }[];
  /** @uniqueItems true */
  AdditionalAccounts?: string[];
  /** @uniqueItems true */
  Tags?: {
    Value?: string;
    Key: string;
  }[];
};
