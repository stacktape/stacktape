import { initializePackageOperation } from '../_utils/initialization';

export const commandPackage = async () => {
  const {
    args: { onlyWorkloads },
    stackContext,
    services: { packaging, tui }
  } = await initializePackageOperation();

  const workloadsList = onlyWorkloads?.length ? ` (${onlyWorkloads.join(', ')})` : '';
  const spinner = tui.createSpinner({ text: `Packaging compute resources${workloadsList}` });

  const packagedWorkloads = await packaging.packageAllWorkloads({
    commandCanUseCache: false,
    onlyWorkloads
  });

  spinner.success({
    text: `Packaged compute resources${workloadsList} for stack ${tui.prettyStackName(stackContext.stackName)}`
  });

  return packagedWorkloads;
};
