import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { parse } from '@fast-csv/parse';
import { downloadFile } from '@shared/utils/download-file';
import { chunkArray, serialize } from '@shared/utils/misc';
import { camelCase } from 'change-case';
import { createReadStream, remove } from 'fs-extra';
import { normalizeEngineType } from './rds';

type CsvRow = {
  sku: string;
  offerTermCode: string;
  rateCode: string;
  termType: string;
  priceDescription: string;
  effectiveDate: string;
  startingRange: string;
  endingRange: string;
  description: string;
  unit: string;
  pricePerUnit: string;
  currency: string;
  productFamily: string;
  serviceCode: string;
  location: string;
  locationType: 'AWS Outpost' | 'AWS Region';
  tenancy: string;
  operatingSystem: 'Windows' | 'Linux';
  usageType: string;
  operation: string;
  cpuArchitecture: 'ARM';
  cpuType: string;
  externalInstanceType: string;
  memoryType: string;
  regionCode: string;
  resource: string;
  serviceName: string;
  storageType: string;
  cacheEngine: 'Redis' | 'Memcached';
  instanceType: string;
  marketOption: string;
  purchaseOption: string;
  databaseEngine: string;
  databaseEdition: string;
  volumeType: string;
  deploymentOption: string;
  storageMedia: 'GP2' | 'GP3' | 'GP3-PIOPS-Storage' | 'GP3-ThroughPut-Storage' | 'Managed-Storage';
  group: string;
  vCpu: string;
  memory: string;
  storage: string;
  physicalProcessor: string;
  storageClass: string;
  throughputClass: string;
};

type AwsServiceCsvOfferCode =
  | 'AmazonECS'
  | 'AmazonElastiCache'
  | 'AmazonEC2'
  | 'AmazonRDS'
  | 'AmazonES'
  | 'AmazonS3'
  | 'AmazonDynamoDB'
  | 'AmazonApiGateway'
  | 'AWSLambda'
  | 'awswaf'
  | 'AWSEvents'
  | 'AmazonCloudFront'
  | 'AmazonEFS';

export type PricingInfo = {
  [productName: string]: {
    [region: string]: RegionalPricingInfo;
  };
};

export type RegionalPricingInfo = {
  unit: string;
  pricePerUnit: string;
  currency: string;
  ADDITIONAL_METADATA?: { vCpu?: string; memory?: string; burstable?: boolean; cpuArchitecture?: 'ARM' | 'x86' };
};

type ResourcePricingInformation = {
  priceInfo: Awaited<ReturnType<typeof getCumulatedPriceInfoForProducts>>;
  relatedAwsPricingDocs?: { [linkName: string]: string };
  underTheHoodLink?: string;
  customComment?: string;
};

type ProductInfo = ReturnType<(typeof productsInfo)['AmazonEC2']['instance']>;

const ALL_REGIONS_MACRO = 'ALL_REGIONS';

