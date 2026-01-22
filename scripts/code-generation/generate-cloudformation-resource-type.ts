import fs from 'node:fs';
import { join } from 'node:path';

/**
 * Converts a CloudFormation type name back to the AWS type string
 * @example 'AwsS3Bucket' -> 'AWS::S3::Bucket'
 * @example 'AwsLambdaFunction' -> 'AWS::Lambda::Function'
 */
function typeNameToAwsType(typeName: string): string {
  // Remove 'Aws' prefix
  const withoutPrefix = typeName.replace(/^Aws/, '');

  // This is tricky - we need to split into service and resource
  // We can use a list of known services to help with this
  const knownServices = [
    'S3',
    'Lambda',
    'Logs',
    'Ec2',
    'Iam',
    'Rds',
    'Dynamodb',
    'Sqs',
    'Sns',
    'Cloudfront',
    'Route53',
    'Apigateway',
    'Apigatewayv2',
    'Ecs',
    'Ecr',
    'Elasticloadbalancingv2',
    'Elasticache',
    'Elasticsearch',
    'Opensearchservice',
    'Secretsmanager',
    'Ssm',
    'Cloudwatch',
    'Events',
    'Scheduler',
    'Stepfunctions',
    'Kinesis',
    'Firehose',
    'Cognito',
    'Wafv2',
    'Cloudformation',
    'Codedeploy',
    'Codebuild',
    'Codepipeline',
    'Batch',
    'Efs',
    'Kms',
    'Acm',
    'Ses',
    'Pipes',
    'Applicationautoscaling',
    'Autoscaling',
    'Apprunner',
    'Appsync',
    'Athena',
    'Backup',
    'Cloudtrail',
    'Config',
    'Dax',
    'Docdb',
    'Glue',
    'Iot',
    'Msk',
    'Neptune',
    'Redshift',
    'Sagemaker',
    'Transfer',
    'Vpc',
    'Vpclattice',
    'Waf',
    'Wafregional',
    'Workspaces',
    'Workspacesweb',
    'Workspacesthinclient',
    'Xray',
    'Wisdom',
    'Voiceid',
    'Verifiedpermissions',
    'Timestream',
    'Synthetics',
    'Supportapp',
    'Systemsmanagersap',
    'Ssmcontacts',
    'Ssmincidents',
    'Sso',
    'Amplify',
    'Amplifyuibuilder',
    'Amazonmq',
    'Appconfig',
    'Appflow',
    'Appintegrations',
    'Applicationinsights',
    'Applicationsignals',
    'Appmesh',
    'Appstream',
    'Apptest',
    'Aps',
    'Arczonalshift',
    'Auditmanager',
    'Autoscalingplans',
    'B2bi',
    'Bcmdataexports',
    'Bedrock',
    'Billingconductor',
    'Budgets',
    'Cassandra',
    'Ce',
    'Certificatemanager',
    'Chatbot',
    'Cleanrooms',
    'Cleanroomsml',
    'Cloud9',
    'Codeartifact',
    'Codecommit',
    'Codeconnections',
    'Codeguruprofiler',
    'Codegurureview',
    'Codestar',
    'Codestarconnections',
    'Codestarnotifications',
    'Comprehend',
    'Connect',
    'Connectcampaigns',
    'Controltower',
    'Cur',
    'Customerprofiles',
    'Databrew',
    'Datapipeline',
    'Datasync',
    'Dms',
    'Detective',
    'Devopsguru',
    'Directoryservice',
    'Dlm',
    'Deadline',
    'Emr',
    'Emrcontainers',
    'Emrserverless',
    'Elasticbeanstalk',
    'Entityresolution',
    'Evidently',
    'Finspace',
    'Fis',
    'Fms',
    'Forecast',
    'Frauddetector',
    'Fsx',
    'Gamelift',
    'Globalaccelerator',
    'Grafana',
    'Greengrass',
    'Greengrassv2',
    'Groundstation',
    'Guardduty',
    'Healthimaging',
    'Healthlake',
    'Imagebuilder',
    'Inspector',
    'Inspectorv2',
    'Internetmonitor',
    'Ivs',
    'Ivschat',
    'Kafkaconnect',
    'Kendra',
    'Kendraranking',
    'Lakeformation',
    'Launchwizard',
    'Lex',
    'Licensemanager',
    'Lightsail',
    'Location',
    'Lookoutequipment',
    'Lookoutmetrics',
    'Lookoutvision',
    'M2',
    'Macie',
    'Managedblockchain',
    'Mediaconnect',
    'Mediaconvert',
    'Medialive',
    'Mediapackage',
    'Mediapackagev2',
    'Mediastore',
    'Mediatailor',
    'Memorydb',
    'Mwaa',
    'Networkfirewall',
    'Networkmanager',
    'Nimblestudio',
    'Oam',
    'Omics',
    'Opensearchserverless',
    'Opsworks',
    'Opsworkscm',
    'Organizations',
    'Osis',
    'Panorama',
    'Pcaconnectorad',
    'Pcaconnectorscep',
    'Personalize',
    'Pinpoint',
    'Pinpointemail',
    'Proton',
    'Qldb',
    'Quicksight',
    'Ram',
    'Rbin',
    'Rekognition',
    'Resiliencehub',
    'Resourceexplorer2',
    'Resourcegroups',
    'Robomaker',
    'Rolesanywhere',
    'Rum',
    'Securityhub',
    'Securitylake',
    'Servicecatalog',
    'Servicecatalogappregistry',
    'Servicediscovery',
    'Shield',
    'Signer',
    'Simspaceweaver',
    'Sns',
    'Accessanalyzer',
    'Acmpca',
    'Alexaask',
    'Bedrock',
    'Cloudtrail',
    'Docdb',
    'Docdbelastic',
    'Docddelastic'
  ];

  // Sort by length descending to match longer services first
  const sortedServices = [...knownServices].sort((a, b) => b.length - a.length);

  let serviceName = '';
  let resourceName = '';

  for (const service of sortedServices) {
    if (withoutPrefix.startsWith(service)) {
      serviceName = service;
      resourceName = withoutPrefix.slice(service.length);
      break;
    }
  }

  if (!serviceName) {
    // Fallback: try to split on capital letters
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const match = withoutPrefix.match(/^([A-Z][a-z0-9]*)(.*)$/);
    if (match) {
      serviceName = match[1];
      resourceName = match[2];
    } else {
      return `AWS::Unknown::${withoutPrefix}`;
    }
  }

  // Convert service name to proper casing
  const serviceMap: Record<string, string> = {
    s3: 'S3',
    lambda: 'Lambda',
    logs: 'Logs',
    ec2: 'EC2',
    iam: 'IAM',
    rds: 'RDS',
    dynamodb: 'DynamoDB',
    sqs: 'SQS',
    sns: 'SNS',
    cloudfront: 'CloudFront',
    route53: 'Route53',
    apigateway: 'ApiGateway',
    apigatewayv2: 'ApiGatewayV2',
    ecs: 'ECS',
    ecr: 'ECR',
    elasticloadbalancingv2: 'ElasticLoadBalancingV2',
    elasticache: 'ElastiCache',
    elasticsearch: 'Elasticsearch',
    opensearchservice: 'OpenSearchService',
    secretsmanager: 'SecretsManager',
    ssm: 'SSM',
    cloudwatch: 'CloudWatch',
    events: 'Events',
    scheduler: 'Scheduler',
    stepfunctions: 'StepFunctions',
    kinesis: 'Kinesis',
    firehose: 'Firehose',
    cognito: 'Cognito',
    wafv2: 'WAFv2',
    cloudformation: 'CloudFormation',
    codedeploy: 'CodeDeploy',
    codebuild: 'CodeBuild',
    codepipeline: 'CodePipeline',
    batch: 'Batch',
    efs: 'EFS',
    kms: 'KMS',
    acm: 'ACM',
    ses: 'SES',
    pipes: 'Pipes',
    applicationautoscaling: 'ApplicationAutoScaling',
    autoscaling: 'AutoScaling',
    apprunner: 'AppRunner',
    appsync: 'AppSync',
    athena: 'Athena',
    backup: 'Backup',
    cloudtrail: 'CloudTrail',
    config: 'Config',
    dax: 'DAX',
    docdb: 'DocDB',
    docdbelastic: 'DocDBElastic',
    glue: 'Glue',
    iot: 'IoT',
    msk: 'MSK',
    neptune: 'Neptune',
    redshift: 'Redshift',
    sagemaker: 'SageMaker',
    transfer: 'Transfer',
    vpc: 'VPC',
    vpclattice: 'VpcLattice',
    waf: 'WAF',
    wafregional: 'WAFRegional'
  };

  const properServiceName = serviceMap[serviceName.toLowerCase()] || serviceName;

  // Convert resource name: Bucket -> Bucket, Bucketpolicy -> BucketPolicy
  // Actually, the resource name is already in the right format for the type
  // We just need to capitalize it properly
  const properResourceName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);

  return `AWS::${properServiceName}::${properResourceName}`;
}

