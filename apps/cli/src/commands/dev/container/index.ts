import type { EnrichedCwContainerProps } from '@domain-services/packaging-manager/types';
import type { Spinner } from '@application-services/tui-manager';
import type { PackagingOutput } from '@stacktape/packaging/runtime-contracts';
import { tuiManager } from '@application-services/tui-manager';
import { packagingManager } from '@domain-services/packaging-manager';

type PrepareImageOptions = {
  isRepackage?: boolean;
  /** External spinner to use (for parallel operations). If not provided, creates its own spinner. */
  spinner?: Spinner;
};

type PrepareImageResult = {
  imageName: string;
  sourceFiles: string[];
  distFolderPath?: string;
  /** Final message from packaging (e.g., "Container image · 343 MB") */
  details?: string;
};

export const prepareImage = async (
  { jobName, workloadName, packaging, resources }: EnrichedCwContainerProps,
  options: PrepareImageOptions = {}
): Promise<PrepareImageResult> => {
  if (packaging.type === 'prebuilt-image') {
    return { imageName: packaging.properties.image, sourceFiles: [] };
  }

  const { isRepackage, spinner: externalSpinner } = options;

  // Use external spinner if provided (for parallel operations), otherwise create our own
  const spinnerText = isRepackage ? 'Re-packaging container' : 'Packaging container';
  const spinner = externalSpinner || tuiManager.createSpinner({ text: spinnerText });
  const progressLogger = tuiManager.createSpinnerProgressLogger(spinner, jobName);

  const { imageName, sourceFiles, distFolderPath } = (await packagingManager.packageWorkload({
    packaging,
    target: 'container',
    jobName,
    workloadName,
    commandCanUseCache: false,
    dockerBuildOutputArchitecture: packagingManager.getTargetCpuArchitectureForContainer(resources),
    customProgressLogger: progressLogger,
    devMode: true
  })) as PackagingOutput;

  const details = progressLogger.getLastFinalMessage();

  // Only complete the spinner if we created it ourselves
  if (!externalSpinner) {
    spinner.success({ details });
  }

  return { imageName, sourceFiles: sourceFiles.map(({ path }) => path), distFolderPath, details };
};
