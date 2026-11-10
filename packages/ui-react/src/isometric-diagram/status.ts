/**
 * Live status on a drawn diagram: what a host reports about its deployed resources, checked at the boundary and
 * summarized per drawn node.
 *
 * The host knows where status comes from (incidents, findings, deploys); the diagram knows only resource names, tones
 * and text. A status never moves anything: it is applied to a scene the layout has already placed.
 */
import type { IsoGroup, IsoNode } from './scene.js';

/**
 * How bad a status is. `critical` means broken now (an open incident), `warning` needs attention (a security finding),
 * `ok` is healthy and `unknown` means the host cannot tell. Text always says the same in words, so tone is never the
 * only signal.
 */
export type DiagramStatusTone = 'critical' | 'warning' | 'ok' | 'unknown';

export type DiagramResourceStatus = {
  tone: DiagramStatusTone;
  /** A few words drawn under the node's name, e.g. "Open incident" or "2 security findings". */
  text: string;
  /** A sentence for the tooltip and the side panel, e.g. the incident's title. */
  detail?: string | undefined;
  /** Where the host shows more: an incident, a finding, a resource page. A relative path or an http(s) URL. */
  href?: string | undefined;
};

/** Statuses by the name of the resource the configuration declares. */
export type DiagramStatuses = Readonly<Record<string, readonly DiagramResourceStatus[] | undefined>>;

/** One status as the diagram shows it, with the declared resource it belongs to (a group member, for a group). */
export type DiagramStatusEntry = DiagramResourceStatus & { resourceName: string };

/** What one drawn node shows: the worst tone, the line under its name and every status behind them. */
export type NodeStatus = {
  tone: DiagramStatusTone;
  /** The worst status's text, or a group's summary. */
  text: string;
  /** How many more statuses the node has beyond the one its text names; the pill adds "+N". */
  more: number;
  /** `text` with its "+N", for labels and tooltips. */
  line: string;
  entries: DiagramStatusEntry[];
  /** On a group: how many members report the worst tone, and how many members it has. */
  affected?: { count: number; of: number } | undefined;
};

const TONES: readonly DiagramStatusTone[] = ['critical', 'warning', 'unknown', 'ok'];
/** Worst first. */
const toneRank = (tone: DiagramStatusTone) => TONES.indexOf(tone);
export const worseTone = (a: DiagramStatusTone, b: DiagramStatusTone) => (toneRank(a) <= toneRank(b) ? a : b);
/** Tones that ring the node and count towards "needs attention". */
export const needsAttention = (tone: DiagramStatusTone) => tone === 'critical' || tone === 'warning';

const TEXT_MAX = 60;
const DETAIL_MAX = 300;
const MAX_STATUSES_PER_RESOURCE = 20;

const clean = (value: unknown, max: number) => {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/gu, ' ').trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/**
 * Links stay inside the host or go to the web: a path (`/incidents/view?id=1`), a query or fragment, or an http(s) URL.
 * Anything else, `javascript:` included, is dropped.
 */
