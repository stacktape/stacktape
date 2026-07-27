import { join } from 'node:path';
import { PACK_GENERATED_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { exec } from '@shared/utils/exec';
import { logInfo } from '@shared/utils/logging';
import { outputFile } from 'fs-extra';

export const generatePackBuildersJson = async () => {
  const { stdout: trustedBuildersCommandResult } = await exec('pack', ['config', 'trusted-builders', 'list'], {
    disableStdout: true
  });
  const trustedBuilders = trustedBuildersCommandResult
    .split('\n')
    .slice(1)
    .map((builder) => builder.trim());

  const buildersInfo = (
    await Promise.all(
      trustedBuilders.map((builder) =>
        exec('pack', ['builder', 'inspect', builder, '--output', 'json'], { disableStdout: true })
      )
    )
  ).map(({ stdout }) => JSON.parse(stdout));
  const result = {};
  buildersInfo.forEach(({ builder_name: builderName, remote_info: remoteInfo }) => {
    result[builderName] = remoteInfo.buildpacks;
  });
  return result;
};

const generatePackBuilderJsonFile = async () => {
  logInfo('generating pack builders info');
  const result = await generatePackBuildersJson();
  await outputFile(join(PACK_GENERATED_FOLDER_PATH, 'builders.json'), JSON.stringify(result));
};

if (import.meta.main) {
  generatePackBuilderJsonFile();
}
