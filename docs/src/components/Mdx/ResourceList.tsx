import {
  ArchitectureServiceAmazonAPIGateway,
  ArchitectureServiceAmazonCognito,
  ArchitectureServiceAmazonDynamoDB,
  ArchitectureServiceAmazonElastiCache,
  ArchitectureServiceAmazonRDS,
  ArchitectureServiceAmazonSimpleNotificationService,
  ArchitectureServiceAmazonSimpleQueueService,
  ArchitectureServiceAWSBatch,
  ArchitectureServiceAWSFargate,
  ArchitectureServiceAWSStepFunctions,
  ArchitectureServiceElasticLoadBalancing,
  ResourceAmazonCloudFrontFunctions,
  ResourceAmazonEC2Instance,
  ResourceAmazonElastiCacheElastiCacheforRedis,
  ResourceAmazonEventBridgeEvent,
  ResourceAmazonRoute53ResolverDNSFirewall,
  ResourceAmazonSimpleStorageServiceS3Standard,
  ResourceAmazonWorkSpacesFamilyAmazonWorkSpaces,
  ResourceAWSLambdaLambdaFunction
} from 'aws-react-icons';
import { capitalCase } from 'change-case';
import Image from 'next/image';
import { BiAtom } from 'react-icons/bi';
import { colors } from '@/styles/variables';
import resources from '../../../.resources.json';
import MongoDbIconSvg from '../../../static/technology-icons/mongodb.svg';
import NextJsIconSvg from '../../../static/technology-icons/nextjs-icon-dark-bg.svg';
import UpstashIconSvg from '../../../static/technology-icons/upstash-icon-dark-bg.svg';
import { onMaxW650 } from '../../styles/responsive';
import { GridList } from '../Misc/GridList';
import { NavBox } from './DeploymentOptions';

const getPrettyResourceName = (resourceName: string) => {
  return capitalCase(resourceName)
    .replaceAll(' Db', 'Db')
    .replace('Sqs', 'SQS')
    .replace('Sns', 'SNS')
    .replace('Aws Cdk', 'AWS CDK')
    .replace('Relational Database', 'SQL database')
    .replace('Open Search Domain', 'OpenSearch (Elastic)')
    .replace('Bastion', 'Bastion (Jump Host)')
    .replace('Event Bus', 'Event Bus (EventBridge)')
    .replace('State Machine', 'State Machine')
    .replace('Application Load', 'Load');
};

export const referenceableParams = resources
  .map(({ resourceType, referenceableParams }) => {
    return Object.entries(referenceableParams).map(([paramName, paramDescription]) => {
      if (paramName === '_hasCdn') {
        return null;
      }
      return { resourceType, paramName, paramDescription };
    });
  })
  .flat()
  .filter(Boolean) as {
  resourceType: string;
  paramName: string;
  paramDescription: string;
}[];

function AwsFargate({ size }) {
  return (
    <ArchitectureServiceAWSFargate
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceCompute }
      }}
      size={size + 12}
    />
  );
}

