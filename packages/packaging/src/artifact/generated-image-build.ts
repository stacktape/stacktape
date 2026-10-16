import type { BuildDockerImage } from '../runtime-contracts';
import { dirname, relative } from 'node:path';
import { remove } from 'fs-extra';
import { createPrivateBuildFile } from '../fs/temporary-file';

/**
 * The images a Dockerfile starts its stages from, without references to its own earlier stages and `scratch`. Only for
 * Dockerfiles Stacktape writes: it reads plain `FROM image [AS name]` lines and does not expand build arguments.
 */
export const getDockerfileBaseImages = (dockerfileContents: string): string[] => {
  const stages = new Set<string>(['scratch']);
  const images = new Set<string>();
  for (const [, image, stage] of dockerfileContents.matchAll(
    /^FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/gim
  )) {
    if (image && !stages.has(image.toLowerCase())) images.add(image);
    if (stage) stages.add(stage.toLowerCase());
  }
  return [...images];
};

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
  buildFileDirectoryPath,
  ...buildOptions
}: Parameters<BuildDockerImage>[0] & {
  dockerfileContents: string;
  buildDockerImage: BuildDockerImage;
  /**
   * Where the generated file is written; the directory above the context by default. A caller whose context is the
   * customer's own source directory passes a directory Stacktape owns, so nothing is written into (or above) the
   * project.
   */
  buildFileDirectoryPath?: string | undefined;
}) => {
  const { directoryPath, filePath } = await createPrivateBuildFile({
    contents: dockerfileContents,
    parentDirectoryPath: buildFileDirectoryPath ?? dirname(buildContextPath),
    prefix: 'stp-image-',
    fileName: 'Dockerfile'
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
        dockerfilePath: relative(buildContextPath, filePath),
        // A Railpack plan is JSON, not a Dockerfile: its caller names the images the plan starts from.
        baseImages: buildOptions.baseImages ?? getDockerfileBaseImages(dockerfileContents)
      })
    };
  } catch (error) {
    buildResult = { succeeded: false, error };
  }
  try {
    await remove(directoryPath);
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
