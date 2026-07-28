import { readFileSync } from 'node:fs';
import { CONFIG_BRIDGE_PATH, CONFIG_PACKAGE_SRC_PATH } from '@shared/naming/project-fs-paths';
import { logSuccess } from '@shared/utils/logging';
import { buildConfigBridge, readPackageDeclarations } from './generate-config-bridge';

/**
 * `generate:check` for the committed ambient bridge: is the file on disk what the generator would write?
 *
 * Deliberately side-effect-free and cheap — no CLI program, no schema. The full migration metric lives in
 * `check-config-bridge.ts`, which builds a TypeScript program and is too slow for the ordinary task graph.
 */
const declarations = readPackageDeclarations(CONFIG_PACKAGE_SRC_PATH);
if (readFileSync(CONFIG_BRIDGE_PATH, 'utf-8') !== buildConfigBridge(declarations)) {
  throw new Error('The committed @stacktape/config bridge is stale. Run `bun run gen:config:bridge`.');
}
logSuccess(`The committed config bridge is current (${declarations.length} declarations).`);
