import type { RdsEngineProperties } from '../../__release-npm/types';
import {
  $CfFormat,
  $CfResourceParam,
  $Region,
  $ResourceParam,
  $Secret,
  $Stage,
  Alarm,
  ApplicationLoadBalancer,
  ApplicationLoadBalancerCustomTrigger,
  ApplicationLoadBalancerErrorRateTrigger,
  ApplicationLoadBalancerIntegration,
  ApplicationLoadBalancerUnhealthyTargetsTrigger,
  BatchJob,
  Bucket,
  EventBus,
  HttpApiGateway,
  HttpApiGatewayErrorRateTrigger,
  LambdaErrorRateTrigger,
  LambdaFunction,
  MultiContainerWorkload,
  MultiContainerWorkloadLoadBalancerIntegration,
  RelationalDatabase,
  RelationalDatabaseConnectionCountTrigger,
  RelationalDatabaseCPUUtilizationTrigger,
  RelationalDatabaseFreeStorageTrigger,
  RelationalDatabaseReadLatencyTrigger,
  RelationalDatabaseWriteLatencyTrigger,
  ScheduleIntegration,
  SqsQueue,
  SqsQueueNotEmptyTrigger,
  SqsQueueReceivedMessagesCountTrigger,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging
} from '../../__release-npm';
import {
  CLOUDINARY_ENV_VARS,
  COMMON_ENV_VARS,
  GOOGLE_ENV_VARS,
  POSTGRES_ENV_VAR_WITH_CONNECTION_LIMIT,
  PRODUCTION_STAGE,
  STAGING_STAGE
} from './env';
import { EVENT_BRIDGE_SCHEDULER_IAM_STATEMENTS, SHOPIFY_SHOP_SECRETS_IAM_STATEMENTS } from './iam';
import { getNotificationTargets } from './notifications';
import { getCustomCertificateArn } from './resources/certificates';

