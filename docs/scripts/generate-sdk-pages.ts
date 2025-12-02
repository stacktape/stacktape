import type { CommandArg } from '../src/components/Mdx/SdkMethodsApiReference.tsx';
import { join } from 'node:path';
import sdkArgsSchema from '@generated/schemas/sdk-schema.json';
import { camelCase } from 'change-case';
import { readFile, readJson, writeFile } from 'fs-extra';
import { format } from 'prettier';
import { getSortedSdkArgsSchema } from './utils/get-schema';
import { getMdxDescription, getSortedArgs } from './utils/schema-utils';

const userContentSeparatorStart = '{/* WRITE ONLY BELOW THIS LINE */}';
const userContentSeparatorStop = '{/* WRITE ONLY ABOVE THIS LINE */}';

const getExistingWrittenContent = async (filePath: string) => {
  let result = null;
  try {
    const currentContent = await readFile(filePath, { encoding: 'utf8' });
    const [, content] = currentContent.split(userContentSeparatorStart);
    const [c] = content.split(userContentSeparatorStop);
    result = c.trim();
  } catch {
    // do nothing
  }
  return result;
};

const getArgs = (requiredArgs: CommandArg[]) => {
  if (!requiredArgs.length) {
    return '';
  }
  return `{
${requiredArgs
  .map((arg, idx) => `  ${arg.name}: '<<${arg.name}>>'${requiredArgs.length - 1 === idx ? '' : ','}\n`)
  .join('')}}`;
};

const getCommandDescriptionMarkdown = async ({
  method,
  description,
  order,
  pagePath,
  schema
}: {
  method: string;
  description: string;
  order: number;
  pagePath: string;
  schema: any;
}) => {
  const existingWrittenContent = await getExistingWrittenContent(pagePath);
  const sortedArgs = await getSortedArgs(schema[method].args);
  return `---
title: "${camelCase(method)}()"
order: ${order}
nestedTo: /sdk/methods
---

# Overview and basic usage

<br />

${getMdxDescription(description || '')}

<br />

${userContentSeparatorStart}
${existingWrittenContent || ''}
${userContentSeparatorStop}

\`\`\`typescript
import { Stacktape } from 'stacktape';

const stacktape = new Stacktape();

stacktape.${camelCase(method)}(${getArgs(sortedArgs.filter((arg) => arg.required))});
\`\`\`

# API reference

<SdkMethodsApiReference command="${method}" sortedArgs={${JSON.stringify(sortedArgs)}} />
`;
};

export const generateSdkPages = async () => {
  const { overrides, ...otherOpts } = await readJson(join(process.cwd(), '.prettierrc'));
  const prettierOptions = { ...otherOpts, ...overrides.find((o) => o.files === '*.mdx').options };
  const sortedSchema = await getSortedSdkArgsSchema();

  let idx = 0;
  await Promise.all(
    sortedSchema.map(async ({ method, methodSchema }) => {
      const camelCaseMethod = camelCase(method);
      const pagePath = join(process.cwd(), 'docs', 'sdk', 'methods', `${camelCaseMethod}.mdx`);
      const mdxContent = await getCommandDescriptionMarkdown({
        pagePath,
        method,
        description: methodSchema.description,
        order: idx++,
        schema: sdkArgsSchema
      });

      return writeFile(pagePath, await format(mdxContent, { parser: 'mdx', ...prettierOptions }));
    })
  );
  console.info('SDK pages generated successfully');
};

if (import.meta.main) {
  generateSdkPages();
}
