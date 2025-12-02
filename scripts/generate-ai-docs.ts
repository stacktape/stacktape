import { AI_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { readdir, readFile, writeFile, ensureDir, pathExists, emptyDir } from 'fs-extra';
import { join, dirname, basename, relative } from 'path';

const DOCS_DIR = 'docs/docs';
const TYPES_DIR = 'types';
const CODE_SNIPPETS_DIR = 'docs/code-snippets';
const IGNORED_FOLDERS = ['sdk', 'static'];

const EXCLUDED_FILES = [
  'index.mdx',
  'getting-started/using-config-editor.mdx',
  'getting-started/starter-projects.mdx',
];

const RESOURCE_FOLDERS = [
  'compute-resources',
  'database-resources',
  'other-resources',
  'security-resources',
  '3rd-party-resources',
  'extending',
];

const normalizePath = (p: string): string => p.replace(/\\/g, '/');

const MDX_TO_TYPE_MAPPING: Record<string, string[]> = {
  'compute-resources/functions.mdx': ['stacktape-config/functions.d.ts', 'stacktape-config/events.d.ts'],
  'compute-resources/batch-jobs.mdx': ['stacktape-config/batch-jobs.d.ts', 'stacktape-config/events.d.ts'],
  'compute-resources/web-services.mdx': ['stacktape-config/web-services.d.ts'],
  'compute-resources/worker-services.mdx': ['stacktape-config/worker-services.d.ts'],
  'compute-resources/private-services.mdx': ['stacktape-config/private-services.d.ts'],
  'compute-resources/multi-container-workloads.mdx': ['stacktape-config/multi-container-workloads.d.ts'],
  'compute-resources/edge-lambda-functions.mdx': ['stacktape-config/edge-lambda-functions.d.ts'],
  'compute-resources/nextjs-website.mdx': ['stacktape-config/nextjs-web.d.ts'],
  'database-resources/relational-databases.mdx': ['stacktape-config/relational-databases.d.ts'],
  'database-resources/dynamo-db-tables.mdx': ['stacktape-config/dynamo-db-tables.d.ts'],
  'database-resources/redis-clusters.mdx': ['stacktape-config/redis-cluster.d.ts'],
  'database-resources/open-search-domains.mdx': ['stacktape-config/open-search.d.ts'],
  'security-resources/user-auth-pools.mdx': ['stacktape-config/user-pools.d.ts'],
  'security-resources/bastions.mdx': ['stacktape-config/bastion.d.ts'],
  'security-resources/web-app-firewalls.mdx': ['stacktape-config/web-app-firewall.d.ts'],
  'other-resources/buckets.mdx': ['stacktape-config/buckets.d.ts'],
  'other-resources/hosting-buckets.mdx': ['stacktape-config/hosting-buckets.d.ts'],
  'other-resources/http-api-gateways.mdx': ['stacktape-config/http-api-gateways.d.ts'],
  'other-resources/application-load-balancers.mdx': ['stacktape-config/application-load-balancers.d.ts'],
  'other-resources/network-load-balancers.mdx': ['stacktape-config/network-load-balancer.d.ts'],
  'other-resources/event-buses.mdx': ['stacktape-config/event-buses.d.ts'],
  'other-resources/sqs-queues.mdx': ['stacktape-config/sqs-queues.d.ts'],
  'other-resources/sns-topics.mdx': ['stacktape-config/sns-topic.d.ts'],
  'other-resources/state-machines.mdx': ['stacktape-config/state-machines.d.ts'],
  'other-resources/efs-filesystems.mdx': ['stacktape-config/efs-filesystem.d.ts'],
  'other-resources/deployment-scripts.mdx': ['stacktape-config/deployment-script.d.ts'],
  'other-resources/cdns.mdx': ['stacktape-config/cdn.d.ts'],
  '3rd-party-resources/mongo-db-atlas-clusters.mdx': ['stacktape-config/mongo-db-atlas-clusters.d.ts'],
  '3rd-party-resources/upstash-redises.mdx': ['stacktape-config/upstash-redis.d.ts'],
  'extending/custom-resources.mdx': ['stacktape-config/custom-resources.d.ts'],
  'extending/aws-cdk-constructs.mdx': ['stacktape-config/aws-cdk-construct.d.ts'],
  'configuration/alarms.mdx': ['stacktape-config/alarms.d.ts'],
  'configuration/log-forwarding.mdx': ['stacktape-config/log-forwarding.d.ts'],
};

type Section = {
  title: string;
  content: string;
  level: number;
  slug: string;
  fileName: string;
};

type SectionMapping = Record<string, string>;
const globalSectionMappings: Record<string, SectionMapping> = {};

const getAllMdxFiles = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = normalizePath(relative(DOCS_DIR, fullPath));

    if (entry.isDirectory()) {
      if (!IGNORED_FOLDERS.includes(entry.name)) {
        files.push(...(await getAllMdxFiles(fullPath)));
      }
    } else if (entry.name.endsWith('.mdx')) {
      if (!EXCLUDED_FILES.includes(relativePath)) {
        files.push(relativePath);
      }
    }
  }

  return files;
};

