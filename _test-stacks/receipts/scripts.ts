import { LocalScript, RelationalDatabase } from '../../__release-npm';
import { PRODUCTION_STAGE, STAGING_STAGE } from './env';

const getDbSeedCommand = (environment: string) => {
  switch (environment) {
    case PRODUCTION_STAGE:
      return 'cd packages/service && NODE_ENV=local npm run prismaSeedProd';
    case STAGING_STAGE:
      return 'cd packages/service && NODE_ENV=local npm run prismaSeedStaging';
    case 'dev':
    default:
      return 'cd packages/service && NODE_ENV=local npm run prismaSeedDev';
  }
};

export const getScripts = (stage: string, mainPostgresDatabase: RelationalDatabase) => {
  return {
    generatePrismaClient: new LocalScript({
      executeCommand: 'npx prisma generate --schema packages/service/src/prisma/schema.prisma'
    }),
    buildProjects: new LocalScript({
      executeCommand: 'npm run build'
    }),
    migrateDb: new LocalScript({
      executeCommands: [
        'npx prisma migrate deploy --schema packages/service/src/prisma/schema.prisma',
        getDbSeedCommand(stage)
      ],
      connectTo: [mainPostgresDatabase]
    })
  };
};
