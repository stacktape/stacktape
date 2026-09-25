import type { StacktapeCommand } from '../../config/cli/commands';
import type { RunStacktapeResult } from './cli-jsonl-runner';
import { getCliCommandPolicy, prepareCliRun, type PreparedCliRun } from './cli-command-tools';
import { buildCliRunOutput, clampInteger, type ToolOutput } from './tool-output';

export type IncidentToolInput = {
  action: 'show' | 'list';
  incidentId?: string;
  projectName?: string;
  stage?: string;
  status?: 'ACTIVE' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ALL';
  limit?: number;
};

const INCIDENT_FOLLOW_UP = [
  'Diagnose from this context. Read logs, metrics, alarms, info:stack and reviewed AWS reads (aws:call) with stacktape_cli action=run; read-only commands run directly, without a plan or confirmation.',
  'Run the stacktape commands the handoff mentions through stacktape_cli, not Bash. Report the likely cause, its evidence, what is still uncertain and a recommended next action; a deploy, rollback or resolve is for the user to decide.'
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The CLI command behind each action: the same `incidents:show` and `incidents` a person runs, with their auth. */
export const prepareIncidentRun = (input: IncidentToolInput): PreparedCliRun => {
  if (input.action === 'show') {
    const incidentId = input.incidentId?.trim();
    if (!incidentId) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Missing required argument for stacktape_incident action=show: incidentId',
        nextActions: ['Find the ID with stacktape_incident action=list, or take it from the Console URL or Slack card.']
      };
    }
    return prepareCliRun({ command: 'incidents:show', args: { incidentId } });
  }

  return prepareCliRun({
    command: 'incidents',
    args: {
      ...(input.projectName ? { projectName: input.projectName } : {}),
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.status ? { incidentStatus: input.status } : {}),
      limit: clampInteger({ value: input.limit, defaultValue: 25, min: 1, max: 100 })
    }
  });
};

const MAX_LISTED_SIGNAL_KINDS = 5;
// Compact JSON of the listed incidents. The pretty-printed MCP envelope around it stays well under its 30,000-character
// limit, so a full page of long titles is trimmed to its newest incidents instead of failing as too large.
const LIST_CHARACTER_BUDGET = 16_000;

/** A list entry says how many signals there are and of which kinds; action=show has the signals themselves. */
const summarizeSignals = (signals: unknown) => {
  const records = Array.isArray(signals) ? signals.filter(isRecord) : [];
  return {
    total: records.length,
    active: records.filter(({ state }) => state === 'ACTIVE').length,
    kinds: [...new Set(records.map(({ kind }) => String(kind)))].slice(0, MAX_LISTED_SIGNAL_KINDS)
  };
};

const summarizeIncident = (incident: Record<string, unknown>) => ({
  id: incident.id,
  status: incident.status,
  severity: incident.severity,
  title: incident.title,
  project: incident.project,
  stage: incident.stage,
  openedAt: incident.openedAt,
  ...(incident.resolvedAt ? { resolvedAt: incident.resolvedAt, resolveReason: incident.resolveReason } : {}),
  ...(incident.deploymentVersion ? { deploymentVersion: incident.deploymentVersion } : {}),
  signals: summarizeSignals(incident.signals)
});

/** The newest incidents that fit the budget; the Console lists them newest first. */
const fitToBudget = (summaries: ReturnType<typeof summarizeIncident>[]) => {
  const listed: typeof summaries = [];
  let size = 0;
  for (const summary of summaries) {
    size += JSON.stringify(summary).length;
    if (size > LIST_CHARACTER_BUDGET) break;
    listed.push(summary);
  }
  return listed;
};

export const buildIncidentToolOutput = ({
  command,
  args,
  result
}: {
  command: StacktapeCommand;
  args: Record<string, unknown>;
  result: RunStacktapeResult;
}): ToolOutput => {
  // The CLI's final agent record carries the command's own return value as `data.result`.
  const commandResult = result.data?.result;
  if (result.ok && command === 'incidents:show' && isRecord(commandResult)) {
    if (typeof commandResult.markdown === 'string') {
      return {
        ok: true,
        code: 'OK',
        message: `Context of incident ${String(args.incidentId)}, for diagnosis.`,
        data: { incidentId: args.incidentId, format: 'markdown', content: commandResult.markdown },
        nextActions: INCIDENT_FOLLOW_UP
      };
    }
  }
  if (result.ok && command === 'incidents' && Array.isArray(commandResult)) {
    const summaries = commandResult.filter(isRecord).map(summarizeIncident);
    const incidents = fitToBudget(summaries);
    const omitted = summaries.length - incidents.length;
    return {
      ok: true,
      code: 'OK',
      message: omitted
        ? `Found ${summaries.length} incident(s); listing the ${incidents.length} newest.`
        : `Found ${summaries.length} incident(s).`,
      data: { incidents, ...(omitted ? { omitted } : {}) },
      nextActions: [
        'Call stacktape_incident action=show with an incident id for its full context.',
        ...(omitted
          ? [
              'The list always starts from the newest. To reach the others, narrow it with projectName, stage or status.'
            ]
          : [])
      ]
    };
  }
  if (result.ok) {
    // The CLI succeeded but did not return what this tool reads: an empty context would look like a quiet incident.
    return {
      ok: false,
      code: 'AGENT_PROTOCOL_ERROR',
      message: `stacktape ${command} completed without the expected ${command === 'incidents' ? 'incident list' : 'incident handoff'}.`
    };
  }
  return buildCliRunOutput({ result, command, policy: getCliCommandPolicy(command) });
};
