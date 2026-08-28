import type { ChildStdioMode } from '@utils/exec';

export const resolveScriptStdioMode = (properties: {
  stdioMode?: ChildStdioMode;
  pipeStdio?: boolean;
}): ChildStdioMode => properties.stdioMode ?? (properties.pipeStdio === false ? 'ignore' : 'capture');
