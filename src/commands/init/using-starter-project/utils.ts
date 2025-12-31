import { join } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY } from '@config';
import { sortObjectKeys } from '@shared/utils/misc';
import { copy, outputFile, readJson, readJSON, writeJson } from 'fs-extra';
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

const addPrettierrc = async ({ distPath, metadata }: { distPath: string; metadata: StarterProjectMetadata }) => {
  const { projectType } = metadata;
  if (projectType === 'es') {
    await writeJson(
      distPath,
      {
        printWidth: 120,
        singleQuote: true,
        endOfLine: 'auto' as const,
        semi: true,
        trailingComma: 'es5' as const,
        tabWidth: 2,
        useTabs: false
      },
      { spaces: 2 }
    );
  }
};

export const adjustPackageJson = async ({
  absoluteProjectPath,
  metadata,
  shouldAddEslintPrettier
}: {
  absoluteProjectPath: string;
  metadata: StarterProjectMetadata;
  shouldAddEslintPrettier: boolean;
}) => {
  const { hasReact, hasPrisma, hasNextJs } = metadata;
  const packageJsonPath = join(absoluteProjectPath, 'package.json');
  const packageJson = await readJson(packageJsonPath, { encoding: 'utf8' });
  const { dependencies, devDependencies, scripts, workspaces } = packageJson;

  const eslintPrettierDeps = {
    '@typescript-eslint/eslint-plugin': '^8.15.0',
    '@typescript-eslint/parser': '^8.15.0',
    eslint: '^9.16.0',
    ...(hasReact
      ? {
          '@eslint/eslintrc': '^3.2.0',
          'eslint-plugin-react': '^7.37.2',
          'eslint-plugin-jsx-a11y': '^6.10.2',
          'eslint-plugin-react-hooks': '^5.0.0'
        }
      : {}),
    ...(hasNextJs
      ? {
          '@next/eslint-plugin-next': '^15.1.0',
          'eslint-config-next': '^15.1.0'
        }
      : {}),
    'eslint-plugin-import': '^2.31.0',
    '@eslint/js': '^9.16.0',
    'typescript-eslint': '^8.15.0',
    prettier: '^3.3.3'
  };

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
    scripts: {
      ...scripts,
      ...(shouldAddEslintPrettier && {
        lint: 'npx eslint .',
        format: 'npx prettier . --write'
      })
    },
    dependencies: sortObjectKeys({
      ...(dependencies || {}),
      ...(hasPrisma && {
        '@prisma/client': '^6.7.0'
      })
    }),
    devDependencies: sortObjectKeys({
      ...(devDependencies || {}),
      '@stacktape/sdk': '^2.5.0',
      '@types/node': '^22.10.1',
      typescript: '^5.7.2',
      ...(hasReact && { '@types/react': '^19.1.0', '@types/react-dom': '^19.1.0' }),
      ...(hasPrisma && { prisma: '^6.7.0' }),
      ...(shouldAddEslintPrettier ? eslintPrettierDeps : {})
    })
  };

  return writeJson(packageJsonPath, content, { spaces: 2 });
};

const addEslintConfig = async ({ distPath, metadata }: { distPath: string; metadata: StarterProjectMetadata }) => {
  const { hasReact, hasNextJs } = metadata;

  const configContent = `import js from '@eslint/js';
import tseslint from 'typescript-eslint';
${hasReact ? "import react from 'eslint-plugin-react';\nimport reactHooks from 'eslint-plugin-react-hooks';\nimport jsxA11y from 'eslint-plugin-jsx-a11y';" : ''}${hasNextJs ? "\nimport nextPlugin from '@next/eslint-plugin-next';" : ''}

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ${
    hasReact
      ? `
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,${hasNextJs ? "\n      '@next/next': nextPlugin," : ''}
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,${hasNextJs ? '\n      ...nextPlugin.configs.recommended.rules,' : ''}
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'react/jsx-props-no-spreading': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/function-component-definition': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },`
      : ''
  }${
    hasNextJs && !hasReact
      ? `
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },`
      : ''
  }
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', args: 'after-used', ignoreRestSiblings: true }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      curly: ['warn', 'all'],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'dir', 'time', 'clear'] }],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  }
);`;

  await outputFile(distPath, configContent);
};

export const promptAddEslintPrettier = async () => {
  const { shouldAdd } = await tuiManager.prompt({
    type: 'confirm',
    name: 'shouldAdd',
    message: 'Add linting and code formatting? (eslint and prettier).'
  });
  return shouldAdd;
};

export const addEslintPrettier = async ({
  absoluteProjectPath,
  metadata
}: {
  metadata: StarterProjectMetadata;
  absoluteProjectPath: string;
}) => {
  await Promise.all([
    addEslintConfig({ distPath: join(absoluteProjectPath, 'eslint.config.js'), metadata }),
    addPrettierrc({ distPath: join(absoluteProjectPath, '.prettierrc'), metadata })
  ]);
};

export const promptTargetDirectory = async (): Promise<string> => {
  const targetDirectory = await tuiManager.promptText({
    message: 'Where to create the project?',
    description: `(Use "." for current directory. Default: "${DEFAULT_STARTER_PROJECT_TARGET_DIRECTORY}"):`
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
