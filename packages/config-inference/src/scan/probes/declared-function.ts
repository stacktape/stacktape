/** Function settings that the Serverless and SAM importers read the same way. */

import type { ServiceFactInput } from '../../facts/service';

type RecordValue = Record<string, unknown>;

/** Entry files whose runtime calls the export the handler string names after the module path. */
const NAMED_EXPORT_ENTRY = /\.(?:[cm]?[jt]sx?|py|rb)$/;

/**
 * The export a `module.export` handler string selects, when it is not the runtime's default.
 *
 * Stacktape calls `handler` (JavaScript's `handler` or default export, Python's and Ruby's `handler`) unless told
 * otherwise, so `handler.main` deploys a function that cannot find `main` unless the name is carried.
 */
export const declaredHandlerExport = (handler: string, entrypoint: string): string | undefined => {
  if (!NAMED_EXPORT_ENTRY.test(entrypoint)) return undefined;
  const separator = handler.lastIndexOf('.');
  const name = separator === -1 ? undefined : handler.slice(separator + 1);
  return name === undefined || name === 'handler' || !/^[A-Za-z_$][\w$]*$/.test(name) ? undefined : name;
};

const wholeNumber = (value: unknown): number | undefined => {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : Number.NaN;
  return Number.isInteger(number) && number > 0 ? number : undefined;
};

/** The timeout and memory a manifest states, within the range Lambda accepts. */
export const declaredSizing = (
  timeout: unknown,
  memory: unknown
): Pick<ServiceFactInput, 'functionTimeoutSeconds' | 'functionMemoryMb'> => {
  const seconds = wholeNumber(timeout);
  const megabytes = wholeNumber(memory);
  return {
    ...(seconds === undefined || seconds > 900 ? {} : { functionTimeoutSeconds: seconds }),
    ...(megabytes === undefined || megabytes < 128 || megabytes > 10240 ? {} : { functionMemoryMb: megabytes })
  };
};

/** FIFO and redelivery settings of an `AWS::SQS::Queue` declaration. */
export const declaredQueueSettings = (properties: unknown) => {
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) return undefined;
  const { FifoQueue, ContentBasedDeduplication, VisibilityTimeout } = properties as RecordValue;
  const visibility =
    typeof VisibilityTimeout === 'number' || typeof VisibilityTimeout === 'string'
      ? Number(VisibilityTimeout)
      : Number.NaN;
  const settings = {
    ...(FifoQueue === true || FifoQueue === 'true' ? { fifo: true as const } : {}),
    ...(ContentBasedDeduplication === true || ContentBasedDeduplication === 'true'
      ? { contentBasedDeduplication: true as const }
      : {}),
    ...(Number.isInteger(visibility) && visibility >= 0 && visibility <= 43200
      ? { visibilityTimeoutSeconds: visibility }
      : {})
  };
  return Object.keys(settings).length === 0 ? undefined : settings;
};

/** What a template declares that a literal can stand for: its parameters and the logical IDs of its resources. */
export type TemplateScope = { parameters: RecordValue; logicalIds: ReadonlySet<string> };

export const UNRESOLVED = Symbol('unresolved');

const parameterDefault = (scope: TemplateScope, name: string): unknown => {
  const parameter = scope.parameters[name];
  const value = typeof parameter === 'object' && parameter !== null ? (parameter as RecordValue).Default : undefined;
  return typeof value === 'string' || typeof value === 'number' ? value : UNRESOLVED;
};

/**
 * A declared value as the literal it deploys with, or `UNRESOLVED`.
 *
 * Filters and payloads decide which events a handler receives and what they contain, so a value init cannot read must
 * not be passed through or dropped: either would widen delivery or change the payload. `Ref` to a parameter resolves
 * to its default. The template parser strips short intrinsic tags, so `!Ref Prefix` arrives as the parameter's name
 * and `!Sub` keeps its `${...}`; both are read that way. Anything else intrinsic, including a reference to a
 * resource and a Serverless `${...}` variable, is unresolved.
 */
export const resolveDeclaredValue = (value: unknown, scope: TemplateScope): unknown => {
  if (typeof value === 'string') {
    if (value.includes('${')) return UNRESOLVED;
    if (Object.hasOwn(scope.parameters, value)) return parameterDefault(scope, value);
    return scope.logicalIds.has(value.split('.')[0] ?? value) ? UNRESOLVED : value;
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => resolveDeclaredValue(item, scope));
    return items.includes(UNRESOLVED) ? UNRESOLVED : items;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as RecordValue;
    if (typeof record.Ref === 'string' && Object.keys(record).length === 1) {
      return Object.hasOwn(scope.parameters, record.Ref) ? parameterDefault(scope, record.Ref) : UNRESOLVED;
    }
    if (Object.keys(record).some((key) => key === 'Ref' || key.startsWith('Fn::') || key === 'Condition')) {
      return UNRESOLVED;
    }
    const entries = Object.entries(record).map(([key, item]) => [key, resolveDeclaredValue(item, scope)] as const);
    return entries.some(([, item]) => item === UNRESOLVED) ? UNRESOLVED : Object.fromEntries(entries);
  }
  return value;
};
