// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-route.json

/** Resource Type definition for AWS::AppMesh::Route */
export type AwsAppmeshRoute = {
  Uid?: string;
  MeshName: string;
  VirtualRouterName: string;
  MeshOwner?: string;
  ResourceOwner?: string;
  RouteName?: string;
  Id?: string;
  Arn?: string;
  Spec: {
    HttpRoute?: {
      Action: {
        /** @uniqueItems false */
        WeightedTargets: {
          VirtualNode: string;
          Weight: number;
          Port?: number;
        }[];
      };
      RetryPolicy?: {
        MaxRetries: number;
        /** @uniqueItems false */
        TcpRetryEvents?: string[];
        PerRetryTimeout: {
          Value: number;
          Unit: string;
        };
        /** @uniqueItems false */
        HttpRetryEvents?: string[];
      };
      Timeout?: {
        PerRequest?: {
          Value: number;
          Unit: string;
        };
        Idle?: {
          Value: number;
          Unit: string;
        };
      };
      Match: {
        Path?: {
          Regex?: string;
          Exact?: string;
        };
        Scheme?: string;
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
        /** @uniqueItems false */
        WeightedTargets: {
          VirtualNode: string;
          Weight: number;
          Port?: number;
        }[];
      };
      RetryPolicy?: {
        MaxRetries: number;
        /** @uniqueItems false */
        TcpRetryEvents?: string[];
        PerRetryTimeout: {
          Value: number;
          Unit: string;
        };
        /** @uniqueItems false */
        HttpRetryEvents?: string[];
      };
      Timeout?: {
        PerRequest?: {
          Value: number;
          Unit: string;
        };
        Idle?: {
          Value: number;
          Unit: string;
        };
      };
      Match: {
        Path?: {
          Regex?: string;
          Exact?: string;
        };
        Scheme?: string;
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
        /** @uniqueItems false */
        WeightedTargets: {
          VirtualNode: string;
          Weight: number;
          Port?: number;
        }[];
      };
      RetryPolicy?: {
        MaxRetries: number;
        /** @uniqueItems false */
        TcpRetryEvents?: string[];
        PerRetryTimeout: {
          Value: number;
          Unit: string;
        };
        /** @uniqueItems false */
        GrpcRetryEvents?: string[];
        /** @uniqueItems false */
        HttpRetryEvents?: string[];
      };
      Timeout?: {
        PerRequest?: {
          Value: number;
          Unit: string;
        };
        Idle?: {
          Value: number;
          Unit: string;
        };
      };
      Match: {
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
        MethodName?: string;
        ServiceName?: string;
        Port?: number;
      };
    };
    TcpRoute?: {
      Action: {
        /** @uniqueItems false */
        WeightedTargets: {
          VirtualNode: string;
          Weight: number;
          Port?: number;
        }[];
      };
      Timeout?: {
        Idle?: {
          Value: number;
          Unit: string;
        };
      };
      Match?: {
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
