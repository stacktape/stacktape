const run = async (cmd: string[], name: string) => {
  console.info(`→ ${name}...`);
  const proc = Bun.spawn(cmd, { stdout: 'inherit', stderr: 'inherit' });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${name} failed with code ${code}`);
};

const migrate = async () => {
  if (!process.env.STP_POSTGRES_DB_CONNECTION_STRING) {
    console.error('STP_POSTGRES_DB_CONNECTION_STRING not set');
    process.exit(1);
  }

  try {
    await run(['bunx', 'prisma', 'generate'], 'Generating Prisma client');
    await run(['bunx', 'prisma', 'db', 'push'], 'Pushing schema to database');
    console.info('✓ Database schema synced');
  } catch (err) {
    console.error('Migration failed:', (err as Error).message);
    process.exit(1);
  }
};

migrate();
