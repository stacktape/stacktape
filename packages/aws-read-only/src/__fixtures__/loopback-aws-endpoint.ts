import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export type RecordedAwsRequest = { method: string; path: string; target?: string };

/**
 * A local stand-in for AWS. While it runs, every SDK client created in this process sends here through the standard
 * `AWS_ENDPOINT_URL` setting, and each request is recorded, so a test can tell whether an operation was actually sent
 * rather than only what a function returned. Every request succeeds, so an operation that should have been refused
 * shows up as a recorded request, not as an unrelated network error.
 */
export const startLoopbackAwsEndpoint = async () => {
  const requests: RecordedAwsRequest[] = [];
  // A test sets this to answer a request with its own JSON body; anything it leaves unanswered gets the default.
  let respond: ((request: RecordedAwsRequest) => string | undefined) | undefined;
  const server = createServer((request, response) => {
    request.resume();
    request.on('end', () => {
      const target = request.headers['x-amz-target'];
      const recorded = {
        method: request.method ?? '',
        path: request.url ?? '',
        ...(typeof target === 'string' ? { target } : {})
      };
      requests.push(recorded);
      // Lambda's REST reads return a function list; JSON-protocol services accept an empty object.
      const isJsonProtocol = typeof target === 'string';
      response.writeHead(200, {
        'content-type': isJsonProtocol ? 'application/x-amz-json-1.1' : 'application/json'
      });
      response.end(respond?.(recorded) ?? (isJsonProtocol ? '{}' : '{"Functions":[]}'));
    });
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address() as AddressInfo;

  // Every client this process creates sends here, never to AWS; a CLI test preload may have turned configured endpoints
  // off, so they are turned back on for this process only, pointed at this fixture.
  const previousEndpoint = process.env.AWS_ENDPOINT_URL;
  const previousIgnore = process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
  process.env.AWS_ENDPOINT_URL = `http://127.0.0.1:${port}`;
  delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;

  return {
    requests,
    respondWith: (handler: typeof respond) => {
      respond = handler;
    },
    close: async () => {
      if (previousEndpoint === undefined) delete process.env.AWS_ENDPOINT_URL;
      else process.env.AWS_ENDPOINT_URL = previousEndpoint;
      if (previousIgnore === undefined) delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
      else process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = previousIgnore;
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  };
};

// An application secret as AWS stores it in plain function and container environments.
export const environmentValue = ['loopback', 'environment', 'value', 'must', 'not', 'leave'].join('-');
const functionConfiguration = {
  FunctionName: 'orders',
  Runtime: 'nodejs22.x',
  MemorySize: 512,
  Environment: { Variables: { DATABASE_URL: environmentValue, STAGE: environmentValue } }
};

/** Lambda and ECS reads answered the way AWS answers them, environment values included. */
export const answerWithEnvironments = ({ path, target }: { path: string; target?: string }) => {
  if (target === 'AmazonEC2ContainerServiceV20141113.DescribeTaskDefinition') {
    return JSON.stringify({
      taskDefinition: {
        family: 'orders',
        containerDefinitions: [
          {
            name: 'api',
            image: 'orders:42',
            environment: [{ name: 'API_TOKEN', value: environmentValue }],
            secrets: [{ name: 'DB_PASSWORD', valueFrom: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:db' }]
          }
        ]
      }
    });
  }
  if (path.endsWith('/configuration')) return JSON.stringify(functionConfiguration);
  if (path.startsWith('/2015-03-31/functions/orders')) {
    return JSON.stringify({ Configuration: functionConfiguration, Code: { RepositoryType: 'S3' } });
  }
  if (path.startsWith('/2015-03-31/functions')) return JSON.stringify({ Functions: [functionConfiguration] });
  return undefined;
};
