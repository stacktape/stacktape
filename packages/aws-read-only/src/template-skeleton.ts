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
