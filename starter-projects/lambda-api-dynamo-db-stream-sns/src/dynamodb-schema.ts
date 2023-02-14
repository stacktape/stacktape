import { Table, Entity } from 'dynamodb-onetable';
import DynamoDB from 'aws-sdk/clients/dynamodb';

const client = new DynamoDB.DocumentClient({});

const PostsSchema = {
  version: '0.0.1',
  client,
  name: 'PostsSchema',
  indexes: {
    primary: { hash: 'id' },
  },
  models: {
    Post: {
      id: { type: String, value: 'post:#${title}' },
      title: { type: String, required: true, unique: true },
      content: { type: String, required: true },
      authorEmail: { type: String, required: true },
    },
  } as const,
};

const table = new Table({
  client,
  name: process.env.STP_MAIN_DYNAMO_DB_TABLE_NAME,
  schema: PostsSchema,
  timestamps: true,
});

type PostType = Entity<typeof PostsSchema.models.Post>;

export const PostModel = table.getModel<PostType>('Post');
