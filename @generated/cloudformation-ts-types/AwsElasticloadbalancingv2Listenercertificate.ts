// This file is auto-generated. Do not edit manually.
// Source: aws-elasticloadbalancingv2-listenercertificate.json

/** Resource Type definition for AWS::ElasticLoadBalancingV2::ListenerCertificate */
export type AwsElasticloadbalancingv2Listenercertificate = {
  ListenerArn: string;
  /** @uniqueItems true */
  Certificates: {
    CertificateArn?: string;
  }[];
  Id?: string;
};
