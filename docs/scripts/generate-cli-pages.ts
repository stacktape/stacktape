import { join } from 'node:path';
import cliArgsSchema from '@generated/schemas/cli-schema.json';
import fsExtra from 'fs-extra';
import { format } from 'prettier';
import { getSortedCliArgsSchema } from './utils/get-schema';
import { getMdxDescription, getSortedArgs } from './utils/schema-utils';

const { readFile, readJson, writeFile } = fsExtra;

const userContentSeparatorStart = '{/* WRITE ONLY BELOW THIS LINE */}';
const userContentSeparatorStop = '{/* WRITE ONLY ABOVE THIS LINE */}';

const getExistingWrittenContent = async (filePath) => {
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

const getCommandDescriptionMarkdown = async ({
  command,
  description,
  requiredOptions,
  order,
  pagePath,
  cliArgsSchema
}) => {
  const existingWrittenContent = await getExistingWrittenContent(pagePath);
  const sortedArgs = await getSortedArgs(cliArgsSchema[command].args);

  return `---
title: "${command}"
order: ${order}
nestedTo: /cli/commands
---

# Overview and basic usage

${getMdxDescription(description)}

${userContentSeparatorStart}
${existingWrittenContent || ''}
${userContentSeparatorStop}

\`\`\`bash
stacktape ${command} ${requiredOptions.map((opt) => `--${opt} <<${opt}>>`).join(' ')}
\`\`\`

# API reference

<CliCommandsApiReference command="${command}" sortedArgs={${JSON.stringify(sortedArgs)}} />
`;
};

export const generateCliPages = async () => {
  const { overrides, ...otherOpts } = await readJson(join(process.cwd(), '.prettierrc'));
  const prettierOptions = { ...otherOpts, ...overrides.find((o) => o.files === '*.mdx').options };
  const sortedSchema = await getSortedCliArgsSchema();

  let idx = 0;
  await Promise.all(
    sortedSchema.map(async ({ command, commandSchema }) => {
      const pagePath = join(process.cwd(), 'docs', 'cli', 'commands', `${command.replaceAll(':', '-')}.mdx`);
      const requiredOptions = [];
      for (const [opt, schema] of Object.entries(commandSchema.args as Record<string, any>)) {
        if (schema.required) {
          requiredOptions.push(opt);
        }
      }
      const mdxContent = await getCommandDescriptionMarkdown({
        pagePath,
        command,
        description: commandSchema.description,
        order: idx++,
        requiredOptions,
        cliArgsSchema
      });

      return writeFile(pagePath, await format(mdxContent, { parser: 'mdx', ...prettierOptions }));
    })
  );
  console.info('CLI pages generated successfully');
};

if (import.meta.main) {
  generateCliPages().catch(console.error);
}
