export type DiagramFixtureExpectation = {
  minNodes: number;
  minConnectors: number;
  hasVpc?: boolean;
  connectorSemantics?: Array<'request' | 'event' | 'dependency' | 'egress' | 'security'>;
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
          type: js-bundle
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
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless

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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
        type: js-bundle
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
            type: js-bundle
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
            type: js-bundle
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
            type: js-bundle
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
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless

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
        type: js-bundle
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
        type: js-bundle
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
  },
  {
    id: 'secured-apis',
    title: 'Secured APIs',
    description:
      'HTTP, GraphQL and WebSocket APIs with sign-in through a user pool, a CDN with an edge function and firewalls in front of the CDN, the load balancer and the user pool.',
    yaml: `resources:
  api:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        useFirewall: edgeFirewall
        edgeFunctions:
          onRequest: geoRedirect

  graphql:
    type: appsync-api
    properties:
      authentication:
        type: user-auth-pool
        properties:
          userAuthPoolName: users

  realtime:
    type: websocket-api-gateway

  adminAlb:
    type: application-load-balancer
    properties:
      useFirewall: regionalFirewall

  listOrders:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/list-orders.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: api
            path: /orders
            method: GET
            authorizer:
              type: cognito
              properties:
                userPoolName: users
      connectTo:
        - orders

  resolveUser:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/resolve-user.ts
      events:
        - type: appsync-api
          properties:
            appsyncApiName: graphql
            field: Query.user
      connectTo:
        - orders

  onMessage:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/on-message.ts
      events:
        - type: websocket-api-gateway
          properties:
            websocketApiGatewayName: realtime
            routeKey: sendMessage
            authorizer:
              type: lambda
              properties:
                functionName: checkToken

  checkToken:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/check-token.ts

  adminPanel:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/admin.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: adminAlb
            priority: 1
            paths:
              - /admin/*

  geoRedirect:
    type: edge-lambda-function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/edge/geo-redirect.ts

  users:
    type: user-auth-pool
    properties:
      useFirewall: regionalFirewall

  edgeFirewall:
    type: web-app-firewall
    properties:
      scope: cdn

  regionalFirewall:
    type: web-app-firewall
    properties:
      scope: regional

  orders:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: S
`,
    expectation: {
      minNodes: 16,
      minConnectors: 18,
      hasVpc: true,
      connectorSemantics: ['request', 'dependency', 'security']
    }
  },
  {
    id: 'agents-and-platform',
    title: 'Agents and Platform Resources',
    description:
      'An AgentCore agent with memory, tools and an MCP gateway, a Kafka consumer, Aurora DSQL, email, a self-hosted Convex backend, a CDK construct, a custom resource and a database left open to the internet.',
    yaml: `stackConfig:
  nat:
    type: gateway

resources:
  supportAgent:
    type: agentcore-runtime
    properties:
      packaging:
        type: prebuilt-image
        properties:
          image: my-org/support-agent:latest
      useMemory: agentMemory
      useGateway: toolGateway
      useBrowser: webBrowser
      useCodeInterpreter: sandbox
      connectTo:
        - ticketsDb

  agentMemory:
    type: agentcore-memory

  toolGateway:
    type: agentcore-gateway
    properties:
      tools:
        - name: lookupOrder
          function: lookupOrder
          toolSchema:
            - name: lookupOrder
              inputSchema:
                type: object

  webBrowser:
    type: agentcore-browser

  sandbox:
    type: agentcore-code-interpreter

  lookupOrder:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/lookup-order.ts
      connectTo:
        - ledger

  ticketsDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('ticketsDb.password')
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: db.t4g.micro

  events:
    type: kafka-cluster

  consumeEvents:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/consume-events.ts
      joinDefaultVpc: true
      events:
        - type: kafka-topic
          properties:
            kafkaClusterName: events
            topicName: orders
      connectTo:
        - ledger
        - mailer

  ledger:
    type: dsql-database

  mailer:
    type: email-sender
    properties:
      identity: example.com

  backend:
    type: convex
    properties:
      appDirectory: apps/backend

  analytics:
    type: aws-cdk-construct
    properties:
      entryfilePath: cdk/analytics.ts

  seedHandler:
    type: custom-resource-definition
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/seed.ts

  seedDefaults:
    type: custom-resource-instance
    properties:
      definitionName: seedHandler
      resourceProperties:
        dataset: defaults

  seedDemo:
    type: custom-resource-instance
    properties:
      definitionName: seedHandler
      resourceProperties:
        dataset: demo

  homepageCheck:
    type: uptime-check
    properties:
      url: https://example.com

  checkoutFlow:
    type: synthetic-test
    properties:
      test:
        type: api
        properties:
          scriptPath: tests/checkout.ts
`,
    expectation: {
      minNodes: 20,
      minConnectors: 16,
      hasVpc: true,
      connectorSemantics: ['request', 'event', 'dependency', 'egress']
    }
  }
];

export const defaultDiagramFixtureId = 'default-microservices';

export const getDiagramFixture = ({ id }: { id: string }) => {
  return diagramFixtures.find((fixture) => fixture.id === id) || diagramFixtures[0];
};
