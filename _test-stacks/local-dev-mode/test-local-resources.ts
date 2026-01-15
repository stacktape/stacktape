// Simple test to verify local resource logic works
import { execSync } from 'child_process';

const runCommand = (cmd: string) => {
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    return { success: true, output: result };
  } catch (err: any) {
    return { success: false, output: err.stderr || err.message };
  }
};

const testDockerAvailable = () => {
  console.log('Testing Docker availability...');
  const result = runCommand('docker --version');
  if (!result.success) {
    console.error('Docker not available:', result.output);
    return false;
  }
  console.log('Docker version:', result.output.trim());
  return true;
};

const testPostgresContainer = async () => {
  console.log('\nTesting Postgres container...');
  const containerName = 'stp-test-postgres';

  // Stop any existing container
  runCommand(`docker stop ${containerName} 2>/dev/null`);
  runCommand(`docker rm ${containerName} 2>/dev/null`);

  // Start postgres
  const startResult = runCommand(
    `docker run -d --name ${containerName} -e POSTGRES_PASSWORD=testpass -p 5433:5432 postgres:16`
  );
  if (!startResult.success) {
    console.error('Failed to start Postgres:', startResult.output);
    return false;
  }
  console.log('Postgres container started');

  // Wait for ready
  console.log('Waiting for Postgres to be ready...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const checkResult = runCommand(`docker exec ${containerName} pg_isready -U postgres`);
    if (checkResult.success) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error('Postgres did not become ready');
    runCommand(`docker stop ${containerName}`);
    runCommand(`docker rm ${containerName}`);
    return false;
  }

  console.log('Postgres is ready!');

  // Cleanup
  runCommand(`docker stop ${containerName}`);
  runCommand(`docker rm ${containerName}`);
  console.log('Postgres container cleaned up');

  return true;
};

const testMysqlContainer = async () => {
  console.log('\nTesting MySQL container...');
  const containerName = 'stp-test-mysql';

  // Stop any existing container
  runCommand(`docker stop ${containerName} 2>/dev/null`);
  runCommand(`docker rm ${containerName} 2>/dev/null`);

  // Start mysql
  const startResult = runCommand(
    `docker run -d --name ${containerName} -e MYSQL_ROOT_PASSWORD=testpass -p 3307:3306 mysql:8.0`
  );
  if (!startResult.success) {
    console.error('Failed to start MySQL:', startResult.output);
    return false;
  }
  console.log('MySQL container started');

  // Wait for ready (MySQL takes longer)
  console.log('Waiting for MySQL to be ready...');
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const checkResult = runCommand(`docker exec ${containerName} mysqladmin ping -h localhost --silent`);
    if (checkResult.success) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error('MySQL did not become ready');
    runCommand(`docker stop ${containerName}`);
    runCommand(`docker rm ${containerName}`);
    return false;
  }

  console.log('MySQL is ready!');

  // Cleanup
  runCommand(`docker stop ${containerName}`);
  runCommand(`docker rm ${containerName}`);
  console.log('MySQL container cleaned up');

  return true;
};

const testRedisContainer = async () => {
  console.log('\nTesting Redis container...');
  const containerName = 'stp-test-redis';

  // Stop any existing container
  runCommand(`docker stop ${containerName} 2>/dev/null`);
  runCommand(`docker rm ${containerName} 2>/dev/null`);

  // Start redis
  const startResult = runCommand(`docker run -d --name ${containerName} -p 6380:6379 redis:7.2`);
  if (!startResult.success) {
    console.error('Failed to start Redis:', startResult.output);
    return false;
  }
  console.log('Redis container started');

  // Wait for ready
  console.log('Waiting for Redis to be ready...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const checkResult = runCommand(`docker exec ${containerName} redis-cli ping`);
    if (checkResult.success && checkResult.output.includes('PONG')) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    console.error('Redis did not become ready');
    runCommand(`docker stop ${containerName}`);
    runCommand(`docker rm ${containerName}`);
    return false;
  }

  console.log('Redis is ready!');

  // Cleanup
  runCommand(`docker stop ${containerName}`);
  runCommand(`docker rm ${containerName}`);
  console.log('Redis container cleaned up');

  return true;
};

const main = async () => {
  console.log('=== Local Dev Mode Resource Tests ===\n');

  if (!testDockerAvailable()) {
    console.error('\nDocker is not available. Please ensure Docker is running.');
    process.exit(1);
  }

  const results = {
    postgres: await testPostgresContainer(),
    mysql: await testMysqlContainer(),
    redis: await testRedisContainer()
  };

  console.log('\n=== Test Results ===');
  console.log('Postgres:', results.postgres ? '✓ PASS' : '✗ FAIL');
  console.log('MySQL:', results.mysql ? '✓ PASS' : '✗ FAIL');
  console.log('Redis:', results.redis ? '✓ PASS' : '✗ FAIL');

  const allPassed = Object.values(results).every((r) => r);
  process.exit(allPassed ? 0 : 1);
};

main();