/**
 * Generates the CloudFormationResource union type.
 * When generatedTypes is provided, only those types are included in the union.
 * Otherwise, falls back to reading all types from cloudformation-ts-types directory.
 */
export function generateCloudFormationResourceType(generatedTypes?: Set<string>): string {
  const resourceTypes: Array<{ typeName: string; awsType: string }> = [];

  if (generatedTypes && generatedTypes.size > 0) {
    // Use only the types that were actually generated
    for (const typeName of generatedTypes) {
      const awsType = typeNameToAwsType(typeName);
      resourceTypes.push({ typeName, awsType });
    }
  } else {
    // Fallback: read all types from directory
    const typesDir = join(process.cwd(), '@generated', 'cloudformation-ts-types');

    if (!fs.existsSync(typesDir)) {
      console.warn('[generate-cloudformation-resource] Types directory not found:', typesDir);
      return '';
    }

    const files = fs.readdirSync(typesDir).filter((f) => f.endsWith('.ts'));

    for (const file of files) {
      const typeName = file.replace('.ts', '');
      const awsType = typeNameToAwsType(typeName);
      resourceTypes.push({ typeName, awsType });
    }
  }

  // Sort for consistent output
  resourceTypes.sort((a, b) => a.awsType.localeCompare(b.awsType));

  // Generate the base CloudFormation resource attributes
  const baseAttributes = `
/**
 * Base CloudFormation resource attributes that apply to all resources
 */
export type CloudFormationResourceBase = {
  /** Dependencies on other resources */
  DependsOn?: string | string[];
  /** Resource metadata */
  Metadata?: Record<string, unknown>;
  /** Condition for resource creation */
  Condition?: string;
  /** Deletion policy */
  DeletionPolicy?: 'Delete' | 'Retain' | 'Snapshot' | 'RetainExceptOnCreate';
  /** Update replace policy */
  UpdateReplacePolicy?: 'Delete' | 'Retain' | 'Snapshot';
  /** Creation policy */
  CreationPolicy?: {
    AutoScalingCreationPolicy?: { MinSuccessfulInstancesPercent?: number };
    ResourceSignal?: { Count?: number; Timeout?: string };
  };
  /** Update policy */
  UpdatePolicy?: Record<string, unknown>;
};
`;

  // Generate individual resource types (only if we have any)
  const resourceTypeUnion =
    resourceTypes.length > 0
      ? resourceTypes
          .map(
            ({ typeName, awsType }) =>
              `  | { Type: '${awsType}'; Properties?: ${typeName} } & CloudFormationResourceBase`
          )
          .join('\n')
      : '';

  const result = `${baseAttributes}

/**
 * Union type of all CloudFormation resources.
 * Each resource has a Type field (discriminant) and Properties typed to match.
 */
export type CloudFormationResource =
${resourceTypeUnion}
  /** Fallback for any CloudFormation resource type not explicitly listed */
  | { Type: string; Properties?: Record<string, unknown> } & CloudFormationResourceBase;
`;

  return result;
}

// For testing
if (process.argv[1]?.includes('generate-cloudformation-resource-type')) {
  const result = generateCloudFormationResourceType();
  console.log('Generated CloudFormationResource type');
  console.log('Total types:', result.split('\n').filter((l) => l.includes('| {')).length);
  console.log('\nFirst 3000 chars:');
  console.log(result.substring(0, 3000));
}
