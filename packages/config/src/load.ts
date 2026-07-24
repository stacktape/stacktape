import { readFile } from 'node:fs/promises';

import { stacktapeConfigSchema, type StacktapeConfig } from './index.js';

export const loadJsonConfig = async (path: string): Promise<StacktapeConfig> =>
  stacktapeConfigSchema.parse(JSON.parse(await readFile(path, 'utf8')));
