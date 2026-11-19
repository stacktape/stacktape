import type { ChildStdioMode } from '@utils/exec';

export const resolveScriptStdioMode = (properties: { stdioMode?: ChildStdioMode }): ChildStdioMode =>
  properties.stdioMode ?? 'capture';
