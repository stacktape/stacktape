import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

type TemplateResources = Record<string, { Type?: string; Properties?: object }>;

const propertiesOf = (resource: { Properties?: object } | undefined) =>
  resource?.Properties as Record<string, unknown> | undefined;

/**
 * The properties that give a stream source a new stream ARN when they change: a replaced Kinesis stream or consumer,
 * a replaced table, or a table whose stream was turned off and on or got another view type. Any change of another
 * type's properties counts.
 */
const NEW_STREAM_PROPERTIES: Record<string, string[]> = {
  'AWS::Kinesis::Stream': ['Name'],
  'AWS::Kinesis::StreamConsumer': ['ConsumerName', 'StreamARN'],
  'AWS::DynamoDB::Table': ['TableName', 'KeySchema', 'LocalSecondaryIndexes', 'StreamSpecification']
};

/** Logical IDs that `Ref` and `Fn::GetAtt` name in `node`. */
const referencedLogicalIds = (node: unknown): string[] => {
  if (Array.isArray(node)) return node.flatMap(referencedLogicalIds);
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'Ref' && typeof value === 'string') return [value];
    if (key === 'Fn::GetAtt') {
      const target = typeof value === 'string' ? value.split('.')[0] : Array.isArray(value) ? value[0] : undefined;
      return typeof target === 'string' ? [target] : [];
    }
    return referencedLogicalIds(value);
  });
};

/**
 * Whether the deployment gives resource `logicalId` a new identity: it is new, has another type, a property that
 * replaces it changed, or a resource such a property names gets a new identity. `Ref`s to parameters and pseudo
 * parameters name no resource and keep their value.
 */
const getsNewIdentity = (
  logicalId: string,
  template: { Resources?: TemplateResources },
  deployedTemplate: { Resources?: TemplateResources },
  seen = new Set<string>()
): boolean => {
  const resource = template.Resources?.[logicalId];
  if (!resource || seen.has(logicalId)) return false;
  seen.add(logicalId);
  const deployed = deployedTemplate.Resources?.[logicalId];
  if (!deployed || deployed.Type !== resource.Type) return true;
  const keys = NEW_STREAM_PROPERTIES[resource.Type ?? ''];
  const relevant = (properties: Record<string, unknown> | undefined) =>
    keys ? keys.map((key) => properties?.[key]) : properties;
  if (JSON.stringify(relevant(propertiesOf(deployed))) !== JSON.stringify(relevant(propertiesOf(resource))))
    return true;
  return referencedLogicalIds(relevant(propertiesOf(resource))).some((id) =>
    getsNewIdentity(id, template, deployedTemplate, seen)
  );
};

export type StartingStreamMapping = { functionName: string; source: 'DynamoDB' | 'Kinesis'; fromLatest: boolean };

/**
 * Stream integrations whose event source mapping this deployment creates or changes.
 *
 * AWS starts polling a new or updated DynamoDB/Kinesis mapping eventually: in r2ar's live runs 20-95 seconds after the
 * start was ready, and AWS documents up to several minutes. Until then no record reaches the
 * function, and a mapping that starts at `LATEST` skips every record written meanwhile. AWS gives no signal that polling
 * started (the mapping is `Enabled` before it reads), so a start cannot wait for it; it says so instead. A mapping the
 * deployment leaves unchanged keeps reading and delays nothing, unless the stream it reads is replaced: its
 * `Fn::GetAtt` stays the same while it reads a new stream from the position it starts at.
 */
export const findStartingStreamMappings = ({
  functions,
  template,
  deployedTemplate
}: {
  functions: Array<{ name: string; events?: Array<{ type: string; properties?: unknown }> }>;
  template: { Resources?: TemplateResources };
  /** Undefined when the deployment creates the stack. */
  deployedTemplate: { Resources?: TemplateResources } | undefined;
}): StartingStreamMapping[] =>
  functions.flatMap(({ name, events }) =>
    (events ?? []).flatMap((event, index) => {
      if (event.type !== 'dynamo-db-stream' && event.type !== 'kinesis-stream') return [];
      const logicalName = cfLogicalNames.eventSourceMapping(name, index);
      const mapping = template.Resources?.[logicalName];
      if (mapping?.Type !== 'AWS::Lambda::EventSourceMapping') return [];
      const deployed = deployedTemplate?.Resources?.[logicalName];
      if (
        deployedTemplate &&
        deployed &&
        JSON.stringify(deployed.Properties) === JSON.stringify(mapping.Properties) &&
        !referencedLogicalIds(propertiesOf(mapping)?.EventSourceArn).some((id) =>
          getsNewIdentity(id, template, deployedTemplate)
        )
      ) {
        return [];
      }
      return [
        {
          functionName: name,
          source: event.type === 'dynamo-db-stream' ? ('DynamoDB' as const) : ('Kinesis' as const),
          fromLatest: propertiesOf(mapping)?.StartingPosition === 'LATEST'
        }
      ];
    })
  );

/** One notice for all of them, for the start's result and the terminal. */
export const formatStartingStreamMappingsNotice = (mappings: StartingStreamMapping[]) => {
  if (!mappings.length) return undefined;
  const latest = mappings.filter(({ fromLatest }) => fromLatest).map(({ functionName }) => `\`${functionName}\``);
  const created = `This start created or changed the stream mappings of ${mappings
    .map(({ functionName, source }) => `\`${functionName}\` (${source})`)
    .join(
      ', '
    )}. AWS starts reading a new mapping some time after it is created, often a minute or more, so the first records written now can reach the function late. Wait for them before you conclude that one was lost.`;
  if (!latest.length) return created;
  return `${created} ${latest.join(', ')} ${latest.length === 1 ? 'reads' : 'read'} from \`startingPosition: LATEST\`, which skips every record written before the mapping starts. Set \`startingPosition: TRIM_HORIZON\` to receive them; changing it replaces the mapping, which then reads every record the stream still retains again: 24 hours of a DynamoDB stream, and the retention period of a Kinesis stream, up to 365 days.`;
};