const isResourcePage = (mdxPath: string): boolean => {
  const folder = mdxPath.split('/')[0];
  return RESOURCE_FOLDERS.includes(folder);
};

const loadCodeSnippet = async (embedPath: string): Promise<string> => {
  const snippetPath = join(CODE_SNIPPETS_DIR, embedPath);
  if (await pathExists(snippetPath)) {
    const content = await readFile(snippetPath, 'utf-8');
    const ext = embedPath.split('.').pop() || '';
    const langMap: Record<string, string> = {
      yml: 'yaml',
      yaml: 'yaml',
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      json: 'json',
    };
    const lang = langMap[ext] || ext;
    return `\`\`\`${lang}\n${content.trim()}\n\`\`\``;
  }
  return `<!-- Code snippet not found: ${embedPath} -->`;
};

const processEmbeds = async (content: string): Promise<string> => {
  const embedRegex = /`embed:([^`]+)`/g;
  let result = content;
  const matches = [...content.matchAll(embedRegex)];

  for (const match of matches) {
    const embedPath = match[1];
    const snippet = await loadCodeSnippet(embedPath);
    result = result.replace(match[0], snippet);
  }

  return result;
};

const removeJsxComponents = (content: string): string => {
  const jsxPatterns = [
    /<[A-Z][A-Za-z0-9]*[^>]*\/>/g,
    /<[A-Z][A-Za-z0-9]*[^>]*>[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g,
    /<br\s*\/?>/g,
  ];

  let result = content;
  for (const pattern of jsxPatterns) {
    result = result.replace(pattern, '');
  }

  return result;
};

const removeImageReferences = (content: string): string => {
  return content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/<img[^>]*>/g, '');
};

const removeFrontmatter = (content: string): string => {
  const frontmatterRegex = /^---[\s\S]*?---\n*/;
  return content.replace(frontmatterRegex, '');
};

const cleanContent = (content: string): string => {
  let result = removeFrontmatter(content);
  result = removeJsxComponents(result);
  result = removeImageReferences(result);
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const padNumber = (n: number): string => n.toString().padStart(2, '0');

const parseSections = (content: string): Section[] => {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: { title: string; content: string; level: number } | null = null;
  let contentBeforeFirstHeading: string[] = [];
  let foundFirstHeading = false;
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    if (inCodeBlock) {
      if (currentSection) {
        currentSection.content += line + '\n';
      } else if (!foundFirstHeading) {
        contentBeforeFirstHeading.push(line);
      }
      continue;
    }

    const h1Match = line.match(/^# ([^#\{].*)$/);
    const h2Match = line.match(/^## (.+)$/);

    if (h1Match || h2Match) {
      foundFirstHeading = true;
      if (currentSection) {
        currentSection.content = currentSection.content.trim();
        if (currentSection.content || currentSection.title) {
          sections.push({
            ...currentSection,
            slug: slugify(currentSection.title),
            fileName: '',
          });
        }
      }
      currentSection = {
        title: h1Match ? h1Match[1] : h2Match![1],
        content: '',
        level: h1Match ? 1 : 2,
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    } else if (!foundFirstHeading) {
      contentBeforeFirstHeading.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentSection.content.trim();
    if (currentSection.content || currentSection.title) {
      sections.push({
        ...currentSection,
        slug: slugify(currentSection.title),
        fileName: '',
      });
    }
  }

  if (contentBeforeFirstHeading.length > 0) {
    const introContent = contentBeforeFirstHeading.join('\n').trim();
    if (introContent) {
      sections.unshift({
        title: 'Overview',
        content: introContent,
        level: 0,
        slug: 'overview',
        fileName: '',
      });
    }
  }

  return sections;
};

const loadTypeFile = async (typePath: string): Promise<string> => {
  const fullPath = join(TYPES_DIR, typePath);
  if (await pathExists(fullPath)) {
    let content = await readFile(fullPath, 'utf-8');
    content = content.replace(/^type Stp\w+.*?;$/gm, '');
    content = content.replace(/\n{3,}/g, '\n\n');
    return content.trim();
  }
  return '';
};

const convertLinks = (content: string, currentMdxPath: string, sectionMapping: SectionMapping): string => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  return content.replace(linkRegex, (match, text, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return match;
    }

    let [path, anchor] = url.split('#');

    if (!path && anchor) {
      const targetFile = sectionMapping[anchor];
      if (targetFile) {
        return `[${text}](./${targetFile})`;
      }
      return match;
    }

    if (path) {
      path = path.replace(/\.mdx$/, '');

      if (path.startsWith('/')) {
        const targetMdxPath = path.slice(1) + '.mdx';
        const isTargetResource = isResourcePage(targetMdxPath);
        const newPath = path.slice(1);

        if (isTargetResource) {
          if (anchor) {
            const targetMapping = globalSectionMappings[targetMdxPath];
            if (targetMapping && targetMapping[anchor]) {
              return `[${text}](../../${newPath}/${targetMapping[anchor]})`;
            }
          }
          return `[${text}](../../${newPath}/index.md)`;
        } else {
          return `[${text}](../../${newPath}.md)`;
        }
      }

      if (path.startsWith('../') || path.startsWith('./')) {
        const currentDir = dirname(currentMdxPath);
        const resolvedPath = normalizePath(join(currentDir, path));
        const targetMdxPath = resolvedPath + '.mdx';
        const isTargetResource = isResourcePage(targetMdxPath);

        if (isTargetResource) {
          if (anchor) {
            const targetMapping = globalSectionMappings[targetMdxPath];
            if (targetMapping && targetMapping[anchor]) {
              const relPath = relative(dirname(currentMdxPath), resolvedPath);
              return `[${text}](../${normalizePath(relPath)}/${targetMapping[anchor]})`;
            }
          }
          const relPath = relative(dirname(currentMdxPath), resolvedPath);
          return `[${text}](../${normalizePath(relPath)}/index.md)`;
        } else {
          const relPath = relative(dirname(currentMdxPath), resolvedPath);
          return `[${text}](../${normalizePath(relPath)}.md)`;
        }
      }
    }

    return match;
  });
};

const generateIndexContent = (
  sections: Section[],
  hasApiRef: boolean,
  title: string,
  apiRefFileName: string
): string => {
  let content = `# ${title}\n\n`;
  content += `## Contents\n\n`;

  for (const section of sections) {
    content += `- [${section.title}](./${section.fileName})\n`;
  }

  if (hasApiRef) {
    content += `- [API Reference](./${apiRefFileName})\n`;
  }

  return content;
};

