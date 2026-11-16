/**
 * The shape of a SaaS backend as deployed with Stacktape 3.7.1 from a TypeScript config and the `stacktape` npm
 * package: a GraphQL container with a sidecar behind a load balancer with custom listeners and priority rules, a single
 * page app whose CDN routes the API to that load balancer, Lambda functions with error-rate alarms that notify a
 * webhook, an Aurora PostgreSQL cluster in raw CloudFormation with its own alarm, and an afterDeploy migration that the
 * CI runner runs against that cluster. The backend's batch jobs are in ./stacktape.ts only: since 30 June 2026 AWS
 * Batch refuses the Amazon Linux 2 compute environments that 3.7.1 creates, so 3.7.1 can no longer deploy them. scripts/real-aws/v3-upgrade-canary.ts deploys it with the
 * 3.7.1 CLI and package, then deploys ./stacktape.ts (the same stack after the documented migration) with the current
 * CLI and package.
 *
 * The canary replaces __OWNER__, __RUNNER_IP__ and __SECRET_NAME__ in its copy of this file.
 */
import {
  $CfResourceParam,
  $ResourceParam,
  $Secret,
  ApplicationLoadBalancer,
  ApplicationLoadBalancerIntegration,
  CustomDockerfilePackaging,
  defineConfig,
  HostingBucket,
  LambdaErrorRateTrigger,
  LambdaFunction,
  MultiContainerWorkload,
  ScheduleIntegration,
  SqsIntegration,
  SqsQueue,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

const partnerApiKey = { PARTNER_API_KEY: $Secret('__SECRET_NAME__.partnerApiKey') };
const databaseHost = $CfResourceParam('AuroraPostgresDatabaseDBCluster', 'Endpoint.Address');

const alarmed = (
  entryfilePath: string,
  extra: { events?: (ScheduleIntegration | ApplicationLoadBalancerIntegration)[] } = {}
) =>
  new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath }),
    environment: partnerApiKey,
    alarms: [
      {
        trigger: new LambdaErrorRateTrigger({ thresholdPercent: 5 }),
        notificationTargets: [{ type: 'webhook', properties: { url: $ResourceParam('alarmSink', 'url') } }]
      }
    ],
    ...extra
  });

