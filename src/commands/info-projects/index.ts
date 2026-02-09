import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';

export const commandInfoProjects = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });
  const projects = await stacktapeTrpcApiManager.apiClient.projectsWithStages();

  const sortedProjects = [...projects].sort((projectA, projectB) => {
    const latestA = Math.max(0, ...projectA.stages.map((stage) => stage.lastUpdateTime || 0));
    const latestB = Math.max(0, ...projectB.stages.map((stage) => stage.lastUpdateTime || 0));
    if (latestA !== latestB) {
      return latestB - latestA;
    }
    return projectA.name.localeCompare(projectB.name);
  });

  if (sortedProjects.length > 0) {
    const summaryHeader = ['Project', 'Stages', 'In Progress', 'Errored', 'This Month', 'Prev Month'];
    const summaryRows = sortedProjects.map((project) => {
      const inProgressCount = project.stages.filter((stage) => stage.deploymentIsInProgress).length;
      const erroredCount = project.stages.filter((stage) => stage.isErrored).length;
      const thisMonthTotal = project.stages.reduce((sum, stage) => sum + (stage.thisMonthCosts?.total || 0), 0);
      const prevMonthTotal = project.stages.reduce((sum, stage) => sum + (stage.previousMonthCosts?.total || 0), 0);
      const currencyCode = project.stages.find((stage) => stage.thisMonthCosts?.currencyCode)?.thisMonthCosts?.currencyCode || 'USD';
      const formatCost = (value: number) =>
        value > 0 ? `${value.toFixed(2)} ${currencyCode}` : tuiManager.colorize('gray', `0.00 ${currencyCode}`);

      return [
        tuiManager.colorize('cyan', project.name),
        `${project.stages.length + project.undeployedStages.length} (${project.stages.length} deployed)`,
        inProgressCount > 0 ? tuiManager.colorize('yellow', `${inProgressCount}`) : '0',
        erroredCount > 0 ? tuiManager.colorize('red', `${erroredCount}`) : '0',
        formatCost(thisMonthTotal),
        formatCost(prevMonthTotal)
      ];
    });

    tuiManager.printTable({ header: summaryHeader, rows: summaryRows });
    console.info('');
  }

  tuiManager.printProjects({ projects: sortedProjects });

  return sortedProjects;
};
