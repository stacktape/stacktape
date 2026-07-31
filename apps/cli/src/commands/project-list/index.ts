import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { formatAsciiTable } from '@application-services/tui-manager/format/blocks';

const printProjects = ({
  projects
}: {
  projects: Array<{
    id: string;
    name: string;
    stages: Array<{
      stage: string;
      status: string;
      deploymentIsInProgress: boolean;
      isErrored: boolean;
      lastUpdateTime: number;
      thisMonthCosts: { currencyCode: string; total: number };
      previousMonthCosts: { currencyCode: string; total: number };
    }>;
    undeployedStages: Array<{ name?: string; [key: string]: any }>;
  }>;
}) => {
  if (projects.length === 0) {
    tuiManager.printLines([tuiManager.colorize('gray', 'No projects found.')]);
    return;
  }

  for (const project of projects) {
    const lines: string[] = [tuiManager.makeBold(`Project: ${tuiManager.colorize('cyan', project.name)}`)];

    if (project.stages.length === 0 && project.undeployedStages.length === 0) {
      lines.push(`  ${tuiManager.colorize('gray', 'No stages')}`, '');
      tuiManager.printLines(lines);
      continue;
    }

    if (project.stages.length > 0) {
      const header = ['Stage', 'Status', 'Last Updated', 'This Month', 'Prev Month'];
      const rows = project.stages.map((s) => {
        let statusDisplay = s.status;
        if (s.deploymentIsInProgress) {
          statusDisplay = tuiManager.colorize('yellow', 'IN_PROGRESS');
        } else if (s.isErrored) {
          statusDisplay = tuiManager.colorize('red', 'ERRORED');
        } else if (s.status?.includes('COMPLETE')) {
          statusDisplay = tuiManager.colorize('green', s.status);
        }

        const formatCost = (cost: { currencyCode: string; total: number }) =>
          cost.total > 0 ? `${cost.total.toFixed(2)} ${cost.currencyCode}` : tuiManager.colorize('gray', '$0.00');

        return [
          tuiManager.colorize('cyan', s.stage),
          statusDisplay,
          s.lastUpdateTime ? new Date(s.lastUpdateTime).toLocaleString() : 'N/A',
          formatCost(s.thisMonthCosts),
          formatCost(s.previousMonthCosts)
        ];
      });
      lines.push(...formatAsciiTable(header, rows));
    }

    if (project.undeployedStages.length > 0) {
      lines.push(
        `  ${tuiManager.colorize('gray', 'Undeployed stages:')} ${project.undeployedStages.map((s) => s.name).join(', ')}`
      );
    }

    lines.push('');
    tuiManager.printLines(lines);
  }
};

export const commandProjectList = async () => {
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
      const currencyCode =
        project.stages.find((stage) => stage.thisMonthCosts?.currencyCode)?.thisMonthCosts?.currencyCode || 'USD';
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
    tuiManager.printLines(['']);
  }

  printProjects({ projects: sortedProjects });

  return sortedProjects;
};
