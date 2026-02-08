/**
 * Generates CLI reference documentation from command definitions.
 *
 * Run with: bun docs/scripts/generate-cli-docs.ts
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { commandDefinitions, type StacktapeCommand } from '../../src/config/cli/commands';
import { argAliases } from '../../src/config/cli/options';

const CLI_DOCS_DIR = join(__dirname, '../_new-docs/cli');

// Extract description from Zod schema
const getOptionDescription = (schema: any): string => {
  if (!schema) return '';
  const desc = schema.description || schema._def?.description || '';
  // Extract just the first paragraph (after the header)
  const lines = desc.split('\n').filter((l: string) => l.trim() && !l.startsWith('####') && l !== '---');
  return lines.join(' ').trim();
};

// Get the type from Zod schema
const getOptionType = (schema: any): string => {
  if (!schema) return 'string';
  const typeName = schema._def?.typeName;
  if (typeName === 'ZodEnum') return schema._def.values.map((v: string) => `\`${v}\``).join(' | ');
  if (typeName === 'ZodBoolean') return 'boolean';
  if (typeName === 'ZodNumber') return 'number';
  if (typeName === 'ZodArray') return 'string[]';
  if (typeName === 'ZodOptional') return getOptionType(schema._def.innerType);
  return 'string';
};

// Convert command name to title
const commandToTitle = (cmd: string): string => cmd;

// Convert command name to filename
const commandToFilename = (cmd: string): string => cmd.replace(/:/g, '-');

// Generate MDX content for a command
const generateCommandDoc = (cmd: StacktapeCommand, order: number): string => {
  const def = commandDefinitions[cmd];
  const args = def.args as Record<string, any>;
  const requiredArgs = def.requiredArgs as readonly string[];

  // Build options table
  const optionRows: string[] = [];
  for (const [name, schema] of Object.entries(args)) {
    const isRequired = requiredArgs.includes(name);
    const alias = argAliases[name as keyof typeof argAliases];
    const aliasStr = alias ? ` (-${alias})` : '';
    const type = getOptionType(schema);
    const desc = getOptionDescription(schema);
    const shortDesc = desc.length > 100 ? desc.substring(0, 97) + '...' : desc;
    optionRows.push(`| \`--${name}\`${aliasStr} | ${isRequired ? 'Yes' : 'No'} | ${type} | ${shortDesc} |`);
  }

  const optionsTable =
    optionRows.length > 0
      ? `## Options

| Option | Required | Type | Description |
|--------|----------|------|-------------|
${optionRows.join('\n')}`
      : '';

  // Build usage example
  const requiredFlags = requiredArgs
    .filter((arg) => arg !== 'resourceName' && arg !== 'scriptName' && arg !== 'paramName')
    .map((arg) => `--${arg} <${arg}>`)
    .join(' ');

  const content = `---
title: '${commandToTitle(cmd)}'
order: ${order}
---

# ${cmd}

${def.description}

## Usage

\`\`\`bash
stacktape ${cmd}${requiredFlags ? ' ' + requiredFlags : ''}
\`\`\`

${optionsTable}
`;

  return content;
};

// Generate index page
const generateIndexDoc = (): string => {
  const commands = Object.keys(commandDefinitions) as StacktapeCommand[];

  // Group commands by category
  const categories: Record<string, StacktapeCommand[]> = {
    Core: ['deploy', 'delete', 'dev', 'logs'],
    'Stack Management': [
      'stack:info',
      'stack:list',
      'rollback',
      'preview-changes',
      'compile-template',
      'package-workloads'
    ],
    Secrets: ['secret:create', 'secret:get', 'secret:delete'],
    'AWS Profiles': ['aws-profile:create', 'aws-profile:list', 'aws-profile:update', 'aws-profile:delete'],
    'Sessions & Tunnels': ['bastion:session', 'bastion:tunnel', 'container:session'],
    Scripts: ['script:run', 'deployment-script:run'],
    Configuration: ['defaults:configure', 'defaults:list', 'init'],
    Utilities: ['bucket:sync', 'domain:add', 'cf-module:update', 'param:get'],
    Account: ['login', 'logout', 'upgrade', 'version', 'help']
  };

  let categorySections = '';
  for (const [category, cmds] of Object.entries(categories)) {
    const validCmds = cmds.filter((cmd) => commandDefinitions[cmd]);
    if (validCmds.length === 0) continue;

    const rows = validCmds
      .map((cmd) => {
        const def = commandDefinitions[cmd];
        const firstLine = def.description.split('\n')[0];
        return `| [${cmd}](/cli/${commandToFilename(cmd)}) | ${firstLine} |`;
      })
      .join('\n');

    categorySections += `### ${category}

| Command | Description |
|---------|-------------|
${rows}

`;
  }

  return `---
title: 'CLI Reference'
order: 1
---

# CLI Reference

The Stacktape CLI is your primary interface for deploying and managing infrastructure.

## Installation

\`\`\`bash
# macOS/Linux
curl -L https://install.stacktape.com | bash

# Windows (PowerShell)
iwr https://install.stacktape.com/win | iex

# npm (alternative)
npm install -g stacktape
\`\`\`

## Getting Help

\`\`\`bash
# List all commands
stacktape help

# Get help for a specific command
stacktape help deploy
\`\`\`

## Commands

${categorySections}

## Common Options

Most commands accept these options:

| Option | Alias | Description |
|--------|-------|-------------|
| \`--stage\` | \`-s\` | Environment name (dev, staging, production) |
| \`--region\` | \`-r\` | AWS region (us-east-1, eu-west-1, etc.) |
| \`--configPath\` | \`-cp\` | Path to config file |
| \`--profile\` | \`-p\` | AWS profile to use |
| \`--logLevel\` | \`-ll\` | Log verbosity (debug, info, error) |
| \`--help\` | \`-h\` | Show help for a command |

## Environment Variables

| Variable | Description |
|----------|-------------|
| \`STACKTAPE_API_KEY\` | API key for CI/CD (alternative to \`stacktape login\`) |
| \`AWS_PROFILE\` | Default AWS profile |
| \`AWS_REGION\` | Default AWS region |
`;
};

async function main() {
  // Ensure directory exists
  await mkdir(CLI_DOCS_DIR, { recursive: true });

  // Generate index
  const indexContent = generateIndexDoc();
  await writeFile(join(CLI_DOCS_DIR, 'index.mdx'), indexContent);
  console.log('Generated: cli/index.mdx');

  // Generate individual command docs
  const commands = Object.keys(commandDefinitions) as StacktapeCommand[];
  let order = 2;

  for (const cmd of commands) {
    const content = generateCommandDoc(cmd, order);
    const filename = `${commandToFilename(cmd)}.mdx`;
    await writeFile(join(CLI_DOCS_DIR, filename), content);
    console.log(`Generated: cli/${filename}`);
    order++;
  }

  console.log(`\nGenerated ${commands.length + 1} CLI documentation files.`);
}

main().catch(console.error);
