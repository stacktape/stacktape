// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoveryreadiness-resourceset.json

/** Schema for the AWS Route53 Recovery Readiness ResourceSet Resource and API. */
export type AwsRoute53recoveryreadinessResourceset = {
  /** The name of the resource set to create. */
  ResourceSetName?: string;
  /**
   * A list of resource objects in the resource set.
   * @minItems 1
   * @maxItems 6
   */
  Resources: ({
    /** The Amazon Resource Name (ARN) of the AWS resource. */
    ResourceArn?: string;
    /** The component identifier of the resource, generated when DNS target resource is used. */
    ComponentId?: string;
    DnsTargetResource?: {
      /** The domain name that acts as an ingress point to a portion of the customer application. */
      DomainName?: string;
      /** The Route 53 record set ID that will uniquely identify a DNS record, given a name and a type. */
      RecordSetId?: string;
      /**
       * The hosted zone Amazon Resource Name (ARN) that contains the DNS record with the provided name of
       * the target resource.
       */
      HostedZoneArn?: string;
      /** The type of DNS record of the target resource. */
      RecordType?: string;
      TargetResource?: unknown | unknown;
    };
    /**
     * A list of recovery group Amazon Resource Names (ARNs) and cell ARNs that this resource is contained
     * within.
     */
    ReadinessScopes?: string[];
  })[];
  /**
   * The Amazon Resource Name (ARN) of the resource set.
   * @minLength 1
   * @maxLength 256
   */
  ResourceSetArn?: string;
  /**
   * The resource type of the resources in the resource set. Enter one of the following values for
   * resource type:
   * AWS: :AutoScaling: :AutoScalingGroup, AWS: :CloudWatch: :Alarm, AWS: :EC2: :CustomerGateway, AWS:
   * :DynamoDB: :Table, AWS: :EC2: :Volume, AWS: :ElasticLoadBalancing: :LoadBalancer, AWS:
   * :ElasticLoadBalancingV2: :LoadBalancer, AWS: :MSK: :Cluster, AWS: :RDS: :DBCluster, AWS: :Route53:
   * :HealthCheck, AWS: :SQS: :Queue, AWS: :SNS: :Topic, AWS: :SNS: :Subscription, AWS: :EC2: :VPC, AWS:
   * :EC2: :VPNConnection, AWS: :EC2: :VPNGateway, AWS::Route53RecoveryReadiness::DNSTargetResource
   */
  ResourceSetType: string;
  /** A tag to associate with the parameters for a resource set. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
