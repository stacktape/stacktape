type GuardrailType =
  | 'stage-restriction'
  | 'region-restriction'
  | 'command-restriction'
  | 'resource-type-restriction'
  | 'require-vpc-databases'
  | 'require-deletion-protection'
  | 'require-dead-letter-queue'
  | 'function-memory-limit'
  | 'function-timeout-limit'
  | 'container-resource-limit'
  | 'database-engine-restriction'
  | 'database-instance-restriction'
  | 'require-waf'
  | 'require-custom-domain'
  | 'resource-count-limit';

type StageRestrictionGuardrail = {
  type: 'stage-restriction';
  properties: {
    /**
     * #### Stages where this stack can be deployed (e.g., `["production", "staging"]`). Others are blocked.
     */
    allowedStages?: string[];
  };
};

type RegionRestrictionGuardrail = {
  type: 'region-restriction';
  properties: {
    /**
     * #### AWS regions where this stack can be deployed (e.g., `["eu-west-1", "us-east-1"]`). Others are blocked.
     */
    allowedRegions?: AWSRegion[];
  };
};

type CommandRestrictionGuardrail = {
  type: 'command-restriction';
  properties: {
    /**
     * #### Commands that are blocked (e.g., `["delete", "rollback"]`).
     */
    blockedCommands?: string[];
  };
};

type ResourceTypeRestrictionGuardrail = {
  type: 'resource-type-restriction';
  properties: {
    /**
     * #### Resource types that are blocked (e.g., `["open-search-domain", "redis-cluster"]`).
     */
    blockedResourceTypes?: StpResourceType[];
  };
};

type RequireVpcDatabasesGuardrail = {
  type: 'require-vpc-databases';
  properties: {
    /**
     * #### When enabled, all databases must use VPC-only accessibility (no public internet access).
     */
    enabled?: boolean;
  };
};

type RequireDeletionProtectionGuardrail = {
  type: 'require-deletion-protection';
  properties: {
    /**
     * #### When enabled, all relational databases must have `deletionProtection` set to `true`.
     */
    enabled?: boolean;
  };
};

type RequireDeadLetterQueueGuardrail = {
  type: 'require-dead-letter-queue';
  properties: {
    /**
     * #### When enabled, all SQS queues must have a `redrivePolicy` (dead-letter queue) configured.
     */
    enabled?: boolean;
  };
};

type FunctionMemoryLimitGuardrail = {
  type: 'function-memory-limit';
  properties: {
    /**
     * #### Maximum memory (in MB) allowed for Lambda functions (e.g., `1024`).
     */
    maxMemoryMB?: number;
  };
};

type FunctionTimeoutLimitGuardrail = {
  type: 'function-timeout-limit';
  properties: {
    /**
     * #### Maximum timeout (in seconds) allowed for Lambda functions (e.g., `30`).
     */
    maxTimeoutSeconds?: number;
  };
};

type ContainerResourceLimitGuardrail = {
  type: 'container-resource-limit';
  properties: {
    /**
     * #### Maximum vCPU allowed for container workloads (e.g., `4`).
     */
    maxCpu?: number;
    /**
     * #### Maximum memory (in MB) allowed for container workloads (e.g., `8192`).
     */
    maxMemoryMB?: number;
  };
};

type DatabaseEngineRestrictionGuardrail = {
  type: 'database-engine-restriction';
  properties: {
    /**
     * #### Database engine types that are allowed (e.g., `["postgres", "aurora-postgresql"]`). Others are blocked.
     */
    allowedEngines?: string[];
  };
};

type DatabaseInstanceRestrictionGuardrail = {
  type: 'database-instance-restriction';
  properties: {
    /**
     * #### Database instance sizes that are blocked (e.g., `["db.r5.4xlarge", "db.r6g.8xlarge"]`).
     */
    blockedInstanceSizes?: string[];
  };
};

type RequireWafGuardrail = {
  type: 'require-waf';
  properties: {
    /**
     * #### When enabled, all application load balancers must have a web application firewall attached.
     */
    enabled?: boolean;
  };
};

type RequireCustomDomainGuardrail = {
  type: 'require-custom-domain';
  properties: {
    /**
     * #### When enabled, public-facing web services and hosting buckets must have a custom domain configured.
     */
    enabled?: boolean;
  };
};

type ResourceCountLimitGuardrail = {
  type: 'resource-count-limit';
  properties: {
    /**
     * #### Maximum number of resources allowed per stack (e.g., `20`).
     */
    maxResources?: number;
  };
};

type GuardrailDefinition =
  | StageRestrictionGuardrail
  | RegionRestrictionGuardrail
  | CommandRestrictionGuardrail
  | ResourceTypeRestrictionGuardrail
  | RequireVpcDatabasesGuardrail
  | RequireDeletionProtectionGuardrail
  | RequireDeadLetterQueueGuardrail
  | FunctionMemoryLimitGuardrail
  | FunctionTimeoutLimitGuardrail
  | ContainerResourceLimitGuardrail
  | DatabaseEngineRestrictionGuardrail
  | DatabaseInstanceRestrictionGuardrail
  | RequireWafGuardrail
  | RequireCustomDomainGuardrail
  | ResourceCountLimitGuardrail;