const extractTitle = (content: string, mdxPath: string): string => {
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*"([^"]+)"[\s\S]*?---/);
  if (frontmatterMatch && frontmatterMatch[1].trim()) return frontmatterMatch[1];

  const fileName = basename(mdxPath, '.mdx');
  return fileName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const buildSectionMappings = async (mdxFiles: string[]): Promise<void> => {
  for (const mdxPath of mdxFiles) {
    if (!isResourcePage(mdxPath)) {
      continue;
    }

    const fullMdxPath = join(DOCS_DIR, mdxPath);
    const rawContent = await readFile(fullMdxPath, 'utf-8');
    const processedContent = await processEmbeds(rawContent);
    const cleanedContent = cleanContent(processedContent);

    const sections = parseSections(cleanedContent);
    const typeFiles = MDX_TO_TYPE_MAPPING[mdxPath] || [];
    const hasApiRef = typeFiles.length > 0;

    const filteredSections = sections.filter(s =>
      s.slug !== 'api-reference' && s.slug !== 'referenceable-parameters'
    );

    const nonEmptySections = filteredSections.filter(s => s.content.trim());

    const mapping: SectionMapping = {};
    let idx = 1;

    for (const section of nonEmptySections) {
      const fileName = `${padNumber(idx)}-${section.slug}.md`;
      mapping[section.slug] = fileName;
      idx++;
    }

    if (hasApiRef) {
      const apiFileName = `${padNumber(idx)}-api-reference.md`;
      mapping['api-reference'] = apiFileName;
    }

    globalSectionMappings[mdxPath] = mapping;
  }
};

