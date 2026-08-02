export type ToolOutput = {
  ok: boolean;
  code: string;
  message: string;
  data?: Record<string, unknown>;
  rawTail?: string;
  nextActions?: string[];
};

export const maskSecretString = (value: string): string => {
  if (value.length <= 8) {
    return '*'.repeat(Math.max(value.length, 1));
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const maskSensitiveText = (value: string): string =>
  value
    .replace(/\bstp_(?:live|test)_[A-Za-z0-9]+_[A-Za-z0-9._-]{12,}\b/g, (match) => `${match.slice(0, 16)}...REDACTED`)
    .replace(/\bsk_(?:live|test)_[A-Za-z0-9._-]{8,}/g, (match) => `${match.slice(0, 8)}...REDACTED`)
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{16,}/g, (match) => `${match.slice(0, 8)}...REDACTED`)
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}/g, (match) => `${match.slice(0, 8)}...REDACTED`)
    .replace(/\bpostgres(?:ql)?:\/\/[^:\s/@]+:[^\s/@]+@/gi, 'postgresql://<REDACTED>@')
    .replace(/\bmysql:\/\/[^:\s/@]+:[^\s/@]+@/gi, 'mysql://<REDACTED>@');

const shouldMaskValueForKey = (key: string): boolean => {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === 'secretname' || normalizedKey === 'secretfile') return false;
  return (
    normalizedKey === 'value' ||
    normalizedKey.includes('secretvalue') ||
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('credential') ||
    normalizedKey.includes('privatekey') ||
    normalizedKey.includes('apikey') ||
    normalizedKey.includes('accesskey')
  );
};

export const maskSensitiveValues = (input: unknown, parentKey = ''): unknown => {
  if (typeof input === 'string') {
    const maskedText = maskSensitiveText(input);
    if (shouldMaskValueForKey(parentKey)) {
      return maskSecretString(maskedText);
    }
    return maskedText;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveValues(item, parentKey));
  }

  if (input && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = maskSensitiveValues(value, key);
    }
    return result;
  }

  return input;
};

const extractJsonLogPayload = (rawTail?: string): Record<string, unknown> | undefined => {
  if (!rawTail) return undefined;
  const lines = rawTail
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    try {
      const parsed = JSON.parse(line);
      if (parsed?.type === 'log' && typeof parsed.message === 'string') {
        try {
          const messagePayload = JSON.parse(parsed.message);
          if (messagePayload && typeof messagePayload === 'object') {
            return messagePayload as Record<string, unknown>;
          }
        } catch {
          // ignore non-json log message
        }
      }
    } catch {
      // ignore non-json tail line
    }
  }
  return undefined;
};

const MAX_RESPONSE_CHARS = 30000;
export const GENERIC_AWS_MCP_BOUNDARY =
  'Do not call generic AWS/AWS SDK MCP tools for this Stacktape-managed operation. Use Stacktape MCP to preserve project/stage/resource mapping and safety gates; ask the user for missing Stacktape args if this response is insufficient.';
const AUTH_FAILURE_RE =
  /\b(auth|authentication|authenticate|authorization|unauthorized|forbidden|invalid api key|api key|credential|credentials|login)\b/i;
const STACKTAPE_AUTH_FAILURE_NEXT_ACTIONS = [
  'Stacktape authentication failed. Stop here and ask the user to authenticate Stacktape in their own terminal with stacktape login. For CI, tell them to configure a dedicated STACKTAPE_API_KEY secret outside this conversation.',
  'Do not call generic AWS/AWS SDK MCP tools to work around a Stacktape authentication failure. Raw AWS access bypasses Stacktape project/stage/resource mapping and safety gates.',
  'Never read ~/.stacktape, ~/.aws, ~/.ssh, or persisted credential files to recover from this failure.',
  'Never ask the user to paste an API key into chat, and never inline an API key, token, password, or connection string into Bash, MCP arguments, rawTail, or the final answer.'
];

export const clampInteger = ({
  value,
  defaultValue,
  min,
  max
}: {
  value?: number;
  defaultValue: number;
  min: number;
  max: number;
}) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return defaultValue;
  return Math.max(min, Math.min(Math.trunc(value), max));
};

const truncateRawTail = (rawTail: string | undefined, maxChars: number): string | undefined => {
  if (!rawTail || rawTail.length <= maxChars) return rawTail;
  const lines = rawTail.split('\n');
  // Keep first few lines and last lines to stay within limit
  const head = lines.slice(0, 5).join('\n');
  const tail = lines.slice(-20).join('\n');
  const truncated = `${head}\n\n... [${lines.length - 25} lines truncated] ...\n\n${tail}`;
  return truncated.length <= maxChars ? truncated : truncated.slice(0, maxChars);
};

