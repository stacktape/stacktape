import type { BuildDockerImage } from '../runtime-contracts';
import { dirname, relative } from 'node:path';
import { remove } from 'fs-extra';
import { createTemporaryBuildFile } from '../fs/temporary-file';

/**
 * Builds an image from a generated Dockerfile without placing that Dockerfile in the image context.
 *
 * Every Stacktape image Dockerfile uses broad COPY instructions. Keeping the generated file outside
 * the context prevents it from being copied into the customer image and avoids stale files and
 * collisions when multiple builds share a context.
 */
export const buildGeneratedDockerImage = async ({
  dockerfileContents,
  buildContextPath,
  buildDockerImage,
  ...buildOptions
}: Parameters<BuildDockerImage>[0] & {
  dockerfileContents: string;
  buildDockerImage: BuildDockerImage;
}) => {
  const { filePath } = await createTemporaryBuildFile({
    contents: dockerfileContents,
    directoryPath: dirname(buildContextPath),
    prefix: 'stp-image-',
    suffix: '.Dockerfile'
  });
  let buildResult:
    | { succeeded: true; value: Awaited<ReturnType<BuildDockerImage>> }
    | { succeeded: false; error: unknown };
  try {
    buildResult = {
      succeeded: true,
      value: await buildDockerImage({
        ...buildOptions,
        buildContextPath,
        dockerfilePath: relative(buildContextPath, filePath)
      })
    };
  } catch (error) {
    buildResult = { succeeded: false, error };
  }
  try {
    await remove(filePath);
  } catch (cleanupError) {
    if (buildResult.succeeded) {
      throw cleanupError;
    }
  }
  if ('error' in buildResult) {
    throw buildResult.error;
  }
  return buildResult.value;
};