const processResourcePage = async ({ distFolderPath, mdxPath }: { mdxPath: string, distFolderPath: string }): Promise<void> => {
  const fullMdxPath = join(DOCS_DIR, mdxPath);
  const rawContent = await readFile(fullMdxPath, 'utf-8');
  const title = extractTitle(rawContent, mdxPath);
  const processedContent = await processEmbeds(rawContent);
  const cleanedContent = cleanContent(processedContent);

  const outputDirName = mdxPath.replace('.mdx', '');
  const outputPath = join(distFolderPath, outputDirName);
  await ensureDir(outputPath);

  const sections = parseSections(cleanedContent);
  const typeFiles = MDX_TO_TYPE_MAPPING[mdxPath] || [];
  let apiRefContent = '';

  for (const typeFile of typeFiles) {
    const typeContent = await loadTypeFile(typeFile);
    if (typeContent) {
      apiRefContent += `\n\n// From ${typeFile}\n${typeContent}`;
    }
  }

  const hasApiRef = apiRefContent.trim().length > 0;

  const filteredSections = sections.filter(s =>
    s.slug !== 'api-reference' && s.slug !== 'referenceable-parameters'
  );

  const sectionMapping = globalSectionMappings[mdxPath] || {};

  const nonEmptySections: Section[] = [];
  let idx = 1;
  for (const section of filteredSections) {
    let sectionContent = convertLinks(section.content, mdxPath, sectionMapping);
    sectionContent = sectionContent.trim();

    if (!sectionContent) {
      continue;
    }

    const fileName = `${padNumber(idx)}-${section.slug}.md`;
    section.fileName = fileName;
    const filePath = join(outputPath, fileName);

    const fullContent = `# ${section.title}\n\n${sectionContent}`;
    await writeFile(filePath, fullContent, 'utf-8');
    nonEmptySections.push(section);
    idx++;
  }

  let apiRefFileName = '';
  if (hasApiRef) {
    apiRefFileName = `${padNumber(idx)}-api-reference.md`;
    const apiRefPath = join(outputPath, apiRefFileName);
    const apiRefMd = `# API Reference\n\nTypeScript type definitions for this resource.\n\n\`\`\`typescript\n${apiRefContent.trim()}\n\`\`\``;
    await writeFile(apiRefPath, apiRefMd, 'utf-8');
  }

  const indexContent = generateIndexContent(nonEmptySections, hasApiRef, title, apiRefFileName);
  const indexPath = join(outputPath, 'index.md');
  await writeFile(indexPath, indexContent, 'utf-8');
};

