/** Per-resource create durations and the stack's wall time from CloudFormation events. bun stack-timeline.ts <stage>. */
import { CloudFormationClient, paginateDescribeStackEvents } from '@aws-sdk/client-cloudformation';
import { REGION, record, stackName } from './lib';
const stage = process.argv[2];
const cf = new CloudFormationClient({ region: REGION });
const events = [];
for await (const page of paginateDescribeStackEvents({ client: cf }, { StackName: stackName(stage) })) events.push(...(page.StackEvents ?? []));
events.reverse();
const t = (e) => e.Timestamp.getTime();
const start = new Map<string, number>();
const rows: { id: string; type: string; s: number; e: number; d: number }[] = [];
const t0 = t(events[0]);
for (const e of events) {
  if (e.ResourceStatus?.endsWith('IN_PROGRESS') && !start.has(e.LogicalResourceId)) start.set(e.LogicalResourceId, t(e));
  if (e.ResourceStatus?.endsWith('COMPLETE') && start.has(e.LogicalResourceId) && e.LogicalResourceId !== stackName(stage)) {
    const s = start.get(e.LogicalResourceId);
    rows.push({ id: e.LogicalResourceId, type: e.ResourceType, s: (s - t0) / 1000, e: (t(e) - t0) / 1000, d: (t(e) - s) / 1000 });
    start.delete(e.LogicalResourceId);
  }
}
const stackEvents = events.filter((e) => e.LogicalResourceId === stackName(stage)).map((e) => `${e.ResourceStatus}@${((t(e) - t0) / 1000).toFixed(0)}s`);
console.log(stage, 'stack events:', stackEvents.join(' '));
for (const r of rows.sort((a, b) => b.d - a.d).slice(0, Number(process.argv[3] ?? 14))) console.log(`${r.d.toFixed(0).padStart(5)}s  [${r.s.toFixed(0)}→${r.e.toFixed(0)}]  ${r.id} (${r.type})`);
record(`stack-timeline-${stage}.jsonl`, { stackEvents, rows });
