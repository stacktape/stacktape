import type { ValidatedAwsCredentials } from './credentials';
import type { TuiManager } from '@application-services/tui-manager';
import { timeAsync } from '@utils/timings';

import { hintMessages } from '@errors';
import { redactAwsRequestInput } from 'src/aws/redact-request-input';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { CliError } from '@utils/errors';

export const createAwsErrorHandler =
  ({ credentials, profile }: { credentials: () => ValidatedAwsCredentials; profile: () => string }) =>
  (message: string) =>
  (err: Error) => {
    if (err instanceof CliError) {
      throw err;
    }
    let additionalMessage = '';
    if (`${err}`.includes('provided token has expired')) {
      additionalMessage = JSON.stringify({
        ...credentials().identity,
        expiration: credentials().expiration,
        source: credentials().source
      });
    }
    throw new CliError({
      category: 'AWS',
      code: 'AWS_REQUEST_FAILED',
      message: `${message}\nError message:\n${err}${additionalMessage ? `\n${additionalMessage}` : ''}`,
      hints: getHintsForAWSError(err, credentials, profile),
      cause: err
    });
  };

const getHintsForAWSError = (err: Error, credentials: () => ValidatedAwsCredentials, profile: () => string) => {
  const hints = [];
  const lowerCasedError = `${err}`.toLowerCase();
  const isPotentiallyWrongProfileError =
    lowerCasedError.includes('accessdenied') ||
    lowerCasedError.includes('access denied') ||
    lowerCasedError.includes('notauthorized') ||
    lowerCasedError.includes('unauthorized') ||
    lowerCasedError.includes('insufficient privileges') ||
    lowerCasedError.includes('insufficient permissions') ||
    lowerCasedError.includes('not authorized');
  if (isPotentiallyWrongProfileError) {
    hints.push(
      ...hintMessages.weakCredentials({
        profile: profile(),
        credentials: credentials()
      })
    );
  }
  return hints;
};

export const createAwsLoggingPlugin = ({
  printer,
  isDebug
}: {
  printer: Pick<TuiManager, 'colorize' | 'debug'>;
  isDebug: () => boolean;
}) => ({
  applyToStack: (stack) => {
    // Middleware added to mark start and end of an complete API call.
    stack.add(
      (next, context) => async (args) => {
        const operation = `${context.clientName.replace('Client', '')}.${context.commandName.replace('Command', '')}`;
        const input = redactAwsRequestInput({
          commandName: context.commandName,
          filterSensitiveLog: context.inputFilterSensitiveLog,
          input: args.input || {}
        });
        const prefix = `[${printer.colorize('gray', `DEBUG: ${operation}`)}]`;
        const shouldPrint =
          isDebug() &&
          // we are not printing requests for sending logs to /stp/stack-operations log group as it creates infinite sending loop (and too much logs) during debug logging
          !(
            context.commandName.includes('PutLogEvents') &&
            input.logGroupName === awsResourceNames.stackOperationsLogGroup()
          );

        if (shouldPrint) {
          printer.debug(`${prefix} Request input:\n  └ ${JSON.stringify(input)}`);
        }

        const start = Date.now();

        // One span per HTTP attempt: retries run this middleware again. Only the operation name is recorded.
        const result = await timeAsync('aws:request', () => next(args), { operation });

        const end = Date.now();

        // const metadata = result.output?.$metadata || {};
        if (shouldPrint) {
          printer.debug(`${prefix} Done in ${end - start}ms.`);
        }
        return result;
      },
      { tags: ['ROUND_TRIP'], step: 'deserialize' }
    );
  }
});
