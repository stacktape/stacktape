export type DiagramFixtureExpectation = {
  minNodes: number;
  minConnectors: number;
  hasVpc?: boolean;
  connectorSemantics?: Array<'request' | 'event' | 'dependency' | 'egress'>;
};

export type DiagramFixture = {
  id: string;
  title: string;
  description: string;
  yaml: string;
  expectation: DiagramFixtureExpectation;
};

export const diagramFixtures: DiagramFixture[] = [
  {
    id: 'default-microservices',
    title: 'Microservices',
    description:
      'Two web services, each behind its own dedicated API gateway, with separate databases and an event topic.',
    yaml: `resources:
  userService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: services/users/index.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2
        maxInstances: 6
      connectTo:
        - usersDb

  orderService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: services/orders/index.ts
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - ordersDb
        - orderEvents

  usersDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: asd
      engine:
        type: postgres
        properties:
          version: '1.3'
          primaryInstance:
            instanceSize: asd
          port: 5432
      accessibility:
        accessibilityMode: vpc

  ordersDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: asd
      engine:
        type: postgres
        properties:
          version: '1.3'
          primaryInstance:
            instanceSize: asd
          port: 5432
      accessibility:
        accessibilityMode: vpc

  orderEvents:
    type: sns-topic
`,
    expectation: { minNodes: 8, minConnectors: 7, hasVpc: true, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'lambda-api',
    title: 'Lambda API',
    description: 'Explicit HTTP API Gateway with multiple Lambda handlers and a DynamoDB table.',
    yaml: `resources:
  apiGateway:
    type: http-api-gateway

  getItems:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/get-items.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /items
            method: GET
      connectTo:
        - postsTable

  createItem:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/create-item.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /items
            method: POST
      connectTo:
        - postsTable

  postsTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: S
`,
    expectation: { minNodes: 4, minConnectors: 4, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'web-service-rds',
    title: 'Web Service With RDS',
    description: 'Single web service talking to RDS and Redis through implicit ingress.',
    yaml: `resources:
  webApp:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2
        maxInstances: 5
      connectTo:
        - mainDb
        - cache

  mainDb:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          port: 5432
      accessibility:
        accessibilityMode: vpc

  cache:
    type: redis-cluster
    properties:
      engine:
        type: redis7
      instanceSize: cache.t3.micro
`,
    expectation: { minNodes: 5, minConnectors: 4, hasVpc: true, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'full-stack',
    title: 'Full Stack App',
    description: 'Web, Lambda, batch, queue, topic, bucket, cache, and database in one stack.',
    yaml: `resources:
  apiGateway:
    type: http-api-gateway

  webApp:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/app.ts
      resources:
        cpu: 1
        memory: 2048
      scaling:
        minInstances: 2
        maxInstances: 10
      connectTo:
        - mainDb
        - cache
        - taskQueue

  processQueue:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-queue.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: taskQueue
      connectTo:
        - mainDb
        - notificationTopic

  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /api/{proxy+}
            method: '*'
      connectTo:
        - mainDb

  batchProcessor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/batch.ts
      resources:
        cpu: 2
        memory: 4096
      events:
        - type: schedule
          properties:
            scheduleRate: rate(1 day)
      connectTo:
        - mainDb
        - filesBucket

  mainDb:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          port: 5432
      accessibility:
        accessibilityMode: vpc

  cache:
    type: redis-cluster
    properties:
      engine:
        type: redis7
      instanceSize: cache.t3.micro

  taskQueue:
    type: sqs-queue

  notificationTopic:
    type: sns-topic

  filesBucket:
    type: bucket
`,
    expectation: {
      minNodes: 10,
      minConnectors: 10,
      hasVpc: true,
      connectorSemantics: ['request', 'event', 'dependency']
    }
  },
  {
    id: 'nextjs-hosting',
    title: 'Next.js Hosting',
    description: 'Next.js app (CDN, server function, assets bucket) with content bucket and user auth pool.',
    yaml: `resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      connectTo:
        - contentBucket

  contentBucket:
    type: bucket

  authPool:
    type: user-auth-pool
`,
    expectation: { minNodes: 6, minConnectors: 4, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'event-driven',
    title: 'Event-Driven Pipeline',
    description: 'Queues, event bus, functions, bucket, topic, and DynamoDB with event edges.',
    yaml: `resources:
  ingestQueue:
    type: sqs-queue

  eventBus:
    type: event-bus

  ingestFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/ingest.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: ingestQueue
      connectTo:
        - dataTable

  processorFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/processor.ts
      events:
        - type: event-bus
          properties:
            eventBusName: eventBus
      connectTo:
        - dataTable
        - outputBucket

  dataTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: pk
          type: S
        sortKey:
          name: sk
          type: S

  outputBucket:
    type: bucket

  notifier:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/notifier.ts
      events:
        - type: event-bus
          properties:
            eventBusName: eventBus
      connectTo:
        - alertTopic

  alertTopic:
    type: sns-topic
`,
    expectation: { minNodes: 7, minConnectors: 7, connectorSemantics: ['event', 'dependency'] }
  },
  {
    id: 'private-subnets',
    title: 'Private Subnets',
    description: 'Worker in private subnets, API trigger, queue, and database inside VPC zones.',
    yaml: `resources:
  workerService:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/worker.ts
      resources:
        cpu: 1
        memory: 2048
      usePrivateSubnetsWithNAT: true
      connectTo:
        - mainDb
        - jobQueue

  mainDb:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          port: 5432
      accessibility:
        accessibilityMode: vpc

  jobQueue:
    type: sqs-queue

  apiGw:
    type: http-api-gateway

  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGw
            path: /jobs
            method: POST
      connectTo:
        - jobQueue
`,
    expectation: { minNodes: 6, minConnectors: 4, hasVpc: true, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'simple-function-url',
    title: 'Function URL',
    description: 'Single Lambda-style function with direct URL and DynamoDB dependency.',
    yaml: `resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handler.ts
      url:
        enabled: true
      connectTo:
        - myTable

  myTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: S
`,
    expectation: { minNodes: 3, minConnectors: 2, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'shared-alb-platform',
    title: 'Shared ALB Platform',
    description: 'Container workloads routed through one explicit ALB with cache, queue, and separate databases.',
    yaml: `resources:
  publicAlb:
    type: application-load-balancer

  catalogService:
    type: multi-container-workload
    properties:
      containers:
        - name: catalog
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: services/catalog/index.ts
          events:
            - type: application-load-balancer
              properties:
                containerPort: 3000
                loadBalancerName: publicAlb
                priority: 10
                paths:
                  - /catalog/*
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - catalogDb
        - sharedCache

  checkoutService:
    type: multi-container-workload
    properties:
      containers:
        - name: checkout
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: services/checkout/index.ts
          events:
            - type: application-load-balancer
              properties:
                containerPort: 3000
                loadBalancerName: publicAlb
                priority: 20
                paths:
                  - /checkout/*
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - ordersDb
        - paymentsQueue

  adminService:
    type: multi-container-workload
    properties:
      containers:
        - name: admin
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: services/admin/index.ts
          events:
            - type: application-load-balancer
              properties:
                containerPort: 3000
                loadBalancerName: publicAlb
                priority: 30
                paths:
                  - /admin/*
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - catalogDb
        - ordersDb

  catalogDb:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          port: 5432
      accessibility:
        accessibilityMode: vpc

  ordersDb:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          port: 5432
      accessibility:
        accessibilityMode: vpc

  sharedCache:
    type: redis-cluster
    properties:
      engine:
        type: redis7
      instanceSize: cache.t3.micro

  paymentsQueue:
    type: sqs-queue
`,
    expectation: { minNodes: 8, minConnectors: 9, hasVpc: true, connectorSemantics: ['request', 'dependency'] }
  },
  {
    id: 'media-processing',
    title: 'Media Processing',
    description: 'Upload API, S3-triggered processing, notifications, search index, and metadata storage.',
    yaml: `resources:
  apiGateway:
    type: http-api-gateway

  uploadApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/upload-api.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: apiGateway
            path: /upload
            method: POST
      connectTo:
        - rawUploads
        - metadataTable

  imageProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/image-processor.ts
      events:
        - type: s3
          properties:
            bucketArn: $ResourceParam('rawUploads', 'arn')
      connectTo:
        - processedAssets
        - metadataTable
        - searchIndex
        - notifications

  rawUploads:
    type: bucket

  processedAssets:
    type: bucket

  metadataTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: assetId
          type: S

  notifications:
    type: sns-topic

  searchIndex:
    type: open-search-domain
    properties:
      accessibility:
        accessibilityMode: vpc
`,
    expectation: { minNodes: 8, minConnectors: 8, hasVpc: true, connectorSemantics: ['request', 'event', 'dependency'] }
  }
];

export const defaultDiagramFixtureId = 'default-microservices';

export const getDiagramFixture = ({ id }: { id: string }) => {
  return diagramFixtures.find((fixture) => fixture.id === id) || diagramFixtures[0];
};
