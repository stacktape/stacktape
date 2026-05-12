import { createHash } from 'node:crypto';
import { buildContextPack } from './context';
import { loadState } from './state';
import type { ContextPack, PageDefinition, PipelineState } from './types';

const hashContent = (content: string): string => createHash('sha1').update(content).digest('hex');

export const computeInputHashes = (contextPack: ContextPack): { inputHashes: Record<string, string>; styleGuideHash: string } => {
  const inputHashes: Record<string, string> = {};
  for (const doc of contextPack.sourceDocuments) {
    inputHashes[doc.filePath] = hashContent(doc.content);
  }
  return {
    inputHashes,
    styleGuideHash: hashContent(contextPack.styleGuide || '')
  };
};

export type StalenessReport = {
  status: 'fresh' | 'stale' | 'no-baseline' | 'never-passed';
  changedFiles: string[];
  removedFiles: string[];
  newFiles: string[];
  styleGuideChanged: boolean;
};

const buildReport = ({ state, current }: { state: PipelineState; current: ReturnType<typeof computeInputHashes> }): StalenessReport => {
  const stored = state.inputHashes || {};
  const changedFiles: string[] = [];
  const removedFiles: string[] = [];
  const newFiles: string[] = [];

  for (const [filePath, hash] of Object.entries(current.inputHashes)) {
    const storedHash = stored[filePath];
    if (storedHash === undefined) {
      newFiles.push(filePath);
    } else if (storedHash !== hash) {
      changedFiles.push(filePath);
    }
  }
  for (const filePath of Object.keys(stored)) {
    if (current.inputHashes[filePath] === undefined) {
      removedFiles.push(filePath);
    }
  }

  const styleGuideChanged = state.styleGuideHash !== undefined && state.styleGuideHash !== current.styleGuideHash;
  const isStale = changedFiles.length > 0 || removedFiles.length > 0 || newFiles.length > 0 || styleGuideChanged;

  return {
    status: isStale ? 'stale' : 'fresh',
    changedFiles,
    removedFiles,
    newFiles,
    styleGuideChanged
  };
};

export const detectStaleness = async ({ page }: { page: PageDefinition }): Promise<StalenessReport> => {
  const state = await loadState({ pageId: page.id });
  if (!state || !state.completedAt) {
    return {
      status: 'never-passed',
      changedFiles: [],
      removedFiles: [],
      newFiles: [],
      styleGuideChanged: false
    };
  }
  if (!state.inputHashes) {
    // Page passed before input-hash tracking was introduced. Treat as needing a baseline so the
    // user knows to regenerate; once it does, the new state will carry hashes.
    return {
      status: 'no-baseline',
      changedFiles: [],
      removedFiles: [],
      newFiles: [],
      styleGuideChanged: false
    };
  }
  const contextPack = await buildContextPack({ page });
  const current = computeInputHashes(contextPack);
  return buildReport({ state, current });
};
