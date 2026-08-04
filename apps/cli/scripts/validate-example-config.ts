/**
 * Validates one or more standalone Stacktape config YAML files against the REAL generated schema.
 * Thin CLI over scripts/code-generation/validate-config-string.ts.
 *
 * Usage:
 *   bun scripts/validate-example-config.ts [--json] <file.yml> [<file2.yml> ...]
 *
 * Exit code 0 if all valid, 1 if any invalid.
 */
import { validateConfigYaml } from './code-generation/validate-config-string';
import { readFile } from 'fs-extra';

const main = async () => {
  const argv = process.argv.slice(2);
  const jsonMode = argv.includes('--json');
  const files = argv.filter((a) => a !== '--json');
  if (files.length === 0) {
    console.error('Usage: bun scripts/validate-example-config.ts [--json] <file.yml> [...]');
    process.exit(2);
  }

  const results = await Promise.all(
    files.map(async (file) => ({ file, ...validateConfigYaml(await readFile(file, 'utf-8')) }))
  );
  const allValid = results.every((r) => r.valid);

  if (jsonMode) {
    console.info(JSON.stringify({ allValid, results }, null, 2));
  } else {
    for (const r of results) {
      if (r.valid) console.info(`OK   ${r.file}`);
      else {
        console.info(`FAIL ${r.file}`);
        for (const e of r.errors) console.info(`       ${e.path}: ${e.message}`);
      }
    }
  }
  process.exit(allValid ? 0 : 1);
};

main();
