/**
 * YAML gate: extracts every ```yaml example embedded in the given Stacktape type files and validates
 * each against the REAL generated schema. Proves the YAML examples that live in *.d.ts are 100% valid.
 *
 * Usage:
 *   bun scripts/validate-examples-in-types.ts <file.d.ts> [...]      # specific files
 *   bun scripts/validate-examples-in-types.ts                        # all types/stacktape-config/*.d.ts
 *   bun scripts/validate-examples-in-types.ts --json ...
 *
 * Exit code 0 if every example is valid, 1 otherwise.
 */
import { extractFencedExamples } from './code-generation/extract-examples';
import { validateConfigYaml } from './code-generation/validate-config-string';
import fastGlob from 'fast-glob';
import { readFile } from 'fs-extra';

const main = async () => {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes('--json');
  let files = argv.filter((a) => a !== '--json');
  if (files.length === 0) files = await fastGlob('types/stacktape-config/*.d.ts');

  const examples = [];
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    examples.push(...extractFencedExamples(file, content).filter((e) => e.lang === 'yaml'));
  }

  const results = examples.map((ex) => ({ ...ex, ...validateConfigYaml(ex.code) }));
  const failures = results.filter((r) => !r.valid);

  if (jsonMode) {
    console.info(JSON.stringify({ total: results.length, failed: failures.length, failures }, null, 2));
  } else {
    const byFile = new Map<string, number>();
    for (const r of results) byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1);
    for (const [file, count] of byFile) console.info(`  ${file}: ${count} yaml examples`);
    console.info(
      `\nTotal: ${results.length} yaml examples, ${results.length - failures.length} valid, ${failures.length} invalid.`
    );
    for (const f of failures) {
      console.info(`\nFAIL ${f.file}:${f.line}  (property: ${f.property})`);
      for (const e of f.errors) console.info(`     ${e.path}: ${e.message}`);
      console.info(
        f.code
          .split('\n')
          .map((l) => `       | ${l}`)
          .join('\n')
      );
    }
  }
  process.exit(failures.length === 0 ? 0 : 1);
};

main();
