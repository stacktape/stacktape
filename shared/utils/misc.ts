import type { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { homedir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { readFile } from 'fs-extra';
import json5 from 'json5';
import get from 'lodash/get';
import micromatch from 'micromatch';

const readJson = async (filePath: string) => {
  try {
    const contents = await readFile(filePath, { encoding: 'utf8' });
    return json5.parse(contents);
  } catch {
    return null;
  }
};

export const isPromise = (obj: any) => {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
};

export const getHomeDir = (): string => {
  const env = process.env;
  const home = env.HOME || env.USERPROFILE || (env.HOMEPATH ? (env.HOMEDRIVE || 'C:/') + env.HOMEPATH : null);
  if (home) {
    return home;
  }
  if (typeof homedir === 'function') {
    return homedir();
  }
};

export const isNonNullObject = (obj: any) => {
  return obj !== null && typeof obj === 'object';
};

export const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getError = ({
  message,
  type,
  data,
  hint,
  stack,
  code,
  userStackTrace
}: {
  message: string;
  type: ErrorType;
  code?: string;
  hint?: string | string[];
  data?: any;
  stack?: Error['stack'];
  userStackTrace?: string;
}) => {
  const error = new Error(message) as StacktapeError;
  if (stack) {
    error.stack = stack;
  }
  error.hint = hint;
  error.data = data;
  error.type = type;
  error.code = code || null;
  error.isExpected = type !== 'UNEXPECTED';
  error.isNewApproachError = true;
  error.userStackTrace = userStackTrace;
  return error;
};

export const stringMatchesGlob = (testedString: string, globPattern: string): boolean => {
  return micromatch.isMatch(testedString, globPattern, { windows: true });
};

export const sortObjectKeys = (obj) => Object.fromEntries(Object.entries(obj).sort());

export const raiseError = (props: ArgsType<typeof getError>[0]): never => {
  throw getError(props);
};

export const splitStringIntoLines = (text: string, lineMaxLength: number, whitespaceLookup = 40) => {
  const regex = new RegExp(
    String.raw`\s*(?:(\S{${lineMaxLength}})|([\s\S]{${lineMaxLength - whitespaceLookup},${lineMaxLength}})(?!\S))`,
    'g'
  );
  const replacedLines = text
    .split('\n')
    .map((line) => {
      let replacedLine = line.replace(regex, (_, x, y) => (x ? `${x}\n` : `${y}\n`));
      replacedLine = replacedLine.endsWith('\n') ? replacedLine.slice(0, -1) : replacedLine;
      return replacedLine.split('\n');
    })
    .flat()
    .map((line) => line.trim());
  return replacedLines;
};

export const whitespacePrefixMultilineText = (text: string, padding: number, skipFirstLine = false) => {
  return text
    .split('\n')
    .map((line, index) => {
      if (index === 0 && skipFirstLine) {
        return line;
      }
      return `${' '.repeat(padding)}${line}`;
    })
    .join('\n');
};

export const areStringArraysContentsEqual = (arr1: string[], arr2: string[]) => {
  if (arr1?.length !== arr2?.length) {
    return false;
  }
  arr1.sort();
  arr2.sort();
  for (const [index, element] of arr1.entries()) {
    if (element !== arr2[index]) {
      return false;
    }
  }
  return true;
};

export const isJson = (item: any) => {
  const stringifiedItem = typeof item !== 'string' ? JSON.stringify(item) : item;
  let parsedItem: any;
  try {
    parsedItem = JSON.parse(stringifiedItem);
  } catch {
    return false;
  }

  if (typeof parsedItem === 'object' && item !== null) {
    return true;
  }

  return false;
};

export const isSmallAlphanumericDashCase = (str: string) => /^[a-z0-9-]+$/.test(str);

export const isValidJson = (item: string | Record<string, unknown>) => {
  if (typeof item === 'string') {
    try {
      JSON.parse(item);
    } catch {
      return false;
    }
    return true;
  }
  if (typeof item === 'object') {
    return true;
  }
  return false;
};

export const serialize = (item: any) => JSON.parse(JSON.stringify(item));

export const getUniqueDuplicates = (array: any[]): any[] => {
  return Array.from(new Set(array.filter((item, index) => array.indexOf(item) !== index)));
};

export const hasDuplicates = (array: any[]): boolean => {
  return array.length !== new Set(array).size;
};

export const processAllNodes = async (
  node: any,
  processFunction: (...args: any) => any,
  { processNonPrimitiveValues }: { processNonPrimitiveValues: boolean } = { processNonPrimitiveValues: false }
) => {
  if (node === null) {
    return processFunction(node);
  }
  if (Array.isArray(node)) {
    if (processNonPrimitiveValues) {
      processFunction(node);
    }
    return Promise.all(
      node.map((nodeValue) => processAllNodes(nodeValue, processFunction, { processNonPrimitiveValues }))
    );
  }
  if (typeof node === 'object') {
    const res = {};
    if (processNonPrimitiveValues) {
      processFunction(node);
    }
    await Promise.all(
      Object.entries(node).map(async ([prop, nodeValue]) => {
        res[prop] = await processAllNodes(nodeValue, processFunction, { processNonPrimitiveValues });
      })
    );
    return res;
  }
  return processFunction(node);
};

export const processAllNodesSync = (node: any, processFunction: (...args: any) => any) => {
  if (node === null) {
    return processFunction(node);
  }
  if (Array.isArray(node)) {
    return node.map((nodeValue) => processAllNodesSync(nodeValue, processFunction));
  }
  if (typeof node === 'object') {
    const res = {};
    Object.entries(node).forEach(([prop, nodeValue]) => {
      res[prop] = processAllNodesSync(nodeValue, processFunction);
    });

    return res;
  }
  return processFunction(node);
};

export const removePropertiesFromObject = (obj: any, propNames: string[]): any => {
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (propNames.includes(key)) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        removePropertiesFromObject(obj[key], propNames);
      }
    }
  }
  return obj;
};