const productsInfo = {
  AmazonECS: {
    cpu: ({
      cpuArchitecture = 'AMD64',
      operatingSystem = 'Linux'
    }: {
      cpuArchitecture?: 'AMD64' | 'ARM';
      operatingSystem?: 'Windows' | 'Linux';
    }) => {
      return {
        name: `ECS-cpu-${cpuArchitecture || 'AMD64'}-${operatingSystem || 'Linux'}`,
        description: 'Price for Fargate vCPUs',
        priceModel: 'flat'
      };
    },
    memory: ({
      cpuArchitecture = 'AMD64',
      operatingSystem = 'Linux'
    }: {
      cpuArchitecture?: 'AMD64' | 'ARM';
      operatingSystem?: 'Windows' | 'Linux';
    }) => {
      return {
        name: `ECS-memory-${cpuArchitecture || 'AMD64'}-${operatingSystem || 'Linux'}`,
        description: 'Price for Fargate memory',
        priceModel: 'flat'
      };
    },
    storage: () => {
      return { name: 'ECS-storage', description: 'Price for ephemeral storage', priceModel: 'flat' };
    }
  },
  AmazonEFS: {
    storage: () => {
      return { name: 'EFS-storage', description: 'Price for EFS storage', priceModel: 'pay-per-use' };
    },
    elasticReads: () => {
      return { name: 'EFS-elastic-reads', description: 'Price for EFS elastic reads', priceModel: 'pay-per-use' };
    },
    elasticWrites: () => {
      return { name: 'EFS-elastic-writes', description: 'Price for EFS elastic writes', priceModel: 'pay-per-use' };
    },
    provisionedThroughput: () => {
      return {
        name: 'EFS-provisioned-throughput',
        description: 'Price for EFS provisioned throughput',
        priceModel: 'flat'
      };
    }
  },
  AmazonElastiCache: {
    instance: ({ instanceType }: { instanceType: string }) => {
      return {
        name: `ElastiCache-instance-${instanceType}`,
        description: 'Price for Redis(ElastiCache) instances',
        priceModel: 'flat'
      };
    },
    serverless: () => ({
      name: 'ElastiCache-serverless',
      description: 'Price for Redis(ElastiCache) serverless',
      priceModel: 'pay-per-use'
    })
  },

  AmazonEC2: {
    publicIp: () => {
      return {
        name: 'EC2-public-ip',
        description: 'Price for a public IP address',
        priceModel: 'flat'
      };
    },
    instance: ({ instanceType, operatingSystem }: { instanceType: string; operatingSystem: string | 'Linux' }) => {
      return {
        name: `EC2-instance-${instanceType}-${operatingSystem}`,
        description: 'Price for EC2 instances',
        priceModel: 'flat'
      };
    },
    loadBalancer: ({ type }: { type: 'network' | 'application' }) => {
      return { name: `EC2-load-balancer-${type}`, description: `Price for ${type} load balancer`, priceModel: 'flat' };
    },
    loadBalancerLcu: ({ type }: { type: 'network' | 'application' }) => {
      return {
        name: `EC2-load-balancer-lcu-${type}`,
        description: `Price for ${type} load balancer LCU (pay-per-use capacity units)`,
        priceModel: 'pay-per-use'
      };
    }
  },
  AmazonRDS: {
    instance: ({ instanceType, databaseEngine }: { instanceType: string; databaseEngine: NormalizedSQLEngine }) => {
      return {
        name: `RDS-instance-${instanceType}-${databaseEngine}`,
        description: 'Price for database instance',
        priceModel: 'flat'
      };
    },
    serverless: ({ databaseEngine }: { databaseEngine: NormalizedSQLEngine }) => {
      return {
        name: `RDS-serverless-${databaseEngine}`,
        description: 'Price for Aurora serverless',
        priceModel: 'flat'
      };
    },
    serverlessV2: ({ databaseEngine }: { databaseEngine: NormalizedSQLEngine }) => {
      return {
        name: `RDS-serverless-V2-${databaseEngine}`,
        description: 'Price for Aurora serverless V2',
        priceModel: 'flat'
      };
    },
    storage: ({ databaseEngine }: { databaseEngine: NormalizedSQLEngine }) => {
      return {
        name: `RDS-gp2-storage-${databaseEngine}`,
        description: 'Price for database storage',
        priceModel: 'flat'
      };
    }
  },
  AtlasMongo: {
    cluster: ({ clusterTier }: { clusterTier: string }) => {
      const simplifiedTier = clusterTier.split('_')[0].split(' ')[0];
      return {
        name: `Atlas-MongoDB-${simplifiedTier}`,
        description: 'Price for Atlas MongoDB cluster',
        priceModel: 'flat'
      };
    }
  },
  awswaf: {
    firewall: () => ({ name: 'WAF-firewall', description: 'Price for Firewall instance', priceModel: 'flat' }),
    firewallRule: () => ({
      name: 'WAF-firewall-rule',
      description: 'Price for Firewall rule / rule group',
      priceModel: 'flat'
    }),
    firewallRequests: () => ({
      name: 'WAF-firewall-requests',
      description: 'Price for processed requests',
      priceModel: 'pay-per-use'
    })
  },
  AmazonES: {
    instance: ({ instanceType }: { instanceType: string }) => {
      return {
        name: `OpenSearch-instance-${instanceType}`,
        description: 'Price for OpenSearch instance',
        priceModel: 'flat'
      };
    },
    serverless: () => {
      return {
        name: 'OpenSearch-serverless',
        description: 'Price for OpenSearch serverless',
        priceModel: 'pay-per-use'
      };
    },
    storage: ({ storageMedia }: { storageMedia: 'GP2' | 'GP3' | 'Managed-Storage' }) => {
      return { name: `OpenSearch-storage-${storageMedia}`, description: 'Price for storage', priceModel: 'flat' };
    },
    storageIops: () => {
      return {
        name: 'OpenSearch-storage-iops',
        description: 'Price for storage - IOPS (3,000 IOPS free for volumes up to 1024 GiB)',
        priceModel: 'flat'
      };
    },
    storageThroughput: () => {
      return {
        name: 'OpenSearch-storage-throughput',
        description: 'Price for storage - throughput (125 MiB/s free for volumes up to 170 GiB)',
        priceModel: 'flat'
      };
    }
  },
  AmazonS3: {
    storage: () => ({
      name: 'S3-storage',
      description: 'Price for amount of data stored',
      priceModel: 'pay-per-use'
    }),
    apiPutRequests: () => ({
      name: 'S3-put-requests',
      description: 'Price for 1000 PUT, COPY, POST, or LIST requests',
      priceModel: 'pay-per-use'
    }),
    apiGetRequests: () => ({
      name: 'S3-get-requests',
      description: 'Price for 10000 GET and all other requests',
      priceModel: 'pay-per-use'
    })
  },
  AmazonDynamoDB: {
    provisionedWriteCapacity: () => ({
      name: 'DynamoDB-provisioned-write',
      description: 'Price for provisioned write capacity',
      priceModel: 'flat'
    }),
    provisionedReadCapacity: () => ({
      name: 'DynamoDB-provisioned-read',
      description: 'Price for provisioned read capacity',
      priceModel: 'flat'
    }),
    onDemandWriteCapacity: () => ({
      name: 'DynamoDB-onDemand-write',
      description: 'Price for million write requests',
      priceModel: 'pay-per-use'
    }),
    onDemandReadCapacity: () => ({
      name: 'DynamoDB-onDemand-read',
      description: 'Price for million read requests',
      priceModel: 'pay-per-use'
    }),
    storage: () => ({
      name: 'DynamoDB-storage',
      description: 'Price for used storage',
      priceModel: 'pay-per-use'
    }),
    pitrStorage: () => ({
      name: 'DynamoDB-pitr-storage',
      description: 'Price for point in time recovery storage',
      priceModel: 'pay-per-use'
    })
  },
  AmazonApiGateway: {
    httpApiRequests: () => ({
      name: 'ApiGateway-http-api-requests',
      description: 'Price per request',
      priceModel: 'pay-per-use'
    })
  },
  AWSLambda: {
    request: () => ({
      name: 'Lambda-price-per-request',
      description: 'Price for each request (invocation)',
      priceModel: 'pay-per-use'
    }),
    duration: () => ({
      name: 'Lambda-execution-time',
      description: 'Price for one second of invocation duration of the function',
      priceModel: 'pay-per-use'
    }),
    ephemeralStorage: () => ({
      name: 'Lambda-price-for-storage',
      description: 'Price for additionally configured storage',
      priceModel: 'pay-per-use'
    }),
    requestEdge: () => ({
      name: 'Lambda-edge-price-per-request',
      description: 'Price for each request (invocation)',
      priceModel: 'pay-per-use'
    }),
    durationEdge: () => ({
      name: 'Lambda-edge-execution-time',
      description: 'Price for a one second of invocation duration for the function',
      priceModel: 'pay-per-use'
    })
  },
  AWSEvents: {
    publishedMessages: () => ({
      name: 'Events-published-messages',
      description: 'Price per million messages published into bus',
      priceModel: 'pay-per-use'
    })
  },
  AmazonCloudFront: {
    requests: () => ({
      name: 'CloudFront-price-per-10000-req',
      description: 'Price per 10,000 requests',
      priceModel: 'pay-per-use'
    })
  },

  UpstashRedis: {
    commands: () => ({
      name: 'UpstashRedis-price-per-100k-commands',
      description: 'Price per 100K commands',
      priceModel: 'pay-per-use'
    })
  },
  AmazonCognito: {
    mau: () => ({
      name: 'Cognito-mau',
      description: 'Price per MAU (monthly active user). First 50,000 MAU is free.',
      priceModel: 'pay-per-use'
    })
  }
} as const;

