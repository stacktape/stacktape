// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-virtualnode.json

/** Resource Type definition for AWS::AppMesh::VirtualNode */
export type AwsAppmeshVirtualnode = {
  Uid?: string;
  MeshName: string;
  MeshOwner?: string;
  ResourceOwner?: string;
  Id?: string;
  Arn?: string;
  Spec: {
    Logging?: {
      AccessLog?: {
        File?: {
          Path: string;
          Format?: {
            Text?: string;
            /** @uniqueItems false */
            Json?: {
              Value: string;
              Key: string;
            }[];
          };
        };
      };
    };
    /** @uniqueItems false */
    Backends?: {
      VirtualService?: {
        VirtualServiceName: string;
        ClientPolicy?: {
          TLS?: {
            Validation: {
              SubjectAlternativeNames?: {
                Match: {
                  /** @uniqueItems false */
                  Exact?: string[];
                };
              };
              Trust: {
                SDS?: {
                  SecretName: string;
                };
                ACM?: {
                  /** @uniqueItems false */
                  CertificateAuthorityArns: string[];
                };
                File?: {
                  CertificateChain: string;
                };
              };
            };
            /** @uniqueItems false */
            Ports?: number[];
            Enforce?: boolean;
            Certificate?: {
              File?: {
                CertificateChain: string;
                PrivateKey: string;
              };
              SDS?: {
                SecretName: string;
              };
            };
          };
        };
      };
    }[];
    /** @uniqueItems false */
    Listeners?: {
      ConnectionPool?: {
        TCP?: {
          MaxConnections: number;
        };
        HTTP?: {
          MaxConnections: number;
          MaxPendingRequests?: number;
        };
        HTTP2?: {
          MaxRequests: number;
        };
        GRPC?: {
          MaxRequests: number;
        };
      };
      Timeout?: {
        TCP?: {
          Idle?: {
            Value: number;
            Unit: string;
          };
        };
        HTTP?: {
          PerRequest?: {
            Value: number;
            Unit: string;
          };
          Idle?: {
            Value: number;
            Unit: string;
          };
        };
        HTTP2?: {
          PerRequest?: {
            Value: number;
            Unit: string;
          };
          Idle?: {
            Value: number;
            Unit: string;
          };
        };
        GRPC?: {
          PerRequest?: {
            Value: number;
            Unit: string;
          };
          Idle?: {
            Value: number;
            Unit: string;
          };
        };
      };
      HealthCheck?: {
        Path?: string;
        UnhealthyThreshold: number;
        Port?: number;
        HealthyThreshold: number;
        TimeoutMillis: number;
        Protocol: string;
        IntervalMillis: number;
      };
      TLS?: {
        Validation?: {
          SubjectAlternativeNames?: {
            Match: {
              /** @uniqueItems false */
              Exact?: string[];
            };
          };
          Trust: {
            File?: {
              CertificateChain: string;
            };
            SDS?: {
              SecretName: string;
            };
          };
        };
        Mode: string;
        Certificate: {
          SDS?: {
            SecretName: string;
          };
          ACM?: {
            CertificateArn: string;
          };
          File?: {
            CertificateChain: string;
            PrivateKey: string;
          };
        };
      };
      PortMapping: {
        Protocol: string;
        Port: number;
      };
      OutlierDetection?: {
        MaxEjectionPercent: number;
        BaseEjectionDuration: {
          Value: number;
          Unit: string;
        };
        MaxServerErrors: number;
        Interval: {
          Value: number;
          Unit: string;
        };
      };
    }[];
    BackendDefaults?: {
      ClientPolicy?: {
        TLS?: {
          Validation: {
            SubjectAlternativeNames?: {
              Match: {
                /** @uniqueItems false */
                Exact?: string[];
              };
            };
            Trust: {
              SDS?: {
                SecretName: string;
              };
              ACM?: {
                /** @uniqueItems false */
                CertificateAuthorityArns: string[];
              };
              File?: {
                CertificateChain: string;
              };
            };
          };
          /** @uniqueItems false */
          Ports?: number[];
          Enforce?: boolean;
          Certificate?: {
            File?: {
              CertificateChain: string;
              PrivateKey: string;
            };
            SDS?: {
              SecretName: string;
            };
          };
        };
      };
    };
    ServiceDiscovery?: {
      DNS?: {
        Hostname: string;
        IpPreference?: string;
        ResponseType?: string;
      };
      AWSCloudMap?: {
        /** @uniqueItems false */
        Attributes?: {
          Value: string;
          Key: string;
        }[];
        NamespaceName: string;
        ServiceName: string;
        IpPreference?: string;
      };
    };
  };
  VirtualNodeName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
