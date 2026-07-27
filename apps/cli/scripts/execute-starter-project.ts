import { join } from 'node:path';
import { exec } from '@shared/utils/exec';
import { getRelativePath } from '@shared/utils/fs-utils';
import { logInfo } from '@shared/utils/logging';
import kleur from 'kleur';
import yargsParser from 'yargs-parser';
import { generateStarterProject } from './generate-starter-project';
import { replacePlaceholdersInStacktapeConfig } from './starter-projects/utils';

const args = yargsParser(process.argv);

export const executeStarterProject = async ({
  outputDirPath,
  command = 'deploy',
  starterProjectName
}: {
  outputDirPath: string;
  command: string;
  starterProjectName: string;
}) => {
  if (!args.stage) {
    console.error('Error:', kleur.red('--stage is missing'));
    process.exit(1);
  }

  const { projectDistPath } = await generateStarterProject({
    outputDirPath,
    starterProjectId: starterProjectName
  });
  const configPath = join(projectDistPath, 'stacktape.yml');

  await replacePlaceholdersInStacktapeConfig({ configPath });

  logInfo(`Executing command ${command} on starter project at ${projectDistPath}.`);

  await exec(
    'bun',
    [
      'dev',
      command,
      '--cp',
      getRelativePath(configPath),
      '--region',
      'eu-west-1',
      '--stage',
      args.stage,
      ...(args.profile ? ['--profile', args.profile] : [])
    ],
    {}
  );
};

if (import.meta.main) {
  executeStarterProject({
    starterProjectName: args.spn,
    // must be config-dependent command
    command: args.cmd,
    outputDirPath: join(process.cwd(), '__starter-projects')
  }).catch(console.error);
}
