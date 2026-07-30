import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STARTER_PROJECTS_METADATA_FOLDER_NAME, STARTER_PROJECTS_SOURCE_PATH } from 'src/config/project-paths';
import { logInfo, logSuccess, logWarn } from '@scripts/support/logging';
import { getUniqueDuplicates, hasDuplicates } from '@utils/misc';
import { pathExists, remove, writeJson } from 'fs-extra';
import { getAllStarterProjectIds } from './generate-starter-project';
import { getStarterProjectMetadata, prettierFix } from './starter-projects/utils';

type SortableStarterProjectMetadata = {
  priority?: number;
  starterProjectId: string;
};

export const compareStarterProjectMetadata = (
  first: SortableStarterProjectMetadata,
  second: SortableStarterProjectMetadata
) => {
  const priorityDifference = (first.priority ?? 100) - (second.priority ?? 100);
  return (
    priorityDifference ||
    (first.starterProjectId < second.starterProjectId ? -1 : first.starterProjectId > second.starterProjectId ? 1 : 0)
  );
};

export const generateStarterProjectsMetadata = async ({ distFolderPath }: { distFolderPath: string }) => {
  logInfo('Generating starter projects metadata...');
  // await exec('npx', ['prettier', 'starter-projects', '--write'], { disableStdout: true });
  const distPath = join(distFolderPath, STARTER_PROJECTS_METADATA_FOLDER_NAME);
  await remove(distPath);

  // Only folders exposing `.project/_metadata.yml` are publishable starters. In-progress projects
  // (no metadata yet) are skipped so generation never crashes on a half-finished starter.
  const allStarterProjects = await getAllStarterProjectIds();
  const withMetadataFlag = await Promise.all(
    allStarterProjects.map(async (name) => ({
      name,
      hasMetadata: await pathExists(join(STARTER_PROJECTS_SOURCE_PATH, name, '.project', '_metadata.yml'))
    }))
  );
  const starterProjects = withMetadataFlag.filter((p) => p.hasMetadata).map((p) => p.name);
  const skipped = withMetadataFlag.filter((p) => !p.hasMetadata).map((p) => p.name);
  if (skipped.length) {
    logWarn(`Skipping starter projects without .project/_metadata.yml: ${skipped.join(', ')}`);
  }

  const metadata = await Promise.all(
    starterProjects.map(async (starterProjectName) => {
      return getStarterProjectMetadata({ absoluteProjectPath: join(STARTER_PROJECTS_SOURCE_PATH, starterProjectName) });
    })
  );

  const allProjectIds = metadata.map((proj) => proj.starterProjectId);
  if (hasDuplicates(allProjectIds)) {
    throw new Error(`There are duplicate starter names in starter projects: ${getUniqueDuplicates(allProjectIds)}`);
  }
  const sorted = metadata.sort(compareStarterProjectMetadata);

  await writeJson(distPath, sorted, { spaces: 2 });

  await prettierFix({ paths: [distPath] });

  logSuccess(`Successfully generated starter projects metadata to ${distPath}`);
  return distPath;
  // await Promise.all([remove(join(outputDirPath, '.prettierrc')), remove(join(outputDirPath, '.eslintrc'))]);
};

export const checkStarterProjectsMetadata = async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'stacktape-starter-metadata-'));

  try {
    const generatedPath = await generateStarterProjectsMetadata({ distFolderPath: temporaryDirectory });
    const committedPath = join(process.cwd(), STARTER_PROJECTS_METADATA_FOLDER_NAME);
    const [generatedContents, committedContents] = await Promise.all([
      readFile(generatedPath, 'utf8'),
      readFile(committedPath, 'utf8')
    ]);

    if (generatedContents !== committedContents) {
      throw new Error(
        `${STARTER_PROJECTS_METADATA_FOLDER_NAME} is stale. Run the normal workspace generation task and commit the result.`
      );
    }

    logSuccess(`${STARTER_PROJECTS_METADATA_FOLDER_NAME} is current.`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

const main = async () => {
  if (process.argv.includes('--check')) {
    await checkStarterProjectsMetadata();
  } else {
    await generateStarterProjectsMetadata({ distFolderPath: process.cwd() });
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
