// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-container.json

/** Resource Type definition for AWS::Lightsail::Container */
export type AwsLightsailContainer = {
  /**
   * The name for the container service.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-z0-9]{1,2}|[a-z0-9][a-z0-9-]+[a-z0-9]$
   */
  ServiceName: string;
  /** The power specification for the container service. */
  Power: string;
  ContainerArn?: string;
  /**
   * The scale specification for the container service.
   * @minimum 1
   * @maximum 20
   */
  Scale: number;
  /**
   * The public domain names to use with the container service, such as example.com and www.example.com.
   * @uniqueItems true
   */
  PublicDomainNames?: {
    CertificateName?: string;
    /**
     * An object that describes the configuration for the containers of the deployment.
     * @uniqueItems true
     */
    DomainNames?: string[];
  }[];
  /** Describes a container deployment configuration of an Amazon Lightsail container service. */
  ContainerServiceDeployment?: {
    /**
     * An object that describes the configuration for the containers of the deployment.
     * @uniqueItems true
     */
    Containers?: {
      /** The name of the container. */
      ContainerName?: string;
      /**
       * The launch command for the container.
       * @uniqueItems true
       */
      Command?: string[];
      /**
       * The environment variables of the container.
       * @uniqueItems true
       */
      Environment?: {
        Variable?: string;
        Value?: string;
      }[];
      /** The name of the image used for the container. */
      Image?: string;
      /**
       * The open firewall ports of the container.
       * @uniqueItems true
       */
      Ports?: {
        Port?: string;
        Protocol?: string;
      }[];
    }[];
    /** An object that describes the endpoint of the deployment. */
    PublicEndpoint?: {
      /** The name of the container for the endpoint. */
      ContainerName?: string;
      /** The port of the container to which traffic is forwarded to. */
      ContainerPort?: number;
      /** An object that describes the health check configuration of the container. */
      HealthCheckConfig?: {
        /**
         * The number of consecutive health checks successes required before moving the container to the
         * Healthy state. The default value is 2.
         */
        HealthyThreshold?: number;
        /**
         * The approximate interval, in seconds, between health checks of an individual container. You can
         * specify between 5 and 300 seconds. The default value is 5.
         */
        IntervalSeconds?: number;
        /** The path on the container on which to perform the health check. The default value is /. */
        Path?: string;
        /**
         * The HTTP codes to use when checking for a successful response from a container. You can specify
         * values between 200 and 499. You can specify multiple values (for example, 200,202) or a range of
         * values (for example, 200-299).
         */
        SuccessCodes?: string;
        /**
         * The amount of time, in seconds, during which no response means a failed health check. You can
         * specify between 2 and 60 seconds. The default value is 2.
         */
        TimeoutSeconds?: number;
        /**
         * The number of consecutive health check failures required before moving the container to the
         * Unhealthy state. The default value is 2.
         */
        UnhealthyThreshold?: number;
      };
    };
  };
  /** A Boolean value to indicate whether the container service is disabled. */
  IsDisabled?: boolean;
  /**
   * A Boolean value to indicate whether the container service has access to private container image
   * repositories, such as Amazon Elastic Container Registry (Amazon ECR) private repositories.
   */
  PrivateRegistryAccess?: {
    /**
     * An object to describe a request to activate or deactivate the role that you can use to grant an
     * Amazon Lightsail container service access to Amazon Elastic Container Registry (Amazon ECR) private
     * repositories.
     */
    EcrImagePullerRole?: {
      /** A Boolean value that indicates whether to activate the role. */
      IsActive?: boolean;
      /** The Amazon Resource Name (ARN) of the role, if it is activated. */
      PrincipalArn?: string;
    };
  };
  /** The publicly accessible URL of the container service. */
  Url?: string;
  /** The principal ARN of the container service. */
  PrincipalArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
