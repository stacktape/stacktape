import { isAbsolute, join } from 'node:path';
import { IS_DEV } from '@config';
import { getRelativePath, isFileAccessible } from '@utils/fs-utils';
import stacktrace from 'stack-trace';
import stripAnsi from 'strip-ansi';

export type ErrorCategory =
  | 'API_KEY'
  | 'CLI'
  | 'MISSING_PREREQUISITE'
  | 'EXISTING_STACK'
  | 'NON_EXISTING_STACK'
  | 'NON_EXISTING_RESOURCE'
  | 'MISSING_OUTPUT'
  | 'CONFIG_VALIDATION'
  | 'CONFIG_GENERATION'
  | 'PACKAGING'
  | 'PACKAGING_CONFIG'
  | 'DOCKER'
  | 'CONFIG'
  | 'SOURCE_CODE'
  | 'LOGIN'
  | 'QUOTA'
  | 'DIRECTIVE'
  | 'PARAMETER'
  | 'HOOK'
  | 'FILE_ACCESS'
  | 'CREDENTIALS'
  | 'NOT_YET_IMPLEMENTED'
  | 'STACK'
  | 'DEPLOYMENT'
  | 'BUDGET'
  | 'AWS'
  | 'DOMAIN_MANAGEMENT'
  | 'CLOUDFORMATION'
  | 'STACK_MONITORING'
  | 'SYNC_BUCKET'
  | 'USERPOOL'
  | 'INPUT'
  | 'BUILD_CODE'
  | 'API_SERVER'
  | 'SCRIPT'
  | 'PACK'
  | 'NIXPACKS'
  | 'CODEBUILD'
  | 'AWS_ACCOUNT'
  | 'LIMIT_EXCEEDED'
  | 'GUARDRAIL'
  | 'SUBSCRIPTION_REQUIRED'
  | 'SESSION_MANAGER'
  | 'UNSUPPORTED_RESOURCE'
  | 'INSTALL_DEPENDENCIES'
  | 'CONFIRMATION_REQUIRED'
  | 'DEVICE';

/** @deprecated Use ErrorCategory while legacy error call sites are migrated. */
export type ErrorType = ErrorCategory;

export type CliErrorOptions = {
  category: ErrorCategory;
  code: string;
  message: string;
  hints?: string | string[];
  cause?: unknown;
  userStackTrace?: string;
  detail?: { title: string; codeFrame?: string };
};

export type ErrorDetails = {
  prettyStackTrace: string | null;
  originalErrorType: string;
  code: string;
  errorType: ErrorCategory | 'UNEXPECTED';
  errorTrackingId: string | null;
};

export class CliError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly hints: string[];
  readonly userStackTrace?: string;
  readonly errorDetails?: { title: string; codeFrame?: string };
  details?: ErrorDetails;

  // Transitional aliases for catch sites that have not moved to instanceof yet.
  readonly isExpected = true;
  readonly type: ErrorCategory;
  readonly hint?: string | string[];

  constructor({ category, code, message, hints, cause, userStackTrace, detail }: CliErrorOptions) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'CliError';
    this.category = category;
    this.type = category;
    this.code = code;
    this.hints = hints ? (Array.isArray(hints) ? hints : [hints]) : [];
    this.hint = hints;
    this.userStackTrace = userStackTrace;
    this.errorDetails = detail;
  }
}

export type StacktapeError = CliError;

const isBundledStacktapeInternalFrame = (fileName: string) => {
  const normalizedFileName = fileName.replaceAll('\\', '/').replace(/^[./]+/, '');
  const bundledInternalPrefixes = ['src/', 'scripts/', 'helper-lambdas/', '@generated/'];

  return (
    bundledInternalPrefixes.some((prefix) => normalizedFileName.startsWith(prefix)) &&
    !isFileAccessible(join(process.cwd(), normalizedFileName))
  );
};

/** @deprecated Prefer CliError with a descriptive machine-readable code. */
export class ExpectedError extends CliError {
  metadata?: Record<string, any>;

  constructor(type: ErrorType, message: string, hint?: string | string[], metadata?: Record<string, any>) {
    super({ category: type, code: `${type}_ERROR`, message, hints: hint });
    this.name = type;
    this.metadata = metadata;
  }
}

export class UnexpectedError extends Error {
  readonly isExpected = false;
  details?: ErrorDetails;