const processSimplePage = async ({ distFolderPath, mdxPath }: { mdxPath: string, distFolderPath: string }): Promise<void> => {
  const fullMdxPath = join(DOCS_DIR, mdxPath);
  const rawContent = await readFile(fullMdxPath, 'utf-8');
  const title = extractTitle(rawContent, mdxPath);
  const processedContent = await processEmbeds(rawContent);
  let cleanedContent = cleanContent(processedContent);

  cleanedContent = convertLinks(cleanedContent, mdxPath, {});

  if (!cleanedContent.trim()) {
    return;
  }

  const outputFileName = mdxPath.replace('.mdx', '.md');
  const outputPath = join(distFolderPath, outputFileName);
  await ensureDir(dirname(outputPath));

  const fullContent = `# ${title}\n\n${cleanedContent}`;
  await writeFile(outputPath, fullContent, 'utf-8');
};

const processMdxFile = async ({ distFolderPath, mdxPath }: { mdxPath: string, distFolderPath: string }): Promise<void> => {
  if (isResourcePage(mdxPath)) {
    await processResourcePage({ distFolderPath, mdxPath });
  } else {
    await processSimplePage({ distFolderPath, mdxPath: mdxPath });
  }
};

const generateMainIndex = async ({ distFolderPath, mdxPaths }: { mdxPaths: string[], distFolderPath: string }): Promise<void> => {
  const categories: Record<string, string[]> = {};

  for (const mdxPath of mdxPaths) {
    const parts = mdxPath.split('/');
    if (parts.length > 1) {
      const category = parts[0];
      if (!categories[category]) categories[category] = [];
      categories[category].push(mdxPath);
    } else {
      if (!categories['general']) categories['general'] = [];
      categories['general'].push(mdxPath);
    }
  }

  const categoryOrder = [
    'getting-started',
    'configuration',
    'compute-resources',
    'database-resources',
    'other-resources',
    'security-resources',
    '3rd-party-resources',
    'extending',
    'cli',
    'user-guides',
    'general',
  ];

  let content = `# Stacktape Documentation

This is the official documentation for Stacktape - a deployment platform for AWS.

## How to use this documentation

- Each category below contains links to topic directories
- Each topic directory has an \`index.md\` with a table of contents
- Files are numbered (01-, 02-, etc.) to indicate reading order
- Most resource topics include an \`api-reference.md\` with TypeScript type definitions
- Links between documents use relative paths

## Quick reference

- **Getting started**: Start with \`getting-started/basics\` for initial setup
- **Resources**: Compute, database, and other AWS resources are in their respective categories
- **Configuration**: Packaging, scripts, hooks, and other config options
- **CLI**: Command reference for the Stacktape CLI
- **Extending**: How to use custom CloudFormation resources and CDK constructs

`;

  const sortedCategories = Object.keys(categories).sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a);
    const bIdx = categoryOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  for (const category of sortedCategories) {
    const files = categories[category];
    const categoryTitle = category === 'general' ? 'General' : category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    content += `## ${categoryTitle}\n\n`;

    for (const file of files.sort()) {
      const displayName = basename(file, '.mdx').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (isResourcePage(file)) {
        const dirName = file.replace('.mdx', '');
        content += `- [${displayName}](./${dirName}/index.md)\n`;
      } else {
        const fileName = file.replace('.mdx', '.md');
        content += `- [${displayName}](./${fileName})\n`;
      }
    }
    content += '\n';
  }

  await writeFile(join(distFolderPath, 'index.md'), content, 'utf-8');
};

export const generateAiDocs = async ({ distFolderPath }: { distFolderPath?: string }) => {
  logInfo('Generating AI documentation...');

  await ensureDir(distFolderPath);
  await emptyDir(distFolderPath);

  const mdxFiles = await getAllMdxFiles(DOCS_DIR);
  logInfo(`Found ${mdxFiles.length} MDX files`);

  await buildSectionMappings(mdxFiles);

  for (const mdxFile of mdxFiles) {
    await processMdxFile({ distFolderPath, mdxPath: mdxFile });
  }

  await generateMainIndex({ distFolderPath, mdxPaths: mdxFiles });

  logSuccess(`Done! Generated documentation in ${distFolderPath}/`);
};

if (import.meta.main) {
  generateAiDocs({ distFolderPath: AI_DOCS_FOLDER_PATH });
}
