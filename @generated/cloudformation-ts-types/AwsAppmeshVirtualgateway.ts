// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-virtualgateway.json

/** Resource Type definition for AWS::AppMesh::VirtualGateway */
export type AwsAppmeshVirtualgateway = {
  Uid?: string;
  VirtualGatewayName?: string;
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
    Listeners: {
      ConnectionPool?: {
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
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
