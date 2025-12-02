// This file is auto-generated. Do not edit manually.
// Source: aws-ecs-taskset.json

/**
 * Create a task set in the specified cluster and service. This is used when a service uses the
 * EXTERNAL deployment controller type. For more information, see
 * https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.htmlin the Amazon
 * Elastic Container Service Developer Guide.
 */
export type AwsEcsTaskset = {
  /**
   * The platform version that the tasks in the task set should use. A platform version is specified
   * only for tasks using the Fargate launch type. If one isn't specified, the LATEST platform version
   * is used by default.
   */
  PlatformVersion?: string;
  /**
   * An optional non-unique tag that identifies this task set in external systems. If the task set is
   * associated with a service discovery registry, the tasks in this task set will have the
   * ECS_TASK_SET_EXTERNAL_ID AWS Cloud Map attribute set to the provided value.
   */
  ExternalId?: string;
  /**
   * The short name or full Amazon Resource Name (ARN) of the cluster that hosts the service to create
   * the task set in.
   */
  Cluster: string;
  LoadBalancers?: {
    /**
     * The full Amazon Resource Name (ARN) of the Elastic Load Balancing target group or groups associated
     * with a service or task set. A target group ARN is only specified when using an Application Load
     * Balancer or Network Load Balancer. If you are using a Classic Load Balancer this should be omitted.
     * For services using the ECS deployment controller, you can specify one or multiple target groups.
     * For more information, see
     * https://docs.aws.amazon.com/AmazonECS/latest/developerguide/register-multiple-targetgroups.html in
     * the Amazon Elastic Container Service Developer Guide. For services using the CODE_DEPLOY deployment
     * controller, you are required to define two target groups for the load balancer. For more
     * information, see
     * https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html in the
     * Amazon Elastic Container Service Developer Guide. If your service's task definition uses the awsvpc
     * network mode (which is required for the Fargate launch type), you must choose ip as the target
     * type, not instance, when creating your target groups because tasks that use the awsvpc network mode
     * are associated with an elastic network interface, not an Amazon EC2 instance.
     */
    TargetGroupArn?: string;
    /**
     * The name of the container (as it appears in a container definition) to associate with the load
     * balancer.
     */
    ContainerName?: string;
    /**
     * The port on the container to associate with the load balancer. This port must correspond to a
     * containerPort in the task definition the tasks in the service are using. For tasks that use the EC2
     * launch type, the container instance they are launched on must allow ingress traffic on the hostPort
     * of the port mapping.
     */
    ContainerPort?: number;
  }[];
  /** The short name or full Amazon Resource Name (ARN) of the service to create the task set in. */
  Service: string;
  /**
   * A floating-point percentage of the desired number of tasks to place and keep running in the task
   * set.
   */
  Scale?: {
    /**
     * The value, specified as a percent total of a service's desiredCount, to scale the task set.
     * Accepted values are numbers between 0 and 100.
     * @minimum 0
     * @maximum 100
     */
    Value?: number;
    /**
     * The unit of measure for the scale value.
     * @enum ["PERCENT"]
     */
    Unit?: "PERCENT";
  };
  /**
   * The details of the service discovery registries to assign to this task set. For more information,
   * see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html.
   */
  ServiceRegistries?: {
    /**
     * The container name value, already specified in the task definition, to be used for your service
     * discovery service. If the task definition that your service task specifies uses the bridge or host
     * network mode, you must specify a containerName and containerPort combination from the task
     * definition. If the task definition that your service task specifies uses the awsvpc network mode
     * and a type SRV DNS record is used, you must specify either a containerName and containerPort
     * combination or a port value, but not both.
     */
    ContainerName?: string;
    /**
     * The port value used if your service discovery service specified an SRV record. This field may be
     * used if both the awsvpc network mode and SRV records are used.
     */
    Port?: number;
    /**
     * The port value, already specified in the task definition, to be used for your service discovery
     * service. If the task definition your service task specifies uses the bridge or host network mode,
     * you must specify a containerName and containerPort combination from the task definition. If the
     * task definition your service task specifies uses the awsvpc network mode and a type SRV DNS record
     * is used, you must specify either a containerName and containerPort combination or a port value, but
     * not both.
     */
    ContainerPort?: number;
    /**
     * The Amazon Resource Name (ARN) of the service registry. The currently supported service registry is
     * AWS Cloud Map. For more information, see
     * https://docs.aws.amazon.com/cloud-map/latest/api/API_CreateService.html
     */
    RegistryArn?: string;
  }[];
  CapacityProviderStrategy?: {
    CapacityProvider?: string;
    Base?: number;
    Weight?: number;
  }[];
  /**
   * The launch type that new tasks in the task set will use. For more information, see
   * https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html in the Amazon Elastic
   * Container Service Developer Guide.
   * @enum ["EC2","FARGATE"]
   */
  LaunchType?: "EC2" | "FARGATE";
  /**
   * The short name or full Amazon Resource Name (ARN) of the task definition for the tasks in the task
   * set to use.
   */
  TaskDefinition: string;
  NetworkConfiguration?: {
    AwsVpcConfiguration?: {
      /**
       * The security groups associated with the task or service. If you do not specify a security group,
       * the default security group for the VPC is used. There is a limit of 5 security groups that can be
       * specified per AwsVpcConfiguration.
       * @maxItems 5
       */
      SecurityGroups?: string[];
      /**
       * The subnets associated with the task or service. There is a limit of 16 subnets that can be
       * specified per AwsVpcConfiguration.
       * @maxItems 16
       */
      Subnets: string[];
      /**
       * Whether the task's elastic network interface receives a public IP address. The default value is
       * DISABLED.
       * @enum ["DISABLED","ENABLED"]
       */
      AssignPublicIp?: "DISABLED" | "ENABLED";
    };
  };
  /** The ID of the task set. */
  Id?: string;
  Tags?: {
    Value?: string;
    Key?: string;
  }[];
};
