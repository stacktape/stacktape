import { tuiManager } from '@application-services/tui-manager';
import { initializeControlPlaneOperation } from '../_utils/initialization';
import { formatAsciiTable } from '@application-services/tui-manager/format/blocks';

const printOperations = ({
  operations
}: {
  operations: Array<{
    id: string;
    command?: string | null;
    projectName?: string | null;
    stackName?: string | null;
    stage?: string | null;
    region?: string | null;
    createdAt?: Date | string;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    success?: boolean | null;
    inProgress?: boolean | null;
    description?: string | null;
  }>;
}) => {
  if (operations.length === 0) {
    tuiManager.printLines([tuiManager.colorize('gray', 'No operations found.')]);
    return;
  }

  const header = ['Command', 'Project', 'Stage', 'Region', 'Status', 'Time'];

  const rows = operations.map((op) => {
    let status: string;
    if (op.inProgress) {
      status = tuiManager.colorize('yellow', 'IN_PROGRESS');
    } else if (op.success === true) {
      status = tuiManager.colorize('green', 'SUCCESS');
    } else if (op.success === false) {
      status = tuiManager.colorize('red', 'FAILED');
    } else {
      status = tuiManager.colorize('gray', 'UNKNOWN');
    }

    const time = op.createdAt ? new Date(op.createdAt).toLocaleString() : 'N/A';

    return [
      op.command || 'N/A',
      op.projectName || 'N/A',
      op.stage ? tuiManager.colorize('cyan', op.stage) : 'N/A',
      op.region || 'N/A',
      status,
      time
    ];
  });

  const allLines = formatAsciiTable(header, rows);

  const failedOps = operations.filter((op) => op.success === false && op.description);
  if (failedOps.length > 0) {
    allLines.push('', tuiManager.makeBold('Error Details:'));
    for (const op of failedOps) {
      allLines.push(`  ${tuiManager.colorize('red', `[${op.command}]`)} ${op.projectName}-${op.stage}:`);
      const descLines = (op.description || '').split('\n').slice(0, 5);
      for (const line of descLines) {
        allLines.push(`    ${tuiManager.colorize('gray', line)}`);
      }
      if ((op.description || '').split('\n').length > 5) {
        allLines.push(`    ${tuiManager.colorize('gray', '...(truncated)')}`);
      }
    }
  }

  tuiManager.printLines(allLines);
};

export const commandInfoOperations = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { currentUserOnly, projectName, stage, limit } = args;

  const activity = await apiClient.organizationActivity({
    currentUserOnly,
    projectName,
    stage,
    pageSize: limit ?? 25
  });

  printOperations({ operations: activity.items });

  return activity;
};
