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
  maxLifetime?: number;
  idleRuntimeSessionTimeout?: number;
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
  expirationDays?: number;
  eventExpiryDuration?: number;
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
  authorizer?: AgentCoreJwtAuthorizerConfig;
  tools?: AgentCoreGatewayTool[];
  instructions?: string;
  supportedVersions?: string[];
  searchType?: string;
  exceptionLevel?: 'DEBUG';
  tags?: CloudformationTag[];
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