export const orderPropertiesOfObjectAccordingToKeys = <T>(
  unordered: Record<string, T>,
  compareFn?: (a: string, b: string) => number
): Record<string, T> => {
  return Object.keys(unordered)
    .sort(compareFn)
    .reduce((obj, key) => {
      obj[key] = unordered[key];
      return obj;
    }, {});
};

export const traverseToMaximalExtent = (
  objectToTraverse: any,
  pathToProp: string
): { resultValue: any; validPath: string; restPath: string } => {
  const restPath = pathToProp.split('.');
  if (!restPath.length) {
    return {
      resultValue: objectToTraverse,
      validPath: '',
      restPath: ''
    };
  }
  let value = get(objectToTraverse, restPath[0]);
  let validPath = value !== undefined && restPath.shift();

  while (value !== undefined && restPath.length) {
    const potentialValue = get(objectToTraverse, `${validPath}.${restPath[0]}`);
    if (potentialValue === undefined) {
      break;
    }
    value = potentialValue;
    validPath = `${validPath}.${restPath.shift()}`;
  }

  return {
    resultValue: value,
    validPath,
    restPath: restPath.join('.')
  };
};

export const replaceAll = function (replaceThis: string, withThis: string, inThis: string) {
  if (withThis) {
    withThis = withThis.replace(/\$/g, '$$$$');
  }
  return inThis.replace(new RegExp(replaceThis.replace(/([/,!\\^${}[\]().*+?|<>\-&])/g, '\\$&'), 'g'), withThis);
};

export const isAlphanumeric = (str: string) => /^[a-z0-9]+$/i.test(str);

export const definedValueOr = (val: any, defaultValue: any) => (val !== undefined ? val : defaultValue);

export const processConcurrently = (jobs: ((...args: any[]) => Promise<any>)[], concurrencyLimit: number) => {
  return new Promise((resolve, reject) => {
    let isErrored = false;
    let resolvedPromises = 0;
    let lastStartedIndex = 0;
    let currentlyRunning = 0;
    const processJob = (job) => {
      currentlyRunning++;
      lastStartedIndex++;
      const result = job();
      Promise.resolve(result)
        .then(() => {
          resolvedPromises++;
          currentlyRunning--;
          // Use setImmediate to yield to event loop after each job completes
          // This allows UI updates and prevents event loop starvation
          setImmediate(checkJobs);
        })
        .catch((err) => {
          if (interval) {
            clearInterval(interval);
          }
          if (!isErrored) {
            return reject(err);
          }
          isErrored = true;
        });
    };

    let interval: NodeJS.Timeout;
    const checkJobs = () => {
      if (resolvedPromises === jobs.length) {
        if (interval) {
          clearInterval(interval);
        }
        return resolve(true);
      }
      let shouldCheckNextJob = true;
      while (shouldCheckNextJob) {
        const newJob = jobs[lastStartedIndex];
        if (newJob && currentlyRunning < concurrencyLimit) {
          processJob(newJob);
        } else {
          shouldCheckNextJob = false;
        }
      }
    };
    checkJobs();
    // Check more frequently (every 10ms) to ensure UI responsiveness
    interval = setInterval(checkJobs, 10);
  });
};

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

export const streamToString = async (stream: Readable): Promise<string> => {
  return streamToBuffer(stream).then((buffer) => buffer.toString('utf-8'));
};

export const transformToCidr = ({ cidrOrIp }: { cidrOrIp: string }) => {
  if (cidrOrIp.includes('/')) {
    return cidrOrIp;
  }
  return `${cidrOrIp}/32`;
};

export const getByteSize = (size: number, unit: 'MB' | 'KB', decimals = 2) => {
  let res: number;
  if (unit === 'MB') {
    res = size / 1024 / 1024;
  } else {
    res = size / 1024;
  }
  return Number(res.toFixed(decimals));
};

export const propertyFromObjectOrNull = (obj: Record<string, any>, prop: string) => {
  try {
    return obj[prop];
  } catch {
    return null;
  }
};

export const capitalizeFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);

export const hasProperties = (obj: any) => {
  if (!obj) {
    return false;
  }
  return !!Object.keys(obj).length;
};

