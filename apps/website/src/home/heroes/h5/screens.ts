import {
  CHECKS,
  COSTS,
  DEPLOY_FACTS,
  DEPLOY_STEPS,
  FINDINGS,
  INCIDENTS,
  MONTH,
  OPEN_INCIDENT,
  OVERVIEW,
  PROJECT,
  RESOURCES,
  TRAFFIC,
  UPTIME
} from './console/data';

/** "a, b and c". */
const list = (items: readonly string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const fact = (label: string) => DEPLOY_FACTS.find((item) => item.label === label)?.value ?? '';
const bySeverity = (severity: string) => FINDINGS.filter((finding) => finding.severity === severity);
const resolved = INCIDENTS.filter((incident) => incident.status === 'Resolved');
const warned = CHECKS.find((check) => check.warning);
const down = CHECKS.find((check) => check.down.length > 0);
const largest = COSTS.filter((row) => row.name !== null).slice(0, 2);

/**
 * The Console screens behind the hero's tabs: the real Console's pages, rebuilt in HTML with acme-shop's data. Each
 * screen is one image to assistive technology, so its description is written from the same data the screen shows.
 */
export const SCREENS = [
  {
    file: 'infrastructure',
    tab: 'Infrastructure',
    description: `The Stacktape Console showing the production stage of ${PROJECT}. An open incident: ${OPEN_INCIDENT.title}. The deployed version, Fix order totals for empty carts, and its ${OVERVIEW.length} resources: ${list(OVERVIEW.map((row) => `${row.name} (${RESOURCES[row.name].label})`))}. Last 24 hours: ${TRAFFIC.requests} requests; ${TRAFFIC.failed} of ${TRAFFIC.scope} requests failed, ${TRAFFIC.scope} latency ${TRAFFIC.latency}.`
  },
  {
    file: 'deploys',
    tab: 'Deploys',
    description: `A deploy of ${PROJECT} to production in the Console, started by a ${fact('Started by').split(' · ')[0].toLowerCase()} from ${fact('Started by').split(' · ')[1]}. Steps: ${list(DEPLOY_STEPS.map((step) => `${step.name.toLowerCase()} ${step.took}${step.note ? ` (${step.note})` : ''}`))}; ${fact('Took')} in total. Configuration: ${fact('Configuration')}.`
  },
  {
    file: 'monitoring',
    tab: 'Monitoring',
    description: `Uptime checks in the Console: all ${UPTIME.checks} checks of ${PROJECT} up, ${UPTIME.available} available in the last 24 hours. ${down?.name} on ${down?.stage} was down in the 10:00 hour and is at ${down?.availability}. ${warned?.name} on ${warned?.stage}: ${warned?.warning}.`
  },
  {
    file: 'incidents',
    tab: 'Incidents',
    description: `The incident list in the Console: ${INCIDENTS.length - resolved.length} open, ${OPEN_INCIDENT.title}, and ${resolved.length} resolved, including ${resolved[0]?.title} (${resolved[0]?.detail}, ${resolved[0]?.by}).`
  },
  {
    file: 'security',
    tab: 'Security',
    description: `The Console security overview for ${PROJECT}: ${list(['Critical', 'High', 'Medium', 'Low'].map((severity) => `${bySeverity(severity).length} ${severity.toLowerCase()}`))} findings. To fix now: ${FINDINGS.filter(
      (finding) => finding.severity === 'Critical' || finding.severity === 'High'
    )
      .map((finding) => `${finding.title} on ${finding.stage} (${finding.fix.toLowerCase()})`)
      .join('; ')}.`
  },
  {
    file: 'costs',
    tab: 'Costs',
    description: `Costs in the Console for ${PROJECT} production: ${MONTH.total} so far in November, ${MONTH.pace} by the end of the month at this pace, ${MONTH.change} than October. The largest: ${list(largest.map((row) => `${row.name} ${row.november}`))}.`
  }
] as const;
