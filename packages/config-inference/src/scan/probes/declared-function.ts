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

/**
 * The timeout and memory a manifest states, within the range Lambda accepts, and which of the two are declared in a
 * way init cannot read. Writing the function with Stacktape's defaults instead would change how long it may run.
 */
export const declaredSizing = (
  timeout: unknown,
  memory: unknown,
  scope: TemplateScope
): {
  settings: Pick<ServiceFactInput, 'functionTimeoutSeconds' | 'functionMemoryMb'>;
  unresolved: Array<'timeout' | 'memory'>;
} => {
  const seconds = declaredNumber(timeout, scope);
  const megabytes = declaredNumber(memory, scope);
  return {
    settings: {
      ...(typeof seconds !== 'number' || seconds < 1 || seconds > 900 ? {} : { functionTimeoutSeconds: seconds }),
      ...(typeof megabytes !== 'number' || megabytes < 128 || megabytes > 10240 ? {} : { functionMemoryMb: megabytes })
    },
    unresolved: [
      ...(seconds === UNRESOLVED || (typeof seconds === 'number' && (seconds < 1 || seconds > 900))
        ? (['timeout'] as const)
        : []),
      ...(megabytes === UNRESOLVED || (typeof megabytes === 'number' && (megabytes < 128 || megabytes > 10240))
        ? (['memory'] as const)
        : [])
    ]
  };
};

/** What a template declares that a literal can stand for: its parameters, conditions and resource logical IDs. */
export type TemplateScope = {
  parameters: RecordValue;
  logicalIds: ReadonlySet<string>;
  conditions?: RecordValue;
  /** Values a parent template passes to these parameters (a SAM nested application's `Parameters`). */
  parameterValues?: Readonly<Record<string, unknown>>;
  /** The whole Serverless manifest, for `${self:...}` references to its own literal values. */
  self?: RecordValue;
};

export const UNRESOLVED = Symbol('unresolved');
/** `Ref: AWS::NoValue`, or the unselected side of a condition: the property is absent. */
export const ABSENT = Symbol('absent');

const parameterValue = (scope: TemplateScope, name: string): unknown => {
  if (scope.parameterValues !== undefined && Object.hasOwn(scope.parameterValues, name)) {
    const passed = scope.parameterValues[name];
    return typeof passed === 'string' || typeof passed === 'number' || typeof passed === 'boolean'
      ? passed
      : UNRESOLVED;
  }
  const parameter = scope.parameters[name];
  const value = isRecord(parameter) ? parameter.Default : undefined;
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : UNRESOLVED;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `${self:custom.jobTimeout}` as the literal the manifest states there; anything with a fallback or another source is not. */
const serverlessSelfValue = (value: string, scope: TemplateScope): unknown => {
  const path = /^\$\{self:([A-Za-z0-9_.-]+)\}$/.exec(value)?.[1];
  if (path === undefined || scope.self === undefined) return UNRESOLVED;
  let current: unknown = scope.self;
  for (const segment of path.split('.')) {
    if (!isRecord(current)) return UNRESOLVED;
    current = current[segment];
  }
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? typeof current === 'string' && current.includes('${')
      ? UNRESOLVED
      : current
    : UNRESOLVED;
};

/** A `Fn::Sub` string with every `${Name}` a parameter, substituted; anything else is unresolved. */
const substitute = (template: string, scope: TemplateScope): unknown => {
  let unresolved = false;
  const result = template.replace(/\$\{([^}]*)\}/g, (match, name: string) => {
    if (name.startsWith('!')) return match.replace('!', '');
    const value = Object.hasOwn(scope.parameters, name) ? parameterValue(scope, name) : UNRESOLVED;
    if (value === UNRESOLVED) unresolved = true;
    return String(value === UNRESOLVED ? '' : value);
  });
  return unresolved ? UNRESOLVED : result;
};

/**
 * Whether a named condition is true with the parameters' defaults (or the values a parent passes), or undefined when
 * that cannot be told without deploying: a pseudo parameter, an import, a parameter without a default.
 */
export const conditionHolds = (
  name: string,
  scope: TemplateScope,
  seen: ReadonlySet<string> = new Set()
): boolean | undefined => {
  if (seen.has(name)) return undefined;
  const expression = scope.conditions?.[name];
  return expression === undefined ? undefined : evaluateCondition(expression, scope, new Set([...seen, name]));
};

const evaluateCondition = (
  expression: unknown,
  scope: TemplateScope,
  seen: ReadonlySet<string>
): boolean | undefined => {
  if (!isRecord(expression) || Object.keys(expression).length !== 1) return undefined;
  const [[operator, operands]] = Object.entries(expression) as [[string, unknown]];
  if (operator === 'Condition') return typeof operands === 'string' ? conditionHolds(operands, scope, seen) : undefined;
  if (!Array.isArray(operands)) return undefined;
  if (operator === 'Fn::Equals') {
    if (operands.length !== 2) return undefined;
    const [left, right] = operands.map((operand) => resolveDeclaredValue(operand, scope));
    if (left === UNRESOLVED || right === UNRESOLVED || left === ABSENT || right === ABSENT) return undefined;
    if (typeof left === 'object' || typeof right === 'object') return undefined;
    return String(left) === String(right);
  }
  const values = operands.map((operand) => evaluateCondition(operand, scope, seen));
  if (operator === 'Fn::Not') return values.length === 1 && values[0] !== undefined ? !values[0] : undefined;
  if (operator === 'Fn::And') return values.includes(false) ? false : values.includes(undefined) ? undefined : true;
  if (operator === 'Fn::Or') return values.includes(true) ? true : values.includes(undefined) ? undefined : false;
  return undefined;
};

