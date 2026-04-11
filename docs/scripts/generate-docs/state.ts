import { ensureDir, pathExists, readJson, writeJson, writeFile } from 'fs-extra';
import { dirname, join } from 'node:path';
import type { PipelineState } from './types';

const stateRoot = join(import.meta.dir, '.state');

export const getStatePath = ({ pageId }: { pageId: string }) => join(stateRoot, `${pageId}.json`);

export const loadState = async ({ pageId }: { pageId: string }) => {
  const filePath = getStatePath({ pageId });
  if (!(await pathExists(filePath))) {
    return null;
  }
  return (await readJson(filePath)) as PipelineState;
};

export const saveState = async ({ state }: { state: PipelineState }) => {
  const filePath = getStatePath({ pageId: state.pageId });
  await ensureDir(dirname(filePath));
  await writeJson(filePath, state, { spaces: 2 });
};

export const saveIterationDraft = async ({ pageId, iteration, draft }: { pageId: string; iteration: number; draft: string }) => {
  const filePath = join(stateRoot, pageId, `iteration-${iteration}.mdx`);
  await ensureDir(dirname(filePath));
  await writeFile(filePath, draft);
  return filePath;
};
