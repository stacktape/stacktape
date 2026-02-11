/* eslint-disable unicorn/error-message */
import { isAbsolute, join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { tuiManager } from '@application-services/tui-manager';
import { IS_DEV } from '@config';
import { getRelativePath, isFileAccessible } from '@shared/utils/fs-utils';
import stacktrace from 'stack-trace';
import stripAnsi from 'strip-ansi';

export class ExpectedError extends Error {
  type: ErrorType;
  isExpected: boolean;
  hint?: string | string[];
  details?: ReturnType<typeof getErrorDetails>;
  metadata?: Record<string, any>;
  userStackTrace?: string;

  constructor(type: ErrorType, message: string, hint?: string | string[], metadata?: Record<string, any>) {
    super(message);
    this.isExpected = true;
    this.name = type;
    this.type = type;
    this.hint = hint;
    this.metadata = metadata;

    this.details = getErrorDetails(this);
  }
}

export class UnexpectedError extends Error {
  message: string;
  isExpected = false;
  details?: ReturnType<typeof getErrorDetails>;

  constructor({ error, customMessage }: { error?: Error; customMessage?: string }) {
    const message = `${customMessage || ''}${error ? `${error?.message}` : ''}`;
    const lastCapturedEventPart = `Last captured event: ${eventManager.lastEvent?.eventType || 'NONE'}`;
    const fullMessage = `${message}${message.endsWith('.') ? '' : '.'} ${lastCapturedEventPart}`;
    super(fullMessage);
    this.message = fullMessage;
    if (error?.stack) {
      this.stack = error.stack;
    }
    this.details = getErrorDetails(this);
  }
}

export class UserCodeError extends ExpectedError {
  constructor(message: string, originalError: Error, hint?: string | string[]) {
    super('SOURCE_CODE', `${message}\n${originalError.message}`, hint);
    this.stack = originalError.stack;
    const hintArray = Array.isArray(hint) ? hint : hint ? [hint] : [];
    const errHint = (originalError as ExpectedError).hint;
    if (errHint) {
      hintArray.push(...(Array.isArray(errHint) ? errHint : [errHint]));
    }
    this.hint = hintArray;
  }
}

export const getReturnableError = (error: ExpectedError | UnexpectedError): Error => {
  const res = new Error();
  delete res.stack;
  res.message = stripAnsi(error.message);
  if (IS_DEV) {
    res.stack = stripAnsi(`[${error.details.errorType}] ${error.message}\n${error.details.prettyStackTrace}`);
  }
  const { sentryEventId, errorType } = error.details;

  const hint = (error as ExpectedError).hint;
  (res as any).details = {
    errorId: sentryEventId,
    errorType,
    hints: hint ? (Array.isArray(hint) ? hint : [hint]) : null
  };
  return res;
};

export const getPrettyStacktrace = (
  error: ExpectedError | UnexpectedError,
  colorizeOwnCode?: (msg: string) => string,
  colorizeDependencyCode?: (msg: string) => string
) => {
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

export const getErrorDetails = (error: UnexpectedError | ExpectedError) => {
  const prettyStackTrace: string = IS_DEV
    ? getPrettyStacktrace(error, (msg) => tuiManager.colorize('cyan', msg))
    : null;
  const originalErrorType = error.name && !error.isExpected ? error.stack.slice(0, error.stack.indexOf(':')) : '';
  const errorType = error.isExpected ? `${(error as ExpectedError).type}_ERROR` : 'UNEXPECTED_ERROR';
  const code = error.isExpected ? `${errorType}_${(error as any).code || 'UNKNOWN_CODE'}` : errorType;
  return {
    prettyStackTrace,
    originalErrorType,
    code,
    errorType,
    sentryEventId: null as string
  };
};

export const attemptToGetUsefulExpectedError = (error: Error) => {
  if (`${error}`.includes('ENOSPC')) {
    return new ExpectedError(
      'DEVICE',
      `There seems to be no space left on the device. Error: ${error}`,
      'Please free up some space on the device and try again.'
    );
  }
  if (
    `${error?.message || error}`.includes(
      'Resource name not set. Make sure to add the resource to the resources object in your config.'
    )
  ) {
    return new ExpectedError(
      'CONFIG_VALIDATION',
      'Resource name not set. Make sure to add the resource to the resources object in your config. The resource name is automatically derived from the object key.',
      'If you create a resource instance, assign it under config.resources (for example resources: { myApi: api }).'
    );
  }
  return null;
};

export const getErrorFromString = (errorString: string) => {
  let [message, ...stackArray] = errorString.split('    at');

  // Stacktape-built image
  if (message.includes('/app/index.js:')) {
    message = message.split('\n\n')[1];
  }

  const stack = stackArray.filter(Boolean).join('    at');
  const error = new Error(message);
  error.stack = `${message}\n    at${stack}`;

  // console.log(error);
  let prettyStacktrace = getPrettyStacktrace(
    error as any,
    (msg) => msg,
    (msg) => tuiManager.colorize('gray', msg)
  );

  if (!prettyStacktrace.endsWith('\n')) {
    prettyStacktrace += '\n';
  }
  if (!message.endsWith('\n')) {
    message += '\n';
  }

  return `\n${tuiManager.makeBold(message)}${prettyStacktrace}`;
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
