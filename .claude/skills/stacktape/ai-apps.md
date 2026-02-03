# Building AI-Powered Applications

Deploy chatbots, AI agents, RAG systems, and more.

## Simple AI Chatbot API

```yaml
resources:
  chat:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/chat.ts
      timeout: 60  # AI calls can be slow
      memory: 1024
      events:
        - type: http-api-gateway
          properties:
            path: /chat
            method: POST
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
```

Handler:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler = async (event) => {
  const { message } = JSON.parse(event.body);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: message }]
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify({ reply: response.choices[0].message.content })
  };
};
```

## RAG (Retrieval Augmented Generation) App

```yaml
resources:
  # API endpoint
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/rag-api.ts
      timeout: 60
      memory: 2048
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
      connectTo:
        - vectorDb
        - documents

  # Vector database for embeddings
  vectorDb:
    type: open-search
    properties:
      clusterConfig:
        instanceType: t3.small.search
        instanceCount: 1
      ebsOptions:
        volumeSize: 20

  # Store original documents
  documents:
    type: bucket

  # Process new documents when uploaded
  documentProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-document.ts
      timeout: 300
      memory: 2048
      events:
        - type: s3
          properties:
            bucketName: documents
            s3Events:
              - s3:ObjectCreated:*
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
      connectTo:
        - vectorDb
        - documents
```

## AI Agent with Tool Calling

```yaml
resources:
  agent:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/agent.ts
      timeout: 120
      memory: 2048
      events:
        - type: http-api-gateway
          properties:
            path: /agent
            method: POST
      environment:
        - name: ANTHROPIC_API_KEY
          value: $Secret('anthropic-key')
      connectTo:
        - database
        - aws:ses  # Agent can send emails

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
```

## GPU Batch Processing (Image Generation, ML)

For heavy AI workloads that need GPUs:

```yaml
resources:
  # API receives requests
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - jobQueue
        - results

  # Queue for processing jobs
  jobQueue:
    type: sqs-queue

  # GPU batch job for inference
  mlProcessor:
    type: batch-job
    properties:
      packaging:
        type: external-image
        properties:
          uri: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
      resources:
        cpu: 4
        memory: 16384
        gpu: 1
      events:
        - type: sqs
          properties:
            sqsQueueName: jobQueue
      connectTo:
        - results

  # Store generated outputs
  results:
    type: bucket
```

## Streaming Responses (Server-Sent Events)

For streaming AI responses, use a container:

```yaml
resources:
  streamingApi:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/streaming-server.ts
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 5
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
```

Handler with streaming:
```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import OpenAI from 'openai';

const app = new Hono();
const openai = new OpenAI();

app.post('/chat/stream', async (c) => {
  const { message } = await c.req.json();
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: message }],
    stream: true
  });
  
  return streamSSE(c, async (sseStream) => {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        await sseStream.writeSSE({ data: content });
      }
    }
  });
});

export default app;
```

## AI with Conversation Memory (Redis)

```yaml
resources:
  chat:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/chat-with-memory.ts
      events:
        - type: http-api-gateway
          properties:
            path: /chat
            method: POST
      environment:
        - name: OPENAI_API_KEY
          value: $Secret('openai-key')
      connectTo:
        - conversationCache

  conversationCache:
    type: upstash-redis
    properties:
      eviction: true  # Auto-expire old conversations
```

## Cost Tips for AI Apps

1. **Use serverless databases** - Aurora Serverless v2 scales to zero
2. **Use Upstash Redis** - Pay per request, not per hour
3. **Batch requests** - Process multiple items in one Lambda invocation
4. **Use SQS** - Queue requests to handle traffic spikes without scaling costs
5. **Consider spot instances** - Use `batch-job` with spot for 90% cost savings on ML workloads