export const getResources = ({ stage }: { stage: string }) => {
  const mainLoadBalancer = new ApplicationLoadBalancer({
    ...(stage === PRODUCTION_STAGE && {
      customDomains: ['api.receipts.xyz'],
      listeners: [
        {
          protocol: 'HTTPS',
          port: 443,
          customCertificateArns: [getCustomCertificateArn(stage)]
        },
        {
          protocol: 'HTTP',
          port: 80,
          defaultAction: {
            type: 'redirect',
            properties: {
              statusCode: 'HTTP_301',
              protocol: 'HTTPS'
            }
          }
        }
      ]
    }),
    alarms: [
      new Alarm({
        trigger: new ApplicationLoadBalancerErrorRateTrigger({
          comparisonOperator: 'GreaterThanOrEqualToThreshold',
          thresholdPercent: 90
        }),
        evaluation: { period: 60, evaluationPeriods: 5, breachedPeriods: 4 },
        notificationTargets: getNotificationTargets(stage),
        description: 'Main Load Balancer 90% Error Rate'
      }),
      new Alarm({
        trigger: new ApplicationLoadBalancerCustomTrigger({
          metric: 'UnHealthyHostCount',
          threshold: 1,
          statistic: 'sum'
        }),
        evaluation: { period: 300 },
        notificationTargets: getNotificationTargets(stage),
        description: 'Unhealthy Host Count'
      }),
      new Alarm({
        trigger: new ApplicationLoadBalancerCustomTrigger({
          metric: 'RejectedConnectionCount',
          threshold: 1,
          statistic: 'sum'
        }),
        evaluation: { period: 60 },
        notificationTargets: getNotificationTargets(stage),
        description: 'Rejected Connection Count > 1'
      }),
      new Alarm({
        trigger: new ApplicationLoadBalancerCustomTrigger({
          metric: 'HTTPCode_Target_5XX_Count',
          threshold: 50,
          statistic: 'sum'
        }),
        evaluation: { period: 300 },
        notificationTargets: getNotificationTargets(stage),
        description: 'API Server5XX Error Count > 50'
      }),
      new Alarm({
        trigger: new ApplicationLoadBalancerCustomTrigger({
          metric: 'HTTPCode_Target_5XX_Count',
          threshold: 0,
          statistic: 'avg'
        }),
        evaluation: { period: 120 },
        notificationTargets: getNotificationTargets(stage),
        description: 'Ingest Server5XX Error Count > 0'
      }),
      new Alarm({
        trigger: new ApplicationLoadBalancerUnhealthyTargetsTrigger({
          thresholdPercent: 0,
          onlyIncludeTargets: ['apiServer']
        }),
        evaluation: { period: 60 },
        notificationTargets: getNotificationTargets(stage),
        description: 'API Server Unhealthy Targets > 1'
      }),
      new Alarm({
        trigger: new ApplicationLoadBalancerUnhealthyTargetsTrigger({
          thresholdPercent: 0,
          onlyIncludeTargets: ['ingestServer']
        }),
        evaluation: { period: 60 },
        notificationTargets: getNotificationTargets(stage),
        description: 'Ingest Server Unhealthy Targets > 1'
      })
    ],
    overrides: {
      MainLoadBalancerLoadBalancer: {
        LoadBalancerAttributes: [
          { Key: 'access_logs.s3.enabled', Value: true },
          { Key: 'access_logs.s3.bucket', Value: $ResourceParam('archiveBucket', 'name') },
          { Key: 'access_logs.s3.prefix', Value: 'logs-mainLoadBalancer' },
          { Key: 'connection_logs.s3.enabled', Value: true },
          { Key: 'connection_logs.s3.bucket', Value: $ResourceParam('archiveBucket', 'name') }
        ]
      },
      ApplicationLoadBalancerCustomForMainLoadBalancer3Alarm: {
        AlarmName: 'ApiServer500Alarm',
        'Metrics.0.MetricStat.Metric.Dimensions.1': {
          Name: 'TargetGroup',
          Value: $CfResourceParam('ApiServerMainLoadBalancerToPort3000TargetGroup', 'TargetGroupFullName')
        }
      },
      ApplicationLoadBalancerCustomForMainLoadBalancer4Alarm: {
        AlarmName: 'IngestServer500Alarm',
        'Metrics.0.MetricStat.Metric.Dimensions.1': {
          Name: 'TargetGroup',
          Value: $CfResourceParam('IngestServerMainLoadBalancerToPort3000TargetGroup', 'TargetGroupFullName')
        }
      }
    }
  });

  const mainApiGateway = new HttpApiGateway({
    cors: { enabled: true },
    logging: { disabled: false, retentionDays: 7 },
    cdn: { enabled: false },
    ...(stage === PRODUCTION_STAGE && {
      customDomains: [
        {
          domainName: 'apig.receipts.xyz',
          disableDnsRecordCreation: true,
          customCertificateArn: getCustomCertificateArn(stage)
        }
      ]
    }),
    alarms: [
      new Alarm({
        trigger: new HttpApiGatewayErrorRateTrigger({
          comparisonOperator: 'GreaterThanOrEqualToThreshold',
          thresholdPercent: 50
        }),
        evaluation: { period: 60, evaluationPeriods: 5, breachedPeriods: 4 },
        notificationTargets: getNotificationTargets(stage),
        description: 'API Gateway Error Rate > 50%'
      })
    ]
  });

  const mainPostgresDatabase = new RelationalDatabase({
    deletionProtection: true,
    credentials: {
      masterUserName: $Secret('main-database-credentials.userName'),
      masterUserPassword: $Secret('main-database-credentials.password')
    },
    engine: {
      type: 'postgres',
      properties: {
        dbName: 'receiptsMainDb',
        primaryInstance: {
          instanceSize: stage === PRODUCTION_STAGE ? 'db.t4g.large' : 'db.t4g.micro',
          multiAz: stage === PRODUCTION_STAGE
        },
        version: '15.10'
      } as RdsEngineProperties
    },
    accessibility: { accessibilityMode: 'internet' },
    automatedBackupRetentionDays: 7,
    logging: { retentionDays: 14 },
    alarms: [
      new Alarm({
        trigger: new RelationalDatabaseReadLatencyTrigger({
          comparisonOperator: 'GreaterThanThreshold',
          thresholdSeconds: 2,
          statistic: 'p90'
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'RDS Database Read Latency > 3s'
      }),
      new Alarm({
        trigger: new RelationalDatabaseWriteLatencyTrigger({
          comparisonOperator: 'GreaterThanThreshold',
          thresholdSeconds: 2,
          statistic: 'p90'
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'RDS Database Write Latency > 3s'
      }),
      new Alarm({
        trigger: new RelationalDatabaseCPUUtilizationTrigger({
          comparisonOperator: 'GreaterThanThreshold',
          thresholdPercent: 75,
          statistic: 'avg'
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'RDS Database CPU Utilization > 75%'
      }),
      new Alarm({
        trigger: new RelationalDatabaseFreeStorageTrigger({
          comparisonOperator: 'LessThanOrEqualToThreshold',
          thresholdMB: 1000,
          statistic: 'avg'
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'RDS Database Free Storage < 1GB'
      }),
      new Alarm({
        trigger: new RelationalDatabaseConnectionCountTrigger({
          comparisonOperator: 'GreaterThanOrEqualToThreshold',
          thresholdCount: 300,
          statistic: 'avg'
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'RDS Database Connection Count > 300'
      })
    ],
    overrides: {
      MainPostgresDatabaseDbParameterGroup: {
        Parameters: { 'rds.allowed_extensions': '*' }
      }
    }
  });

  const mainEventBus = new EventBus({
    archivation: {
      enabled: true,
      retentionDays: 7
    }
  });

  const privateRawDataS3 = new Bucket({
    versioning: true,
    enableEventBusNotifications: true
  });

  const publicDataBucket = new Bucket({
    cdn: {
      enabled: stage !== 'dev',
      cloudfrontPriceClass: 'PriceClass_100',
      disableInvalidationAfterDeploy: true,
      cachingOptions: { maxTTL: 1209600, defaultTTL: 1209600, minTTL: 0 },
      forwardingOptions: { allowedMethods: ['GET', 'HEAD', 'OPTIONS'] },
      ...(stage === PRODUCTION_STAGE && {
        customDomains: [
          {
            domainName: 'data.receipts.xyz',
            disableDnsRecordCreation: true,
            customCertificateArn: getCustomCertificateArn(stage)
          }
        ]
      })
    },
    accessibility: { accessibilityMode: 'public-read' },
    cors: { enabled: true },
    versioning: false,
    enableEventBusNotifications: true
  });

  const archiveBucket = new Bucket({
    accessibility: {
      accessibilityMode: 'private',
      accessPolicyStatements: [
        {
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::127311923021:root' },
          Action: ['s3:PutObject'],
          Resource: [$CfFormat('{}/*', $ResourceParam('archiveBucket', 'arn'))]
        }
      ]
    }
  });

  const privateS3OriginImages = new Bucket({
    accessibility: {
      accessibilityMode: 'private',
      accessPolicyStatements: [
        {
          Resource: [$CfFormat('{}/*', $ResourceParam('privateS3OriginImages', 'arn'))],
          Action: ['s3:GetObject'],
          Principal: { AWS: ['arn:aws:iam::232482882421:root'] },
          Effect: 'Allow'
        }
      ]
    },
    overrides: {
      PrivateS3OriginImagesBucket: {
        BucketName: `cloudinary-origin-images-${$Stage()}-${$Region()}`
      },
      PrivateS3OriginImagesBucketPolicy: {
        Bucket: `cloudinary-origin-images-${$Stage()}-${$Region()}`
      }
    }
  });

  const mainEventBusDeadLetterQueue = new SqsQueue({ fifoEnabled: false });

  const activitiesForTrackEvaluationQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    visibilityTimeoutSeconds: 300
  });

  const activitiesForTrackEvaluationDlqQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    alarms: [
      new Alarm({
        trigger: new SqsQueueNotEmptyTrigger(),
        notificationTargets: getNotificationTargets(stage),
        description: 'Activities For Track Evaluation DLQ Queue Not Empty'
      })
    ]
  });

  const feedDlqQueue = new SqsQueue({
    alarms: [
      new Alarm({
        trigger: new SqsQueueNotEmptyTrigger(),
        notificationTargets: getNotificationTargets(stage),
        description: 'Feed DLQ Queue Not Empty'
      })
    ]
  });

  const feedQueue = new SqsQueue({
    visibilityTimeoutSeconds: 15,
    redrivePolicy: {
      targetSqsQueueArn: feedDlqQueue.arn,
      maxReceiveCount: 3
    }
  });

  const personalOfferEndSchedulerDlqQueue = new SqsQueue({
    alarms: [
      new Alarm({
        trigger: new SqsQueueNotEmptyTrigger(),
        notificationTargets: getNotificationTargets(stage),
        description: 'EventBridge Scheduler DLQ Queue Not Empty'
      })
    ]
  });

  const pipelineFifoDlqQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    alarms: [
      new Alarm({
        trigger: new SqsQueueNotEmptyTrigger(),
        notificationTargets: getNotificationTargets(stage),
        description: 'Pipeline Main Fifo Queue Not Empty'
      })
    ]
  });

  const pipelineMainFifoQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    visibilityTimeoutSeconds: 300,
    redrivePolicy: {
      targetSqsQueueArn: pipelineFifoDlqQueue.arn,
      maxReceiveCount: 5
    },
    alarms: [
      new Alarm({
        trigger: new SqsQueueReceivedMessagesCountTrigger({
          comparisonOperator: 'GreaterThanOrEqualToThreshold',
          thresholdCount: 500,
          statistic: 'max'
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'Pipeline Main Fifo Queue Not Empty'
      })
    ]
  });

  const supplementalDataQueue = new SqsQueue({ visibilityTimeoutSeconds: 600 });

  const supplementalDataDlqQueue = new SqsQueue({
    alarms: [
      new Alarm({
        trigger: new SqsQueueNotEmptyTrigger(),
        notificationTargets: getNotificationTargets(stage),
        description: 'Supplemental Data DLQ Queue Not Empty'
      })
    ]
  });

  const transactionDlqQueue = new SqsQueue({
    fifoEnabled: true,
    alarms: [
      new Alarm({
        trigger: new SqsQueueNotEmptyTrigger(),
        notificationTargets: getNotificationTargets(stage),
        description: 'Transaction DLQ Queue Not Empty'
      })
    ]
  });

  const transactionQueue = new SqsQueue({
    visibilityTimeoutSeconds: 30,
    fifoEnabled: true,
    contentBasedDeduplication: true,
    redrivePolicy: {
      targetSqsQueueArn: transactionDlqQueue.arn,
      maxReceiveCount: 3
    }
  });

  const personalOfferEndLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './packages/workers/src/lambdas/personalOfferEnd.ts'
    }),
    connectTo: [mainPostgresDatabase, mainEventBus]
  });

  const trackTeamInvitationExpiredLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './packages/workers/src/lambdas/trackTeamInvitationExpired.ts'
    }),
    connectTo: [mainPostgresDatabase, mainEventBus]
  });

  const trackTeamVoidLambda = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './packages/workers/src/lambdas/trackTeamVoid.ts'
    }),
    connectTo: [mainPostgresDatabase, mainEventBus]
  });

  const apiServer = new MultiContainerWorkload({
    resources: {
      cpu: stage === PRODUCTION_STAGE ? 1 : stage === STAGING_STAGE ? 0.5 : 0.25,
      memory: 2048
    },
    connectTo: [
      mainPostgresDatabase,
      mainEventBus,
      privateRawDataS3,
      privateS3OriginImages,
      transactionQueue,
      feedQueue,
      personalOfferEndSchedulerDlqQueue,
      personalOfferEndLambda,
      trackTeamInvitationExpiredLambda,
      trackTeamVoidLambda
    ],
    scaling: {
      minInstances: stage === PRODUCTION_STAGE ? 2 : 1,
      maxInstances: stage === PRODUCTION_STAGE ? 3 : stage === STAGING_STAGE ? 2 : 1
    },
    containers: [
      {
        name: 'graphql-api-container',
        packaging: {
          type: 'stacktape-image-buildpack',
          properties: {
            entryfilePath: './packages/api/src/index.ts',
            languageSpecificConfig: { tsConfigPath: './packages/api/tsconfig.json', nodeVersion: 22 },
            customDockerBuildCommands: ['apk add --no-cache openssl']
          }
        },
        logging: { retentionDays: 14 },
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
          intervalSeconds: 20,
          timeoutSeconds: 5,
          startPeriodSeconds: 150,
          retries: 2
        },
        environment: {
          PORT: 3000,
          S3_ORIGIN_IMAGES_BUCKET_NAME: privateS3OriginImages.name,
          GOOGLE_SHEETS_WAITLIST_ID: $Secret('google-config.waitlist_spreadsheet_id'),
          PERSONAL_OFFER_END_LAMBDA_ROLE_ARN: $CfResourceParam('PersonalOfferEndLambdaRole', 'Arn'),
          TRACK_TEAM_INVITATION_EXPIRED_LAMBDA_ROLE_ARN: $CfResourceParam(
            'TrackTeamInvitationExpiredLambdaRole',
            'Arn'
          ),
          TRACK_TEAM_VOID_LAMBDA_ROLE_ARN: $CfResourceParam('TrackTeamVoidLambdaRole', 'Arn'),
          ...CLOUDINARY_ENV_VARS,
          ...GOOGLE_ENV_VARS,
          ...COMMON_ENV_VARS(stage)
        },
        events: [
          new MultiContainerWorkloadLoadBalancerIntegration({
            containerPort: 3000,
            loadBalancerName: mainLoadBalancer.resourceName,
            priority: 2,
            listenerPort: stage === PRODUCTION_STAGE ? 443 : undefined,
            paths: ['/', '/health', '/user/*', '/graphql', '/media/*']
          }),
          new MultiContainerWorkloadLoadBalancerIntegration({
            containerPort: 3000,
            loadBalancerName: mainLoadBalancer.resourceName,
            priority: 4,
            listenerPort: stage === PRODUCTION_STAGE ? 443 : undefined,
            paths: ['/intercom/auth', '/waitlist/*', '/extensions/*', '/shops/*']
          })
        ]
      }
    ],
    iamRoleStatements: [
      ...EVENT_BRIDGE_SCHEDULER_IAM_STATEMENTS(),
      ...SHOPIFY_SHOP_SECRETS_IAM_STATEMENTS(),
      {
        Effect: 'Allow',
        Action: ['iam:PassRole'],
        Resource: [$CfResourceParam('PersonalOfferEndLambdaRole', 'Arn')]
      },
      {
        Effect: 'Allow',
        Action: ['iam:PassRole'],
        Resource: [$CfResourceParam('TrackTeamInvitationExpiredLambdaRole', 'Arn')]
      },
      {
        Effect: 'Allow',
        Action: ['iam:PassRole'],
        Resource: [$CfResourceParam('TrackTeamVoidLambdaRole', 'Arn')]
      }
    ],
    overrides: {
      ApiServerMainLoadBalancerToPort3000TargetGroup: {
        HealthCheckPath: '/health',
        HealthCheckIntervalSeconds: 20,
        HealthCheckTimeoutSeconds: 5,
        HealthyThresholdCount: 2,
        UnhealthyThresholdCount: 2
      }
    }
  });

  const ingestServer = new MultiContainerWorkload({
    resources: {
      cpu: stage === PRODUCTION_STAGE ? 1 : stage === STAGING_STAGE ? 0.5 : 0.25,
      memory: stage === PRODUCTION_STAGE || stage === STAGING_STAGE ? 2048 : 512
    },
    connectTo: [mainPostgresDatabase, mainEventBus, privateRawDataS3],
    scaling: {
      minInstances: stage === PRODUCTION_STAGE ? 2 : 1,
      maxInstances: stage === PRODUCTION_STAGE ? 3 : stage === STAGING_STAGE ? 2 : 1
    },
    containers: [
      {
        name: 'ingest-container',
        packaging: {
          type: 'stacktape-image-buildpack',
          properties: {
            entryfilePath: './packages/ingest/src/app.ts',
            languageSpecificConfig: { tsConfigPath: './packages/ingest/tsconfig.json', nodeVersion: 22 },
            customDockerBuildCommands: ['apk add --no-cache openssl']
          }
        },
        logging: { retentionDays: 14 },
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/v1/health || exit 1'],
          intervalSeconds: 20,
          timeoutSeconds: 5,
          startPeriodSeconds: 150,
          retries: 2
        },
        environment: { PORT: 3000, ...COMMON_ENV_VARS(stage) },
        events: [
          new MultiContainerWorkloadLoadBalancerIntegration({
            containerPort: 3000,
            loadBalancerName: mainLoadBalancer.resourceName,
            priority: 3,
            listenerPort: stage === PRODUCTION_STAGE ? 443 : undefined,
            paths: ['/v1/health', '/v1/ingest/*']
          })
        ]
      }
    ],
    iamRoleStatements: [{ Effect: 'Allow', Action: ['cloudwatch:PutMetricData'], Resource: ['*'] }],
    overrides: {
      IngestServerMainLoadBalancerToPort3000TargetGroup: {
        HealthCheckPath: '/v1/health',
        HealthCheckIntervalSeconds: 20,
        HealthCheckTimeoutSeconds: 5,
        HealthyThresholdCount: 2,
        UnhealthyThresholdCount: 2
      }
    }
  });

  const publicApiLambda = new LambdaFunction({
    memory: stage === PRODUCTION_STAGE ? 1024 : 256,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './packages/api-public/src/index.ts',
      languageSpecificConfig: {
        tsConfigPath: './packages/api-public/tsconfig.json',
        disableSourceMaps: true,
        nodeVersion: 24
      }
    }),
    connectTo: [mainEventBus, mainPostgresDatabase],
    environment: {
      ...COMMON_ENV_VARS(stage),
      ...POSTGRES_ENV_VAR_WITH_CONNECTION_LIMIT(1),
      KNOCK_WEBHOOK_SECRET: $Secret('knock-credentials.webhook_secret')
    },
    alarms: [
      new Alarm({
        trigger: new LambdaErrorRateTrigger({
          comparisonOperator: 'GreaterThanThreshold',
          thresholdPercent: 50
        }),
        notificationTargets: getNotificationTargets(stage),
        description: 'Public API Lambda Error Rate > 50%'
      })
    ],
    events: [
      new ApplicationLoadBalancerIntegration({
        loadBalancerName: mainLoadBalancer.resourceName,
        listenerPort: stage === PRODUCTION_STAGE ? 443 : undefined,
        priority: 1,
        paths: ['/invite', '/invite/*', '/webhooks', '/webhooks/*']
      })
    ]
  });

  const authenticationProcessor = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/authenticationProcessor.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [new ScheduleIntegration({ scheduleRate: 'cron(0 6 ? * Mon *)' })],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  const groupWeekChangeProcessor = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/groupWeekChangeProcessor.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [new ScheduleIntegration({ scheduleRate: 'cron(1 0 ? * Mon *)' })],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  const personalGoalsWeeklyChangeProcessor = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/personalGoalsWeeklyChangeProcessor.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [new ScheduleIntegration({ scheduleRate: 'cron(1 0 ? * Mon *)' })],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  const streaksWeeklyChangeProcessor = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/streaksWeeklyChangeProcessor.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [new ScheduleIntegration({ scheduleRate: 'cron(1 0 ? * Mon *)' })],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  const syncKnockUsersBatchJob = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/syncKnockUsers.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [new ScheduleIntegration({ scheduleRate: 'cron(0 6 ? * Mon *)' })],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  const tracksJanitor = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/tracksJanitor.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [new ScheduleIntegration({ scheduleRate: 'cron(1 0 ? * Mon *)' })],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  const tracksNotifier = new BatchJob({
    useSpotInstances: false,
    logging: { retentionDays: 30 },
    retryConfig: { attempts: 2, retryIntervalSeconds: 120 },
    resources: { cpu: 2, memory: 1800 },
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './packages/workers/src/batchJobs/tracksNotifier.ts',
        languageSpecificConfig: { nodeVersion: 22 },
        customDockerBuildCommands: ['apk add --no-cache openssl']
      }),
      environment: {
        STP_MAIN_POSTGRES_DATABASE_CONNECTION_STRING: mainPostgresDatabase.connectionString,
        AWS_REGION: $Region(),
        ...COMMON_ENV_VARS(stage)
      }
    },
    events: [
      new ScheduleIntegration({ scheduleRate: 'cron(0 6 * * ? *)', input: { jobType: 'notifyIterationStarts' } }),
      new ScheduleIntegration({ scheduleRate: 'cron(10 22 ? * WED *)', input: { jobType: 'notifyMidTracks' } })
    ],
    connectTo: [publicDataBucket, mainEventBus, mainPostgresDatabase]
  });

  return {
    mainLoadBalancer,
    mainApiGateway,
    mainPostgresDatabase,
    mainEventBus,
    privateRawDataS3,
    publicDataBucket,
    archiveBucket,
    privateS3OriginImages,
    mainEventBusDeadLetterQueue,
    activitiesForTrackEvaluationQueue,
    activitiesForTrackEvaluationDlqQueue,
    feedQueue,
    feedDlqQueue,
    personalOfferEndSchedulerDlqQueue,
    pipelineMainFifoQueue,
    pipelineFifoDlqQueue,
    supplementalDataQueue,
    supplementalDataDlqQueue,
    transactionQueue,
    transactionDlqQueue,
    personalOfferEndLambda,
    trackTeamInvitationExpiredLambda,
    trackTeamVoidLambda,
    apiServer,
    ingestServer,
    publicApiLambda,
    authenticationProcessor,
    groupWeekChangeProcessor,
    personalGoalsWeeklyChangeProcessor,
    streaksWeeklyChangeProcessor,
    syncKnockUsersBatchJob,
    tracksJanitor,
    tracksNotifier
  };
};
