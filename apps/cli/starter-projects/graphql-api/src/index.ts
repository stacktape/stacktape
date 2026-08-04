import { createSchema, createYoga } from 'graphql-yoga';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_POSTS_TABLE_NAME!;

const schema = createSchema({
  typeDefs: `
    type Post {
      id: ID!
      title: String!
      content: String!
      createdAt: String!
    }

    type Query {
      posts: [Post!]!
    }

    type Mutation {
      createPost(title: String!, content: String!): Post!
    }
  `,
  resolvers: {
    Query: {
      posts: async () => {
        const result = await client.send(new ScanCommand({ TableName: tableName }));
        return result.Items || [];
      }
    },
    Mutation: {
      createPost: async (_: unknown, { title, content }: { title: string; content: string }) => {
        const post = { id: randomUUID(), title, content, createdAt: new Date().toISOString() };
        await client.send(new PutCommand({ TableName: tableName, Item: post }));
        return post;
      }
    }
  }
});

const yoga = createYoga({ schema, graphqlEndpoint: '/graphql', landingPage: false });

const app = new Hono();

app.all('/graphql', async (c) => {
  const response = await yoga.fetch(c.req.raw);
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
});

app.get('/', (c) => c.json({ message: 'GraphQL API. Send queries to /graphql' }));

export default handle(app);
