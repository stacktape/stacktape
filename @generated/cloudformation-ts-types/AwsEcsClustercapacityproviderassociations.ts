// This file is auto-generated. Do not edit manually.
// Source: aws-ecs-clustercapacityproviderassociations.json

/** Associate a set of ECS Capacity Providers with a specified ECS Cluster */
export type AwsEcsClustercapacityproviderassociations = {
  DefaultCapacityProviderStrategy: ({
    CapacityProvider: "FARGATE" | "FARGATE_SPOT" | string;
    /**
     * @minimum 0
     * @maximum 100000
     */
    Base?: number;
    /**
     * @minimum 0
     * @maximum 1000
     */
    Weight?: number;
  })[];
  CapacityProviders?: ("FARGATE" | "FARGATE_SPOT" | string)[];
  Cluster: string;
};
