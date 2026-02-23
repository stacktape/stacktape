import kleur from 'kleur';
import stripAnsi from 'strip-ansi';

const getTimeString = () => {
  const date = new Date();
  return `(${kleur.gray(`${date.toLocaleTimeString('sk-SK')}:${date.getMilliseconds()}`)})`;
};

const isSilent = () => {
  return process.env.STP_SILENT_SCRIPT_LOGS === 'true';
};

/**
 * Success prints message
 *
 * @param {string} message - message to print
 */
export const logSuccess = (message) => {
  if (isSilent()) return;
  console.info(`${kleur.green('✓')} ${getTimeString()} ${message}`);
};

/**
 * Success prints message
 *
 * @param {string} message - message to print
 */
export const logWarn = (message) => {
  if (isSilent()) return;
  console.info(`${kleur.yellow('~')} ${getTimeString()} ${message}`);
};

/**
 * Info prints message
 *
 * @param {string} message - message to print
 */
export const logInfo = (message) => {
  if (isSilent()) return;
  console.info(`${kleur.cyan('i')} ${getTimeString()} ${message}`);
};

/**
 * Pretty prints error
 *
 * @param {Error} error
 * @param {string} prefix
 */
export const logError = (error, prefix = '') => {
  if (isSilent()) return;
  const errDetails =
    error instanceof Error ? error.stack || error.message : `Unknown error:\n${JSON.stringify(error, null, 2)}`;
  console.error(`${kleur.red('✖')} ${getTimeString()}${prefix ? ` ${prefix}` : ''} ${errDetails}`);
};

/**
 * Pretty log error messages
 *
 * @param {string[]} errorMessages
 */
export const logErrorMessage = (errorMessages) => {
  if (isSilent()) return;
  const beginning = `${kleur.red('✖')} ${getTimeString()}`;
  const beginningLength = stripAnsi(beginning).length + 1;
  console.error(`${beginning} ${errorMessages.join(`\n${' '.repeat(beginningLength)}`)}`);
};

export const logPath = (path: string) => {
  return kleur.gray().bold(path);
};