// @note this is a "forked" version of 'pend' npm package use in s3Sync
export class Pend {
  pending: number;
  max: number;
  listeners: any[];
  waiting: any[];
  error = null;

  constructor({ max }: { max?: number } = {}) {
    this.pending = 0;
    this.max = max || Infinity;
    this.listeners = [];
    this.waiting = [];
    this.error = null;
  }

  go = (fn) => {
    if (this.pending < this.max) {
      this.pendGo(fn);
    } else {
      this.waiting.push(fn);
    }
  };

  wait = (cb) => {
    if (this.pending === 0) {
      cb(this.error);
    } else {
      this.listeners.push(cb);
    }
  };

  hold = () => {
    return this.pendHold();
  };

  pendHold = () => {
    this.pending += 1;
    let called = false;
    const onCb = (err) => {
      if (called) {
        throw new Error('callback called twice');
      }
      called = true;
      this.error = this.error || err;
      this.pending -= 1;
      if (this.waiting.length > 0 && this.pending < this.max) {
        this.pendGo(this.waiting.shift());
      } else if (this.pending === 0) {
        const listeners = this.listeners;
        this.listeners = [];
        listeners.forEach(cbListener);
      }
    };
    const cbListener = (listener) => {
      listener(this.error);
    };

    return onCb;
  };

  pendGo = (fn) => {
    fn(this.pendHold());
  };
}

export const getTimeSinceProcessStart = () => {
  return Math.round(process.uptime() * 1000);
};

export const localBuildTsConfigPath = join(process.cwd(), 'tsconfig.json');

export const builtinModules = [
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib'
];

export const getTsconfigAliases = async (tsconfigPath: string) => {
  const tsconfig = await readJson(tsconfigPath);
  const paths = tsconfig?.compilerOptions?.paths || {};
  const res: { [alias: string]: string } = {};
  Object.keys(paths).forEach((item) => {
    const key = item.replace('/*', '');
    const value = resolvePath(process.cwd(), paths[item][0].replace('/*', '').replace('*', ''));
    res[key] = value;
  });
  return res;
};

export const applyAll = (functionsArray: ((...args: any) => any)[], value: any) => {
  let res = value;
  for (const fn of functionsArray) {
    res = fn(res);
  }
  return res;
};

export const filterDuplicates = (item: any, index: number, arr: any[]) => arr.indexOf(item) === index;

export const getFirstAndLastItem = <T>(arr: T[]) => {
  return { first: arr[0] || null, last: arr[arr.length - 1] || null };
};

export const groupBy = <T, K extends keyof any>(list: T[], getKey: (item: T) => K) =>
  list.reduce(
    (previous, currentItem) => {
      const group = getKey(currentItem);
      if (!previous[group]) {
        previous[group] = [];
      }
      previous[group].push(currentItem);
      return previous;
    },
    {} as Record<K, T[]>
  );

export const chunkArray = <T>(arr: T[], chunkSize: number): T[][] => {
  return arr.reduce((all: T[][], one: T, i) => {
    const ch = Math.floor(i / chunkSize);

    all[ch] = all[ch] || [];
    all[ch].push(one);
    return all;
  }, []);
};

export const getRandomNumberFromInterval = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export const lowerCaseFirstCharacterOfEveryWord = (sentence: string, wordSeparator: string = '.') => {
  return sentence.split(wordSeparator).map(lowerCaseFirstCharacter).join(wordSeparator);
};

export const lowerCaseFirstCharacterOfObjectKeys = (val: any, skipKeyFunction?: (key: string) => boolean): any => {
  if (val == null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((v) => lowerCaseFirstCharacterOfObjectKeys(v, skipKeyFunction));
  }
  const ret: { [k: string]: any } = {};
  for (const [k, v] of Object.entries(val)) {
    ret[skipKeyFunction && skipKeyFunction(k) ? k : lowerCaseFirstCharacter(k)] = lowerCaseFirstCharacterOfObjectKeys(
      v,
      skipKeyFunction
    );
  }
  return ret;
};

const lowerCaseFirstCharacter = (str: string): string => {
  return str.length > 0 ? `${str[0].toLowerCase()}${str.slice(1)}` : str;
};

export const removeColoringFromString = (str: string) =>
  // eslint-disable-next-line no-control-regex
  str.replace(/[\u001B\u009B][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

export const chunkString = (str: string, chunkSize: number): string[] => {
  // Validate chunkSize to ensure it's positive
  if (chunkSize < 1) {
    throw new Error('Chunk size must be at least 1');
  }

  // The regular expression: Match up to `chunkSize` characters globally across the string
  const regexPattern = new RegExp(`.{1,${chunkSize}}`, 'g');

  // Use the regex to split the string into chunks and return the result
  return str.match(regexPattern) || []; // In case of no matches, return an empty array
};

export const settleAllBeforeThrowing = async (promises: Promise<any>[]) => {
  const results = await Promise.allSettled(promises);
  return results.map((res) => {
    if (res.status === 'rejected') {
      throw res.reason;
    }
    return res.value;
  });
};
