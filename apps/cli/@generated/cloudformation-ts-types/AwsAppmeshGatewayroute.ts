// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-gatewayroute.json

/** Resource Type definition for AWS::AppMesh::GatewayRoute */
export type AwsAppmeshGatewayroute = {
  Uid?: string;
  MeshName: string;
  VirtualGatewayName: string;
  MeshOwner?: string;
  ResourceOwner?: string;
  GatewayRouteName?: string;
  Id?: string;
  Arn?: string;
  Spec: {
    HttpRoute?: {
      Action: {
        Target: {
          VirtualService: {
            VirtualServiceName: string;
          };
          Port?: number;
        };
        Rewrite?: {
          Path?: {
            Exact?: string;
          };
          Hostname?: {
            DefaultTargetHostname?: string;
          };
          Prefix?: {
            Value?: string;
            DefaultPrefix?: string;
          };
        };
      };
      Match: {
        Path?: {
          Regex?: string;
          Exact?: string;
        };
        /** @uniqueItems false */
        Headers?: {
          Invert?: boolean;
          Name: string;
          Match?: {
            Suffix?: string;
            Exact?: string;
            Prefix?: string;
            Regex?: string;
            Range?: {
              Start: number;
              End: number;
            };
          };
        }[];
        Port?: number;
        Hostname?: {
          Suffix?: string;
          Exact?: string;
        };
        Prefix?: string;
        Method?: string;
        /** @uniqueItems false */
        QueryParameters?: {
          Name: string;
          Match?: {
            Exact?: string;
          };
        }[];
      };
    };
    Http2Route?: {
      Action: {
        Target: {
          VirtualService: {
            VirtualServiceName: string;
          };
          Port?: number;
        };
        Rewrite?: {
          Path?: {
            Exact?: string;
          };
          Hostname?: {
            DefaultTargetHostname?: string;
          };
          Prefix?: {
            Value?: string;
            DefaultPrefix?: string;
          };
        };
      };
      Match: {
        Path?: {
          Regex?: string;
          Exact?: string;
        };
        /** @uniqueItems false */
        Headers?: {
          Invert?: boolean;
          Name: string;
          Match?: {
            Suffix?: string;
            Exact?: string;
            Prefix?: string;
            Regex?: string;
            Range?: {
              Start: number;
              End: number;
            };
          };
        }[];
        Port?: number;
        Hostname?: {
          Suffix?: string;
          Exact?: string;
        };
        Prefix?: string;
        Method?: string;
        /** @uniqueItems false */
        QueryParameters?: {
          Name: string;
          Match?: {
            Exact?: string;
          };
        }[];
      };
    };
    GrpcRoute?: {
      Action: {
        Target: {
          VirtualService: {
            VirtualServiceName: string;
          };
          Port?: number;
        };
        Rewrite?: {
          Hostname?: {
            DefaultTargetHostname?: string;
          };
        };
      };
      Match: {
        Hostname?: {
          Suffix?: string;
          Exact?: string;
        };
        /** @uniqueItems false */
        Metadata?: {
          Invert?: boolean;
          Name: string;
          Match?: {
            Suffix?: string;
            Exact?: string;
            Prefix?: string;
            Regex?: string;
            Range?: {
              Start: number;
              End: number;
            };
          };
        }[];
        ServiceName?: string;
        Port?: number;
      };
    };
    Priority?: number;
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
