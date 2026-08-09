import type { ComponentType, CSSProperties, ReactNode, SVGProps } from 'react';
import {
  ArchitectureServiceAmazonAPIGateway,
  ArchitectureServiceAmazonBedrock,
  ArchitectureServiceAmazonCloudFront,
  ArchitectureServiceAmazonCognito,
  ArchitectureServiceAmazonDocumentDB,
  ArchitectureServiceAmazonDynamoDB,
  ArchitectureServiceAmazonEFS,
  ArchitectureServiceAmazonKinesisDataStreams,
  ArchitectureServiceAmazonOpenSearchService,
  ArchitectureServiceAmazonRDS,
  ArchitectureServiceAmazonSimpleQueueService,
  ArchitectureServiceAWSBatch,
  ArchitectureServiceAWSFargate,
  ArchitectureServiceAWSStepFunctions,
  ArchitectureServiceElasticLoadBalancing,
  ResourceAmazonEC2Instance,
  ResourceAmazonElastiCacheElastiCacheforRedis,
  ResourceAmazonEventBridgeEvent,
  ResourceAmazonRoute53ResolverDNSFirewall,
  ResourceAmazonSimpleNotificationServiceTopic,
  ResourceAmazonSimpleStorageServiceS3Standard,
  ResourceAWSLambdaLambdaFunction
} from 'aws-react-icons';
import { BiAtom } from 'react-icons/bi';
import { FrameworkIcon } from '../framework-icon/FrameworkIcon.js';
import type { AwsResourceIconName, ResourceVisualCategory } from './catalog.js';
import { getResourceVisual, RESOURCE_VISUALS } from './catalog.js';

type AwsIconComponent = ComponentType<SVGProps<SVGElement> & { size?: number | string }>;
type AwsIconDefinition = { component: AwsIconComponent; geometry: 'architecture' | 'plain' | 'resource' };

const awsIcon: Record<AwsResourceIconName, AwsIconDefinition> = {
  'api-gateway': architecture(ArchitectureServiceAmazonAPIGateway),
  batch: architecture(ArchitectureServiceAWSBatch),
  bedrock: architecture(ArchitectureServiceAmazonBedrock),
  cloudfront: architecture(ArchitectureServiceAmazonCloudFront),
  cognito: architecture(ArchitectureServiceAmazonCognito),
  'document-db': architecture(ArchitectureServiceAmazonDocumentDB),
  'dynamo-db': architecture(ArchitectureServiceAmazonDynamoDB),
  ec2: plain(ResourceAmazonEC2Instance),
  efs: architecture(ArchitectureServiceAmazonEFS),
  elasticache: plain(ResourceAmazonElastiCacheElastiCacheforRedis),
  'elastic-load-balancing': architecture(ArchitectureServiceElasticLoadBalancing),
  eventbridge: resource(ResourceAmazonEventBridgeEvent),
  fargate: architecture(ArchitectureServiceAWSFargate),
  kinesis: architecture(ArchitectureServiceAmazonKinesisDataStreams),
  lambda: resource(ResourceAWSLambdaLambdaFunction),
  'open-search': architecture(ArchitectureServiceAmazonOpenSearchService),
  rds: architecture(ArchitectureServiceAmazonRDS),
  s3: resource(ResourceAmazonSimpleStorageServiceS3Standard),
  sns: resource(ResourceAmazonSimpleNotificationServiceTopic),
  sqs: architecture(ArchitectureServiceAmazonSimpleQueueService),
  'step-functions': architecture(ArchitectureServiceAWSStepFunctions),
  waf: resource(ResourceAmazonRoute53ResolverDNSFirewall)
};

const categoryColor: Record<ResourceVisualCategory, string> = {
  compute: 'var(--stp-aws-category-compute)',
  database: 'var(--stp-aws-category-database)',
  integration: 'var(--stp-aws-category-integration)',
  network: 'var(--stp-aws-category-network)',
  security: 'var(--stp-aws-category-security)',
  storage: 'var(--stp-aws-category-storage)'
};

export type IconRenderer = ({ size }: { size: number }) => ReactNode;

/** Adapts the shared component to metadata APIs that store an icon renderer rather than a node. */
export const createResourceIconRenderer = (resourceType: string): IconRenderer =>
  function ResourceIconRenderer({ size }) {
    return <ResourceIcon resourceType={resourceType} size={size} />;
  };

/** Renderer metadata for legacy menus and preset catalogs; values still resolve through one visual catalog. */
export const RESOURCE_ICON_RENDERERS = Object.fromEntries(
  Object.keys(RESOURCE_VISUALS).map((resourceType) => [resourceType, createResourceIconRenderer(resourceType)])
) as Record<keyof typeof RESOURCE_VISUALS, IconRenderer>;

export function ResourceIcon({
  resourceType,
  size,
  label,
  className,
  style
}: {
  resourceType: string;
  size: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const visual = getResourceVisual(resourceType);
  const classes = ['stp-ui-resource-icon', className].filter(Boolean).join(' ');

  if (!visual) {
    return (
      <span
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={`${classes} stp-ui-resource-icon--fallback`}
        role={label ? 'img' : undefined}
        style={{ width: size, height: size, ...style }}
      >
        <BiAtom aria-hidden="true" size={size} />
      </span>
    );
  }

  const rootStyle = {
    '--stp-resource-icon-color': categoryColor[visual.category],
    width: size,
    height: size,
    ...style
  } as CSSProperties;

  if (visual.icon.kind === 'framework') {
    return (
      <span
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={`${classes} stp-ui-resource-icon--framework`}
        role={label ? 'img' : undefined}
        style={rootStyle}
      >
        <FrameworkIcon name={visual.icon.name} size={size} />
      </span>
    );
  }

  const definition = awsIcon[visual.icon.name];
  const Icon = definition.component;
  const renderedSize =
    definition.geometry === 'architecture' ? size + 12 : definition.geometry === 'resource' ? size + 2 : size;

  return (
    <span
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`${classes} stp-ui-resource-icon--${definition.geometry}`}
      role={label ? 'img' : undefined}
      style={rootStyle}
    >
      <Icon aria-hidden="true" size={renderedSize} />
    </span>
  );
}

function architecture(component: AwsIconComponent): AwsIconDefinition {
  return { component, geometry: 'architecture' };
}

function resource(component: AwsIconComponent): AwsIconDefinition {
  return { component, geometry: 'resource' };
}

function plain(component: AwsIconComponent): AwsIconDefinition {
  return { component, geometry: 'plain' };
}
