// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-virtualrouter.json

/** Resource Type definition for AWS::AppMesh::VirtualRouter */
export type AwsAppmeshVirtualrouter = {
  Uid?: string;
  MeshName: string;
  VirtualRouterName?: string;
  MeshOwner?: string;
  ResourceOwner?: string;
  Id?: string;
  Arn?: string;
  Spec: {
    /** @uniqueItems false */
    Listeners: {
      PortMapping: {
        Protocol: string;
        Port: number;
      };
    }[];
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