const truncateText = (value: string, maxChars: number): string =>
  value.length <= maxChars ? value : `${value.slice(0, maxChars).trimEnd()}\n\n... [truncated]`;

const isStacktapeAuthFailure = ({ code, message, rawTail }: { code?: string; message?: string; rawTail?: string }) =>
  AUTH_FAILURE_RE.test([code, message, rawTail].filter(Boolean).join('\n'));

const shrinkToolPayload = (payload: ToolOutput | Record<string, unknown>): ToolOutput | Record<string, unknown> => {
  const compact = { ...payload } as Record<string, unknown>;
  if (typeof compact.answer === 'string') {
    compact.answer = truncateText(compact.answer, 6000);
  }
  if (Array.isArray(compact.references)) {
    compact.references = compact.references.slice(0, 10);
  }
  if (Array.isArray(compact.snippets)) {
    compact.snippets = compact.snippets.slice(0, 8).map((snippet) => {
      if (!snippet || typeof snippet !== 'object') return snippet;
      const snippetRecord = { ...(snippet as Record<string, unknown>) };
      if (typeof snippetRecord.code === 'string') {
        snippetRecord.code = truncateText(snippetRecord.code, 900);
      }
      if (typeof snippetRecord.context === 'string') {
        snippetRecord.context = truncateText(snippetRecord.context, 900);
      }
      return snippetRecord;
    });
  }
  if (compact.data && typeof compact.data === 'object' && !Array.isArray(compact.data)) {
    const data = { ...(compact.data as Record<string, unknown>) };
    if (typeof data.content === 'string') {
      data.content = truncateText(data.content, 12000);
    }
    compact.data = data;
  }
  compact.truncated = true;
  return compact;
};

export const toToolText = (payload: ToolOutput | Record<string, unknown>) => {
  payload = maskSensitiveValues(payload) as ToolOutput | Record<string, unknown>;

  // Truncate rawTail if present
  if ('rawTail' in payload && typeof payload.rawTail === 'string') {
    payload = { ...payload, rawTail: truncateRawTail(payload.rawTail as string, 8000) };
  }

  let text = JSON.stringify(payload, null, 2);
  if (text.length > MAX_RESPONSE_CHARS) {
    // Remove rawTail entirely if still too large
    const withoutTail = { ...payload };
    delete (withoutTail as Record<string, unknown>).rawTail;
    text = JSON.stringify(withoutTail, null, 2);

    if (text.length > MAX_RESPONSE_CHARS) {
      text = JSON.stringify(shrinkToolPayload(withoutTail), null, 2);
    }

    if (text.length > MAX_RESPONSE_CHARS) {
      text = JSON.stringify(
        {
          ok: false,
          code: 'RESPONSE_TOO_LARGE',
          message: `Tool response exceeded ${MAX_RESPONSE_CHARS} characters even after compaction. Retry with fewer results, a narrower query, a headingPath, or a lower maxChars.`,
          truncated: true,
          nextActions: [
            'Retry the same Stacktape MCP tool with a narrower query, fewer results, or a more specific Stacktape project/stage/resource selector.',
            GENERIC_AWS_MCP_BOUNDARY
          ]
        },
        null,
        2
      );
    }
  }

  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ]
  };
};

const summarizeCompileTemplateData = (data?: Record<string, unknown>): Record<string, unknown> | undefined => {
  const template = data?.result;
  if (!template || typeof template !== 'object') return data;
  const templateRecord = template as Record<string, unknown>;
  const resources = templateRecord.Resources;
  const outputs = templateRecord.Outputs;
  const resourceCount = resources && typeof resources === 'object' ? Object.keys(resources).length : undefined;
  const outputCount = outputs && typeof outputs === 'object' ? Object.keys(outputs).length : undefined;

  return {
    summary: {
      compiled: true,
      description: templateRecord.Description,
      resourceCount,
      outputCount
    },
    note: 'Full compiled CloudFormation template omitted from MCP output to avoid dumping secrets, ARNs, and large generated data into the conversation.'
  };
};

const parseJsonObject = (value: unknown): Record<string, unknown> | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const summarizeMapCounts = (items: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
};