const productNameBuilders: {
  [_offerCode in AwsServiceCsvOfferCode]?: (product: CsvRow) => string | string[] | undefined;
} = {
  AmazonECS: ({ productFamily, storageType, memoryType, cpuArchitecture, operatingSystem, cpuType }) => {
    if (
      productFamily !== 'Compute' ||
      (!storageType && !memoryType && !cpuType) ||
      (operatingSystem && operatingSystem !== 'Windows')
    ) {
      return;
    }
    return cpuType
      ? productsInfo.AmazonECS.cpu({ cpuArchitecture, operatingSystem }).name
      : memoryType
        ? productsInfo.AmazonECS.memory({ cpuArchitecture, operatingSystem }).name
        : storageType
          ? productsInfo.AmazonECS.storage().name
          : undefined;
  },
  AmazonEFS: ({ storageClass, productFamily, operation, throughputClass }) => {
    if (productFamily !== 'Storage' && storageClass === 'General Purpose') {
      return productsInfo.AmazonEFS.storage().name;
    }
    if (productFamily !== 'Storage' && storageClass === 'EFS Storage' && operation === 'Write') {
      return productsInfo.AmazonEFS.elasticWrites().name;
    }
    if (productFamily !== 'Storage' && storageClass === 'EFS Storage' && operation === 'Read') {
      return productsInfo.AmazonEFS.elasticReads().name;
    }
    if (productFamily !== 'Provisioned Throughput' && throughputClass === 'Provisioned') {
      return productsInfo.AmazonEFS.provisionedThroughput().name;
    }
    return undefined;
  },
  AmazonElastiCache: ({ productFamily, instanceType, cacheEngine, locationType, purchaseOption }) => {
    if (cacheEngine !== 'Redis' || locationType !== 'AWS Region' || purchaseOption) {
      return;
    }
    return productFamily === 'Cache Instance'
      ? productsInfo.AmazonElastiCache.instance({ instanceType }).name
      : productFamily === 'ElastiCache Serverless'
        ? productsInfo.AmazonElastiCache.serverless().name
        : undefined;
  },
  AmazonEC2: ({
    usageType,
    productFamily,
    instanceType,
    locationType,
    purchaseOption,
    operatingSystem,
    priceDescription,
    termType
  }) => {
    if (termType !== 'OnDemand' || purchaseOption || locationType !== 'AWS Region') {
      return;
    }
    return (productFamily === 'Compute Instance' || productFamily === 'Compute Instance (bare metal)') &&
      priceDescription.includes('On Demand') &&
      !priceDescription.includes('with') &&
      operatingSystem === 'Linux'
      ? productsInfo.AmazonEC2.instance({ instanceType, operatingSystem }).name
      : usageType.includes('LoadBalancerUsage')
        ? productsInfo.AmazonEC2.loadBalancer({
            type: productFamily === 'Load Balancer-Network' ? 'network' : 'application'
          }).name
        : usageType.includes('LCUUsage')
          ? productsInfo.AmazonEC2.loadBalancerLcu({
              type: productFamily === 'Load Balancer-Network' ? 'network' : 'application'
            }).name
          : undefined;
  },
  AmazonRDS: ({
    productFamily,
    instanceType,
    locationType,
    purchaseOption,
    databaseEngine,
    databaseEdition,
    volumeType,
    deploymentOption,
    usageType,
    storage
  }) => {
    if (
      purchaseOption ||
      locationType !== 'AWS Region' ||
      (productFamily !== 'Database Instance' &&
        productFamily !== 'Database Storage' &&
        productFamily !== 'Serverless' &&
        productFamily !== 'ServerlessV2')
    ) {
      return;
    }
    const dbEngine: NormalizedSQLEngine | 'ANY_AURORA' =
      databaseEngine === 'Aurora MySQL'
        ? 'aurora-mysql'
        : databaseEngine === 'Aurora PostgreSQL'
          ? 'aurora-postgresql'
          : databaseEngine === 'PostgreSQL'
            ? 'postgres'
            : databaseEngine === 'MariaDB'
              ? 'mariadb'
              : databaseEngine === 'MySQL'
                ? 'mysql'
                : databaseEngine === 'Oracle' && databaseEdition === 'Enterprise'
                  ? 'oracle-ee'
                  : databaseEngine === 'Oracle' && databaseEdition === 'Standard Two'
                    ? 'oracle-se2'
                    : databaseEngine === 'SQL Server' && databaseEdition === 'Web'
                      ? 'sqlserver-web'
                      : databaseEngine === 'SQL Server' && databaseEdition === 'Enterprise'
                        ? 'sqlserver-ee'
                        : databaseEngine === 'SQL Server' && databaseEdition === 'Standard'
                          ? 'sqlserver-se'
                          : databaseEngine === 'SQL Server' && databaseEdition === 'Express'
                            ? 'sqlserver-ex'
                            : databaseEngine === 'Any' && usageType.includes('Aurora')
                              ? 'ANY_AURORA'
                              : undefined;
    if (!dbEngine) {
      return;
    }
    if (dbEngine === 'ANY_AURORA') {
      return volumeType === 'General Purpose-Aurora' && deploymentOption === 'Single-AZ'
        ? [
            productsInfo.AmazonRDS.storage({ databaseEngine: 'aurora-mysql' }).name,
            productsInfo.AmazonRDS.storage({ databaseEngine: 'aurora-postgresql' }).name
          ]
        : undefined;
    }
    return productFamily === 'Database Instance' && deploymentOption === 'Single-AZ' && storage === 'EBS Only'
      ? productsInfo.AmazonRDS.instance({ instanceType, databaseEngine: dbEngine }).name
      : productFamily === 'Database Storage' &&
          (volumeType === 'General Purpose' || volumeType === 'General Purpose-Aurora') &&
          deploymentOption === 'Single-AZ'
        ? productsInfo.AmazonRDS.storage({ databaseEngine: dbEngine }).name
        : productFamily === 'Serverless'
          ? productsInfo.AmazonRDS.serverless({ databaseEngine: dbEngine }).name
          : productFamily === 'ServerlessV2' && !storage
            ? productsInfo.AmazonRDS.serverless({ databaseEngine: dbEngine }).name
            : undefined;
  },
  AmazonES: ({ productFamily, instanceType, locationType, purchaseOption, storageMedia, termType }) => {
    if (purchaseOption || locationType !== 'AWS Region') {
      return;
    }
    return productFamily === 'Amazon OpenSearch Service Instance' && termType === 'OnDemand'
      ? productsInfo.AmazonES.instance({ instanceType }).name
      : productFamily === 'Amazon OpenSearch Service Serverless'
        ? productsInfo.AmazonES.serverless().name
        : productFamily === 'Amazon OpenSearch Service Volume' &&
            (storageMedia === 'GP3' || storageMedia === 'GP2' || storageMedia === 'Managed-Storage')
          ? productsInfo.AmazonES.storage({ storageMedia }).name
          : productFamily === 'Amazon OpenSearch Service Volume' && storageMedia === 'GP3-ThroughPut-Storage'
            ? productsInfo.AmazonES.storageThroughput().name
            : productFamily === 'Amazon OpenSearch Service Volume' && storageMedia === 'GP3-PIOPS-Storage'
              ? productsInfo.AmazonES.storageIops().name
              : undefined;
  },
  AmazonS3: ({ priceDescription, locationType, volumeType }) => {
    if (locationType !== 'AWS Region') {
      return;
    }
    return priceDescription.endsWith('per 1,000 PUT, COPY, POST, or LIST requests') ||
      priceDescription.includes('per 1,000 PUT, COPY, POST, or LIST requests in')
      ? productsInfo.AmazonS3.apiPutRequests().name
      : priceDescription.endsWith('per 10,000 GET and all other requests') ||
          priceDescription.includes('per 10,000 GET and all other requests in')
        ? productsInfo.AmazonS3.apiGetRequests().name
        : volumeType === 'Standard' &&
            (priceDescription.endsWith('first 50 TB / month of storage used') ||
              // special case do not ask me why
              priceDescription.includes('first 50 TB / month of storage used in Spain'))
          ? productsInfo.AmazonS3.storage().name
          : undefined;
  },
  AmazonDynamoDB: ({ purchaseOption, locationType, productFamily, unit, endingRange, volumeType }) => {
    if (purchaseOption || locationType !== 'AWS Region') {
      return;
    }
    return productFamily === 'Provisioned IOPS' && unit === 'WriteCapacityUnit-Hrs' && endingRange === 'Inf'
      ? productsInfo.AmazonDynamoDB.provisionedWriteCapacity().name
      : productFamily === 'Provisioned IOPS' && unit === 'ReadCapacityUnit-Hrs' && endingRange === 'Inf'
        ? productsInfo.AmazonDynamoDB.provisionedReadCapacity().name
        : productFamily === 'Amazon DynamoDB PayPerRequest Throughput' &&
            unit === 'WriteRequestUnits' &&
            endingRange === 'Inf'
          ? productsInfo.AmazonDynamoDB.onDemandWriteCapacity().name
          : productFamily === 'Amazon DynamoDB PayPerRequest Throughput' &&
              unit === 'ReadRequestUnits' &&
              endingRange === 'Inf'
            ? productsInfo.AmazonDynamoDB.onDemandReadCapacity().name
            : productFamily === 'Database Storage' &&
                endingRange === 'Inf' &&
                volumeType === 'Amazon DynamoDB - Indexed DataStore'
              ? productsInfo.AmazonDynamoDB.storage().name
              : productFamily === 'Database Storage' &&
                  endingRange === 'Inf' &&
                  volumeType === 'Amazon DynamoDB - Point-In-Time-Restore (PITR) Backup Storage'
                ? productsInfo.AmazonDynamoDB.pitrStorage().name
                : undefined;
  },
  AmazonApiGateway: ({ description, productFamily }) => {
    return description === 'HTTP API Requests' && productFamily === 'API Calls'
      ? productsInfo.AmazonApiGateway.httpApiRequests().name
      : undefined;
  },
  AWSLambda: ({ group, priceDescription, regionCode }) => {
    if (!regionCode) {
      return;
    }
    return group === 'AWS-Lambda-Requests'
      ? productsInfo.AWSLambda.request().name
      : group === 'AWS-Lambda-Storage-Duration'
        ? productsInfo.AWSLambda.ephemeralStorage().name
        : group === 'AWS-Lambda-Duration' && priceDescription.endsWith('Tier-1')
          ? productsInfo.AWSLambda.duration().name
          : group === 'AWS-Lambda-Edge-Requests'
            ? productsInfo.AWSLambda.requestEdge().name
            : group === 'AWS-Lambda-Edge-Duration'
              ? productsInfo.AWSLambda.durationEdge().name
              : undefined;
  }
};

