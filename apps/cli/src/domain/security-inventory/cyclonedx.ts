import { randomUUID } from 'node:crypto';

/**
 * The dependency inventory of one deployment is a CycloneDX document: the packages the source tree declares (from
 * lockfiles) and the packages inside every container image the deployment rebuilt. Each component is tagged with the
 * workload it belongs to, so the Console can say which service a vulnerable package runs in, and with the digest of
 * the artifact it was read from, so a later deployment that did not rebuild an image can carry its packages over.
 */

export type CycloneDxProperty = { name: string; value: string };

export type CycloneDxComponent = {
  type?: string;
  name: string;
  version?: string;
  group?: string;
  purl?: string;
  'bom-ref'?: string;
  properties?: CycloneDxProperty[];
  [extra: string]: unknown;
};

export type CycloneDxDocument = {
  bomFormat: 'CycloneDX';
  specVersion: string;
  serialNumber?: string;
  version?: number;
  metadata?: Record<string, unknown>;
  components?: CycloneDxComponent[];
  [extra: string]: unknown;
};

export const STACKTAPE_COMPONENT_PROPERTY = {
  workload: 'stacktape:workload',
  artifactDigest: 'stacktape:artifactDigest',
  source: 'stacktape:source'
} as const;

/** Where a component was read: lockfiles in the source tree, a rebuilt image, or an earlier inventory of an unchanged image. */
export type InventorySource = 'filesystem' | 'image' | 'carried-over';

/** The project-wide part (lockfiles) has no workload; image parts belong to the workload whose image they describe. */
export type InventoryPart = {
  workload: string | null;
  artifactDigest?: string;
  source: InventorySource;
  document: CycloneDxDocument;
};

export type InventoryWorkloadSummary = {
  name: string;
  source: InventorySource;
  componentCount: number;
  artifactDigest?: string;
};

export type InventorySummary = {
  componentCount: number;
  workloads: InventoryWorkloadSummary[];
  /** Component counts by package type, taken from the `pkg:<type>/` prefix of each purl. */
  ecosystems: Record<string, number>;
};

const PROJECT_SCOPE = 'project';

const propertyValue = (component: CycloneDxComponent, name: string) =>
  component.properties?.find((property) => property.name === name)?.value;

const withProperties = (component: CycloneDxComponent, values: Record<string, string | undefined>) => {
  const kept = (component.properties ?? []).filter((property) => !(property.name in values));
  const added = Object.entries(values)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([name, value]) => ({ name, value }));
  return { ...component, properties: [...kept, ...added] };
};

/**
 * Scopes a component to its part. The bom-ref gets the workload as a prefix, because two images can contain the same
 * package and CycloneDX requires every bom-ref in a document to be unique.
 */
const scopeComponent = (component: CycloneDxComponent, part: InventoryPart): CycloneDxComponent => {
  const scope = part.workload ?? PROJECT_SCOPE;
  const reference = component['bom-ref'] ?? component.purl ?? `${component.name}@${component.version ?? ''}`;
  const scoped = reference.startsWith(`${scope}:`) ? reference : `${scope}:${reference}`;
  return withProperties(
    { ...component, 'bom-ref': scoped },
    {
      [STACKTAPE_COMPONENT_PROPERTY.workload]: part.workload ?? undefined,
      [STACKTAPE_COMPONENT_PROPERTY.artifactDigest]: part.artifactDigest,
      [STACKTAPE_COMPONENT_PROPERTY.source]: part.source
    }
  );
};

/**
 * Components of an earlier inventory that describe the given workload at the given artifact digest. A deployment
 * that did not rebuild an image has nothing new to scan, and the packages inside the image did not change either.
 */
export const carryOverComponents = ({
  previous,
  workload,
  artifactDigest
}: {
  previous: CycloneDxDocument;
  workload: string;
  artifactDigest: string;
}): CycloneDxComponent[] =>
  (previous.components ?? []).filter(
    (component) =>
      propertyValue(component, STACKTAPE_COMPONENT_PROPERTY.workload) === workload &&
      propertyValue(component, STACKTAPE_COMPONENT_PROPERTY.artifactDigest) === artifactDigest
  );

const compareSpecVersions = (a: string, b: string) => {
  const [aMajor = 0, aMinor = 0] = a.split('.').map(Number);
  const [bMajor = 0, bMinor = 0] = b.split('.').map(Number);
  return aMajor - bMajor || aMinor - bMinor;
};

/**
 * One document for the deployment out of the parts Trivy produced. Dependency graphs are dropped: the Console grades
 * packages, not their relationships, and the graphs are the bulk of a CycloneDX file.
 */
export const mergeInventoryParts = ({
  parts,
  application,
  tools,
  now = new Date()
}: {
  parts: InventoryPart[];
  application: { name: string; version: string };
  tools: Array<{ name: string; version: string }>;
  now?: Date;
}): CycloneDxDocument => {
  const seen = new Set<string>();
  const components: CycloneDxComponent[] = [];
  for (const part of parts) {
    for (const component of part.document.components ?? []) {
      const scoped = scopeComponent(component, part);
      const reference = scoped['bom-ref']!;
      if (seen.has(reference)) continue;
      seen.add(reference);
      components.push(scoped);
    }
  }
  const specVersion =
    parts
      .map((part) => part.document.specVersion)
      .toSorted(compareSpecVersions)
      .at(-1) ?? '1.6';
  return {
    bomFormat: 'CycloneDX',
    specVersion,
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: now.toISOString(),
      tools: { components: tools.map((tool) => ({ type: 'application', name: tool.name, version: tool.version })) },
      component: { type: 'application', name: application.name, version: application.version }
    },
    components
  };
};

const ecosystemOf = (purl: string | undefined) => {
  const match = purl?.match(/^pkg:([a-z0-9._-]+)\//i);
  return match?.[1]?.toLowerCase() ?? 'unknown';
};

export const summarizeInventory = (document: CycloneDxDocument): InventorySummary => {
  const components = document.components ?? [];
  const workloads = new Map<string, InventoryWorkloadSummary>();
  const ecosystems: Record<string, number> = {};
  for (const component of components) {
    const name = propertyValue(component, STACKTAPE_COMPONENT_PROPERTY.workload) ?? PROJECT_SCOPE;
    const source = (propertyValue(component, STACKTAPE_COMPONENT_PROPERTY.source) as InventorySource) ?? 'filesystem';
    const artifactDigest = propertyValue(component, STACKTAPE_COMPONENT_PROPERTY.artifactDigest);
    const summary = workloads.get(name) ?? {
      name,
      source,
      componentCount: 0,
      ...(artifactDigest ? { artifactDigest } : {})
    };
    summary.componentCount += 1;
    workloads.set(name, summary);
    const ecosystem = ecosystemOf(component.purl);
    ecosystems[ecosystem] = (ecosystems[ecosystem] ?? 0) + 1;
  }
  return { componentCount: components.length, workloads: [...workloads.values()], ecosystems };
};

/** Trivy writes a valid but empty document when nothing was found; treat anything unparseable as empty too. */
export const parseCycloneDx = (text: string): CycloneDxDocument => {
  const parsed = JSON.parse(text) as Partial<CycloneDxDocument>;
  if (parsed?.bomFormat !== 'CycloneDX' || typeof parsed.specVersion !== 'string') {
    throw new Error('The scanner output is not a CycloneDX document.');
  }
  return { ...parsed, bomFormat: 'CycloneDX', specVersion: parsed.specVersion, components: parsed.components ?? [] };
};
