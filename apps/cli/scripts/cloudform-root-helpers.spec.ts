import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLOUDFORM_FOLDER_PATH, CLOUDFORM_ROOT_HELPER_FOLDER_PATH } from 'src/config/project-paths';
import * as prettier from 'prettier';

/** The formatting `gen:cloudform` applies: prettier with the CLI's own `.prettierrc`, the same config the script passes. */
const formatAsGenerationWould = async (text: string, filePath: string) => {
  const options = await prettier.resolveConfig(join(process.cwd(), '.prettierrc'), { editorconfig: false });
  return prettier.format(text, { ...options, filepath: filePath });
};

/**
 * `gen:cloudform` copies the hand-written root helpers into the generated tree and then formats the whole tree,
 * so the committed copies must equal the canonical sources put through the same formatting. Nothing here
 * contacts AWS: the resource modules are generated from a live schema, but the root helpers are not, and this
 * is the only part of that tree with a canonical offline source to compare against.
 */
describe('the committed cloudform root helpers match their canonical sources', () => {
  const helpers = readdirSync(CLOUDFORM_ROOT_HELPER_FOLDER_PATH).filter((file) => file.endsWith('.ts'));

  test('every canonical helper has a committed copy', () => {
    expect(helpers.length).toBeGreaterThan(0);
    for (const helper of helpers) {
      expect(readdirSync(CLOUDFORM_FOLDER_PATH)).toContain(helper);
    }
  });

  test.each(helpers)('%s is byte-identical to its formatted canonical source', async (helper) => {
    const canonical = readFileSync(join(CLOUDFORM_ROOT_HELPER_FOLDER_PATH, helper), 'utf-8');
    const committed = readFileSync(join(CLOUDFORM_FOLDER_PATH, helper), 'utf-8');

    expect(committed).toBe(await formatAsGenerationWould(canonical, helper));
  });

  test('only the two helpers that carry the authored CloudFormation vocabulary changed', () => {
    // The vocabulary move rewired dataTypes.ts and resource.ts to import from @stacktape/config. Every other
    // module in the 2,000+ file generated tree is emitted from the schema and must be untouched by it.
    const importsPackage = readdirSync(CLOUDFORM_FOLDER_PATH)
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => readFileSync(join(CLOUDFORM_FOLDER_PATH, file), 'utf-8').includes('@stacktape/config'));

    expect(importsPackage.sort()).toEqual(['dataTypes.ts', 'resource.ts']);
  });
});
