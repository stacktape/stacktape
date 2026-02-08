import { join } from 'node:path';
import { DescribeDBEngineVersionsCommand, RDSClient } from '@aws-sdk/client-rds';
import { DB_ENGINE_VERSIONS_FOLDER } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { outputFile } from 'fs-extra';

const client = new RDSClient({ region: 'us-east-1' }); // Specify your region

const ALLOWED_RDS_ENGINES: StpRelationalDatabase['engine']['type'][] = [
  'aurora-mysql',
  'aurora-postgresql',
  'mariadb',
  'mysql',
  'oracle-ee',
  'oracle-se2',
  'postgres',
  'sqlserver-ee',
  'sqlserver-ex',
  'sqlserver-se',
  'sqlserver-web'
];

const VERSION_THRESHOLDS: Record<number, number> = {
  18: 10,
  17: 10,
  16: 10,
  15: 10,
  14: 12,
  13: 15
};

async function fetchRdsEngineVersions() {
  const finalData = {};
  let marker;

  do {
    try {
      // Fetch all engine versions, paginating through results
      const params = {
        Marker: marker,
        MaxRecords: 100 // You can adjust this number based on your needs
      };
      const command = new DescribeDBEngineVersionsCommand(params);
      const data = await client.send(command);

      // Process the data
      data.DBEngineVersions.forEach((item) => {
        const engineName = item.Engine;

        if (
          item.Status !== 'available' ||
          !ALLOWED_RDS_ENGINES.includes(engineName as StpRelationalDatabase['engine']['type'])
        ) {
          return;
        }
        if (!finalData[engineName]) {
          finalData[engineName] = [];
        }
        if (item.EngineVersion && !finalData[engineName].includes(item.EngineVersion)) {
          finalData[engineName].push({ version: item.EngineVersion, createDate: item.CreateTime });
        }
        const supportsServerless = item.SupportedEngineModes?.includes('serverless');
        if (supportsServerless) {
          const slsEngineName = `${engineName}-serverless`;
          if (!finalData[slsEngineName]) {
            finalData[slsEngineName] = [];
          }
          if (item.EngineVersion && !finalData[slsEngineName].includes(item.EngineVersion)) {
            finalData[slsEngineName].push({ version: item.EngineVersion, createDate: item.CreateTime });
          }
        }
        const supportsServerlessV2 =
          (engineName === 'aurora-mysql' && isServerlessV2AuroraMySQLVersion(item.EngineVersion)) ||
          (engineName === 'aurora-postgresql' && isServerlessV2AuroraPostgresVersion(item.EngineVersion));
        if (supportsServerlessV2) {
          const slsEngineName = `${engineName}-serverless-v2`;
          if (!finalData[slsEngineName]) {
            finalData[slsEngineName] = [];
          }
          if (item.EngineVersion && !finalData[slsEngineName].includes(item.EngineVersion)) {
            finalData[slsEngineName].push({ version: item.EngineVersion, createDate: item.CreateTime });
          }
        }
      });

      // Check if there is a next page
      marker = data.Marker;
    } catch (error) {
      console.error('Error fetching engine versions:', error);
      return;
    }
  } while (marker);
  Object.keys(finalData).forEach((engineName) => {
    finalData[engineName] = finalData[engineName].map(({ version }) => version).reverse();
  });
  return finalData;
}

function isServerlessV2AuroraMySQLVersion(version: string): boolean {
  const parseVersion = (ver: string) => {
    const regex = /^(\d+)\.(\d+)\.mysql_aurora\.(\d+)\.(\d+)\.(\d+)$/;
    const match = ver.match(regex);

    if (!match) {
      throw new Error(`Invalid Aurora MySQL version format: ${version}`);
    }

    return match.slice(1).map(Number);
  };

  const partsA = parseVersion(version);
  const partsB = parseVersion('8.0.mysql_aurora.3.08.0');

  // Compare each part numerically
  for (let i = 0; i < partsA.length; i++) {
    if (partsA[i] > partsB[i]) {
      return true;
    } // versionA is greater
    if (partsA[i] < partsB[i]) {
      return false;
    } // versionB is greater
  }

  return true;
}

function isServerlessV2AuroraPostgresVersion(version: string): boolean {
  const parseVersion = (ver: string): [number, number] => {
    const cleanedVersion = ver.split('-')[0];
    const parts = cleanedVersion.split('.').map(Number);
    if (parts.length !== 2 || parts.some(Number.isNaN)) {
      throw new Error(`Invalid Aurora Postgres version format: ${cleanedVersion}`);
    }
    return [parts[0], parts[1]];
  };

  const [major, minor] = parseVersion(version);

  if (VERSION_THRESHOLDS[major] !== undefined) {
    return minor >= VERSION_THRESHOLDS[major];
  }

  return false;
}

export const generateDbEngineVersionsFile = async () => {
  logInfo('Generating db engine versions file...');
  const result = { rds: await fetchRdsEngineVersions() };

  await outputFile(join(DB_ENGINE_VERSIONS_FOLDER, 'versions.json'), JSON.stringify(result));

  logSuccess('Db engine versions file generated successfully.');
};

if (import.meta.main) {
  generateDbEngineVersionsFile();
}
