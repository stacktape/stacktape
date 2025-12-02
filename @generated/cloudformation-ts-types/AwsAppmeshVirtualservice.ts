// This file is auto-generated. Do not edit manually.
// Source: aws-appmesh-virtualservice.json

/** Resource Type definition for AWS::AppMesh::VirtualService */
export type AwsAppmeshVirtualservice = {
  Uid?: string;
  MeshName: string;
  MeshOwner?: string;
  ResourceOwner?: string;
  Id?: string;
  VirtualServiceName: string;
  Arn?: string;
  Spec: {
    Provider?: {
      VirtualNode?: {
        VirtualNodeName: string;
      };
      VirtualRouter?: {
        VirtualRouterName: string;
      };
    };
  };
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
