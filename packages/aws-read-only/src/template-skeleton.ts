import { parse } from 'yaml';

/** What a template's literal values read as in its skeleton. */
export const TEMPLATE_VALUE_PLACEHOLDER = '[value]';

const INTRINSICS = [
  'Base64',
  'Cidr',
  'Equals',
  'FindInMap',
  'GetAtt',
  'GetAZs',
  'If',
  'ImportValue',
  'Join',
  'Length',
  'Not',
  'And',
  'Or',
  'Select',
  'Split',
  'Sub',
  'ToJsonString',
  'Transform'
];

/**
 * CloudFormation's short-form YAML tags (`!Ref`, `!Sub`, `!GetAtt`, `!If` ...), read as the long form they stand for.
 * A tag applies to a scalar, a sequence or a mapping alike.
 */
const CLOUDFORMATION_TAGS = ['Ref', 'Condition', ...INTRINSICS].flatMap((name) => {
  const key = name === 'Ref' || name === 'Condition' ? name : `Fn::${name}`;
  return [
    { tag: `!${name}`, resolve: (value: string) => ({ [key]: value }) },
    {
      tag: `!${name}`,
      collection: 'seq' as const,
      resolve: (seq: { toJSON: () => unknown }) => ({ [key]: seq.toJSON() })
    },
    {
      tag: `!${name}`,
      collection: 'map' as const,
      resolve: (map: { toJSON: () => unknown }) => ({ [key]: map.toJSON() })
    }
  ];
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** A JSON or YAML template body, or `undefined` when it is neither. */
export const parseTemplateBody = (body: string): Record<string, unknown> | undefined => {
  try {
    const parsed = JSON.parse(body);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    // Not JSON: CloudFormation also accepts YAML.
  }
  try {
    const parsed = parse(body, { customTags: CLOUDFORMATION_TAGS as never, prettyErrors: false });
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/** The `${Name}` references of a `Fn::Sub` string, with every literal part between them replaced. */
const subReferences = (text: string) => {
  const references = [...text.matchAll(/\$\{(?!!)([^}]+)\}/g)].map(([reference]) => reference);
  return references.length ? references.join(TEMPLATE_VALUE_PLACEHOLDER) : TEMPLATE_VALUE_PLACEHOLDER;
};

/**
 * A template value with every literal replaced. What names the template's own parts stays: property names, the
 * logical IDs and pseudo parameters of `Ref`, the logical ID and attribute of `Fn::GetAtt`, the `${...}` references of
 * `Fn::Sub` and its variable names, the condition of `Fn::If` and `Condition`, and the map of `Fn::FindInMap`.
 */
const skeletonOf = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(skeletonOf);
  if (!isRecord(node)) return node === null ? null : TEMPLATE_VALUE_PLACEHOLDER;
  const entries = Object.entries(node);
  if (entries.length === 1) {
    const [key, value] = entries[0]!;
    if ((key === 'Ref' || key === 'Condition') && typeof value === 'string') return { [key]: value };
    if (key === 'Fn::GetAtt') {
      return {
        [key]:
          typeof value === 'string' || (Array.isArray(value) && value.every((part) => typeof part === 'string'))
            ? value
            : skeletonOf(value)
      };
    }
    if (key === 'Fn::Sub') {
      if (typeof value === 'string') return { [key]: subReferences(value) };
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return { [key]: [subReferences(value[0]), ...value.slice(1).map(skeletonOf)] };
      }
    }
    if ((key === 'Fn::If' || key === 'Fn::FindInMap') && Array.isArray(value) && typeof value[0] === 'string') {
      return { [key]: [value[0], ...value.slice(1).map(skeletonOf)] };
    }
  }
  return Object.fromEntries(entries.map(([key, value]) => [key, skeletonOf(value)]));
};

const namesOnly = (section: unknown, describe: (entry: unknown) => unknown) =>
  isRecord(section)
    ? Object.fromEntries(Object.entries(section).map(([name, entry]) => [name, describe(entry)]))
    : undefined;

/**
 * The structure of a template without any literal value, for `GetTemplate`. A template holds what the application
 * keeps out of its code: environment values, connection strings, passwords, parameter defaults, mappings and state
 * machine definitions, nested in conditions and substitutions in more ways than a list of known places can follow.
 * Kept: the sections, the logical IDs of parameters, mappings, conditions, resources and outputs, each resource's
 * `Type`, `Condition`, `DependsOn`, `DeletionPolicy` and `UpdateReplacePolicy`, a parameter's `Type`, the keys of
 * mappings, every property name, and what references name (see `skeletonOf`). Every other value reads `[value]`.
 */
export const getTemplateSkeleton = (template: Record<string, unknown>) => {
  const skeleton: Record<string, unknown> = {};
  for (const [section, value] of Object.entries(template)) {
    if (section === 'Parameters') {
      skeleton[section] = namesOnly(value, (parameter) =>
        isRecord(parameter) && typeof parameter.Type === 'string' ? { Type: parameter.Type } : {}
      );
    } else if (section === 'Mappings') {
      skeleton[section] = namesOnly(value, (mapping) =>
        namesOnly(mapping, (keys) => namesOnly(keys, () => TEMPLATE_VALUE_PLACEHOLDER))
      );
    } else if (section === 'Resources') {
      skeleton[section] = namesOnly(value, (resource) => {
        if (!isRecord(resource)) return skeletonOf(resource);
        const { Type, Condition, DependsOn, DeletionPolicy, UpdateReplacePolicy, ...rest } = resource;
        return {
          ...(typeof Type === 'string' && { Type }),
          ...(typeof Condition === 'string' && { Condition }),
          ...(DependsOn !== undefined && {
            DependsOn: [DependsOn].flat().every((name) => typeof name === 'string') ? DependsOn : skeletonOf(DependsOn)
          }),
          ...(typeof DeletionPolicy === 'string' && { DeletionPolicy }),
          ...(typeof UpdateReplacePolicy === 'string' && { UpdateReplacePolicy }),
          ...(skeletonOf(rest) as Record<string, unknown>)
        };
      });
    } else if (section === 'Conditions' || section === 'Outputs' || section === 'Rules') {
      skeleton[section] = namesOnly(value, skeletonOf);
    } else if (section === 'AWSTemplateFormatVersion' && typeof value === 'string') {
      skeleton[section] = value;
    } else {
      skeleton[section] = skeletonOf(value);
    }
  }
  return skeleton;
};

/**
 * The longest template structure `GetTemplate` returns whole, in characters of compact JSON. It leaves room for the rest
 * of a 30 000-character MCP tool result, so an ordinary stack (about 25 resources) reads in one call.
 */
export const TEMPLATE_STRUCTURE_LIMIT = 28_000;

/** The input field that selects resources of a `GetTemplate` call; it is Stacktape's, never sent to AWS. */
export const TEMPLATE_RESOURCE_SELECTOR = 'LogicalResourceIds';

/** The most resources one `GetTemplate` call selects. */
const MAX_SELECTED_TEMPLATE_RESOURCES = 100;

const compactLength = (value: unknown) => JSON.stringify(value).length;

/**
 * Why a `LogicalResourceIds` value cannot select resources, or `undefined`: it must be a list of 1 to 100 logical IDs.
 */
export const describeInvalidResourceSelection = (selection: unknown): string | undefined =>
  Array.isArray(selection) &&
  selection.length > 0 &&
  selection.length <= MAX_SELECTED_TEMPLATE_RESOURCES &&
  selection.every((id) => typeof id === 'string' && id.length > 0)
    ? undefined
    : `${TEMPLATE_RESOURCE_SELECTOR} must be a list of 1 to ${MAX_SELECTED_TEMPLATE_RESOURCES} logical IDs of the template's resources.`;

/** Resource logical IDs by resource type, sorted, or the number of resources of each type when the lists are too long. */
const resourcesByType = (resources: Record<string, unknown>) => {
  const byType: Record<string, string[]> = {};
  for (const [logicalId, resource] of Object.entries(resources).toSorted(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const type = isRecord(resource) && typeof resource.Type === 'string' ? resource.Type : 'Unknown';
    (byType[type] ??= []).push(logicalId);
  }
  const sorted = Object.fromEntries(Object.entries(byType).toSorted(([left], [right]) => left.localeCompare(right)));
  return compactLength(sorted) <= TEMPLATE_STRUCTURE_LIMIT
    ? sorted
    : Object.fromEntries(Object.entries(sorted).map(([type, ids]) => [type, ids.length]));
};

/**
 * What `GetTemplate` returns of a template's structure (`getTemplateSkeleton`), bounded by `TEMPLATE_STRUCTURE_LIMIT`:
 *
 * - without a selection, the whole structure as `Template` when it fits, and otherwise `TemplateIndex`: the template's
 *   resources by type and the names of its parameters, conditions and outputs, with a `Note` on how to read resources;
 * - with `LogicalResourceIds`, the structure of those resources as `Template.Resources`, in the order asked, as many as
 *   fit. IDs the template lacks are listed in `MissingLogicalResourceIds`, those that did not fit in
 *   `OmittedLogicalResourceIds`.
 */
export const boundTemplateStructure = (
  skeleton: Record<string, unknown>,
  selection?: string[]
): Record<string, unknown> => {
  const resources = isRecord(skeleton.Resources) ? skeleton.Resources : {};
  if (selection) {
    const selected: Record<string, unknown> = {};
    const missing: string[] = [];
    const omitted: string[] = [];
    for (const logicalId of new Set(selection)) {
      if (!Object.hasOwn(resources, logicalId)) {
        missing.push(logicalId);
        continue;
      }
      const fits =
        !omitted.length &&
        compactLength({ ...selected, [logicalId]: resources[logicalId] }) <= TEMPLATE_STRUCTURE_LIMIT;
      if (fits) selected[logicalId] = resources[logicalId];
      else omitted.push(logicalId);
    }
    return {
      Template: { Resources: selected },
      ...(missing.length && { MissingLogicalResourceIds: missing }),
      ...(omitted.length && {
        OmittedLogicalResourceIds: omitted,
        Note: `The selected resources' structure is longer than ${TEMPLATE_STRUCTURE_LIMIT} characters. Read the omitted ones in another GetTemplate call with ${TEMPLATE_RESOURCE_SELECTOR}.`
      })
    };
  }
  const length = compactLength(skeleton);
  if (length <= TEMPLATE_STRUCTURE_LIMIT) return { Template: skeleton };
  const names = (section: unknown) => (isRecord(section) ? Object.keys(section) : undefined);
  const parameters = isRecord(skeleton.Parameters) ? skeleton.Parameters : undefined;
  return {
    TemplateIndex: {
      ...(typeof skeleton.AWSTemplateFormatVersion === 'string' && {
        AWSTemplateFormatVersion: skeleton.AWSTemplateFormatVersion
      }),
      ...(parameters && {
        Parameters: Object.fromEntries(
          Object.entries(parameters).map(([name, parameter]) => [
            name,
            isRecord(parameter) && typeof parameter.Type === 'string' ? parameter.Type : TEMPLATE_VALUE_PLACEHOLDER
          ])
        )
      }),
      ...(names(skeleton.Conditions) && { Conditions: names(skeleton.Conditions) }),
      ...(names(skeleton.Outputs) && { Outputs: names(skeleton.Outputs) }),
      ResourceCount: Object.keys(resources).length,
      ResourcesByType: resourcesByType(resources)
    },
    Note: `The template's structure is ${length} characters, longer than the ${TEMPLATE_STRUCTURE_LIMIT} returned whole, so this lists its resources by type. To read the structure of chosen resources, repeat GetTemplate with "${TEMPLATE_RESOURCE_SELECTOR}": ["<logical ID>", ...] in its input (at most ${MAX_SELECTED_TEMPLATE_RESOURCES}).`
  };
};
