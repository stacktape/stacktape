/**
 * Records the scan facts the wizard fixture replays.
 *
 * The facts are real probe output for real repositories, read without an agent, so the fixture shows what a first
 * run on that repository actually shows. Rerun after a probe change that should be visible in the wizard:
 *
 *   bun scripts/init-wizard-fixture/record-facts.ts <name> <repository-directory>
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runGreenfieldMission } from '../../src/init/missions/greenfield';
import { createRailpackPlanner } from '../../src/init/railpack-planner';

const [name, repositoryRoot] = process.argv.slice(2);
if (name === undefined || repositoryRoot === undefined) {
  throw new Error('Usage: record-facts.ts <name> <repository-directory>');
}

const result = await runGreenfieldMission({
  repositoryRoot,
  projectName: name,
  planner: createRailpackPlanner(repositoryRoot)
});
const target = join(import.meta.dir, 'projects', `${name}.json`);
await writeFile(target, `${JSON.stringify(result.facts, null, 2)}\n`);
console.log(`Wrote ${target}`);