const summarizeStackInfoMapResources = (stackInfoMap: Record<string, unknown> | undefined) => {
  const resources = parseJsonObject(stackInfoMap?.resources);
  if (!resources) return undefined;

  const entries = Object.entries(resources);
  const resourceSummaries = entries.slice(0, 45).map(([name, value]) => {
    const resource = parseJsonObject(value);
    const childResources = parseJsonObject(resource?.cloudformationChildResources);
    const childEntries = Object.entries(childResources || {});
    const links = parseJsonObject(resource?.links);
    const referencableParams = parseJsonObject(resource?.referencableParams);

    return {
      name,
      resourceType: resource?.resourceType,
      links: links ? Object.keys(links).slice(0, 8) : [],
      referencableParams: referencableParams ? Object.keys(referencableParams).slice(0, 8) : [],
      cloudformationChildResourceCount: childEntries.length,
      cloudformationChildResources: childEntries.slice(0, 10).map(([logicalId, child]) => {
        const childRecord = parseJsonObject(child);
        return {
          logicalId,
          type: childRecord?.cloudformationResourceType
        };
      })
    };
  });

  return {
    resourceCount: entries.length,
    omittedResources: Math.max(entries.length - resourceSummaries.length, 0),
    resources: resourceSummaries
  };
};

const summarizeCloudformationResources = (stackResources: unknown) => {
  if (!Array.isArray(stackResources)) return undefined;
  const resources = stackResources.filter((resource): resource is Record<string, unknown> =>
    Boolean(resource && typeof resource === 'object' && !Array.isArray(resource))
  );
  const resourceTypes = resources
    .map((resource) => (typeof resource.ResourceType === 'string' ? resource.ResourceType : undefined))
    .filter((resourceType): resourceType is string => Boolean(resourceType));

  return {
    resourceCount: resources.length,
    resourceTypeCounts: summarizeMapCounts(resourceTypes),
    omittedResources: Math.max(resources.length - 120, 0),
    resources: resources.slice(0, 120).map((resource) => ({
      logicalId: resource.LogicalResourceId,
      physicalId: resource.PhysicalResourceId,
      type: resource.ResourceType,
      status: resource.ResourceStatus,
      lastUpdated: resource.LastUpdatedTimestamp
    }))
  };
};

const summarizeInfoStackData = (data?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!data) return data;

  const stackOutput = parseJsonObject(data.stackOutput);
  const stackInfoMap = parseJsonObject(stackOutput?.StpStackInfoMap);
  const stackInfoResources = summarizeStackInfoMapResources(stackInfoMap);
  const cloudformation = summarizeCloudformationResources(data.stackResources);

  return {
    stackName: data.stackName,
    region: data.region,
    description: data.description,
    ...(stackInfoResources ? { stacktapeResources: stackInfoResources } : {}),
    ...(cloudformation ? { cloudformation } : {}),
    note: 'Full info:stack output was compacted for MCP. It can contain hundreds of CloudFormation records and sensitive-looking metadata; use this Stacktape summary instead of generic AWS MCP tools for Stacktape-managed stacks.'
  };
};

const summarizeCliDataForAgent = ({
  command,
  data
}: {
  command: string;
  data?: Record<string, unknown>;
}): Record<string, unknown> | undefined => {
  if (command === 'synth') {
    return summarizeCompileTemplateData(data);
  }
  if (command === 'info:stack') {
    return summarizeInfoStackData(data);
  }
  return data;
};

export const buildCliRunOutput = ({
  result,
  command,
  policy
}: {
  result: {
    ok: boolean;
    code: string;
    message: string;
    data?: Record<string, unknown>;
    rawTail?: string;
  };
  command: string;
  policy: { category: string; safety: string; sensitiveOutput?: boolean };
}): ToolOutput => {
  let data = summarizeCliDataForAgent({
    command,
    data: result.data || extractJsonLogPayload(result.rawTail)
  });
  let rawTail = result.ok && data ? undefined : result.rawTail;

  if (policy.sensitiveOutput) {
    data = maskSensitiveValues(data || {}) as Record<string, unknown>;
    rawTail = '[REDACTED: this command can return sensitive values]';
  } else {
    data = maskSensitiveValues(data || {}) as Record<string, unknown>;
    rawTail = rawTail ? maskSensitiveText(rawTail) : undefined;
  }

  const authFailure = !result.ok && isStacktapeAuthFailure(result);
  const failureNextActions = authFailure
    ? STACKTAPE_AUTH_FAILURE_NEXT_ACTIONS
    : [
        `Do not retry stacktape ${command} through Bash/shell. The MCP result above is the canonical execution result.`,
        rawTail
          ? 'Use rawTail to explain the failure, then ask the user for the missing input or auth step if needed.'
          : 'If the CLI produced no raw output, report that limitation and ask the user for the missing input or auth step if needed.',
        GENERIC_AWS_MCP_BOUNDARY,
        'Never read ~/.stacktape, ~/.aws, ~/.ssh, or persisted credential files to recover from this failure.'
      ];

  return {
    ok: result.ok,
    code: result.code,
    message: result.message,
    data: {
      command,
      policy,
      ...(data ? { cli: data } : {})
    },
    ...(rawTail ? { rawTail } : {}),
    ...(!result.ok
      ? {
          nextActions: failureNextActions
        }
      : {})
  };
};
