import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

type TemplateResources = Record<string, { Type?: string; Properties?: { StartingPosition?: unknown } }>;

export type StartingStreamMapping = { functionName: string; source: 'DynamoDB' | 'Kinesis'; fromLatest: boolean };

/**
 * Stream integrations whose event source mapping this deployment creates or changes.
 *
 * AWS starts polling a new or updated DynamoDB/Kinesis mapping eventually: in r2ar's live runs 20-95 seconds after the
 * start was ready, and AWS documents up to several minutes. Until then no record reaches the
 * function, and a mapping that starts at `LATEST` skips every record written meanwhile. AWS gives no signal that polling
 * started (the mapping is `Enabled` before it reads), so a start cannot wait for it; it says so instead. A mapping the
 * deployment leaves unchanged keeps reading and delays nothing.
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
      if (deployed && JSON.stringify(deployed.Properties) === JSON.stringify(mapping.Properties)) return [];
      return [
        {
          functionName: name,
          source: event.type === 'dynamo-db-stream' ? ('DynamoDB' as const) : ('Kinesis' as const),
          fromLatest: mapping.Properties?.StartingPosition === 'LATEST'
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
  return `${created} ${latest.join(', ')} ${latest.length === 1 ? 'reads' : 'read'} from \`startingPosition: LATEST\`, which skips every record written before the mapping starts. Set \`startingPosition: TRIM_HORIZON\` to receive them; changing it replaces the mapping, which then reads the stream's last 24 hours again.`;
};
