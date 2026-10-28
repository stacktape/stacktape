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
