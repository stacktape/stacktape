export const INFO_STACK_AGENT_SCHEMA_VERSION = 'stacktape.info-stack.v1' as const;

export type InfoStackDetails = {
  stackOutput?: Record<string, string>;
  stackInfoMap?: unknown;
  resources?: unknown[];
  description?: string | null;
};

export type InfoStackAgentResultV1 = {
  schemaVersion: typeof INFO_STACK_AGENT_SCHEMA_VERSION;
  stackName: string;
  region: string;
  description: string | null;
  stackOutput: Record<string, string>;
  stackInfoMap: Record<string, unknown> | null;
  resources: Record<string, unknown>[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const buildInfoStackAgentResult = ({
  stackName,
  region,
  details
}: {
  stackName: string;
  region: string;
  details: InfoStackDetails;
}): InfoStackAgentResultV1 => ({
  schemaVersion: INFO_STACK_AGENT_SCHEMA_VERSION,
  stackName,
  region,
  description: details.description ?? null,
  stackOutput: details.stackOutput ?? {},
  stackInfoMap: asRecord(details.stackInfoMap),
  resources: (details.resources ?? [])
    .map(asRecord)
    .filter((resource): resource is Record<string, unknown> => !!resource)
});
