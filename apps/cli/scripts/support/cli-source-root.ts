import { resolve } from 'node:path';

/** The directory of this package, which holds the source CLI's own files. */
export const CLI_SOURCE_ROOT = resolve(import.meta.dir, '..', '..');

// `scripts/dev.ts` imports this first, before any module computes a path from it. The source CLI then finds its own
// files here instead of in the current directory, so it runs from a project directory like the installed CLI. Child
// processes it starts, such as the dev agent, inherit the variable.
process.env.STP_CLI_SOURCE_ROOT = CLI_SOURCE_ROOT;
