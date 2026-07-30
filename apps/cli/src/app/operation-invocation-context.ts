export type StacktapeOperationInvocationContext = {
  initiator: 'ai-agent';
  interface: 'mcp';
  client?: string;
  tool?: string;
};

export const OPERATION_INVOCATION_COMMAND_ARGS_KEY = '__stacktapeInvocation';

export const OPERATION_INVOCATION_ENV = {
  initiator: 'STP_OPERATION_INITIATOR',
  interface: 'STP_OPERATION_INTERFACE',
  client: 'STP_OPERATION_CLIENT',
  tool: 'STP_OPERATION_TOOL'
} as const;

const MAX_CONTEXT_VALUE_LENGTH = 80;

const sanitizeContextValue = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/[^\w .:/@+-]/g, '').slice(0, MAX_CONTEXT_VALUE_LENGTH) || undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

export const getStacktapeOperationInvocationContext = (
  env: NodeJS.ProcessEnv = process.env
): StacktapeOperationInvocationContext | undefined => {
  if (env[OPERATION_INVOCATION_ENV.initiator] !== 'ai-agent') return undefined;
  if (env[OPERATION_INVOCATION_ENV.interface] !== 'mcp') return undefined;

  return {
    initiator: 'ai-agent',
    interface: 'mcp',
    client: sanitizeContextValue(env[OPERATION_INVOCATION_ENV.client]),
    tool: sanitizeContextValue(env[OPERATION_INVOCATION_ENV.tool])
  };
};

export const getMcpOperationInvocationEnv = ({
  client,
  tool
}: {
  client?: string;
  tool: string;
}): Record<string, string> => {
  return {
    [OPERATION_INVOCATION_ENV.initiator]: 'ai-agent',
    [OPERATION_INVOCATION_ENV.interface]: 'mcp',
    [OPERATION_INVOCATION_ENV.client]: sanitizeContextValue(client) || 'unknown',
    [OPERATION_INVOCATION_ENV.tool]: sanitizeContextValue(tool) || 'unknown'
  };
};

export const getForwardableOperationInvocationEnv = (env: NodeJS.ProcessEnv = process.env): Record<string, string> => {
  const context = getStacktapeOperationInvocationContext(env);
  if (!context) return {};

  return {
    [OPERATION_INVOCATION_ENV.initiator]: context.initiator,
    [OPERATION_INVOCATION_ENV.interface]: context.interface,
    ...(context.client ? { [OPERATION_INVOCATION_ENV.client]: context.client } : {}),
    ...(context.tool ? { [OPERATION_INVOCATION_ENV.tool]: context.tool } : {})
  };
};

export const withStacktapeOperationInvocationContext = (
  commandArgs: Record<string, unknown> | undefined,
  env: NodeJS.ProcessEnv = process.env
): Record<string, unknown> | undefined => {
  const context = getStacktapeOperationInvocationContext(env);
  if (!context) return commandArgs;

  const args = isRecord(commandArgs) ? commandArgs : {};
  const previousContext = isRecord(args[OPERATION_INVOCATION_COMMAND_ARGS_KEY])
    ? args[OPERATION_INVOCATION_COMMAND_ARGS_KEY]
    : {};

  return {
    ...args,
    [OPERATION_INVOCATION_COMMAND_ARGS_KEY]: {
      ...previousContext,
      ...context
    }
  };
};
