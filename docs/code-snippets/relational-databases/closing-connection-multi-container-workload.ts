const connectionPool = createConnectionPool();

// remember to close the connection even on errors
process
  .on('uncaughtException', () => {
    connectionPool.close();
    process.exit(1);
  })
  .on('unhandledRejection', () => {
    connectionPool.close();
    process.exit(1);
  });

process.on('SIGTERM', () => {
  connectionPool.close();
  process.exit(0);
});