const getAdditionalMetadataAboutProductFromRow = (
  productName: string,
  row: CsvRow
): PricingInfo[string][string]['ADDITIONAL_METADATA'] | undefined => {
  if (
    productName.startsWith('RDS-instance') ||
    productName.startsWith('ElastiCache-instance') ||
    productName.startsWith('EC2-instance')
  ) {
    return {
      vCpu: row.vCpu,
      memory: row.memory,
      burstable: row.instanceType.split('.')?.[1]?.startsWith('t'),
      cpuArchitecture: productName.startsWith('EC2-instance')
        ? row.physicalProcessor.includes('Apple') || row.physicalProcessor.includes('Graviton')
          ? 'ARM'
          : 'x86'
        : undefined
    };
  }
};

const getPricesFromCsvFile = async (path: string) => {
  const result: PricingInfo = {};

  const processRow = (row: CsvRow) => {
    const productName = productNameBuilders[row.serviceCode](row); // can return multiple product names
    [productName]
      .flat()
      .filter(Boolean)
      .forEach((pn) => {
        result[pn] = result[pn] || {};
        const additionalMetadata = getAdditionalMetadataAboutProductFromRow(pn, row);
        result[pn][row.regionCode] = {
          unit: row.unit,
          pricePerUnit: row.pricePerUnit,
          currency: row.currency,
          ...(additionalMetadata ? { ADDITIONAL_METADATA: additionalMetadata } : {})
        };
      });
  };

  await new Promise((resolve, reject) => {
    createReadStream(path)
      .pipe(parse({ headers: (headers) => headers.map((header) => camelCase(header)), skipLines: 5 }))
      .on('error', (error) => reject(error))
      .on('data', (row) => processRow(row))
      .on('end', (rowCount: number) => resolve(`Parsed ${rowCount} rows`));
  });

  return result;
};

export const downloadSimplePricingInfo = async ({
  downloadDirectory,
  awsServiceOfferCode
}: {
  downloadDirectory: string;
  awsServiceOfferCode: AwsServiceCsvOfferCode;
}) => {
  const downloadUrl = `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/${awsServiceOfferCode}/current/index.csv`;
  const { filePath: downloadedFilePath } = await downloadFile({
    downloadTo: downloadDirectory,
    url: downloadUrl,
    fileName: `${awsServiceOfferCode}.csv`
  });

  const prices = await getPricesFromCsvFile(downloadedFilePath);
  await remove(downloadedFilePath);
  return prices;
};

const SERVICES_WITH_STATIC_PRICES: {
  AtlasMongo: PricingInfo;
  awswaf: PricingInfo;
  AWSEvents: PricingInfo;
  AmazonCloudFront: PricingInfo;
  UpstashRedis: PricingInfo;
  AmazonCognito: PricingInfo;
  AmazonEC2: PricingInfo;
} = {
  AtlasMongo: {
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M2' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.0125' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M5' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.034' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M10' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.08' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M20' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.20' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M30' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.54' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M40' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '1.04' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M50' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '2.00' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M60' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '3.95' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M80' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '7,30' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M140' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '10.99' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M200' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '14.59' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M300' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '21.85' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M400' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '22.40' }
    },
    [productsInfo.AtlasMongo.cluster({ clusterTier: 'M700' }).name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '33.26' }
    }
  },
  awswaf: {
    [productsInfo.awswaf.firewall().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.007' }
    },
    [productsInfo.awswaf.firewallRule().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.0013' }
    },
    [productsInfo.awswaf.firewallRequests().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'per million requests', pricePerUnit: '0.6' }
    }
  },
  AWSEvents: {
    [productsInfo.AWSEvents.publishedMessages().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: '1M requests', pricePerUnit: '1.0' }
    }
  },
  AmazonCloudFront: {
    [productsInfo.AmazonCloudFront.requests().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: '10,000 requests', pricePerUnit: '0.009' }
    }
  },

  UpstashRedis: {
    [productsInfo.UpstashRedis.commands().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: '100,000 commands', pricePerUnit: '0.2' }
    }
  },
  AmazonCognito: {
    [productsInfo.AmazonCognito.mau().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: '1 mau', pricePerUnit: '0.0055' }
    }
  },
  AmazonEC2: {
    [productsInfo.AmazonEC2.publicIp().name]: {
      [ALL_REGIONS_MACRO]: { currency: 'USD', unit: 'hr', pricePerUnit: '0.005' }
    }
  }
};

export const calculateFlatMonthlyCost = (regionalProductPricingInfo: RegionalPricingInfo) => {
  return (
    Number(regionalProductPricingInfo.pricePerUnit) *
    (regionalProductPricingInfo.unit.toLowerCase().includes('mo') ? 1 : 24 * 30)
  );
};

const formatCostInfo = ({
  productInfo,
  productPricingInfo,
  region
}: {
  productInfo: ProductInfo & { multiplier?: number; upperThresholdMultiplier?: number };
  productPricingInfo: PricingInfo[string];
  region: string;
}) => {
  if (!productPricingInfo) {
    console.error(`Unable to get pricing info for product: ${productInfo.name} (${productInfo.description})`);
    return {
      unsupportedProduct: true,
      pricePerMonth: 0,
      ...productInfo
    };
  }
  const regionalProductPricingInfo = productPricingInfo[region] || productPricingInfo[ALL_REGIONS_MACRO];
  return {
    pricePerUnit: Number(regionalProductPricingInfo.pricePerUnit),
    unit: regionalProductPricingInfo.unit,
    adjustedPrice: Number(regionalProductPricingInfo.pricePerUnit) * (productInfo.multiplier || 1),
    // we are assuming all flat prices are in "per hour shape"
    pricePerMonth:
      productInfo.priceModel === 'flat' &&
      calculateFlatMonthlyCost(regionalProductPricingInfo) *
        (productInfo.multiplier !== undefined ? productInfo.multiplier : 1),
    pricePerMonthUpper:
      productInfo.priceModel === 'flat' &&
      productInfo.upperThresholdMultiplier &&
      calculateFlatMonthlyCost(regionalProductPricingInfo) * productInfo.upperThresholdMultiplier,
    ADDITIONAL_METADATA: regionalProductPricingInfo.ADDITIONAL_METADATA,
    ...productInfo
  };
};

