/* eslint-disable */
// @note from https://github.com/Submersible/node-python-bridge
import { spawn } from 'node:child_process';
import { fsPaths } from '@shared/naming/fs-paths';

export const pythonBridge = (opts?: any) => {
  // default options
  const pythonExecutable = opts.pythonExecutable;
  const stdio = (opts && opts.stdio) || ['pipe', process.stdout, process.stderr];
  const options = {
    cwd: opts && opts.cwd,
    env: opts && opts.env,
    uid: opts && opts.uid,
    gid: opts && opts.gid,
    stdio: stdio.concat(['ipc'])
  };

  // create process bridge
  const ps = spawn(pythonExecutable, [fsPaths.pythonBridgeScriptPath()], options);
  const queue = singleQueue();

  function sendPythonCommand(type, enqueue, self) {
    function wrapper() {
      self = self || wrapper;
      // @ts-expect-error todo
      const code = json.apply(this, arguments);

      // @ts-expect-error
      if (!((this && this.connected) || self.connected)) {
        return Promise.reject(new PythonBridgeNotConnected());
      }

      return enqueue(
        () =>
          new Promise((resolve, reject) => {
            ps.send({ type, code });
            ps.once('message', onMessage);
            ps.once('close', onClose);

            function onMessage(data) {
              ps.removeListener('close', onClose);
              if (data && data.type && data.type === 'success') {
                resolve(eval(`(${data.value})`));
              } else if (data && data.type && data.type === 'exception') {
                reject(new PythonException(data.value));
              } else {
                reject(data);
              }
            }

            function onClose(exit_code, message) {
              ps.removeListener('message', onMessage);
              if (!message) {
                reject(new Error(`Python process closed with exit code ${exit_code}`));
              } else {
                reject(new Error(`Python process closed with exit code ${exit_code} and message: ${message}`));
              }
            }
          })
      );
    }
    return wrapper;
  }

  function setupLock(enqueue) {
    return (f) => {
      return enqueue(() => {
        const lock_queue = singleQueue();
        // @ts-expect-error todo
        const lock_python = sendPythonCommand('evaluate', lock_queue) as any;
        lock_python.ex = sendPythonCommand('execute', lock_queue, lock_python);
        lock_python.lock = setupLock(lock_queue);
        lock_python.connected = true;
        lock_python.__proto__ = python;

        return f(lock_python);
      });
    };
  }

  // API
  // @ts-expect-error todo
  let python = sendPythonCommand('evaluate', queue) as any;
  python.ex = sendPythonCommand('execute', queue, python);
  python.lock = setupLock(queue);
  python.pid = ps.pid;
  python.connected = true;
  python.Exception = PythonException;
  python.isException = isPythonException;
  python.disconnect = () => {
    python.connected = false;
    return queue(() => {
      ps.disconnect();
    });
  };
  python.end = python.disconnect;
  python.kill = (signal) => {
    python.connected = false;
    ps.kill(signal);
  };
  python.stdin = ps.stdin;
  python.stdout = ps.stdout;
  python.stderr = ps.stderr;
  return python;
};

class PythonException extends Error {
  constructor(exc) {
    if (exc && exc.format) {
      super(exc.format.join(''));
    } else if (exc && exc.error) {
      super(`Python exception: ${exc.error}`);
    } else {
      super('Unknown Python exception');
    }
    // @ts-expect-error todo
    this.error = exc.error;
    // @ts-expect-error todo
    this.exception = exc.exception;
    // @ts-expect-error todo
    this.traceback = exc.traceback;
    // @ts-expect-error todo
    this.format = exc.format;
  }
}

class PythonBridgeNotConnected extends Error {
  constructor() {
    super('Python bridge is no longer connected.');
  }
}

function isPythonException(name, exc) {
  // @ts-expect-error todo
  const thunk = (exc) => exc instanceof PythonException && exc.exception && exc.exception.type.name === name;
  if (exc === undefined) {
    return thunk;
  }
  return thunk(exc);
}

function singleQueue() {
  let last = Promise.resolve();
  return function enqueue(f) {
    const wait = last;
    let done;
    last = new Promise((resolve) => {
      done = resolve;
    });
    return new Promise((resolve, reject) => {
      wait.finally(() => {
        f().then(resolve).catch(reject);
      });
    }).finally(() => done());
  };
}

function dedent(code) {
  // dedent text
  const lines = code.split('\n');
  let offset = null;

  // remove extra blank starting line
  if (!lines[0].trim()) {
    lines.shift();
  }
  for (const line of lines) {
    const trimmed = line.trimLeft();
    if (trimmed) {
      offset = line.length - trimmed.length + 1;
      break;
    }
  }
  if (!offset) {
    return code;
  }
  const match = new RegExp(`^${new Array(offset).join('\\s?')}`);
  return lines.map((line) => line.replace(match, '')).join('\n');
}

function json(text_nodes) {
  const values = Array.prototype.slice.call(arguments, 1);
  return dedent(
    text_nodes.reduce((cur, acc, i) => {
      return cur + serializePython(values[i - 1]) + acc;
    })
  );
}

function serializePython(value) {
  if (value === null || typeof value === 'undefined') {
    return 'None';
  }
  if (value === true) {
    return 'True';
  }
  if (value === false) {
    return 'False';
  }
  if (value === Infinity) {
    return "float('inf')";
  }
  if (value === -Infinity) {
    return "float('-inf')";
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializePython).join(', ')}]`;
  }
  if (typeof value === 'number') {
    if (isNaN(value)) {
      return "float('nan')";
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value instanceof Map) {
    const props = Array.from(value.entries(), (kv) => `${serializePython(kv[0])}: ${serializePython(kv[1])}`);
    return `{${props.join(', ')}}`;
  }
  const props = Object.keys(value).map((k) => `${serializePython(k)}: ${serializePython(value[k])}`);
  return `{${props.join(', ')}}`;
}

pythonBridge.pythonBridge = pythonBridge;
pythonBridge.PythonException = PythonException;
pythonBridge.PythonBridgeNotConnected = PythonBridgeNotConnected;
pythonBridge.isPythonException = isPythonException;
pythonBridge.json = json;
pythonBridge.serializePython = serializePython;
