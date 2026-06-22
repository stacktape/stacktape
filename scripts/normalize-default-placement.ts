/**
 * Ensures every JSDoc `@default <value>` tag is the LAST line of its comment block.
 *
 * `typescript-json-schema` treats all text AFTER a `@default` tag as that tag's value. So if an
 * embedded example (or any prose) follows `@default`, it gets swallowed into the `default` field
 * (corrupting the default, dropping the example from `description`, and flattening indentation).
 * Keeping `@default` last avoids this. Run after inserting examples; idempotent.
 *
 * Usage: bun scripts/normalize-default-placement.ts <file.d.ts> [...]
 */
import { readFile, writeFile } from 'fs-extra';

const relocateDefault = (block: string[]): string[] => {
  const defaultIdx = block.findIndex((l) => /^\s*\*\s*@default\s+\S/.test(l));
  if (defaultIdx === -1) return block;
  const closingIdx = block.length - 1; // the `*/` line
  if (defaultIdx >= closingIdx - 1) return block; // already last content line
  const defaultLine = block[defaultIdx];
  const indent = defaultLine.match(/^(\s*)\*/)?.[1] ?? '   ';
  const without = block.filter((_, i) => i !== defaultIdx);
  const newClosingIdx = without.length - 1;
  without.splice(newClosingIdx, 0, `${indent}*`, defaultLine);
  return without;
};

const fixContent = (content: string): string => {
  const lines = content.split('\n');
  const out: string[] = [];
  let block: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inBlock && trimmed.startsWith('/**') && !trimmed.endsWith('*/')) {
      inBlock = true;
      block = [line];
      continue;
    }
    if (inBlock) {
      block.push(line);
      if (trimmed.endsWith('*/')) {
        out.push(...relocateDefault(block));
        inBlock = false;
        block = [];
      }
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
};

const main = async () => {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: bun scripts/normalize-default-placement.ts <file.d.ts> [...]');
    process.exit(2);
  }
  let changed = 0;
  for (const file of files) {
    const before = await readFile(file, 'utf-8');
    const after = fixContent(before);
    if (after !== before) {
      await writeFile(file, after, 'utf-8');
      changed += 1;
      console.info(`fixed ${file}`);
    } else {
      console.info(`ok    ${file}`);
    }
  }
  console.info(`\n${changed} file(s) changed.`);
};

main();