const getProductsPricingInfoFromDynamoTable = async ({
  products,
  dynamoDbTableName
}: {
  products: string[];
  dynamoDbTableName: string;
}) => {
  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const response = await docClient.send(
    new BatchGetCommand({
      RequestItems: {
        [dynamoDbTableName]: { Keys: Array.from(new Set(products)).map((productName) => ({ productName })) }
      }
    })
  );
  return response.Responses[dynamoDbTableName].reduce((obj, item) => {
    obj[item.productName] = item.prices;
    return obj;
  }, {}) as PricingInfo;
};

const getCumulatedPriceInfoForProducts = async ({
  products,
  region,
  dynamoDbTableName
}: {
  products: (ProductInfo & { multiplier?: number; upperThresholdMultiplier?: number })[];
  region: string;
  dynamoDbTableName: string;
}) => {
  const pricingInfo = products.length
    ? await getProductsPricingInfoFromDynamoTable({
        products: products.map((product) => product.name),
        dynamoDbTableName
      })
    : {};
  const costBreakdown = products
    .map((productInfo) => {
      return formatCostInfo({
        productInfo,
        productPricingInfo: pricingInfo[productInfo.name],
        region
      });
    })
    .filter(Boolean);
  const totalMonthlyFlat = costBreakdown
    .map(({ pricePerMonth }) => pricePerMonth)
    .filter(Boolean)
    .reduce((acc, prc) => acc + prc, 0);
  return {
    totalMonthlyFlat,
    costBreakdown
  };
};

