import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('STP_MAIN_DATABASE_CONNECTION_STRING'),
  },
});
