import { basename, join, sep } from 'node:path';
import { STARTER_PROJECTS_SOURCE_PATH } from '@shared/naming/project-fs-paths';
import { exec } from '@shared/utils/exec';
import { copy, readFile, writeFile, writeJson } from 'fs-extra';
import sortBy from 'lodash/sortBy';
import removeMarkdown from 'markdown-to-text';
import { parse as parseYaml } from 'yaml';
import { addEslintPrettier, addTsConfig, adjustPackageJson } from '../../src/commands/init/using-starter-project/utils';
import { addReadme, getProjectMdx } from './starters-mdx';

const IGNORED_FILES = [
  'yarn.lock',
  'package-lock.json',
  '.stacktape',
  '.stacktape-stack-info',
  'node_modules',
  'yarn-error.log',
  '.project',
  'README.md'
];

const prettierFix = ({ paths }: { paths: string[] }) => {
  return exec(
    'npx',
    ['prettier', ...paths, '--write', '--config', 'scripts/starter-projects/starters-prettierrc.json'],
    {
      disableStdout: true
    }
  );
};

export const prepareStarterProject = async ({
  starterProjectId,
  outputDirPath,
  mode,
  addLinting = false
}: {
  starterProjectId: string;
  outputDirPath: string;
  mode: 'github' | 'app';
  addLinting?: boolean;
}) => {
  const absoluteProjectPath = join(STARTER_PROJECTS_SOURCE_PATH, starterProjectId);
  const metadata: StarterProjectMetadata = await getStarterProjectMetadata({ absoluteProjectPath });
  const distFolderPath = join(outputDirPath, metadata.starterProjectId);

  await copy(absoluteProjectPath, distFolderPath, {
    filter: (src: string) => {
      return !IGNORED_FILES.includes(basename(src));
    }
  });
  const mdxDescription = await getProjectMdx(metadata, absoluteProjectPath);
  await Promise.all([
    mode === 'app' && writeJson(join(outputDirPath, metadata.starterProjectId, '.metadata.json'), metadata),
    addReadme({ distPath: join(outputDirPath, metadata.starterProjectId, 'README.md'), metadata, mode, mdxDescription })
  ]);

  if (metadata.projectType === 'es' && !metadata.hasOwnTsConfig) {
    await addTsConfig({ absoluteProjectPath: distFolderPath, metadata });
  }
  const shouldAddLinting = addLinting && !metadata.disableLintingOption;

  if (metadata.projectType === 'es') {
    await Promise.all([
      adjustPackageJson({
        absoluteProjectPath: distFolderPath,
        metadata,
        shouldAddEslintPrettier: shouldAddLinting
      }),
      shouldAddLinting && addEslintPrettier({ absoluteProjectPath: distFolderPath, metadata })
    ]);
  }
  await prettierFix({
    paths: [`${distFolderPath}/**/*.{js,jsx,ts,tsx,json,yml,md}`, ...(shouldAddLinting ? ['.eslintrc.json'] : [])]
  });
  return metadata;
};

const fixedPricingResources = {
  'multi-container-workload': 9,
  'private-service': 9,
  'web-service': 9,
  'worker-service': 9,
  'application-load-balancer': 16,
  'relational-database': 13
};

const getProjectMonthlyAwsCosts = (resourceTypes: UsedResourceData[]) => {
  let res = 0;
  for (const resource of resourceTypes) {
    res += fixedPricingResources[resource.type] || 0;
  }
  return res;
};

export const getStarterProjectMetadata = async ({
  absoluteProjectPath
}: {
  absoluteProjectPath: string;
}): Promise<StarterProjectMetadata> => {
  const [projectMetadataFileContent, mdxDescription] = await Promise.all([
    readFile(join(absoluteProjectPath, '.project', '_metadata.yml'), {
      encoding: 'utf8'
    }),
    readFile(join(absoluteProjectPath, '.project', 'description.md'), {
      encoding: 'utf8'
    })
  ]);
  const metadata: RawStarterProjectMetadata = await parseYaml(projectMetadataFileContent);
  const folderName = absoluteProjectPath.split(sep).slice(-1)[0];
  let projectType: 'es' | 'java' | 'ruby' | 'python' | 'go';
  if (metadata.tags.includes('Typescript') || metadata.tags.includes('Javascript')) {
    projectType = 'es';
  }
  if (metadata.tags.includes('Python')) {
    projectType = 'python';
  }
  if (metadata.tags.includes('Ruby')) {
    projectType = 'ruby';
  }
  if (metadata.tags.includes('Java')) {
    projectType = 'java';
  }
  if (metadata.tags.includes('Golang')) {
    projectType = 'go';
  }

  const { usedResources } = await getUsedResources({
    templatePath: join(absoluteProjectPath, 'stacktape.yml')
  });
  const usedResourceTypes = usedResources
    .map((r) => r.type)
    .filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

  const isWebsite = metadata.tags.includes('website');
  const isSpaWebsite = metadata.tags.includes('SPA website');
  const isStaticWebsite = metadata.tags.includes('static website');
  const hasPrisma = metadata.tags.includes('Prisma');
  const hasTypescript = metadata.tags.includes('Typescript');
  const hasNextJs = metadata.tags.includes('Next.js');
  const hasReact = metadata.tags.includes('React');
  const isRestApi = metadata.tags.includes('REST API');
  const hasCognito = metadata.tags.includes('Authentication');
  const isServerSideRenderedWebsite = metadata.tags.includes('Server side rendered website');
  const priority = metadata.priority === undefined ? 100 : metadata.priority;
  const monthlyAwsCosts = getProjectMonthlyAwsCosts(usedResources);

  return {
    ...metadata,
    starterProjectId: folderName,
    projectType,
    usedResources,
    usedResourceTypes,
    isServerSideRenderedWebsite,
    githubLink: `https://github.com/stacktape/starter-${folderName}`,
    isWebsite,
    isSpaWebsite,
    isStaticWebsite,
    hasPrisma,
    hasNextJs,
    hasTypescript,
    hasReact,
    isRestApi,
    monthlyAwsCosts,
    priority,
    hasCognito,
    description: removeMarkdown(mdxDescription)
  };
};

const getUsedResources = async ({
  templatePath
}: {
  templatePath: string;
}): Promise<{ usedResources: UsedResourceData[] }> => {
  const templateFileContents = await readFile(templatePath, { encoding: 'utf8' });
  const template = await parseYaml(templateFileContents);

  const usedResources = sortBy(
    Object.entries(template.resources).map(([name, resource]: [string, StacktapeResourceDefinition]) => {
      return {
        name,
        type: resource.type,
        containerNames:
          resource.type === 'multi-container-workload' ? resource.properties.containers.map((c) => c.name) : []
      };
    }),
    ['type']
  );
  return { usedResources };
};

export const replacePlaceholdersInStacktapeConfig = async ({ configPath }: { configPath: string }) => {
  const replacements = {
    '<<your-upstash-account-email>>': 'simon.obetko@stacktape.com',
    '<<your-upstash-api-key>>': "$Secret('upstash-api-key')",
    '<<your-mongodb-public-key>>': 'vsnrksqa',
    '<<your-mongodb-private-key>>': "$Secret('mongoFullAccessPrivateKey')",
    '<<your-mongodb-organization-id>>': '6027241119807a593cbe63dd'
  };

  let fileContents = await readFile(configPath, { encoding: 'utf8' });

  Object.entries(replacements).forEach(([key, value]) => {
    fileContents = fileContents.replace(key, value);
  });

  await writeFile(configPath, fileContents);
};
