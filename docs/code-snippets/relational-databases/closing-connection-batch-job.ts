const connectionPool = createConnectionPool();

connectionPool.connect();

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

doSomethingWithYourConnection();

connectionPool.close();
