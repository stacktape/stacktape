import type { RDSClient } from '@aws-sdk/client-rds';
import { DescribeDBClustersCommand, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsRds {
  readonly #createClient: () => RDSClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => RDSClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  getInstance = async ({ identifier }: { identifier: string }) => {
    const errorHandler = this.#getErrorHandler('Unable to get RDS DB instance detail');
    const response = await this.#createClient()
      .send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: identifier }))
      .catch(errorHandler);
    return response.DBInstances?.[0];
  };

  getCluster = async ({ identifier }: { identifier: string }) => {
    const errorHandler = this.#getErrorHandler('Unable to get RDS cluster detail');
    const response = await this.#createClient()
      .send(new DescribeDBClustersCommand({ DBClusterIdentifier: identifier }))
      .catch(errorHandler);
    return response.DBClusters?.[0];
  };
}
