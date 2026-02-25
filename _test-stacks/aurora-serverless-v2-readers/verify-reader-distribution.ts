import { Client } from 'pg';

const readerConnectionString = process.env.READER_CONNECTION_STRING;

if (!readerConnectionString) {
  throw new Error('Missing READER_CONNECTION_STRING environment variable');
}

const sampleCount = Number(process.env.SAMPLE_COUNT || 40);

const run = async () => {
  const sampleResults: { instanceId: string; address: string; port: number; isReader: boolean }[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const client = new Client({ connectionString: readerConnectionString, statement_timeout: 10_000 });
    await client.connect();
    try {
      const result = await client.query<{
        instance_id: string;
        address: string;
        port: number;
        is_reader: boolean;
      }>(
        'select aurora_db_instance_identifier() as instance_id, inet_server_addr()::text as address, inet_server_port() as port, pg_is_in_recovery() as is_reader'
      );
      sampleResults.push({
        instanceId: result.rows[0].instance_id,
        address: result.rows[0].address,
        port: result.rows[0].port,
        isReader: result.rows[0].is_reader
      });
    } finally {
      await client.end();
    }
  }

  const byInstanceId: Record<string, number> = {};
  sampleResults.forEach(({ instanceId }) => {
    byInstanceId[instanceId] = (byInstanceId[instanceId] || 0) + 1;
  });

  const byAddress: Record<string, number> = {};
  sampleResults.forEach(({ address }) => {
    byAddress[address] = (byAddress[address] || 0) + 1;
  });

  const readerResponses = sampleResults.filter(({ isReader }) => isReader).length;
  const writerResponses = sampleResults.length - readerResponses;

  console.log(
    JSON.stringify(
      {
        sampleCount,
        uniqueInstances: Object.keys(byInstanceId).length,
        byInstanceId,
        uniqueAddresses: Object.keys(byAddress).length,
        byAddress,
        readerResponses,
        writerResponses
      },
      null,
      2
    )
  );
};

run();
