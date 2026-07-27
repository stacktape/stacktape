// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-mesh.json

/** Resource Type definition for AWS::AppMesh::Mesh */
export type AwsAppmeshMesh = {
  Uid?: string;
  MeshName?: string;
  MeshOwner?: string;
  ResourceOwner?: string;
  Id?: string;
  Arn?: string;
  Spec?: {
    EgressFilter?: {
      Type: string;
    };
    ServiceDiscovery?: {
      IpPreference?: string;
    };
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
