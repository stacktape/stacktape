# Agent Core Runtime


## TypeScript Definition

```typescript
interface AgentCoreRuntime {
  type: 'agentcore-runtime';
  properties: AgentCoreRuntimeProps;
  overrides?: ResourceOverrides;
}

interface AgentCoreRuntimeProps extends ResourceAccessProps {
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

type AgentCoreRuntimePackaging = ContainerWorkloadContainerPackaging;

interface AgentCoreRuntimeEndpointConfig {
  name: string;
  description?: string;
  runtimeVersion?: string;
}

interface AgentCoreRuntimeLifecycleConfig {
  maxLifetime?: number;
  idleRuntimeSessionTimeout?: number;
}

interface AgentCoreJwtAuthorizerConfig {
  discoveryUrl: string;
  allowedAudience?: string[];
  allowedClients?: string[];
  allowedScopes?: string[];
}

type AgentCoreRuntimeReferencableParam = 'id' | 'arn' | 'endpointName' | 'endpointArn';

interface AgentCoreMemory {
  type: 'agentcore-memory';
  properties: AgentCoreMemoryProps;
  overrides?: ResourceOverrides;
}

interface AgentCoreMemoryProps {
  description?: string;
  expirationDays?: number;
  eventExpiryDuration?: number;
  encryptionKeyArn?: string;
  memoryStrategies?: any[];
  tags?: CloudformationTag[];
}

type AgentCoreMemoryReferencableParam = 'id' | 'arn';

interface AgentCoreGateway {
  type: 'agentcore-gateway';
  properties: AgentCoreGatewayProps;
  overrides?: ResourceOverrides;
}

interface AgentCoreGatewayProps {
  description?: string;
  authorizer?: AgentCoreJwtAuthorizerConfig;
  tools?: AgentCoreGatewayTool[];
  instructions?: string;
  supportedVersions?: string[];
  searchType?: string;
  exceptionLevel?: 'DEBUG';
  tags?: CloudformationTag[];
}

interface AgentCoreGatewayTool {
  name: string;
  description?: string;
  function?: string;
  lambdaArn?: string;
  toolSchema: AgentCoreToolDefinition[];
}

interface AgentCoreToolDefinition {
  name: string;
  description?: string;
  inputSchema: any;
  outputSchema?: any;
}

type AgentCoreGatewayReferencableParam = 'id' | 'arn' | 'url';

interface AgentCoreBrowser {
  type: 'agentcore-browser';
  properties: AgentCoreBrowserProps;
  overrides?: ResourceOverrides;
}

interface AgentCoreBrowserProps {
  description?: string;
  recording?: {
    enabled?: boolean;
    bucketName?: string;
    prefix?: string;
  };
  tags?: CloudformationTag[];
}

type AgentCoreBrowserReferencableParam = 'id' | 'arn';

interface AgentCoreCodeInterpreter {
  type: 'agentcore-code-interpreter';
  properties: AgentCoreCodeInterpreterProps;
  overrides?: ResourceOverrides;
}

interface AgentCoreCodeInterpreterProps {
  description?: string;
  tags?: CloudformationTag[];
}

type AgentCoreCodeInterpreterReferencableParam = 'id' | 'arn';
```