const getPricingInformationForResource = async ({
  resource,
  region = 'us-east-1',
  dynamoDbTableName
}: {
  resource: StacktapeResourceDefinition;
  region: string;
  dynamoDbTableName: string;
}): Promise<ResourcePricingInformation> => {
  if (resource.type === 'application-load-balancer') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonEC2.loadBalancer({ type: 'application' }),
        productsInfo.AmazonEC2.loadBalancerLcu({ type: 'application' }),
        ...(resource.properties?.interface === 'internal'
          ? []
          : [{ ...productsInfo.AmazonEC2.publicIp(), multiplier: 2 }])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: { 'AWS Load Balancer pricing': 'https://aws.amazon.com/elasticloadbalancing/pricing/' },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/application-load-balancers/#under-the-hood'
    };
  }
  if (resource.type === 'network-load-balancer') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonEC2.loadBalancer({ type: 'network' }),
        productsInfo.AmazonEC2.loadBalancerLcu({ type: 'network' }),
        ...(resource.properties?.interface === 'internal'
          ? []
          : [{ ...productsInfo.AmazonEC2.publicIp(), multiplier: 2 }])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: { 'AWS Load Balancer pricing': 'https://aws.amazon.com/elasticloadbalancing/pricing/' },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/application-load-balancers/#under-the-hood'
    };
  }
  if (resource.type === 'aws-cdk-construct') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: []
    });
    return {
      priceInfo,
      customComment: 'The price of your construct depends on resources contained in the construct.'
    };
  }
  if (resource.type === 'bastion') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonEC2.publicIp(),
        productsInfo.AmazonEC2.instance({
          instanceType: resource.properties?.instanceSize || 't3.micro',
          operatingSystem: 'Linux'
        })
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: { 'AWS EC2 pricing': 'https://aws.amazon.com/ec2/pricing/on-demand/' },
      underTheHoodLink: 'https://docs.stacktape.com/security-resources/bastions/#overview'
    };
  }
  if (resource.type === 'batch-job') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: []
    });
    return {
      priceInfo,
      customComment:
        'The price of the batch-job depends on the length of the the job and on the type of EC2 instances used by AWS to execute your job (AWS uses "optimal" strategy to choose instance that match your job demands)',
      relatedAwsPricingDocs: {
        'AWS EC2 pricing': 'https://aws.amazon.com/ec2/pricing/on-demand/',
        'Batch "optimal" strategy':
          'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-batch-computeenvironment-computeresources.html#cfn-batch-computeenvironment-computeresources-instancetypes'
      },
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/batch-jobs/#under-the-hood'
    };
  }
  if (resource.type === 'bucket') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonS3.storage(),
        productsInfo.AmazonS3.apiGetRequests(),
        productsInfo.AmazonS3.apiPutRequests()
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS S3 pricing': 'https://aws.amazon.com/s3/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/buckets/#under-the-hood'
    };
  }
  if (resource.type === 'custom-resource-definition') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.AWSLambda.duration(), productsInfo.AWSLambda.request()]
    });
    return {
      priceInfo,
      customComment:
        'You are only paying for the amount of time your custom resource is executing during deploy (this price is usually negligible).',
      relatedAwsPricingDocs: {
        'AWS Lambda pricing': 'https://aws.amazon.com/lambda/pricing/'
      }
    };
  }
  if (resource.type === 'custom-resource-instance') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: []
    });
    return {
      priceInfo,
      customComment:
        'You are not paying for custom-resource-instance. Small (negligible) prices can be attributed to the custom-resource-definition.\nIf your custom resource creates other resources, you will be charged for them.'
    };
  }
  if (resource.type === 'deployment-script') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.AWSLambda.duration(), productsInfo.AWSLambda.request()]
    });
    return {
      priceInfo,
      customComment:
        'You are only paying for the amount of time your deployment is executing during deploy (this price is usually negligible).\nIf your deployment script creates other resources, you will be charged for them.',
      relatedAwsPricingDocs: {
        'AWS Lambda pricing': 'https://aws.amazon.com/lambda/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/deployment-scripts/'
    };
  }
  if (resource.type === 'dynamo-db-table') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonDynamoDB.storage(),
        ...(resource.properties?.enablePointInTimeRecovery ? [productsInfo.AmazonDynamoDB.pitrStorage()] : []),
        ...(resource.properties?.provisionedThroughput
          ? [
              {
                ...productsInfo.AmazonDynamoDB.provisionedReadCapacity(),
                multiplier: resource.properties?.provisionedThroughput.readUnits,
                upperThresholdMultiplier: resource.properties?.provisionedThroughput?.readScaling?.maxUnits
              },
              {
                ...productsInfo.AmazonDynamoDB.provisionedWriteCapacity(),
                multiplier: resource.properties?.provisionedThroughput.writeUnits,
                upperThresholdMultiplier: resource.properties?.provisionedThroughput?.writeScaling?.maxUnits
              }
            ]
          : [productsInfo.AmazonDynamoDB.onDemandReadCapacity(), productsInfo.AmazonDynamoDB.onDemandWriteCapacity()])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS DynamoDB pricing': 'https://aws.amazon.com/dynamodb/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/database-resources/dynamo-db-tables/#under-the-hood'
    };
  }
  if (resource.type === 'edge-lambda-function') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        { ...productsInfo.AWSLambda.durationEdge(), multiplier: (resource.properties.memory || 128) / 1024 },
        productsInfo.AWSLambda.requestEdge()
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS Lambda pricing': 'https://aws.amazon.com/lambda/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/edge-lambda-functions/#under-the-hood'
    };
  }
  if (resource.type === 'event-bus') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.AWSEvents.publishedMessages()]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS EventBus pricing': 'https://aws.amazon.com/eventbridge/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/event-buses/#overview'
    };
  }
  if (resource.type === 'function') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        { ...productsInfo.AWSLambda.duration(), multiplier: (resource.properties.memory || 1024) / 1024 },
        {
          ...productsInfo.AWSLambda.ephemeralStorage(),
          multiplier: ((resource.properties.storage || 512) - 512) / 1024
        },
        productsInfo.AWSLambda.request()
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS Lambda pricing': 'https://aws.amazon.com/lambda/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/lambda-functions/#under-the-hood'
    };
  }
  if (resource.type === 'hosting-bucket') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.AmazonS3.storage(), productsInfo.AmazonCloudFront.requests()]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS S3 pricing': 'https://aws.amazon.com/s3/pricing/',
        'AWS CloudFront (CDN) pricing': 'https://aws.amazon.com/cloudfront/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/hosting-buckets/#under-the-hood'
    };
  }
  if (resource.type === 'http-api-gateway') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonApiGateway.httpApiRequests(),
        ...(resource.properties?.cdn?.enabled ? [productsInfo.AmazonCloudFront.requests()] : [])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS HTTP API Gateway pricing': 'https://aws.amazon.com/api-gateway/pricing/#HTTP_APIs',
        'AWS CloudFront (CDN) pricing': 'https://aws.amazon.com/cloudfront/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/http-api-gateways/'
    };
  }
  if (resource.type === 'mongo-db-atlas-cluster') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.AtlasMongo.cluster({ clusterTier: resource.properties?.clusterTier })]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'Atlas Mongo pricing': 'https://www.mongodb.com/pricing'
      },
      customComment:
        'Prices charged by Atlas for your Mongo cluster are not visible in your cost and usage breakdown in Stacktape console',
      underTheHoodLink: 'https://docs.stacktape.com/3rd-party-resources/mongo-db-atlas-clusters/'
    };
  }
  if (resource.type === 'multi-container-workload') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        ...(resource.properties?.resources?.instanceTypes
          ? [
              {
                ...productsInfo.AmazonEC2.instance({
                  instanceType: resource.properties.resources.instanceTypes[0],
                  operatingSystem: 'Linux'
                }),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ]
          : [
              {
                ...productsInfo.AmazonECS.cpu({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier: (resource.properties.scaling?.minInstances || 1) * resource.properties.resources.cpu,
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * resource.properties.resources.cpu
                  : undefined
              },
              {
                ...productsInfo.AmazonECS.memory({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier:
                  (resource.properties.scaling?.minInstances || 1) * (resource.properties.resources.memory / 1024),
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * (resource.properties.resources.memory / 1024)
                  : undefined
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'ECS Fargate pricing': 'https://aws.amazon.com/fargate/pricing/',
        'AWS EC2 instances pricing': 'https://aws.amazon.com/ec2/pricing/on-demand/'
      },
      customComment:
        resource.properties.resources.instanceTypes &&
        (resource.properties.resources.cpu || resource.properties.resources.memory)
          ? 'When specifying both memory + cpu and instanceTypes the estimation might be less precise.'
          : (resource.properties.resources.instanceTypes?.length || 0) > 1
            ? 'When multiple instanceTypes are specified, the estimations might be less precise.'
            : undefined,
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/multi-container-workloads/#under-the-hood'
    };
  }
  if (resource.type === 'nextjs-web') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonS3.storage(),
        productsInfo.AmazonCloudFront.requests(),
        ...(resource.properties?.useEdgeLambda
          ? [
              {
                ...productsInfo.AWSLambda.durationEdge(),
                multiplier: (resource.properties?.serverLambda?.memory || 1024) / 1024
              },
              productsInfo.AWSLambda.requestEdge()
            ]
          : [
              {
                ...productsInfo.AWSLambda.duration(),
                multiplier: (resource.properties?.serverLambda?.memory || 1024) / 1024
              },
              productsInfo.AWSLambda.request()
            ])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS S3 pricing': 'https://aws.amazon.com/s3/pricing/',
        'AWS DynamoDB pricing': 'https://aws.amazon.com/dynamodb/pricing/',
        'AWS Lambda pricing': 'https://aws.amazon.com/lambda/pricing/',
        'AWS CloudFront (CDN) pricing': 'https://aws.amazon.com/cloudfront/pricing/'
      },
      customComment: 'NextJS web resource is fully serverless, so you only pay small sum for incoming requests.',
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/nextjs-website/#under-the-hood'
    };
  }
  if (resource.type === 'open-search-domain') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        {
          ...productsInfo.AmazonES.instance({
            instanceType: resource.properties?.clusterConfig?.instanceType || 'm4.large.search'
          }),
          multiplier: resource.properties?.clusterConfig?.instanceCount || 1
        },
        ...(resource.properties.clusterConfig?.dedicatedMasterCount
          ? [
              {
                ...productsInfo.AmazonES.instance({
                  instanceType: resource.properties?.clusterConfig?.dedicatedMasterType || 'm4.large.search'
                }),
                multiplier: resource.properties?.clusterConfig?.dedicatedMasterCount
              }
            ]
          : []),
        ...(resource.properties.clusterConfig?.warmCount
          ? [
              {
                ...productsInfo.AmazonES.instance({
                  instanceType: resource.properties?.clusterConfig?.warmType || 'ultrawarm1.medium.search'
                }),
                multiplier: resource.properties?.clusterConfig?.warmCount
              }
            ]
          : []),
        {
          ...productsInfo.AmazonES.storage({
            storageMedia: resource.properties.storage.iops || resource.properties.storage.throughput ? 'GP3' : 'GP2'
          }),
          multiplier: resource.properties.storage.size
        },
        ...(resource.properties.storage.iops
          ? [{ ...productsInfo.AmazonES.storageIops(), multiplier: resource.properties.storage.iops }]
          : []),
        ...(resource.properties.storage.throughput
          ? [{ ...productsInfo.AmazonES.storageThroughput(), multiplier: resource.properties.storage.throughput }]
          : [])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: { 'AWS OpenSearch pricing': 'https://aws.amazon.com/opensearch-service/pricing/' },
      underTheHoodLink: 'https://docs.stacktape.com/database-resources/open-search-domains/'
    };
  }
  if (resource.type === 'private-service') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        ...(resource.properties?.resources?.instanceTypes
          ? [
              {
                ...productsInfo.AmazonEC2.instance({
                  instanceType: resource.properties.resources.instanceTypes[0],
                  operatingSystem: 'Linux'
                }),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ]
          : [
              {
                ...productsInfo.AmazonECS.cpu({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier: (resource.properties.scaling?.minInstances || 1) * resource.properties.resources.cpu,
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * resource.properties.resources.cpu
                  : undefined
              },
              {
                ...productsInfo.AmazonECS.memory({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier:
                  (resource.properties.scaling?.minInstances || 1) * (resource.properties.resources.memory / 1024),
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * (resource.properties.resources.memory / 1024)
                  : undefined
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ]),
        ...(resource.properties.loadBalancing?.type === 'application-load-balancer'
          ? [
              productsInfo.AmazonEC2.loadBalancer({ type: 'application' }),
              productsInfo.AmazonEC2.loadBalancerLcu({ type: 'application' })
            ]
          : [])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS ECS Fargate pricing': 'https://aws.amazon.com/fargate/pricing/',
        'AWS EC2 instances pricing': 'https://aws.amazon.com/ec2/pricing/on-demand/',
        'AWS Load Balancer pricing': 'https://aws.amazon.com/elasticloadbalancing/pricing/'
      },
      customComment:
        resource.properties.resources.instanceTypes &&
        (resource.properties.resources.cpu || resource.properties.resources.memory)
          ? 'When specifying both memory + cpu and instanceTypes the estimation might be less precise.'
          : (resource.properties.resources.instanceTypes?.length || 0) > 1
            ? 'When multiple instanceTypes are specified, the estimations might be less precise.'
            : undefined,
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/private-services/#under-the-hood'
    };
  }
  if (resource.type === 'redis-cluster') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        {
          ...productsInfo.AmazonElastiCache.instance({ instanceType: resource.properties.instanceSize }),
          multiplier: (resource.properties.numReplicaNodes || 0) + 1
        }
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS Elasticache pricing': 'https://aws.amazon.com/elasticache/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/database-resources/redis-clusters/'
    };
  }
  if (resource.type === 'relational-database') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products:
        resource.properties.engine.type === 'aurora-mysql-serverless' ||
        resource.properties.engine.type === 'aurora-postgresql-serverless'
          ? [
              {
                ...productsInfo.AmazonRDS.serverless({
                  databaseEngine: normalizeEngineType(resource.properties.engine.type)
                }),
                multiplier: resource.properties.engine.properties?.pauseAfterSeconds
                  ? 0
                  : resource.properties.engine.properties?.minCapacity || 2,
                upperThresholdMultiplier:
                  resource.properties.engine.properties?.maxCapacity ||
                  resource.properties.engine.properties?.minCapacity ||
                  4
              },
              {
                ...productsInfo.AmazonRDS.storage({
                  databaseEngine: normalizeEngineType(resource.properties.engine.type)
                }),
                multiplier: 1,
                upperThresholdMultiplier: 64000
              }
            ]
          : resource.properties.engine.type === 'aurora-mysql-serverless-v2' ||
              resource.properties.engine.type === 'aurora-postgresql-serverless-v2'
            ? [
                {
                  ...productsInfo.AmazonRDS.serverlessV2({
                    databaseEngine: normalizeEngineType(resource.properties.engine.type)
                  }),
                  multiplier: resource.properties.engine.properties?.minCapacity || 0,
                  upperThresholdMultiplier: resource.properties.engine.properties?.maxCapacity || 10
                },
                {
                  ...productsInfo.AmazonRDS.storage({
                    databaseEngine: normalizeEngineType(resource.properties.engine.type)
                  }),
                  multiplier: 1,
                  upperThresholdMultiplier: 64000
                },
                ...(resource.properties.accessibility?.forceDisablePublicIp ? [] : [productsInfo.AmazonEC2.publicIp()])
              ]
            : resource.properties.engine.type === 'aurora-mysql' ||
                resource.properties.engine.type === 'aurora-postgresql'
              ? [
                  ...resource.properties.engine.properties.instances
                    .map(({ instanceSize }) => [
                      {
                        ...productsInfo.AmazonRDS.instance({
                          databaseEngine: normalizeEngineType(resource.properties.engine.type),
                          instanceType: instanceSize
                        })
                      },
                      ...(resource.properties.accessibility?.forceDisablePublicIp
                        ? []
                        : [productsInfo.AmazonEC2.publicIp()])
                    ])
                    .flat(),
                  {
                    ...productsInfo.AmazonRDS.storage({
                      databaseEngine: normalizeEngineType(resource.properties.engine.type)
                    }),
                    multiplier: 1,
                    upperThresholdMultiplier: 64000
                  }
                ]
              : [
                  {
                    ...productsInfo.AmazonRDS.instance({
                      databaseEngine: normalizeEngineType(resource.properties.engine.type),
                      instanceType: (resource.properties.engine as RdsEngine).properties.primaryInstance.instanceSize
                    }),
                    multiplier: (resource.properties.engine as RdsEngine).properties.primaryInstance.multiAz ? 2 : 1
                  },
                  ...(resource.properties.accessibility?.forceDisablePublicIp
                    ? []
                    : [productsInfo.AmazonEC2.publicIp()]),
                  {
                    ...productsInfo.AmazonRDS.storage({
                      databaseEngine: normalizeEngineType(resource.properties.engine.type)
                    }),
                    multiplier:
                      ((resource.properties.engine as RdsEngine).properties.primaryInstance.multiAz ? 2 : 1) *
                      ((resource.properties.engine as RdsEngine).properties.storage?.initialSize || 20),
                    upperThresholdMultiplier:
                      ((resource.properties.engine as RdsEngine).properties.primaryInstance.multiAz ? 2 : 1) *
                      ((resource.properties.engine as RdsEngine).properties.storage?.maxSize || 200)
                  },
                  ...((resource.properties.engine as RdsEngine).properties.readReplicas || [])
                    .map(({ instanceSize, multiAz }) => [
                      {
                        ...productsInfo.AmazonRDS.instance({
                          databaseEngine: normalizeEngineType(resource.properties.engine.type),
                          instanceType: instanceSize
                        }),
                        multiplier: multiAz ? 2 : 1
                      },
                      ...(resource.properties.accessibility?.forceDisablePublicIp
                        ? []
                        : [productsInfo.AmazonEC2.publicIp()]),
                      {
                        ...productsInfo.AmazonRDS.storage({
                          databaseEngine: normalizeEngineType(resource.properties.engine.type)
                        }),
                        multiplier:
                          (multiAz ? 2 : 1) *
                          ((resource.properties.engine as RdsEngine).properties.storage?.initialSize || 20),
                        upperThresholdMultiplier:
                          (multiAz ? 2 : 1) *
                          ((resource.properties.engine as RdsEngine).properties.storage?.maxSize || 200)
                      }
                    ])
                    .flat()
                ]
    });

    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS RDS pricing': 'https://aws.amazon.com/rds/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/database-resources/relational-databases/#under-the-hood'
    };
  }
  if (resource.type === 'sqs-queue') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: []
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS SQS pricing': 'https://aws.amazon.com/sqs/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/sqs-queues/'
    };
  }
  if (resource.type === 'state-machine') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: []
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS Step Functions pricing': 'https://aws.amazon.com/step-functions/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/state-machines/'
    };
  }
  if (resource.type === 'upstash-redis') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.UpstashRedis.commands()]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'Upstash pricing': 'https://upstash.com/pricing'
      },
      underTheHoodLink: 'https://docs.stacktape.com/3rd-party-resources/upstash-redis/'
    };
  }
  if (resource.type === 'user-auth-pool') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [productsInfo.AmazonCognito.mau()]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS Cognito pricing': 'https://aws.amazon.com/cognito/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/security-resources/user-auth-pools/'
    };
  }
  if (resource.type === 'web-app-firewall') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.awswaf.firewall(),
        { ...productsInfo.awswaf.firewallRule(), multiplier: resource.properties?.rules?.length || 2 },
        productsInfo.awswaf.firewallRequests()
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS WAF pricing': 'https://aws.amazon.com/waf/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/security-resources/web-app-firewalls/'
    };
  }
  if (resource.type === 'web-service') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        ...(resource.properties?.resources?.instanceTypes
          ? [
              {
                ...productsInfo.AmazonEC2.instance({
                  instanceType: resource.properties.resources.instanceTypes[0],
                  operatingSystem: 'Linux'
                }),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ]
          : [
              {
                ...productsInfo.AmazonECS.cpu({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier: (resource.properties.scaling?.minInstances || 1) * resource.properties.resources.cpu,
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * resource.properties.resources.cpu
                  : undefined
              },
              {
                ...productsInfo.AmazonECS.memory({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier:
                  (resource.properties.scaling?.minInstances || 1) * (resource.properties.resources.memory / 1024),
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * (resource.properties.resources.memory / 1024)
                  : undefined
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ]),
        ...(resource.properties.loadBalancing?.type === 'application-load-balancer'
          ? [
              productsInfo.AmazonEC2.loadBalancer({ type: 'application' }),
              productsInfo.AmazonEC2.loadBalancerLcu({ type: 'application' }),
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: 2
              }
            ]
          : resource.properties.loadBalancing?.type === 'network-load-balancer'
            ? [
                productsInfo.AmazonEC2.loadBalancer({ type: 'network' }),
                productsInfo.AmazonEC2.loadBalancerLcu({ type: 'network' }),
                {
                  ...productsInfo.AmazonEC2.publicIp(),
                  multiplier: 2
                }
              ]
            : [productsInfo.AmazonApiGateway.httpApiRequests()])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS ECS Fargate pricing': 'https://aws.amazon.com/fargate/pricing/',
        'AWS EC2 instances pricing': 'https://aws.amazon.com/ec2/pricing/on-demand/',
        'AWS Load Balancer pricing': 'https://aws.amazon.com/elasticloadbalancing/pricing/',
        'AWS HTTP API Gateway pricing': 'https://aws.amazon.com/api-gateway/pricing/'
      },
      customComment:
        resource.properties.resources.instanceTypes &&
        (resource.properties.resources.cpu || resource.properties.resources.memory)
          ? 'When specifying both memory + cpu and instanceTypes the estimation might be less precise.'
          : (resource.properties.resources.instanceTypes?.length || 0) > 1
            ? 'When multiple instanceTypes are specified, the estimations might be less precise.'
            : undefined,
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/web-services/#under-the-hood'
    };
  }
  if (resource.type === 'worker-service') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        ...(resource.properties?.resources?.instanceTypes
          ? [
              {
                ...productsInfo.AmazonEC2.instance({
                  instanceType: resource.properties.resources.instanceTypes[0],
                  operatingSystem: 'Linux'
                }),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ]
          : [
              {
                ...productsInfo.AmazonECS.cpu({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier: (resource.properties.scaling?.minInstances || 1) * resource.properties.resources.cpu,
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * resource.properties.resources.cpu
                  : undefined
              },
              {
                ...productsInfo.AmazonECS.memory({ cpuArchitecture: 'AMD64', operatingSystem: 'Linux' }),
                multiplier:
                  (resource.properties.scaling?.minInstances || 1) * (resource.properties.resources.memory / 1024),
                upperThresholdMultiplier: resource.properties.scaling?.maxInstances
                  ? (resource.properties.scaling?.maxInstances || 1) * (resource.properties.resources.memory / 1024)
                  : undefined
              },
              {
                ...productsInfo.AmazonEC2.publicIp(),
                multiplier: resource.properties.scaling?.minInstances || 1,
                upperThresholdMultiplier: resource.properties.scaling && (resource.properties.scaling.maxInstances || 1)
              }
            ])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS ECS Fargate pricing': 'https://aws.amazon.com/fargate/pricing/',
        'AWS EC2 instances pricing': 'https://aws.amazon.com/ec2/pricing/on-demand/'
      },
      customComment:
        resource.properties.resources.instanceTypes &&
        (resource.properties.resources.cpu || resource.properties.resources.memory)
          ? 'When specifying both memory + cpu and instanceTypes the estimation might be less precise.'
          : (resource.properties.resources.instanceTypes?.length || 0) > 1
            ? 'When multiple instanceTypes are specified, the estimations might be less precise.'
            : undefined,
      underTheHoodLink: 'https://docs.stacktape.com/compute-resources/worker-services/#under-the-hood'
    };
  }
  if (resource.type === 'efs-filesystem') {
    const priceInfo = await getCumulatedPriceInfoForProducts({
      dynamoDbTableName,
      region,
      products: [
        productsInfo.AmazonEFS.storage(),
        ...(resource.properties?.throughputMode === 'provisioned'
          ? [
              {
                ...productsInfo.AmazonEFS.provisionedThroughput(),
                multiplier: resource.properties?.provisionedThroughputInMibps || 1
              }
            ]
          : resource.properties?.throughputMode === 'bursting'
            ? []
            : [productsInfo.AmazonEFS.elasticReads(), productsInfo.AmazonEFS.elasticWrites()])
      ]
    });
    return {
      priceInfo,
      relatedAwsPricingDocs: {
        'AWS EFS pricing': 'https://aws.amazon.com/efs/pricing/'
      },
      underTheHoodLink: 'https://docs.stacktape.com/other-resources/efs-filesystems/#under-the-hood'
    };
  }
};

const loadProductPricesIntoDynamoTable = async ({
  prices,
  dynamoDbTableName
}: {
  prices: PricingInfo;
  dynamoDbTableName: string;
}) => {
  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  return Promise.all(
    chunkArray(Object.entries(prices), 25).map(async (chunk) => {
      try {
        return await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [dynamoDbTableName]: chunk.map(([productName, value]) => {
                return {
                  PutRequest: {
                    Item: serialize({
                      productName,
                      prices: value
                    })
                  }
                };
              })
            }
          })
        );
      } catch (err) {
        console.info(chunk.map(([productName, value]) => `${productName}: ${JSON.stringify(value)}`).join('\n'));
        throw err;
      }
    })
  );
};

const getCumulatedPriceInfoForStack = async ({
  stackConfig,
  region = 'us-east-1',
  dynamoDbTableName
}: {
  stackConfig: StacktapeConfig;
  region?: string;
  dynamoDbTableName: string;
}) => {
  const resourcesBreakdown: { [resourceName: string]: ResourcePricingInformation } = {};
  let flatMonthlyCost = 0;
  await Promise.all(
    Object.entries(stackConfig.resources).map(async ([resourceName, resourceConfig]) => {
      const priceBreakdown = await getPricingInformationForResource({
        resource: resourceConfig,
        region,
        dynamoDbTableName
      }).catch((err) => {
        console.error(err);
        return null;
      });
      if (priceBreakdown !== null) {
        resourcesBreakdown[resourceName] = priceBreakdown;
        flatMonthlyCost += priceBreakdown.priceInfo.totalMonthlyFlat;
      }
    })
  );
  return {
    flatMonthlyCost,
    resourcesBreakdown
  };
};