export default defineConfig(() => {
  const mainLoadBalancer = new ApplicationLoadBalancer({
    listeners: [
      { protocol: 'HTTP', port: 80 },
      { protocol: 'HTTP', port: 8080, whitelistIps: ['__RUNNER_IP__/32'] }
    ]
  });

  const apiServer = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    scaling: { minInstances: 1, maxInstances: 2 },
    containers: [
      {
        name: 'graphql-api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/api/server.ts' }),
        environment: { ...partnerApiKey, DATABASE_HOST: databaseHost },
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              containerPort: 3000,
              loadBalancerName: 'mainLoadBalancer',
              listenerPort: 80,
              priority: 10,
              paths: ['/graphql*']
            }
          }
        ],
        loadBalancerHealthCheck: { healthcheckPath: '/health' }
      },
      {
        name: 'metrics-agent',
        essential: false,
        packaging: new CustomDockerfilePackaging({ buildContextPath: './sidecar' })
      }
    ]
  });

  const appUi = new HostingBucket({
    uploadDirectoryPath: './app-ui',
    hostingContentType: 'single-page-app',
    routeRewrites: [
      {
        path: '/graphql*',
        routeTo: {
          type: 'application-load-balancer',
          properties: { loadBalancerName: 'mainLoadBalancer', listenerPort: 80 }
        }
      }
    ]
  });

  const jobsQueue = new SqsQueue({});
  const webhookQueue = new SqsQueue({});

  const alarmSink = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/functions/alarmSink.ts' }),
    url: { enabled: true, authMode: 'NONE' }
  });

  return {
    resources: {
      mainLoadBalancer,
      apiServer,
      appUi,
      jobsQueue,
      webhookQueue,
      alarmSink,
      cardPull: alarmed('./src/functions/cardPull.ts', {
        events: [new ScheduleIntegration({ scheduleRate: 'rate(1 day)' })]
      }),
      webhookWorker: alarmed('./src/functions/webhookWorker.ts'),
      codeMinter: alarmed('./src/functions/codeMinter.ts'),
      tokenRefreshWorker: alarmed('./src/functions/tokenRefreshWorker.ts'),
      maintenance: alarmed('./src/functions/maintenance.ts', {
        events: [
          new ApplicationLoadBalancerIntegration({
            loadBalancerName: 'mainLoadBalancer',
            listenerPort: 8080,
            priority: 1,
            paths: ['/admin/*']
          })
        ]
      }),
      reportExporter: alarmed('./src/functions/reportExporter.ts'),
      inviteSender: new LambdaFunction({
        packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/functions/inviteSender.ts' }),
        environment: partnerApiKey
      }),
      webhookIngress: new LambdaFunction({
        packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/functions/webhookIngress.ts' }),
        events: [
          new ApplicationLoadBalancerIntegration({
            loadBalancerName: 'mainLoadBalancer',
            listenerPort: 80,
            priority: 20,
            paths: ['/hooks/*']
          })
        ]
      }),
      queueConsumer: new LambdaFunction({
        packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/functions/queueConsumer.ts' }),
        events: [new SqsIntegration({ sqsQueueName: 'webhookQueue', batchSize: 1 })]
      })
    },
    scripts: {
      migrate: {
        type: 'local-script',
        properties: {
          executeCommand: 'node scripts/migrate.mjs',
          environment: [
            { name: 'DATABASE_HOST', value: databaseHost },
            { name: 'DATABASE_PASSWORD', value: $Secret('__SECRET_NAME__.dbPassword') }
          ]
        }
      }
    },
    hooks: { afterDeploy: [{ scriptName: 'migrate' }] },
    cloudformationResources: {
      AuroraDbSubnetGroup: {
        Type: 'AWS::RDS::DBSubnetGroup',
        Properties: {
          DBSubnetGroupDescription: 'Application database',
          SubnetIds: [{ Ref: 'StpPublicSubnet0' }, { Ref: 'StpPublicSubnet1' }]
        }
      },
      AuroraDbSecurityGroup: {
        Type: 'AWS::EC2::SecurityGroup',
        Properties: {
          GroupDescription: 'Application database',
          VpcId: { Ref: 'StpVpc' },
          SecurityGroupIngress: [
            { IpProtocol: 'tcp', FromPort: 5432, ToPort: 5432, CidrIp: '__RUNNER_IP__/32' },
            { IpProtocol: 'tcp', FromPort: 5432, ToPort: 5432, CidrIp: { 'Fn::GetAtt': ['StpVpc', 'CidrBlock'] } }
          ]
        }
      },
      AuroraPostgresDatabaseDBCluster: {
        Type: 'AWS::RDS::DBCluster',
        Properties: {
          Engine: 'aurora-postgresql',
          EngineVersion: '16.8',
          DatabaseName: 'app',
          MasterUsername: 'app_admin',
          MasterUserPassword: $Secret('__SECRET_NAME__.dbPassword'),
          DBSubnetGroupName: { Ref: 'AuroraDbSubnetGroup' },
          VpcSecurityGroupIds: [{ Ref: 'AuroraDbSecurityGroup' }],
          ServerlessV2ScalingConfiguration: { MinCapacity: 0.5, MaxCapacity: 1 },
          BackupRetentionPeriod: 1,
          StorageEncrypted: true
        }
      },
      AuroraPostgresDatabaseInstance: {
        Type: 'AWS::RDS::DBInstance',
        Properties: {
          DBClusterIdentifier: { Ref: 'AuroraPostgresDatabaseDBCluster' },
          DBInstanceClass: 'db.serverless',
          Engine: 'aurora-postgresql',
          PubliclyAccessible: true
        }
      },
      AuroraPostgresDatabaseCpuAlarm: {
        Type: 'AWS::CloudWatch::Alarm',
        Properties: {
          AlarmDescription: 'Application database CPU above 80%',
          Namespace: 'AWS/RDS',
          MetricName: 'CPUUtilization',
          Dimensions: [{ Name: 'DBClusterIdentifier', Value: { Ref: 'AuroraPostgresDatabaseDBCluster' } }],
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 3,
          Threshold: 80,
          ComparisonOperator: 'GreaterThanThreshold'
        }
      }
    },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: '__OWNER__' }] }
  };
});
