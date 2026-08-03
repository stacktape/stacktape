const REDACTED_CONTENT = '...hidden sensitive content...';
const REDACTED_BODY = '...hidden body content...';
const REDACTED_LOGS = '...hidden logs content...';
const AWS_REDACTED_CONTENT = '***SensitiveInformation***';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCodeBuildEnvironmentValue = (path: string[], key: string) =>
  key === 'value' &&
  path.some((segment) => segment === 'environmentVariables' || segment === 'environmentVariablesOverride');

const shouldRedactField = ({
  commandName,
  key,
  path,
  value
}: {
  commandName: string;
  key: string;
  path: string[];
  value: unknown;
}) => {
  if (value === AWS_REDACTED_CONTENT) return false;
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === 'secretstring' || normalizedKey === 'secretbinary') return true;
  if (commandName === 'PutParameterCommand' && path.length === 0 && key === 'Value') return true;
  return isCodeBuildEnvironmentValue(path, key);
};

const toLoggableValue = ({
  commandName,
  path,
  seen,
  value
}: {
  commandName: string;
  path: string[];
  seen: WeakSet<object>;
  value: unknown;
}): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return REDACTED_CONTENT;
  if (seen.has(value)) return '...circular reference...';

  seen.add(value);
  const result = Array.isArray(value)
    ? value.map((item) => toLoggableValue({ commandName, path, seen, value: item }))
    : Object.fromEntries(
        Object.entries(value).map(([key, child]) => {
          if (key === 'Body') return [key, REDACTED_BODY];
          if (key === 'logEvents') return [key, REDACTED_LOGS];
          if (shouldRedactField({ commandName, key, path, value: child })) return [key, REDACTED_CONTENT];
          return [key, toLoggableValue({ commandName, path: [...path, key], seen, value: child })];
        })
      );
  seen.delete(value);
  return result;
};

export const redactAwsRequestInput = <Input extends object>({
  commandName,
  filterSensitiveLog,
  input
}: {
  commandName: string;
  filterSensitiveLog?: (input: Input) => unknown;
  input: Input;
}): Record<string, unknown> => {
  const modelFiltered = filterSensitiveLog?.(input) ?? input;
  const redacted = toLoggableValue({ commandName, path: [], seen: new WeakSet(), value: modelFiltered });
  return isRecord(redacted) ? redacted : {};
};
