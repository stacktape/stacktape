import type {
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime
} from '@stacktape/config/agentcore';

declare global {
type StpAgentCoreRuntime = AgentCoreRuntime['properties'] & {
  name: string;
  type: AgentCoreRuntime['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreRuntime['type'];
  jobName: string;
};
type AgentCoreRuntimeReferencableParam = 'id' | 'arn' | 'endpointName' | 'endpointArn';
type StpAgentCoreMemory = AgentCoreMemory['properties'] & {
  name: string;
  type: AgentCoreMemory['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreMemory['type'];
};
type AgentCoreMemoryReferencableParam = 'id' | 'arn';
type StpAgentCoreGateway = AgentCoreGateway['properties'] & {
  name: string;
  type: AgentCoreGateway['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreGateway['type'];
};
type AgentCoreGatewayReferencableParam = 'id' | 'arn' | 'url';
type StpAgentCoreBrowser = AgentCoreBrowser['properties'] & {
  name: string;
  type: AgentCoreBrowser['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreBrowser['type'];
};
type AgentCoreBrowserReferencableParam = 'id' | 'arn';
type StpAgentCoreCodeInterpreter = AgentCoreCodeInterpreter['properties'] & {
  name: string;
  type: AgentCoreCodeInterpreter['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreCodeInterpreter['type'];
};
type AgentCoreCodeInterpreterReferencableParam = 'id' | 'arn';
}
