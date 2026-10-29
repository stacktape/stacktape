import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';

/** Resource types that hold data. Removing one to replace something it depends on would delete that data. */
const DATA_RESOURCE_TYPES = new Set([
  'AWS::RDS::DBCluster',
  'AWS::RDS::DBInstance',
  'AWS::DSQL::Cluster',
  'AWS::DynamoDB::GlobalTable',
  'AWS::DynamoDB::Table',
  'AWS::MSK::ServerlessCluster',
  'AWS::ElastiCache::GlobalReplicationGroup',
  'AWS::ElastiCache::ReplicationGroup',
  'AWS::Kinesis::Stream',
  'AWS::SQS::Queue',
  'AWS::S3::Bucket',
  'MongoDB::StpAtlasV1::Cluster',
  'AWS::Cognito::UserPool',
  'Upstash::DatabasesV1::Database',
  'AWS::OpenSearchService::Domain',
  'AWS::EFS::FileSystem'
]);

const SUB_REFERENCE = /\$\{([A-Za-z0-9]+)[.}]/g;

/** Logical IDs a template value refers to through Ref, Fn::GetAtt or Fn::Sub. */
const collectReferences = (value: unknown, into: Set<string>) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferences(item, into));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, inner] of Object.entries(value)) {
    if (key === 'Ref' && typeof inner === 'string') into.add(inner);
    else if (key === 'Fn::GetAtt') {
      const target = Array.isArray(inner) ? inner[0] : typeof inner === 'string' ? inner.split('.')[0] : undefined;
      if (typeof target === 'string') into.add(target);
    } else if (key === 'Fn::Sub') {
      const text = Array.isArray(inner) ? inner[0] : inner;
      if (typeof text === 'string') for (const [, id] of text.matchAll(SUB_REFERENCE)) into.add(id);
    }
    collectReferences(inner, into);
  }
};

const dependenciesOf = (resource: { DependsOn?: unknown } & Record<string, unknown>) => {
  const ids = new Set<string>();
  collectReferences(resource, ids);
  const dependsOn = resource.DependsOn;
  for (const id of Array.isArray(dependsOn) ? dependsOn : dependsOn ? [dependsOn] : []) {
    if (typeof id === 'string') ids.add(id);
  }
  return ids;
};

/**
 * The template without the given resources and everything that depends on them, directly or through other resources,
 * and without the outputs that refer to any of them.
 *
 * CloudFormation cannot replace a resource in an update without rollback, and continuing a failed deploy requires an
 * update without rollback. Deploying this template first deletes the resources to replace; the full template then
 * creates them again. Only a stack that has never been deployed successfully may go this way: nothing serves traffic
 * yet, so deleting and recreating a resource interrupts nothing.
 */
export const templateWithoutResources = (
  template: CloudFormationTemplate,
  logicalIds: string[]
): { template: CloudFormationTemplate; removedResources: string[]; removedDataResources: string[] } => {
  const resources = (template.Resources ?? {}) as Record<string, { Type?: string; DependsOn?: unknown }>;
  const removed = new Set(logicalIds.filter((id) => id in resources));
  let grew = removed.size > 0;
  while (grew) {
    grew = false;
    for (const [id, resource] of Object.entries(resources)) {
      if (removed.has(id)) continue;
      if ([...dependenciesOf(resource as Record<string, unknown>)].some((dependency) => removed.has(dependency))) {
        removed.add(id);
        grew = true;
      }
    }
  }
  const outputs = Object.fromEntries(
    Object.entries(template.Outputs ?? {}).filter(([, output]) => {
      const ids = new Set<string>();
      collectReferences(output, ids);
      return ![...ids].some((id) => removed.has(id));
    })
  );
  const removedResources = [...removed].toSorted();
  const { Outputs: _outputs, ...withoutOutputs } = template;
  return {
    template: {
      ...withoutOutputs,
      Resources: Object.fromEntries(Object.entries(resources).filter(([id]) => !removed.has(id))),
      // CloudFormation rejects an empty Outputs section.
      ...(Object.keys(outputs).length ? { Outputs: outputs } : {})
    } as CloudFormationTemplate,
    removedResources,
    removedDataResources: removedResources.filter((id) => DATA_RESOURCE_TYPES.has(resources[id]?.Type ?? ''))
  };
};
