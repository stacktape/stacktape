import { PARENT_IDENTIFIER_CUSTOM_CF, PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { stringifyToYaml } from '@utils/yaml';
import { RESULT_MARKER, type TemplatePreviewRequest, type TemplatePreviewResult } from './protocol';
import { synthesizeTemplatePreview } from './synthesize';

type MapResource = {
  cloudformationChildResources: Record<string, unknown>;
  _nestedResources?: Record<string, MapResource | undefined>;
};

/** Every logical ID under a resource of the stack info map, its nested resources' included. */
const logicalIdsOf = (resource: MapResource): string[] => [
  ...Object.keys(resource.cloudformationChildResources),
  ...Object.values(resource._nestedResources ?? {}).flatMap((nested) =>
    nested === undefined ? [] : logicalIdsOf(nested)
  )
];

/** `main-database` and `mainDatabase` as their logical IDs start: `MainDatabase`. */
const pascalCase = (name: string) =>
  name
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part !== '')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');

/**
 * The template with what a person reads first first: its resources, grouped by the configuration's resource in the
 * order the configuration declares them, then the stack's shared ones, then the outputs and the rest. Only the order
 * of keys changes; CloudFormation reads the same template.
 */
const readingOrder = (
  template: CloudFormationTemplate,
  owners: Record<string, string>,
  declared: string[]
): CloudFormationTemplate => {
  const resources = template.Resources ?? {};
  const rank = (logicalId: string) => {
    const owner = owners[logicalId];
    const index = owner === undefined ? -1 : declared.indexOf(owner);
    return index === -1 ? (owner === undefined ? declared.length + 1 : declared.length) : index;
  };
  const ordered = Object.keys(resources)
    .map((logicalId, position) => ({ logicalId, position, rank: rank(logicalId) }))
    .toSorted((left, right) => left.rank - right.rank || left.position - right.position);
  const { AWSTemplateFormatVersion, Description, Resources: _resources, Outputs, ...rest } = template;
  return {
    ...(AWSTemplateFormatVersion === undefined ? {} : { AWSTemplateFormatVersion }),
    ...(Description === undefined ? {} : { Description }),
    Resources: Object.fromEntries(ordered.map(({ logicalId }) => [logicalId, resources[logicalId]!])),
    ...(Outputs === undefined ? {} : { Outputs }),
    ...rest
  } as CloudFormationTemplate;
};

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
};

/**
 * A CLI process started with `TEMPLATE_PREVIEW_ARGUMENT`: reads one request from stdin, compiles it and prints the
 * result after `RESULT_MARKER`. The wizard starts one per compile, so the CLI's process-wide state is never shared.
 */
export const runTemplatePreviewChild = async () => {
  let result: TemplatePreviewResult;
  try {
    const request = JSON.parse(await readStdin()) as TemplatePreviewRequest;
    const template = await synthesizeTemplatePreview(request);
    const owners: Record<string, string> = {};
    const resources = calculatedStackOverviewManager.stackInfoMap.resources as Record<string, MapResource>;
    for (const [name, resource] of Object.entries(resources)) {
      // The stack's own resources (its network, the service Lambda) are listed under a reserved name; resources added
      // as raw CloudFormation under theirs. Both are left without an owner.
      if (name === PARENT_IDENTIFIER_SHARED_GLOBAL || name === PARENT_IDENTIFIER_CUSTOM_CF) continue;
      for (const logicalId of logicalIdsOf(resource)) owners[logicalId] = name;
    }
    // A few resources are added for a resource without being listed under it (a database's deletion protection); their
    // logical ID still starts with its name.
    const declared = Object.keys((request.config.resources as Record<string, unknown> | undefined) ?? {});
    const prefixes = declared
      .map((name) => ({ name, prefix: pascalCase(name) }))
      .toSorted((left, right) => right.prefix.length - left.prefix.length);
    for (const logicalId of Object.keys(template.Resources ?? {})) {
      if (owners[logicalId] !== undefined) continue;
      const owner = prefixes.find(({ prefix }) => logicalId.startsWith(prefix));
      if (owner !== undefined) owners[logicalId] = owner.name;
    }
    result = { ok: true, text: stringifyToYaml(readingOrder(template, owners, declared)), owners };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The configuration arrives as an object, not a file: the CLI's "Config at `null`" names no file worth naming.
    result = {
      ok: false,
      error: message.replace(/^Config \([^)]*\) at `null` is invalid\./, 'The configuration is invalid.')
    };
  }
  // Exits once the line is handed to the pipe: an exit with output still queued would cut a large template short.
  process.stdout.write(`\n${RESULT_MARKER}${JSON.stringify(result)}\n`, () => process.exit(0));
};

if (import.meta.main) void runTemplatePreviewChild();
