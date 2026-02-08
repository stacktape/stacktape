import { join } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY } from '@config';
import { sortObjectKeys } from '@shared/utils/misc';
import { copy, readJson, readJSON, writeJson } from 'fs-extra';
import sortBy from 'lodash/sortBy';

export const getAvailableStartersMetadata = async ({
  startersMetadataFilePath
}: {
  startersMetadataFilePath: string;
}) => {
  // const dirContents = (await readdir(startersDirectory)).filter((f) => f !== '.DS_store');
  // const res = await Promise.all(
  //   dirContents.map(async (item) => {
  //     const metadata: StarterProjectMetadata = await readJson(join(startersDirectory, item, '.metadata.json'));
  //     return metadata;
  //   })
  // );
  const startersMetadata: StarterProjectMetadata[] = await readJSON(startersMetadataFilePath);
  return sortBy(startersMetadata, ['projectType', 'isWebsite']);
};

export const copyProject = ({ distPath, projectPath }: { projectPath: string; distPath: string }) => {
  return copy(projectPath, distPath, {
    filter: (filePath) => {
      return !filePath.endsWith('.metadata.json');
    }
  });
};

export const adjustPackageJson = async ({
  absoluteProjectPath,
  metadata
}: {
  absoluteProjectPath: string;
  metadata: StarterProjectMetadata;
}) => {
  const { hasPrisma } = metadata;
  const packageJsonPath = join(absoluteProjectPath, 'package.json');
  const packageJson = await readJson(packageJsonPath, { encoding: 'utf8' });
  const { dependencies, devDependencies, scripts, workspaces } = packageJson;

  const content = {
    name: metadata.starterProjectId,
    version: '1.0.0',
    private: true,
    ...(packageJson.type && { type: packageJson.type }),
    ...(workspaces && { workspaces }),
    bugs: {
      url: 'https://github.com/stacktape/stacktape/issues'
    },
    author: 'Stacktape team <info@stacktape.com> (https://stacktape.com)',
    scripts: { ...scripts },
    dependencies: sortObjectKeys({
      ...(dependencies || {}),
      ...(hasPrisma && { '@prisma/client': '^6.7.0' })
    }),
    devDependencies: sortObjectKeys({
      stacktape: '^3.4.0',
      ...(devDependencies || {})
    })
  };

  return writeJson(packageJsonPath, content, { spaces: 2 });
};

export const promptTargetDirectory = async (): Promise<string> => {
  const targetDirectory = await tuiManager.promptText({
    message: `Where to create the project? ${tuiManager.colorize('gray', '(use "." for current directory)')}`,
    placeholder: DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY,
    defaultValue: DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY
  });
  return targetDirectory === '' ? DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY : targetDirectory;
};

export const addTsConfig = async ({
  metadata,
  absoluteProjectPath
}: {
  metadata: StarterProjectMetadata;
  absoluteProjectPath: string;
}) => {
  const { hasTypescript, isWebsite, hasReact, hasNextJs } = metadata;

  if (hasTypescript) {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2023', ...(isWebsite || metadata.tags.includes('Puppeteer') ? ['DOM', 'DOM.Iterable'] : [])],
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: false,
        noEmit: true,
        strict: true,
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        allowJs: true,
        resolveJsonModule: true,
        declaration: false,
        declarationMap: false,
        sourceMap: true,
        incremental: true,
        removeComments: false,
        ...(hasReact ? { jsx: 'preserve' } : {}),
        ...(hasNextJs && { plugins: [{ name: 'next' }] })
      },
      include: ['**/*.ts', '**/*.d.ts', '**/*.tsx', ...(hasNextJs ? ['.next/types/**/*.ts'] : [])],
      exclude: ['node_modules', 'dist', 'build']
    };
    await writeJson(join(absoluteProjectPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
  }
};
