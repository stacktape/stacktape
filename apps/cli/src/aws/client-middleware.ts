import { HttpRequest } from '@smithy/protocol-http';
import { getRandomNumberFromInterval, wait } from '@utils/misc';
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
    stack.add(
      (next) => async (args: { request: HttpRequest }) => {
        const originalRequest = args.request.clone();
        try {
          return await next(args);
        } catch (err) {
          if (err.Code === 'TemporaryRedirect' && err.Endpoint) {
            // S3 reports the endpoint as `{bucket-name}.{regional-endpoint}`.
            const [, ...regionalEndpointParts] = (err.Endpoint as string).split('.');
            return next({
              ...args,
              request: new HttpRequest({
                ...originalRequest,
                hostname: regionalEndpointParts.join('.')
              })
            });
          }
          throw err;
        }
      },
      { tags: ['ROUND_TRIP'], step: 'build' }
    );
  }
};