  constructor({ error, customMessage }: { error?: unknown; customMessage?: string }) {
    const originalError = error instanceof Error ? error : error === undefined ? undefined : new Error(String(error));
    const message = [customMessage?.trimEnd(), originalError?.message].filter(Boolean).join('\n') || 'Unknown error';
    super(message, originalError ? { cause: originalError } : undefined);
    this.name = originalError?.name || 'UnexpectedError';
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

export class UserCodeError extends CliError {
  constructor(message: string, originalError: Error, hint?: string | string[]) {
    super({
      category: 'SOURCE_CODE',
      code: 'SOURCE_CODE_LOAD_FAILED',
      message: `${message}\n${originalError.message}`,
      hints: hint,
      cause: originalError
    });
    this.stack = originalError.stack;
    const hintArray = Array.isArray(hint) ? hint : hint ? [hint] : [];
    if (originalError instanceof CliError) {
      hintArray.push(...originalError.hints);
    }
    this.hints.splice(0, this.hints.length, ...hintArray);
  }
}

export type HandledError = CliError | UnexpectedError;

export const getReturnableError = (error: HandledError): Error => {
  const details = error.details || getErrorDetails(error);
  const res = new Error();
  delete res.stack;
  res.message = stripAnsi(error.message);
  if (IS_DEV) {
    res.stack = stripAnsi(`[${details.errorType}] ${error.message}\n${details.prettyStackTrace}`);
  }
  const hints = error instanceof CliError ? error.hints : [];
  (res as any).details = {
    errorId: details.errorTrackingId,
    errorType: details.errorType,
    code: details.code,
    hints: hints.length ? hints : null
  };
  return res;
};

export const getPrettyStacktrace = (
  error: Error,
  colorizeOwnCode?: (msg: string) => string,
  colorizeDependencyCode?: (msg: string) => string
) => {
  if (!error.stack) {
    return '';
  }
  const trace = stacktrace.parse(error);
  return trace
    .filter(({ fileName, native }) => {
      if (fileName) {
        return (
          !native &&
          !fileName.startsWith('internal/') &&
          fileName !== '------' &&
          !fileName.startsWith('node:internal') &&
          fileName !== 'vm.js' &&
          !fileName.includes('bootstrap_node.js') &&
          (IS_DEV ? true : !fileName.includes('__publish-folder') && !fileName.includes('stacktape.js:1'))
        );
      }
      return false;
    })
    .map((callsite) => {
      const { fileName, lineNumber, columnNumber, functionName } = callsite;
      let isUserCode = true;
      let adjustedFileName: string = fileName;
      let adjustedFunctionName = `${functionName} `;
      if (functionName && functionName.includes('Object.')) {
        adjustedFunctionName = '';
      } else if (!functionName) {
        adjustedFunctionName = '<anonymous> ';
      }
      if (fileName) {
        isUserCode =
          !fileName.includes('node_modules') &&
          !fileName.includes('node:') &&
          !fileName.includes('var/runtime/Runtime');
        if (fileName.includes('webpack:') && !/'webpack\\'|'webpack\/'/.exec(fileName)) {
          adjustedFileName = fileName
            .replace(/(.*)webpack:\/stacktape/, '')
            .replace(/(.*)webpack:\\stacktape/, '')
            .replace(/\/|\\/, '');
        }
      }
      if (isAbsolute(fileName) && isFileAccessible(fileName)) {
        adjustedFileName = getRelativePath(fileName).replaceAll('\\', '/');
      } else {
        adjustedFileName = getRelativePath(join(process.cwd(), fileName)).replaceAll('\\', '/');
      }
      adjustedFileName = adjustedFileName.replace('C:/snapshot/core/', '').replace('/snapshot/core/', '');
      const position = `(${isUserCode ? './' : ''}${adjustedFileName}:${lineNumber}${
        columnNumber ? `:${columnNumber}` : ''
      })`;
      const res = `at ${adjustedFunctionName}${fileName ? position : ''}`;
      return isUserCode
        ? colorizeOwnCode
          ? colorizeOwnCode(res)
          : res
        : colorizeDependencyCode
          ? colorizeDependencyCode(res)
          : res;
    })
    .join('\n');
};

/**
 * Get a pretty stack trace showing only user code frames (for config errors)
 */
export const getUserCodeStackTrace = (error: Error, colorize?: (msg: string) => string): string | null => {
  if (!error.stack) {
    return null;
  }
  const trace = stacktrace.parse(error);
  const userFrames = trace
    .filter(({ fileName, native }) => {
      if (native || !fileName) return false;
      if (fileName === '------' || fileName === 'native') return false;
      if (fileName.startsWith('internal/') || fileName.startsWith('node:')) return false;
      // Only include user code, not node_modules or stacktape internals
      if (fileName.includes('node_modules')) return false;
      if (fileName.includes('stacktape/src') || fileName.includes('stacktape\\src')) return false;
      if (fileName.includes('__publish-folder') || fileName.includes('stacktape.js')) return false;
      if (isBundledStacktapeInternalFrame(fileName)) return false;
      // Filter Bun's package install cache (e.g. ~/.bun/install/cache/stacktape@x.y.z/index.js)
      const normalized = fileName.replaceAll('\\', '/');
      if (normalized.includes('/.bun/install/')) return false;
      return true;
    })
    .map((callsite) => {
      const { fileName, lineNumber, columnNumber, functionName } = callsite;
      let adjustedFileName: string = fileName;

      // Format function name
      let adjustedFunctionName = '';
      if (functionName && !functionName.includes('Object.')) {
        adjustedFunctionName = `${functionName} `;
      } else if (!functionName) {
        adjustedFunctionName = '<anonymous> ';
      }

      // Convert to relative path
      if (isAbsolute(fileName) && isFileAccessible(fileName)) {
        adjustedFileName = getRelativePath(fileName).replaceAll('\\', '/');
      } else {
        adjustedFileName = getRelativePath(join(process.cwd(), fileName)).replaceAll('\\', '/');
      }

      const position = `./${adjustedFileName}:${lineNumber}${columnNumber ? `:${columnNumber}` : ''}`;
      const line = `  at ${adjustedFunctionName}(${position})`;
      return colorize ? colorize(line) : line;
    });

  return userFrames.length > 0 ? userFrames.join('\n') : null;
};

export const getErrorDetails = (error: HandledError): ErrorDetails => {
  const isExpected = error instanceof CliError;
  const prettyStackTrace: string = IS_DEV ? getPrettyStacktrace(error) : null;
  const originalErrorType = isExpected ? '' : error.name || 'Error';
  const errorType = isExpected ? error.category : 'UNEXPECTED';
  const code = isExpected ? error.code : 'UNEXPECTED_ERROR';
  return {
    prettyStackTrace,
    originalErrorType,
    code,
    errorType,
    errorTrackingId: null as string
  };
};

export const attemptToGetUsefulExpectedError = (error: Error) => {
  if (`${error}`.includes('ENOSPC')) {
    return new CliError({
      category: 'DEVICE',
      code: 'DEVICE_NO_SPACE',
      message: `There seems to be no space left on the device. Error: ${error}`,
      hints: 'Please free up some space on the device and try again.',
      cause: error
    });
  }
  if (
    `${error?.message || error}`.includes(
      'Resource name not set. Make sure to add the resource to the resources object in your config.'
    )
  ) {
    return new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_VALIDATION_RESOURCE_NAME_MISSING',
      message:
        'Resource name not set. Make sure to add the resource to the resources object in your config. The resource name is automatically derived from the object key.',
      hints:
        'If you create a resource instance, assign it under config.resources (for example resources: { myApi: api }).',
      cause: error
    });
  }
  return null;
};

