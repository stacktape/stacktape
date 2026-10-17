import fsExtra from 'fs-extra';

/**
 * Bun gives errors of callback-style `fs` functions no stack at all, and fs-extra is built on them, so a failing
 * `ensureDir` or `readJson` reached error tracking without any trace of the code that called it. Each
 * promise-returning fs-extra function is wrapped to record its caller's stack and give it to a stackless rejection.
 * The stack is recorded when the function is called, because capturing it after an `await` loses every caller that
 * returned the promise instead of awaiting it. Only calls into fs-extra's exports pay for it (about a microsecond),
 * not the file operations fs-extra makes internally.
 *
 * The release and dev bundles resolve every fs-extra import to one copy (`fs-extra-single-copy-plugin.ts`), so
 * wrapping its exports covers the internal packages as well.
 */
export const addCallerStacksToFileErrors = () => {
  const exports = fsExtra as unknown as Record<string, unknown>;
  for (const [name, original] of Object.entries(exports)) {
    if (typeof original !== 'function' || !/^[a-z]/.test(name) || name.endsWith('Sync') || isWrapped(original)) {
      continue;
    }
    const wrapped = function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      if (!(result instanceof Promise)) return result;
      // A real error: `Error.captureStackTrace` on a plain object throws under some `Error.prepareStackTrace` hooks.
      const callSite = new Error();
      return result.catch((error: unknown) => {
        addCallSite(error, callSite.stack);
        throw error;
      });
    };
    // Keeps attached members such as `realpath.native` and `util.promisify.custom`.
    for (const key of Reflect.ownKeys(original)) {
      if (!['length', 'name', 'prototype', 'arguments', 'caller'].includes(key as string)) {
        Object.defineProperty(wrapped, key, Object.getOwnPropertyDescriptor(original, key)!);
      }
    }
    wrappedFunctions.add(wrapped);
    exports[name] = wrapped;
  }
};

const wrappedFunctions = new WeakSet<object>();
const isWrapped = (value: object) => wrappedFunctions.has(value);

const hasStackFrames = (stack: unknown) => typeof stack === 'string' && /\n\s+at /.test(stack);

/** Gives a stackless error the frames of `callSiteStack`, without its header and the wrapper's own frame. */
const addCallSite = (error: unknown, callSiteStack: string | undefined) => {
  if (!(error instanceof Error) || hasStackFrames(error.stack) || !callSiteStack) return;
  try {
    error.stack = [`${error.name}: ${error.message}`, ...callSiteStack.split('\n').slice(2)].join('\n');
  } catch {
    // A frozen error keeps its message; the stack only helps.
  }
};
