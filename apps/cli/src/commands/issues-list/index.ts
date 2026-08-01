import { tuiManager } from '@application-services/tui-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandIssuesList = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { projectName, stage, issueStatus, limit } = args;

  const issues = await apiClient.listIssues({
    project: projectName,
    stage,
    status: issueStatus as 'OPEN' | 'RESOLVED' | 'IGNORED' | undefined,
    limit: limit ?? 25
  });

  if (isAgentMode(args)) {
    tuiManager.info(JSON.stringify(issues, null, 2));
  } else {
    tuiManager.printTable({
      header: ['ID', 'Status', 'Error', 'Type', 'Function', 'Project', 'Stage', 'Count', 'Last seen'],
      rows: issues.map((issue) => [
        issue.id,
        issue.status,
        issue.errorMessage.length > 60 ? `${issue.errorMessage.slice(0, 60)}...` : issue.errorMessage,
        issue.errorType,
        issue.functionName || '-',
        issue.project || '-',
        issue.stage || '-',
        String(issue.occurrenceCount),
        new Date(issue.lastOccurrence).toLocaleString()
      ])
    });
  }

  return issues;
};