const resourceIcons: { [resourceType: string]: any } = {
  bucket: ({ size }) => (
    <ResourceAmazonSimpleStorageServiceS3Standard
      css={{
        margin: '-3px',
        path: { fill: colors.awsResourceStorage }
      }}
      size={size + 2}
    />
  ),
  'hosting-bucket': ({ size }) => (
    <ResourceAmazonWorkSpacesFamilyAmazonWorkSpaces
      css={{
        margin: '-3px',
        path: { fill: colors.awsResourceStorage }
      }}
      size={size + 2}
    />
  ),
  function: ({ size }) => (
    <ResourceAWSLambdaLambdaFunction
      css={{
        margin: '-3px',
        path: {
          fill: colors.awsResourceCompute
        }
      }}
      size={size + 2}
    />
  ),
  'web-service': AwsFargate,
  'private-service': AwsFargate,
  'worker-service': AwsFargate,
  'multi-container-workload': AwsFargate,
  'application-load-balancer': ({ size }) => (
    <ArchitectureServiceElasticLoadBalancing
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceNetwork }
      }}
      size={size + 12}
    />
  ),
  'aws-cdk-construct': null,
  'batch-job': ({ size }) => (
    <ArchitectureServiceAWSBatch
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceCompute }
      }}
      size={size + 12}
    />
  ),
  'deployment-script': null,
  'dynamo-db-table': ({ size }) => (
    <ArchitectureServiceAmazonDynamoDB
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceDatabase }
      }}
      size={size + 12}
    />
  ),
  'edge-lambda-function': ({ size }) => (
    <ResourceAmazonCloudFrontFunctions
      css={{
        margin: '-3px',
        path: {
          fill: colors.awsResourceCompute
        }
      }}
      size={size + 2}
    />
  ),
  'event-bus': ({ size }) => (
    <ResourceAmazonEventBridgeEvent
      css={{
        margin: '-3px',
        path: {
          fill: colors.awsResourceIntegration
        }
      }}
      size={size + 2}
    />
  ),
  'http-api-gateway': ({ size }) => (
    <ArchitectureServiceAmazonAPIGateway
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceNetwork }
      }}
      size={size + 12}
    />
  ),
  'mongo-db-atlas-cluster': ({ size }) => (
    <Image css={{ padding: '0px' }} width={size} height={size} src={MongoDbIconSvg} alt="mongo-db-icon" />
  ),
  'nextjs-web': ({ size }) => (
    <Image css={{ padding: '0px' }} width={size} height={size} src={NextJsIconSvg} alt="nextjs-icon" />
  ),
  'open-search-domain': ({ size }) => (
    <ArchitectureServiceAmazonElastiCache
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceDatabase }
      }}
      size={size + 12}
    />
  ),
  'redis-cluster': ({ size }) => (
    <ResourceAmazonElastiCacheElastiCacheforRedis
      css={{
        margin: '-3px',
        path: {
          fill: colors.awsResourceDatabase
        }
      }}
      size={size + 2}
    />
  ),
  'relational-database': ({ size }) => (
    <ArchitectureServiceAmazonRDS
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceDatabase }
      }}
      size={size + 12}
    />
  ),
  'sns-topic': ({ size }) => (
    <ArchitectureServiceAmazonSimpleNotificationService
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceIntegration }
      }}
      size={size + 12}
    />
  ),
  'sqs-queue': ({ size }) => (
    <ArchitectureServiceAmazonSimpleQueueService
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceIntegration }
      }}
      size={size + 12}
    />
  ),
  'state-machine': ({ size }) => (
    <ArchitectureServiceAWSStepFunctions
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceIntegration }
      }}
      size={size + 12}
    />
  ),
  'upstash-redis': ({ size }) => (
    <Image css={{ padding: '0px' }} width={size} height={size} src={UpstashIconSvg} alt="upstash-icon" />
  ),
  'user-auth-pool': ({ size }) => (
    <ArchitectureServiceAmazonCognito
      css={{
        margin: '-6px',
        'path:first-of-type': { fill: 'transparent' },
        'path:nth-of-type(2)': { fill: colors.awsResourceSecurity }
      }}
      size={size + 12}
    />
  ),
  'web-app-firewall': ({ size }) => (
    <ResourceAmazonRoute53ResolverDNSFirewall
      css={{
        margin: '-3px',
        path: { fill: colors.awsResourceSecurity }
      }}
      size={size + 2}
    />
  ),
  'custom-resource-definition': null,
  'custom-resource-instance': null,
  bastion: ResourceAmazonEC2Instance
};

export const allResources = resources.map(({ resourceType, category }) => {
  return {
    type: resourceType,
    prettyType: getPrettyResourceName(resourceType),
    category,
    icon: ({ size }) => (resourceIcons[resourceType] ? resourceIcons[resourceType]({ size }) : <BiAtom size={size} />)
  };
});

export function ResourceList() {
  return (
    <GridList
      minItemWidth="422px"
      rootCss={{
        marginTop: '20px',
        [onMaxW650]: {
          display: 'block',
          width: '100%'
        }
      }}
    >
      {allResources
        .filter(
          (resource) =>
            !['custom-resource-definition', 'custom-resource-instance', 'aws-cdk-construct'].includes(resource.type)
        )
        .map((resource) => (
          <NavBox
            key={resource.type}
            icon={resource.icon({ size: 28 })}
            text={resource.prettyType}
            url={`${resource.category}s/${resource.type}${resource.type.endsWith('s') ? 'es' : 's'}`}
          />
        ))}
    </GridList>
  );
}
