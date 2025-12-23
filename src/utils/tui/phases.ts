// Phase definitions and event-to-phase mapping

import type { PhaseMapping, ResourceHint } from './types';

// Phase definitions for deploy command
export const deployPhases: PhaseMapping[] = [
  {
    phaseId: 'init',
    phaseName: 'Initialize',
    view: 'simple',
    eventTypes: [
      'LOAD_CONFIG_FILE',
      'LOAD_AWS_CREDENTIALS',
      'LOAD_USER_DATA',
      'RESOLVE_CONFIG',
      'LOAD_PROVIDER_CREDENTIALS',
      'FETCH_STACK_DATA',
      'FETCH_PREVIOUS_ARTIFACTS',
      'LOAD_TARGET_STACK_INFO',
      'LOAD_VPC_INFO'
    ]
  },
  {
    phaseId: 'build',
    phaseName: 'Build & Package',
    view: 'detailed',
    eventTypes: [
      'ANALYZE_PROJECT',
      'RESOLVE_DEPENDENCIES',
      'ANALYZE_DEPENDENCIES',
      'INSTALL_DEPENDENCIES',
      'BUILD_CODE',
      'REBUILD_CODE',
      'BUILD_NEXTJS_PROJECT',
      'BUNDLING_NEXTJS_FUNCTIONS',
      'CREATE_DOCKERFILE',
      'BUILD_IMAGE',
      'PACKAGE_ARTIFACTS',
      'REPACKAGE_ARTIFACTS',
      'ZIP_PACKAGE',
      'CALCULATE_CHECKSUM',
      'CALCULATE_SIZE',
      'ZIP_PROJECT'
    ]
  },
  {
    phaseId: 'upload',
    phaseName: 'Upload',
    view: 'detailed',
    eventTypes: [
      'CREATE_RESOURCES_FOR_ARTIFACTS',
      'UPLOAD_DEPLOYMENT_ARTIFACTS',
      'UPLOAD_PACKAGE',
      'UPLOAD_IMAGE',
      'UPLOAD_PROJECT',
      'UPLOAD_BUCKET_CONTENT',
      'SYNC_BUCKET'
    ]
  },
  {
    phaseId: 'deploy',
    phaseName: 'Deploy',
    view: 'resource-table',
    eventTypes: [
      'VALIDATE_TEMPLATE',
      'CALCULATE_CHANGES',
      'UPDATE_STACK',
      'HOTSWAP_UPDATE',
      'UPDATE_FUNCTION_CODE',
      'REGISTER_ECS_TASK_DEFINITION',
      'UPDATE_ECS_SERVICE',
      'REGISTER_CF_PRIVATE_TYPES'
    ]
  },
  {
    phaseId: 'finalize',
    phaseName: 'Finalize',
    view: 'simple',
    eventTypes: ['DELETE_OBSOLETE_ARTIFACTS', 'INVALIDATE_CACHE', 'CLEANUP']
  }
];

// Phase definitions for delete command
export const deletePhases: PhaseMapping[] = [
  {
    phaseId: 'init',
    phaseName: 'Initialize',
    view: 'simple',
    eventTypes: ['LOAD_CONFIG_FILE', 'LOAD_AWS_CREDENTIALS', 'LOAD_USER_DATA', 'FETCH_STACK_DATA']
  },
  {
    phaseId: 'delete',
    phaseName: 'Delete Resources',
    view: 'resource-table',
    eventTypes: ['DELETE_STACK', 'ROLLBACK_STACK']
  },
  {
    phaseId: 'cleanup',
    phaseName: 'Cleanup',
    view: 'simple',
    eventTypes: ['DELETE_ARTIFACTS', 'CLEANUP']
  }
];

// Get phase for an event type
export const getPhaseForEvent = (eventType: string, command: 'deploy' | 'delete' | 'dev'): PhaseMapping | null => {
  const phases = command === 'delete' ? deletePhases : deployPhases;
  for (const phase of phases) {
    if (phase.eventTypes.includes(eventType)) {
      return phase;
    }
  }
  return null;
};

// Get all phases for a command
export const getPhasesForCommand = (command: 'deploy' | 'delete' | 'dev'): PhaseMapping[] => {
  return command === 'delete' ? deletePhases : deployPhases;
};

// Resource type hints - shown when certain resources are being created
export const resourceHints: ResourceHint[] = [
  { resourceType: 'AWS::RDS::DBInstance', message: 'RDS instances typically take 3-5 minutes to provision' },
  { resourceType: 'AWS::RDS::DBCluster', message: 'RDS clusters typically take 5-10 minutes to provision' },
  {
    resourceType: 'AWS::ElastiCache::CacheCluster',
    message: 'ElastiCache clusters typically take 5-10 minutes to provision'
  },
  {
    resourceType: 'AWS::CloudFront::Distribution',
    message: 'CloudFront distributions typically take 5-15 minutes to deploy globally'
  },
  {
    resourceType: 'AWS::OpenSearchService::Domain',
    message: 'OpenSearch domains can take 15-30 minutes to provision'
  },
  {
    resourceType: 'AWS::ECS::Service',
    message: 'ECS services may take a few minutes while health checks stabilize'
  },
  { resourceType: 'AWS::EC2::NatGateway', message: 'NAT Gateways typically take 2-5 minutes to provision' },
  { resourceType: 'AWS::Neptune::DBCluster', message: 'Neptune clusters typically take 10-20 minutes to provision' },
  { resourceType: 'AWS::DocDB::DBCluster', message: 'DocumentDB clusters typically take 10-15 minutes to provision' }
];

// Get hint for a resource type
export const getHintForResource = (resourceType: string): string | null => {
  const hint = resourceHints.find((h) => h.resourceType === resourceType);
  return hint?.message || null;
};

// Get the slowest in-progress resource hint (priority order)
export const getActiveResourceHint = (resources: { resourceType: string; status: string }[]): string | null => {
  const inProgress = resources.filter((r) => r.status.includes('IN_PROGRESS'));

  // Priority order for hints (slowest resources first)
  const priorityOrder = [
    'AWS::OpenSearchService::Domain',
    'AWS::Neptune::DBCluster',
    'AWS::DocDB::DBCluster',
    'AWS::CloudFront::Distribution',
    'AWS::RDS::DBCluster',
    'AWS::RDS::DBInstance',
    'AWS::ElastiCache::CacheCluster',
    'AWS::EC2::NatGateway',
    'AWS::ECS::Service'
  ];

  for (const resourceType of priorityOrder) {
    const resource = inProgress.find((r) => r.resourceType === resourceType);
    if (resource) {
      return getHintForResource(resourceType);
    }
  }

  return null;
};
