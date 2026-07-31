import type {
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AgentCoreGateway,
  AgentCoreMemory,
  AgentCoreRuntime
} from '@stacktape/config/agentcore';

export type StpAgentCoreRuntime = AgentCoreRuntime['properties'] & {
  name: string;
  type: AgentCoreRuntime['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreRuntime['type'];
  jobName: string;
};
export type AgentCoreRuntimeReferencableParam = 'id' | 'arn' | 'endpointName' | 'endpointArn';
export type StpAgentCoreMemory = AgentCoreMemory['properties'] & {
  name: string;
  type: AgentCoreMemory['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreMemory['type'];
};
export type AgentCoreMemoryReferencableParam = 'id' | 'arn';
export type StpAgentCoreGateway = AgentCoreGateway['properties'] & {
  name: string;
  type: AgentCoreGateway['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreGateway['type'];
};
export type AgentCoreGatewayReferencableParam = 'id' | 'arn' | 'url';
export type StpAgentCoreBrowser = AgentCoreBrowser['properties'] & {
  name: string;
  type: AgentCoreBrowser['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreBrowser['type'];
};
export type AgentCoreBrowserReferencableParam = 'id' | 'arn';
export type StpAgentCoreCodeInterpreter = AgentCoreCodeInterpreter['properties'] & {
  name: string;
  type: AgentCoreCodeInterpreter['type'];
  nameChain: string[];
  configParentResourceType: AgentCoreCodeInterpreter['type'];
};
export type AgentCoreCodeInterpreterReferencableParam = 'id' | 'arn';
