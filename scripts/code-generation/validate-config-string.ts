/**
 * Core validation of a single Stacktape config (as a YAML string or parsed object) against the REAL
 * generated Zod schema (`stacktapeConfigSchema`, produced by `gen:schema` from types/stacktape-config).
 *
 * Pure + offline: no AWS, no CLI init, no global state. Shared by the docs-example tooling:
 *   - scripts/validate-example-config.ts        (validate standalone .yml files)
 *   - scripts/validate-examples-in-types.ts     (extract + validate every ```yaml example in *.d.ts)
 *
 * VERDICT is authoritative: `safeParse` minus issues on directive values, exactly like real-flow
 * validation in src/domain/config-manager/utils/zod-validator.ts.
 * MESSAGES are leaf-precise: `resources` (and engines, lifecycle rules, events, ...) are plain
 * `z.union`s, so we walk the schema recursively, discriminating typed unions on `type`.
 */
import { getIsDirective } from '@utils/directives';
import { parseYaml } from '@shared/utils/yaml';
import { get } from 'lodash';
import { stacktapeConfigSchema } from '@generated/schemas/validate-config-zod';

export type ConfigIssue = { path: string; message: string };
export type ConfigValidation = { valid: boolean; errors: ConfigIssue[] };

const def = (s: any) => s?._def ?? {};
const unwrap = (s: any): any => {
  let cur = s;
  while (cur && ['optional', 'default', 'nullable', 'readonly', 'catch'].includes(def(cur).type))
    cur = def(cur).innerType;
  return cur;
};
const isOptional = (s: any) => ['optional', 'default'].includes(def(s).type);
const literalsOf = (s: any): unknown[] => {
  const d = def(unwrap(s));
  if (d.type === 'literal') return d.values ?? (d.value !== undefined ? [d.value] : []);
  if (d.type === 'enum') return Object.values(d.entries ?? d.values ?? {});
  return [];
};
const objectShape = (core: any): Record<string, any> | undefined =>
  def(core).type === 'object' ? (core.shape ?? def(core).shape) : undefined;

const leafIssues = (value: unknown, schema: any, path: string): ConfigIssue[] => {
  const r = schema.safeParse(value);
  if (r.success) return [];
  return r.error.issues.map((i: any) => ({
    path: [path, ...i.path].filter(Boolean).join('.') || '<root>',
    message: i.message
  }));
};

const pinpoint = (value: any, schema: any, path: string): ConfigIssue[] => {
  if (getIsDirective(value)) return [];
  const core = unwrap(schema);
  const t = def(core).type;

  if (t === 'union') {
    const options: any[] = def(core).options ?? [];
    const typed = options.filter(
      (o) => objectShape(unwrap(o))?.type && literalsOf(objectShape(unwrap(o))!.type).length
    );
    if (value && typeof value === 'object' && 'type' in value && typed.length) {
      const match = typed.find((o) => literalsOf(objectShape(unwrap(o))!.type).includes(value.type));
      if (match) return pinpoint(value, match, path);
      const allowed = typed.flatMap((o) => literalsOf(objectShape(unwrap(o))!.type));
      return [
        { path: `${path}.type`, message: `Invalid type "${value.type}". Expected one of: ${allowed.join(', ')}` }
      ];
    }
    let best: ConfigIssue[] | null = null;
    for (const o of options) {
      const errs = pinpoint(value, o, path);
      if (errs.length === 0) return [];
      if (!best || errs.length < best.length) best = errs;
    }
    return best ?? leafIssues(value, schema, path);
  }

  if (t === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return leafIssues(value, schema, path);
    const shape = objectShape(core)!;
    const issues: ConfigIssue[] = [];
    for (const key of Object.keys(value)) {
      if (!(key in shape)) issues.push({ path: `${path}.${key}`, message: `Unrecognized key "${key}"` });
    }
    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (key in value) issues.push(...pinpoint(value[key], fieldSchema, path ? `${path}.${key}` : key));
      else if (!isOptional(fieldSchema)) issues.push({ path: path ? `${path}.${key}` : key, message: 'Required' });
    }
    return issues;
  }

  if (t === 'array') {
    const element = def(core).element ?? def(core).type;
    if (!Array.isArray(value) || !element || typeof element === 'string') return leafIssues(value, schema, path);
    return value.flatMap((item, i) => pinpoint(item, element, `${path}.${i}`));
  }

  if (t === 'record') {
    const valueType = def(core).valueType;
    if (value === null || typeof value !== 'object' || !valueType) return leafIssues(value, schema, path);
    return Object.entries(value).flatMap(([k, v]) => pinpoint(v, valueType, path ? `${path}.${k}` : k));
  }

  return leafIssues(value, schema, path);
};

export const validateConfigObject = (config: unknown): ConfigValidation => {
  const result = stacktapeConfigSchema.safeParse(config);
  const filtered = result.success
    ? []
    : result.error.issues.filter((i) => !getIsDirective(get(config, i.path.join('.'))));
  if (filtered.length === 0) return { valid: true, errors: [] };
  const precise = pinpoint(config, stacktapeConfigSchema, '');
  const errors = precise.length
    ? precise
    : filtered.map((i) => ({ path: i.path.join('.') || '<root>', message: i.message }));
  return { valid: false, errors };
};

export const validateConfigYaml = (yamlString: string): ConfigValidation => {
  let config: unknown;
  try {
    config = parseYaml(yamlString);
  } catch (err) {
    return { valid: false, errors: [{ path: '<parse>', message: (err as Error).message }] };
  }
  return validateConfigObject(config);
};