const safeHref = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const href = value.trim();
  if (/^(?:\/(?!\/)|\?|#)/u.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Checks what the host passed: an unknown tone reads as `unknown`, a status without text is dropped, text is collapsed
 * and bounded, and unsafe links are removed. Each resource's statuses come back worst first, in the host's order
 * within a tone.
 */
export const readStatuses = (input: DiagramStatuses | undefined): Map<string, DiagramResourceStatus[]> => {
  const result = new Map<string, DiagramResourceStatus[]>();
  if (!input || typeof input !== 'object') return result;
  for (const [resourceName, list] of Object.entries(input)) {
    if (!Array.isArray(list)) continue;
    const statuses: DiagramResourceStatus[] = [];
    for (const raw of list.slice(0, MAX_STATUSES_PER_RESOURCE) as unknown[]) {
      if (!raw || typeof raw !== 'object') continue;
      const candidate = raw as Record<string, unknown>;
      const text = clean(candidate.text, TEXT_MAX);
      if (!text) continue;
      const tone = TONES.includes(candidate.tone as DiagramStatusTone)
        ? (candidate.tone as DiagramStatusTone)
        : 'unknown';
      statuses.push({ tone, text, detail: clean(candidate.detail, DETAIL_MAX), href: safeHref(candidate.href) });
    }
    if (statuses.length === 0) continue;
    result.set(
      resourceName,
      statuses
        .map((status, index) => ({ status, index }))
        .sort((a, b) => toneRank(a.status.tone) - toneRank(b.status.tone) || a.index - b.index)
        .map(({ status }) => status)
    );
  }
  return result;
};

/** Short enough that "12 of 60 flagged" fits under any node. */
const GROUP_WORDS: Record<DiagramStatusTone, string> = {
  critical: 'failing',
  warning: 'flagged',
  unknown: 'unknown',
  ok: 'ok'
};

const toEntry = (status: DiagramResourceStatus, resourceName: string): DiagramStatusEntry => ({
  tone: status.tone,
  text: status.text,
  detail: status.detail,
  href: status.href,
  resourceName
});

/** A declared resource's status: its worst status, with "+N" for the rest. */
export const getResourceStatus = ({
  resourceName,
  statuses
}: {
  resourceName: string;
  statuses: Map<string, DiagramResourceStatus[]>;
}): NodeStatus | undefined => {
  const list = statuses.get(resourceName);
  const worst = list?.[0];
  if (!list || !worst) return undefined;
  const more = list.length - 1;
  return {
    tone: worst.tone,
    text: worst.text,
    more,
    line: more > 0 ? `${worst.text} +${more}` : worst.text,
    entries: list.map((status) => toEntry(status, resourceName))
  };
};

/** A group's status: its worst member's tone and how many members share it ("2 of 18 failing"). */
export const getGroupStatus = ({
  group,
  statuses
}: {
  group: IsoGroup;
  statuses: Map<string, DiagramResourceStatus[]>;
}): NodeStatus | undefined => {
  const members = group.members.flatMap((member) => {
    const list = statuses.get(member.id);
    return list?.[0] ? [{ name: member.id, list, tone: list[0].tone }] : [];
  });
  if (members.length === 0) return undefined;
  const tone = members.map((member) => member.tone).reduce(worseTone);
  const count = members.filter((member) => member.tone === tone).length;
  const of = group.members.length;
  const entries = members
    .flatMap(({ name, list }) => list.map((status) => toEntry(status, name)))
    .sort((a, b) => toneRank(a.tone) - toneRank(b.tone));
  const text = `${count} of ${of} ${GROUP_WORDS[tone]}`;
  return { tone, text, more: 0, line: text, entries, affected: { count, of } };
};

/**
 * The status of each drawn node. Nodes Stacktape creates implicitly have no status of their own; a collapsed group
 * summarizes its members.
 */
export const buildNodeStatuses = ({
  nodes,
  groups,
  statuses
}: {
  nodes: readonly IsoNode[];
  groups: readonly IsoGroup[];
  statuses: Map<string, DiagramResourceStatus[]>;
}): Map<string, NodeStatus> => {
  const result = new Map<string, NodeStatus>();
  if (statuses.size === 0) return result;
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  for (const node of nodes) {
    if (node.isImplicit) continue;
    const group = node.memberCount ? groupsById.get(node.id) : undefined;
    const status = group ? getGroupStatus({ group, statuses }) : getResourceStatus({ resourceName: node.id, statuses });
    if (status) result.set(node.id, status);
  }
  return result;
};

/** How many declared resources need attention, counting group members one by one. */
export const countResourcesNeedingAttention = (nodeStatuses: Map<string, NodeStatus>) =>
  new Set(
    [...nodeStatuses.values()].flatMap((status) =>
      status.entries.filter((entry) => needsAttention(entry.tone)).map((entry) => entry.resourceName)
    )
  ).size;
