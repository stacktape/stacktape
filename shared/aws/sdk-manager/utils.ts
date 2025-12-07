import { HttpRequest } from '@aws-sdk/protocol-http';
import { getRandomNumberFromInterval, wait } from '@shared/utils/misc';
import { pascalCase } from 'change-case';
import pRetry from 'p-retry';

export const retryPlugin = {
  applyToStack: (stack) => {
    stack.add(
      (next) => async (args) => {
        let tryNumber = 1;
        return pRetry(() => next(args), {
          retries: 5,
          onFailedAttempt: async (err) => {
            const errMessage = err.toString();
            // console.log(
            //   `Failed. Retrying... Retry attempts: ${tryNumber}. Error:\n${JSON.stringify(err, null, 2)}\nArgs: ${args}`
            // );
            if (
              errMessage.includes('EAI_AGAIN') ||
              errMessage.includes('ENOTFOUND') ||
              errMessage.includes('ECONNREFUSED') ||
              errMessage.includes('EHOSTUNREACH') ||
              errMessage.includes('Throttling') ||
              errMessage.includes('Rate exceeded') ||
              errMessage.includes('Please try again')
            ) {
              await wait(Math.ceil(getRandomNumberFromInterval(1.68, 2.18) ** tryNumber) * 1000);
              tryNumber++;
              return;
            }
            throw err;
          }
        });
      },
      { tags: ['ROUND_TRIP'], step: 'initialize' }
    );
  }
};

export const redirectPlugin = {
  applyToStack: (stack) => {
    // Middleware to follow s3 temporary redirects
    stack.add(
      (next) => async (args: { request: HttpRequest }) => {
        const copyOfRequest = args.request.clone();
        try {
          return await next(args);
        } catch (err) {
          if (err.Code === 'TemporaryRedirect' && err.Endpoint) {
            // we are assuming that the err.Endpoint url is in shape {bucket-name}.{endpoint}
            const [, ...restHost] = (err.Endpoint as string).split('.');
            const redirectHost = restHost.join('.');
            const newArgs = {
              ...args,
              request: new HttpRequest({ ...copyOfRequest, hostname: redirectHost })
            };
            return next(newArgs);
          }
          throw err;
        }
      },
      { tags: ['ROUND_TRIP'], step: 'build' }
    );
  }
};

export const isBucketNativelySupportedHeader = (headerName: string) =>
  ['CacheControl', 'ContentDisposition', 'ContentEncoding', 'ContentLanguage', 'Expires'].includes(
    pascalCase(headerName)
  );

export const automaticUploadFilterPresets: {
  [_presetName in DirectoryUpload['headersPreset']]: DirectoryUploadFilter[];
} = {
  'gatsby-static-website': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'page-data/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'app-data.json',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'static/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    },
    { includePattern: '**/*.js', headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }] },
    { includePattern: '**/*.css', headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }] },
    {
      includePattern: 'sw.js',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    }
  ],
  'static-website': [
    {
      includePattern: '**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    }
  ],
  'single-page-app': [
    {
      includePattern: '**/*.html',
      headers: [{ key: 'cache-control', value: 'public, max-age=0, s-maxage=31536000, must-revalidate' }]
    },
    {
      includePattern: 'static/**/*',
      headers: [{ key: 'cache-control', value: 'public, max-age=31536000, immutable' }]
    }
  ]
};

export const defaultGetErrorFunction = (_message: string) => (err: Error) => {
  throw err;
};

export const transformToCliArgs = (args: StacktapeArgs) => {
  const res = [];
  for (const argName in args) {
    if (typeof args[argName] === 'boolean') {
      if (args[argName] === true) {
        res.push(`--${argName}`);
      }
    } else {
      res.push(`--${argName}`);
      res.push(args[argName]);
    }
  }
  return res;
};
