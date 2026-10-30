import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

export class AwsDynamoDb {
  readonly #createClient: () => DynamoDBClient;

  constructor({ createClient }: { createClient: () => DynamoDBClient }) {
    this.#createClient = createClient;
  }

  getTable = async ({ tableName }: { tableName: string }) => {
    const response = await this.#createClient().send(new DescribeTableCommand({ TableName: tableName }));
    return response.Table;
  };

  /** Whether the table still exists. A table that is being deleted still exists. */
  tableExists = async ({ tableName }: { tableName: string }) => {
    try {
      return !!(await this.getTable({ tableName }));
    } catch (error) {
      if (error instanceof Error && error.name === 'ResourceNotFoundException') return false;
      throw error;
    }
  };

  /** Starts deleting a table and returns at once. AWS errors are passed through unchanged. */
  deleteTable = async ({ tableName }: { tableName: string }) => {
    await this.#createClient().send(new DeleteTableCommand({ TableName: tableName }));
  };
}
