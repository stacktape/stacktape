/* eslint-disable antfu/no-top-level-await */
import { generateStarterProject } from './scripts/generate-starter-project';
import yargsParser from 'yargs-parser';

const args = yargsParser(process.argv);

await generateStarterProject({
  starterProjectId: args.starterProjectId,
  outputDirPath: './starter',
  mode: 'github',
  log: true
});
