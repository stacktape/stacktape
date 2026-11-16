import type { CloudformationTag, EnvironmentVar, ResourceAccessProps, ResourceOverrides } from './shared';
import type { ContainerWorkloadContainerPackaging } from './deployment-artifacts';
export interface AgentCoreRuntime {
  type: 'agentcore-runtime';
  properties: AgentCoreRuntimeProps;
  overrides?: ResourceOverrides;
}


export interface AgentCoreRuntimeProps extends ResourceAccessProps {
  packaging: AgentCoreRuntimePackaging;
  description?: string;
  protocol?: 'HTTP' | 'MCP' | 'A2A' | 'AGUI';
  environment?: EnvironmentVar[];
  useMemory?: string;
  useGateway?: string;
  useBrowser?: string;
  useCodeInterpreter?: string;
  /**
   * Runtime endpoints. Omit this property to create one endpoint named `default`.
   *
   * An explicit list must contain at least one endpoint and endpoint names must be unique. References to
   * `endpointName` and `endpointArn` select the endpoint named `default` when present, or otherwise the first endpoint
   * in this list.
   */
  endpoints?: (string | AgentCoreRuntimeEndpointConfig)[];
  lifecycle?: AgentCoreRuntimeLifecycleConfig;
  requestHeaders?: string[];
  authorizer?: AgentCoreJwtAuthorizerConfig;
  tags?: CloudformationTag[];
}


export type AgentCoreRuntimePackaging = ContainerWorkloadContainerPackaging;


export interface AgentCoreRuntimeEndpointConfig {
  name: string;
  description?: string;
  runtimeVersion?: string;
}


export interface AgentCoreRuntimeLifecycleConfig {
  /**
   * #### Longest time a runtime session can live, in seconds.
   *
   * ---
   *
   * AWS ends the session after this time, even while it is active. When omitted, AWS uses its default (8 hours).
   */
  maxLifetimeSeconds?: number;
  /**
   * #### How long an idle runtime session stays alive, in seconds.
   *
   * ---
   *
   * AWS ends a session that receives no request for this long. A shorter timeout lowers cost. When omitted, AWS uses
   * its default (15 minutes).
   */
  idleTimeoutSeconds?: number;
}


export interface AgentCoreJwtAuthorizerConfig {
  discoveryUrl: string;
  allowedAudience?: string[];
  allowedClients?: string[];
  allowedScopes?: string[];
}


export interface AgentCoreMemory {
  type: 'agentcore-memory';
  properties: AgentCoreMemoryProps;
  overrides?: ResourceOverrides;
}


export interface AgentCoreMemoryProps {
  description?: string;
  /**
   * #### How many days AgentCore keeps raw memory events.
   *
   * ---
   *
   * Events older than this are deleted. AWS accepts 7 to 365 days.
   *
   * @default 30
   */
  eventRetentionDays?: number;
  encryptionKeyArn?: string;
  memoryStrategies?: any[];
  tags?: CloudformationTag[];
}


export interface AgentCoreGateway {
  type: 'agentcore-gateway';
  properties: AgentCoreGatewayProps;
  overrides?: ResourceOverrides;
}


export interface AgentCoreGatewayProps {
  description?: string;
  /**
   * #### Who can call the gateway's tools.
   *
   * ---
   *
   * Required, because the gateway exposes every configured tool to its callers.
   *
   * - `jwt`: callers must send a JSON Web Token issued by your identity provider.
   * - `none`: anyone who can reach the gateway endpoint can call its tools. Use it only for tools that are safe to
   *   expose publicly.
   */
  authorizer: AgentCoreGatewayAuthorizer;
  tools?: AgentCoreGatewayTool[];
  instructions?: string;
  supportedVersions?: string[];
  searchType?: 'SEMANTIC';
  exceptionLevel?: 'DEBUG';
  tags?: CloudformationTag[];
}


export type AgentCoreGatewayAuthorizer = AgentCoreGatewayJwtAuthorizer | AgentCoreGatewayNoAuthorizer;


/** #### Require a JSON Web Token from your identity provider on every gateway call. */
export interface AgentCoreGatewayJwtAuthorizer {
  type: 'jwt';
  properties: AgentCoreJwtAuthorizerConfig;
}


/** #### Allow unauthenticated calls to the gateway's tools. */
export interface AgentCoreGatewayNoAuthorizer {
  type: 'none';
}


export interface AgentCoreGatewayTool {
  name: string;
  description?: string;
  function?: string;
  lambdaArn?: string;
  toolSchema: AgentCoreToolDefinition[];
}


export interface AgentCoreToolDefinition {
  name: string;
  description?: string;
  inputSchema: any;
  outputSchema?: any;
}


export interface AgentCoreBrowser {
  type: 'agentcore-browser';
  properties: AgentCoreBrowserProps;
  overrides?: ResourceOverrides;
}


export interface AgentCoreBrowserProps {
  description?: string;
  recording?: {
    enabled?: boolean;
    bucketName?: string;
    prefix?: string;
  };
  tags?: CloudformationTag[];
}


export interface AgentCoreCodeInterpreter {
  type: 'agentcore-code-interpreter';
  properties: AgentCoreCodeInterpreterProps;
  overrides?: ResourceOverrides;
}


export interface AgentCoreCodeInterpreterProps {
  description?: string;
  tags?: CloudformationTag[];
}