export const getErrorFromString = (
  errorString: string,
  format: {
    message?: (message: string) => string;
    dependencyFrame?: (frame: string) => string;
  } = {}
) => {
  let [message, ...stackArray] = errorString.split('    at');

  // Stacktape-built image
  if (message.includes('/app/index.js:')) {
    message = message.split('\n\n')[1];
  }

  const stack = stackArray.filter(Boolean).join('    at');
  const error = new Error(message);
  error.stack = `${message}\n    at${stack}`;

  // console.log(error);
  let prettyStacktrace = getPrettyStacktrace(error, undefined, format.dependencyFrame);

  if (!prettyStacktrace.endsWith('\n')) {
    prettyStacktrace += '\n';
  }
  if (!message.endsWith('\n')) {
    message += '\n';
  }

  return `\n${format.message ? format.message(message) : message}${prettyStacktrace}`;
};

export const parseContainerError = (errorString: string): { message: string; stackTrace?: string } => {
  let [message, ...stackArray] = errorString.split('    at');

  // Stacktape-built image
  if (message.includes('/app/index.js:')) {
    message = message.split('\n\n')[1] || message;
  }

  // Clean up the message
  message = message.trim();

  if (stackArray.length === 0) {
    return { message };
  }

  const stack = stackArray.filter(Boolean).join('    at');
  const error = new Error(message);
  error.stack = `${message}\n    at${stack}`;

  const prettyStacktrace = getPrettyStacktrace(
    error as any,
    (msg) => msg,
    (msg) => msg
  );

  return {
    message,
    stackTrace: prettyStacktrace || undefined
  };
};

// export const handleStderrData = (data, killProcessFn) => {
//   const parsedData: string = data.toString();
//   if (parsedData !== '\n') {
//     if (parsedData.includes('at ')) {
//       const err = getErrorFromString(parsedData);
//       killProcessFn('SIGTERM', { forceKillAfterTimeout: 4000 });
//       throw err;
//     }
//   }
// };
