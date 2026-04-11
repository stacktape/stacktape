import { readFile } from 'fs-extra';
import { glob } from 'glob';
import { join } from 'node:path';
import { getBackboneSections } from './backbones';
import type { ContextPack, PageDefinition } from './types';

const docsRoot = join(import.meta.dir, '..', '..');

const safeReadFile = async (filePath: string) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
};

const unique = <T,>(items: T[]) => [...new Set(items)];

export const buildContextPack = async ({ page }: { page: PageDefinition }): Promise<ContextPack> => {
  const structurePlan = (await safeReadFile(join(docsRoot, 'DOCS_STRUCTURE_PLAN.md'))) || '';
  const pipelinePlan = (await safeReadFile(join(docsRoot, 'DOCS_PIPELINE_PLAN.md'))) || '';

  const globMatches = await Promise.all((page.sourceGlobs || []).map((pattern) => glob(pattern, { absolute: true })));
  const sourceFiles = unique([...(page.sourceFiles || []), ...globMatches.flat()]);
  const sourceDocuments = (
    await Promise.all(
      sourceFiles.map(async (filePath) => {
        const content = await safeReadFile(filePath);
        if (!content) {
          return null;
        }
        return { filePath, content };
      })
    )
  ).filter(Boolean) as ContextPack['sourceDocuments'];

  return {
    page,
    structurePlan,
    pipelinePlan,
    backboneSections: getBackboneSections(page.template),
    sourceDocuments
  };
};
