import { defineConfig, DynamoDbTable, RedisCluster, RelationalDatabase } from '../../__release-npm';

export default defineConfig(() => {
  const postgresDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testPassword123'
    },
    engine: {
      type: 'postgres',
      properties: {
        version: '16.9',
        primaryInstance: {
          instanceSize: 'db.t3.micro'
        }
      }
    }
  });

  const mysqlDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testPassword123'
    },
    engine: {
      type: 'mysql',
      properties: {
        version: '8.0',
        primaryInstance: {
          instanceSize: 'db.t3.micro'
        }
      }
    }
  });

  const mariaDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: 'testPassword123'
    },
    engine: {
      type: 'mariadb',
      properties: {
        version: '10.11',
        primaryInstance: {
          instanceSize: 'db.t3.micro'
        }
      }
    }
  });

  const redis = new RedisCluster({
    instanceSize: 'cache.t3.micro',
    defaultUserPassword: 'redisTestPassword1234'
  });

  const dynamoDb = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'pk', type: 'string' },
      sortKey: { name: 'sk', type: 'string' }
    }
  });

  return {
    resources: {
      postgresDb,
      mysqlDb,
      mariaDb,
      redis,
      dynamoDb
    }
  };
});