/**
 * The side of an `Fn::If` that applies, `ABSENT` for `AWS::NoValue`, `UNRESOLVED` when the condition cannot be told,
 * or the value itself when it is not conditional.
 */
export const selectBranch = (value: unknown, scope: TemplateScope): unknown => {
  if (isRecord(value) && value.Ref === 'AWS::NoValue' && Object.keys(value).length === 1) return ABSENT;
  if (!isRecord(value) || !Array.isArray(value['Fn::If']) || Object.keys(value).length !== 1) return value;
  const [condition, whenTrue, whenFalse] = value['Fn::If'] as unknown[];
  const holds = typeof condition === 'string' ? conditionHolds(condition, scope) : undefined;
  return holds === undefined ? UNRESOLVED : selectBranch(holds ? whenTrue : whenFalse, scope);
};

/**
 * A declared value as the literal it deploys with, or `UNRESOLVED`.
 *
 * Filters, payloads, sizing and switches decide which events a handler receives, how it runs and whether it runs at
 * all, so a value init cannot read must not be passed through, dropped or guessed. `Ref` to a parameter resolves to
 * the value a parent passes, else its default; `Fn::Sub` substitutes parameters; `Fn::If` takes the side its
 * condition selects. A plain string is always a literal, even when a parameter has the same name. A reference to a
 * resource, an import and a Serverless variable other than `${self:...}` to a literal are unresolved.
 */
export const resolveDeclaredValue = (value: unknown, scope: TemplateScope): unknown => {
  if (typeof value === 'string') {
    if (!value.includes('${')) return value;
    return serverlessSelfValue(value, scope);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => resolveDeclaredValue(item, scope)).filter((item) => item !== ABSENT);
    return items.includes(UNRESOLVED) ? UNRESOLVED : items;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === 'Ref') {
      if (value.Ref === 'AWS::NoValue') return ABSENT;
      return typeof value.Ref === 'string' && Object.hasOwn(scope.parameters, value.Ref)
        ? parameterValue(scope, value.Ref)
        : UNRESOLVED;
    }
    if (keys.length === 1 && keys[0] === 'Fn::Sub') {
      return typeof value['Fn::Sub'] === 'string' ? substitute(value['Fn::Sub'], scope) : UNRESOLVED;
    }
    if (keys.length === 1 && keys[0] === 'Fn::If') {
      const branch = selectBranch(value, scope);
      return branch === UNRESOLVED || branch === ABSENT ? branch : resolveDeclaredValue(branch, scope);
    }
    if (keys.some((key) => key === 'Ref' || key.startsWith('Fn::') || key === 'Condition')) return UNRESOLVED;
    const entries = Object.entries(value)
      .map(([key, item]) => [key, resolveDeclaredValue(item, scope)] as const)
      .filter(([, item]) => item !== ABSENT);
    return entries.some(([, item]) => item === UNRESOLVED) ? UNRESOLVED : Object.fromEntries(entries);
  }
  return value;
};

/** A literal switch: true, false, or `UNRESOLVED` for anything init cannot read as one. */
export const declaredSwitch = (value: unknown, scope: TemplateScope): boolean | typeof UNRESOLVED | undefined => {
  if (value === undefined) return undefined;
  const resolved = resolveDeclaredValue(value, scope);
  if (resolved === ABSENT) return undefined;
  if (resolved === true || resolved === 'true' || resolved === 'True' || resolved === 'TRUE') return true;
  if (resolved === false || resolved === 'false' || resolved === 'False' || resolved === 'FALSE') return false;
  return UNRESOLVED;
};

/** A literal whole number, `undefined` when not declared, or `UNRESOLVED`. */
export const declaredNumber = (value: unknown, scope: TemplateScope): number | typeof UNRESOLVED | undefined => {
  if (value === undefined) return undefined;
  const resolved = resolveDeclaredValue(value, scope);
  if (resolved === ABSENT) return undefined;
  const number =
    typeof resolved === 'number' ? resolved : typeof resolved === 'string' ? Number(resolved.trim()) : Number.NaN;
  return Number.isInteger(number) && number >= 0 ? number : UNRESOLVED;
};

/** FIFO and redelivery settings of an `AWS::SQS::Queue` declaration, or `UNRESOLVED` when one of them cannot be read. */
export const declaredQueueSettings = (properties: unknown, scope: TemplateScope) => {
  if (!isRecord(properties)) return undefined;
  const fifo = declaredSwitch(properties.FifoQueue, scope);
  const deduplication = declaredSwitch(properties.ContentBasedDeduplication, scope);
  const visibility = declaredNumber(properties.VisibilityTimeout, scope);
  if (fifo === UNRESOLVED || deduplication === UNRESOLVED || visibility === UNRESOLVED) return UNRESOLVED;
  const settings = {
    ...(fifo === true ? { fifo: true as const } : {}),
    ...(deduplication === true ? { contentBasedDeduplication: true as const } : {}),
    ...(visibility !== undefined && visibility <= 43200 ? { visibilityTimeoutSeconds: visibility } : {})
  };
  return Object.keys(settings).length === 0 ? undefined : settings;
};
