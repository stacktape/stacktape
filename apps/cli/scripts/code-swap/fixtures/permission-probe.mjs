// Runs inside the deliberately overprivileged application. Never returns credentials or signed headers.
import { createHash, createHmac } from 'node:crypto';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
export function permissionResponse(status, result) {
  const errors = result.Responses?.map((item) => item.Error?.Code).filter(Boolean) ?? [];
  const cancellationCodes = result.CancellationReasons?.map((item) => item.Code).filter(Boolean) ?? [];
  const code = result.__type?.split('#').at(-1) ?? errors[0];
  const denied = [code, ...cancellationCodes].some(
    (code) => code === 'AccessDeniedException' || code === 'AccessDenied'
  );
  return { status, code, cancellationCodes, denied };
}
export async function permissionProbe(siblings) {
  const credentials = await (
    await fetch(`http://169.254.170.2${process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI}`)
  ).json();
  const task = await (await fetch(`${process.env.ECS_CONTAINER_METADATA_URI_V4}/task`)).json();
  const taskId = task.TaskARN.split('/').at(-1);
  const sibling = siblings.find((id) => id !== taskId);
  if (!sibling) throw new Error('Probe needs a different live task.');
  const table = process.env.STP_BENCH_TABLE;
  const arn = `arn:aws:dynamodb:eu-west-1:597581086285:table/${table}`;
  const call = async (operation, input) => {
    const body = JSON.stringify(input);
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const target = `DynamoDB_20120810.${operation}`;
    const host = 'dynamodb.eu-west-1.amazonaws.com';
    const headers = {
      'content-type': 'application/x-amz-json-1.0',
      host,
      'x-amz-date': date,
      'x-amz-security-token': credentials.Token,
      'x-amz-target': target
    };
    const names = Object.keys(headers).sort();
    const canonical = [
      'POST',
      '/',
      '',
      names.map((key) => `${key}:${headers[key]}\n`).join(''),
      names.join(';'),
      hash(body)
    ].join('\n');
    const scope = `${date.slice(0, 8)}/eu-west-1/dynamodb/aws4_request`;
    const key = hmac(
      hmac(hmac(hmac(`AWS4${credentials.SecretAccessKey}`, date.slice(0, 8)), 'eu-west-1'), 'dynamodb'),
      'aws4_request'
    );
    const signature = createHmac('sha256', key)
      .update(`AWS4-HMAC-SHA256\n${date}\n${scope}\n${hash(canonical)}`)
      .digest('hex');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${credentials.AccessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
    const response = await fetch(`https://${host}/`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000)
    });
    const result = await response.json();
    return permissionResponse(response.status, result);
  };
  const results = [];
  const attempt = async (name, operation, input, denied = true) => {
    const result = await call(operation, input);
    results.push({ name, operation, expectedDenied: denied, ...result });
    if (result.denied !== denied || (!denied && result.status !== 200))
      throw new Error(`Permission boundary failed: ${name}: ${JSON.stringify(result)}`);
  };
  await attempt('read release', 'GetItem', { TableName: table, Key: { pk: { S: 'release#node' } } }, false);
  await attempt(
    'query release',
    'Query',
    {
      TableName: table,
      KeyConditionExpression: 'pk = :key',
      ExpressionAttributeValues: { ':key': { S: 'release#node' } }
    },
    false
  );
  const own = `status#node#${process.env.STP_BENCH_ROLE_ID}:${taskId}`;
  await attempt(
    'write own status',
    'PutItem',
    {
      TableName: table,
      Item: {
        pk: { S: own },
        data: { S: JSON.stringify({ state: 'probe', revision: 'probe', task: taskId, timings: {} }) }
      }
    },
    false
  );
  for (const pk of ['lock', 'release#node', `status#node#${process.env.STP_BENCH_ROLE_ID}:${sibling}`]) {
    const Key = { pk: { S: pk } },
      Item = { ...Key, data: { S: 'forged' } };
    await attempt(`put ${pk}`, 'PutItem', { TableName: table, Item });
    await attempt(`update ${pk}`, 'UpdateItem', {
      TableName: table,
      Key,
      UpdateExpression: 'SET #data = :data',
      ExpressionAttributeNames: { '#data': 'data' },
      ExpressionAttributeValues: { ':data': { S: 'forged' } }
    });
    await attempt(`delete ${pk}`, 'DeleteItem', { TableName: table, Key });
    await attempt(`batch put ${pk}`, 'BatchWriteItem', { RequestItems: { [table]: [{ PutRequest: { Item } }] } });
    await attempt(`batch delete ${pk}`, 'BatchWriteItem', { RequestItems: { [table]: [{ DeleteRequest: { Key } }] } });
    await attempt(`transaction put ${pk}`, 'TransactWriteItems', {
      TransactItems: [{ Put: { TableName: table, Item } }]
    });
    await attempt(`transaction delete ${pk}`, 'TransactWriteItems', {
      TransactItems: [{ Delete: { TableName: table, Key } }]
    });
    const statement = {
      Statement: `UPDATE "${table}" SET "data"=? WHERE "pk"=?`,
      Parameters: [{ S: 'forged' }, { S: pk }]
    };
    await attempt(`PartiQL ${pk}`, 'ExecuteStatement', statement);
    await attempt(`batch PartiQL ${pk}`, 'BatchExecuteStatement', { Statements: [statement] });
    await attempt(`transaction PartiQL ${pk}`, 'ExecuteTransaction', { TransactStatements: [statement] });
  }
  await attempt('TTL', 'UpdateTimeToLive', {
    TableName: table,
    TimeToLiveSpecification: { AttributeName: 'expires', Enabled: true }
  });
  await attempt('table update', 'UpdateTable', {
    TableName: table,
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
  });
  await attempt('policy replacement', 'PutResourcePolicy', {
    ResourceArn: arn,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: '*', Action: 'dynamodb:GetItem', Resource: arn }]
    }),
    ConfirmRemoveSelfResourceAccess: true
  });
  await attempt('policy deletion', 'DeleteResourcePolicy', { ResourceArn: arn });
  await attempt('table deletion', 'DeleteTable', { TableName: table });
  return { taskId, sibling, results };
}
