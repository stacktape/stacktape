/** Source files that prove how a long-running HTTP service enters the program. */

import { posix } from 'node:path';
import type { ServiceFactInput } from '../../facts/service';
import type { Citation } from '../../facts/citation';
import { citeFirstMatch, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { directoriesEnteredByRoot, nearestManifestRoot, withoutSampleDirectories } from '../service-root';
import { citeFirstCodeMatch, maskFile } from '../lexical';
import { createModuleResolver, reachableFrom, startEntriesOf, type StartEntry } from '../start-entries';

const javaServiceExposesHttp = async (root: string, context: ProbeContext): Promise<boolean> => {
  const manifestNames = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
  for (const name of manifestNames) {
    const path = root === '.' ? name : posix.join(root, name);
    if (!context.files.includes(path)) continue;
    // oxlint-disable-next-line no-await-in-loop -- there is at most one build manifest in ordinary modules.
    const raw = await readText(context, path);
    if (raw !== undefined && /spring-boot-starter-(?:web|webflux)|quarkus-(?:rest|resteasy|vertx-http)/i.test(raw)) {
      return true;
    }
  }
  return false;
};

type Detection = {
  entrypoint: string;
  framework?: string;
  pattern: RegExp;
  language: string;
  exposesHttp?: boolean;
  processType?: string;
  /** The pattern that proved a WebSocket server, which needs a load balancer that keeps the connection open. */
  websocket?: RegExp;
  /**
   * Whether the file is the entry a container runs. Hono's `serve({ fetch })` proves the port and that the package
   * serves HTTP, but the package's own start script stays how it runs (it often starts a compiled `dist/index.js`).
   */
  claimsEntrypoint?: false;
  /** A later file of the same service replaces an earlier one with a lower rank (default 1). */
  rank?: number;
  /** A NestJS microservice bootstrap: it serves no HTTP, whatever the package depends on. */
  microservice?: 'tcp-microservice' | 'broker-microservice';
};

/**
 * A WebSocket server in the process, by library: `ws`'s `WebSocketServer`, socket.io's `Server`, `@fastify/websocket`,
 * `express-ws`, uWebSockets.js and Bun's `websocket` handler, or a FastAPI/Starlette `@app.websocket` route,
 * Flask-SocketIO, `websockets.serve` and a Django Channels `ProtocolTypeRouter` with a `websocket` protocol. Each needs
 * the library's import and its server call; a client (`new WebSocket(url)`, `socket.io-client`) is not one.
 */
const JS_WEBSOCKET_SERVERS: ReadonlyArray<{ module: string; server: RegExp }> = [
  { module: 'ws', server: /\bnew\s+(?:WebSocketServer|WebSocket\.Server|WsServer)\s*\(/ },
  {
    module: 'socket.io',
    server: /\bnew\s+(?:Server|SocketIOServer|SocketServer)\s*\(|\b(?:socketIo|socketio|io)\s*\(\s*\w/
  },
  { module: '@fastify/websocket', server: /\.register\s*\(/ },
  { module: 'express-ws', server: /\bexpressWs\s*\(|\.ws\s*\(/ },
  { module: 'uWebSockets.js', server: /\.ws\s*\(/ }
];
const BUN_WEBSOCKET_SERVER = /\bBun\.serve\s*\(\s*\{[\s\S]{0,800}?\bwebsocket\s*:/;
const PYTHON_WEBSOCKET_SERVER = /^\s*@\w+\.websocket(?:_route)?\s*\(|\bSocketIO\s*\(|\bwebsockets\.serve\s*\(/m;
/** `require('socket.io')(server)`, read with strings kept. */
const SOCKET_IO_REQUIRE_CALL = /\brequire\s*\(\s*['"]socket\.io['"]\s*\)\s*\(/;
/** Read with strings kept: the protocol name is a dictionary key. */
const CHANNELS_WEBSOCKET_ROUTER = /\bProtocolTypeRouter\s*\(\s*\{[^}]*?['"]websocket['"]\s*:/;

/** The exports of each library that construct a server, and whether calling its module object does (`require('socket.io')(server)`). */
const SERVER_EXPORTS: Readonly<Record<string, { names: ReadonlySet<string>; moduleIsServer: boolean }>> = {
  ws: { names: new Set(['WebSocketServer', 'Server']), moduleIsServer: false },
  'socket.io': { names: new Set(['Server']), moduleIsServer: true }
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `A`, `A as B` (ESM) or `A: B` (destructuring), as exported name and local name. */
const specifiers = (list: string, separator: 'as' | ':'): Array<{ exported: string; local: string }> =>
  list.split(',').flatMap((entry) => {
    const [exported, local = exported] = entry
      .replace(/^\s*type\s+/, '')
      .split(separator === 'as' ? /\s+as\s+/ : ':')
      .map((part) => part.trim());
    return exported !== undefined && IDENTIFIER.test(exported) && IDENTIFIER.test(local!)
      ? [{ exported, local: local! }]
      : [];
  });

type ModuleImport = {
  specifier: string;
  /** Local name to the name the module exports. */
  named: Array<{ exported: string; local: string }>;
  /** Names bound to the module object: `import * as ws`, `const ws = require('ws')`, a default import. */
  modules: string[];
};

/** Every import and `require` of a file (`keep` has comments removed and strings kept). */
const importsOf = (keep: string): ModuleImport[] => {
  const imports: ModuleImport[] = [];
  for (const match of keep.matchAll(
    /\bimport\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}|\*\s*as\s+([A-Za-z_$][\w$]*))?\s*from\s*['"]([^'"\n]+)['"]/g
  )) {
    imports.push({
      specifier: match[4]!,
      named: match[2] === undefined ? [] : specifiers(match[2], 'as'),
      modules: [match[1], match[3]].filter((name): name is string => name !== undefined && name !== 'type')
    });
  }
  for (const match of keep.matchAll(
    /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g
  )) {
    imports.push({ specifier: match[2]!, named: specifiers(match[1]!, ':'), modules: [] });
  }
  for (const match of keep.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"\n]+)['"]\s*\)(?:\s*\.\s*([A-Za-z_$][\w$]*))?/g
  )) {
    imports.push({
      specifier: match[2]!,
      named: match[3] === undefined ? [] : [{ exported: match[3], local: match[1]! }],
      modules: match[3] === undefined ? [match[1]!] : []
    });
  }
  return imports;
};

/**
 * What a project file re-exports from a WebSocket library: `export { WebSocketServer as SocketServer } from 'ws'` maps
 * `SocketServer` to `WebSocketServer`; `export * from 'ws'` passes every name through.
 */
type Reexport = { module: string; names: ReadonlyMap<string, string> | 'all' };

const reexportsOf = (keep: string): Reexport[] =>
  Object.keys(SERVER_EXPORTS).flatMap((module): Reexport[] => {
    const quoted = `['"]${escapeRegExp(module)}['"]`;
    if (new RegExp(`\\bexport\\s*\\*\\s*from\\s*${quoted}`).test(keep)) return [{ module, names: 'all' }];
    const names = new Map(
      [...keep.matchAll(new RegExp(`\\bexport\\s*\\{([^}]*)\\}\\s*from\\s*${quoted}`, 'g'))].flatMap((match) =>
        specifiers(match[1]!, 'as').map(({ exported, local }) => [local, exported] as const)
      )
    );
    return names.size === 0 ? [] : [{ module, names }];
  });

const JS_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.mjs', '.cjs', '/index.ts', '/index.js'];
/** Every module a file names: `import ... from`, `export ... from`, `import('...')`, `require('...')`. */
const MODULE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"\n]+)['"]/g;
/** Development tooling: scripts, tools, mocks and dev servers are no part of a deployed process. */
const DEVELOPMENT_PATH = /(?:^|\/)(?:scripts?|tools?|dev|devtools|mocks?|__mocks__|e2e|playground)\//i;

/** The project file a relative import names, when it is one of `files`. */
const resolveRelative = (from: string, specifier: string, files: ReadonlySet<string>): string | undefined => {
  if (!specifier.startsWith('.')) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  // A TypeScript source imports `./socket.js` for `./socket.ts`.
  const stem = base.replace(/\.[cm]?js$/, '');
  return [base, stem]
    .flatMap((candidate) => JS_EXTENSIONS.map((extension) => `${candidate}${extension}`))
    .find((candidate) => files.has(candidate));
};

/**
 * The server-constructing calls a file can make through its own names for a WebSocket library: an alias
 * (`{ WebSocketServer: WSS }`, `import { Server as IO }`), a module object (`ws.Server`), or a project file that
 * re-exports the library.
 */
const aliasedServerCall = (
  path: string,
  keep: string,
  code: string,
  reexports: ReadonlyMap<string, Reexport[]>,
  files: ReadonlySet<string>
): RegExp | undefined => {
  const constructors = new Set<string>();
  const factories = new Set<string>();
  for (const { specifier, named, modules } of importsOf(keep)) {
    const sources: Reexport[] =
      SERVER_EXPORTS[specifier] === undefined
        ? (reexports.get(resolveRelative(path, specifier, files) ?? '') ?? [])
        : [{ module: specifier, names: 'all' }];
    for (const source of sources) {
      const library = SERVER_EXPORTS[source.module]!;
      const original = (name: string) => (source.names === 'all' ? name : source.names.get(name));
      for (const { exported, local } of named) {
        if (library.names.has(original(exported) ?? '')) constructors.add(local);
      }
      // A module object reached through a re-export is not the library's own module object.
      if (source.names !== 'all') continue;
      for (const local of modules) {
        for (const name of library.names) constructors.add(`${local}.${name}`);
        if (library.moduleIsServer) factories.add(local);
      }
    }
  }
  if (constructors.size === 0 && factories.size === 0) return undefined;
  const alternatives = [
    ...[...constructors].map((name) => `\\bnew\\s+${escapeRegExp(name).replace('\\.', '\\s*\\.\\s*')}\\s*\\(`),
    ...[...factories].map((name) => `(?<![.\\w$])${escapeRegExp(name)}\\s*\\(\\s*[\\w{]`)
  ];
  const pattern = new RegExp(alternatives.join('|'));
  return pattern.test(code) ? pattern : undefined;
};

const importsModule = (keep: string, module: string): boolean => {
  const name = module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:\\bfrom\\s*|\\brequire\\s*\\(\\s*|\\bimport\\s*\\(\\s*)['"]${name}['"]`).test(keep);
};

const websocketIn = (
  path: string,
  raw: string,
  code: string,
  reexports: ReadonlyMap<string, Reexport[]>,
  files: ReadonlySet<string>
): RegExp | undefined => {
  if (path.endsWith('.py')) {
    if (PYTHON_WEBSOCKET_SERVER.test(code)) return PYTHON_WEBSOCKET_SERVER;
    return CHANNELS_WEBSOCKET_ROUTER.test(maskFile(path, raw, 'keep')) ? CHANNELS_WEBSOCKET_ROUTER : undefined;
  }
  if (!/\.(?:[cm]?js|tsx?)$/.test(path)) return undefined;
  if (BUN_WEBSOCKET_SERVER.test(code)) return BUN_WEBSOCKET_SERVER;
  const keep = maskFile(path, raw, 'keep');
  return (
    JS_WEBSOCKET_SERVERS.find(({ module, server }) => importsModule(keep, module) && server.test(code))?.server ??
    (SOCKET_IO_REQUIRE_CALL.test(keep) ? SOCKET_IO_REQUIRE_CALL : undefined) ??
    aliasedServerCall(path, keep, code, reexports, files)
  );
};

const workerProcessType = (path: string): string => {
  const stem = posix.basename(path).replace(/\.[^.]+$/, '');
  return /(?:^|\/)(?:worker|workers)(?:\/|$)/i.test(path) && /^(?:index|main|bootstrap)$/i.test(stem) ? 'worker' : stem;
};

/**
 * `code` is `raw` with comments and string contents blanked: a commented-out `app.listen(3000)` or a server quoted in
 * a help text proves nothing.
 */
const detectionFor = (path: string, raw: string, code: string): Detection | undefined => {
  if (/\.(?:[cm]?js|tsx?)$/.test(path)) {
    const queueWorker =
      /from\s+["'](?:bullmq|bull|bee-queue)["']/.test(maskFile(path, raw, 'keep')) && /new\s+Worker\s*\(/.test(code);
    if (queueWorker) {
      return {
        entrypoint: path,
        pattern: /new\s+Worker\s*\(/,
        language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript',
        exposesHttp: false,
        processType: workerProcessType(path)
      };
    }
    const honoApplication = /\b(?:const|let)\s+(\w+)\s*=\s*new\s+Hono\s*\(/.exec(code);
    if (honoApplication !== null && new RegExp(`export\\s+default\\s+${honoApplication[1]}\\b`).test(code)) {
      return {
        entrypoint: path,
        framework: 'hono',
        pattern: /new\s+Hono\s*\(/,
        language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript'
      };
    }
    // `NestFactory.createMicroservice()` without `NestFactory.create()`: its `app.listen()` starts a transport, not an
    // HTTP server. A hybrid application (`create` and `connectMicroservice`) does serve HTTP, and so does a file that
    // starts any other server beside the microservice (`express().listen(3000)`).
    const nestMicroservice = /\bNestFactory\s*\.\s*createMicroservice\s*(?:<[^>]*>)?\s*\(/;
    const microserviceApplication =
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?NestFactory\s*\.\s*createMicroservice\b/.exec(
        code
      )?.[1];
    const otherServer =
      [...code.matchAll(/([\w$]+|\))\s*\.listen\s*\(/g)].some((call) => call[1] !== microserviceApplication) ||
      /\bcreateServer\s*\(|\bBun\.serve\s*\(|\bDeno\.serve\s*\(|\bserve\s*\(\s*\{|\bconnectMicroservice\s*\(/.test(
        code
      );
    if (nestMicroservice.test(code) && !otherServer && !/\bNestFactory\s*\.\s*create\s*(?:<[^>]*>)?\s*\(/.test(code)) {
      // TCP is Nest's default transport, and gRPC or a custom `strategy` also accepts connections; only a broker
      // transport (Redis, NATS, MQTT, Kafka, RabbitMQ) alone accepts none.
      const broker =
        /\bTransport\s*\.\s*(?:REDIS|NATS|MQTT|KAFKA|RMQ)\b/.test(code) &&
        !/\bTransport\s*\.\s*(?:TCP|GRPC)\b|\bstrategy\s*:/.test(code);
      return {
        entrypoint: path,
        pattern: nestMicroservice,
        language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript',
        exposesHttp: false,
        rank: 0,
        microservice: broker ? 'broker-microservice' : 'tcp-microservice'
      };
    }
    // `serve({ fetch: app.fetch })` is Hono's Node server.
    const honoServe = /\bserve\s*\(\s*\{[^}]*\bfetch\s*[:,}]/;
    const pattern = /\.listen\s*\(|\bBun\.serve\s*\(|\bDeno\.serve\s*\(/;
    if (!pattern.test(code) && honoServe.test(code)) {
      return {
        entrypoint: path,
        pattern: honoServe,
        language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript',
        claimsEntrypoint: false
      };
    }
    return pattern.test(code)
      ? {
          entrypoint: path,
          pattern,
          language: /\.tsx?$/.test(path) ? 'typescript' : 'javascript'
        }
      : undefined;
  }
  if (path.endsWith('.php')) {
    const isWebEntrypoint =
      posix.basename(path).toLowerCase() === 'index.php' &&
      (posix.dirname(path) === '.' || posix.basename(posix.dirname(path)).toLowerCase() === 'public');
    const pattern = /^\s*<\?php/m;
    return isWebEntrypoint && pattern.test(raw) ? { entrypoint: path, pattern, language: 'php' } : undefined;
  }
  if (path.endsWith('.py')) {
    const application = /^\s*(\w+)\s*=\s*(FastAPI|Flask)\s*\(/m.exec(code);
    if (application !== null) {
      const framework = application[2] === 'FastAPI' ? 'fastapi' : 'flask';
      return {
        entrypoint: `${path}:${application[1]}`,
        framework,
        pattern: new RegExp(`^\\s*${application[1]}\\s*=\\s*${application[2]}\\s*\\(`, 'm'),
        language: 'python'
      };
    }
    // Django Channels routes HTTP and WebSocket connections from its ASGI application; it outranks the WSGI one.
    const channels = /^\s*application\s*=\s*ProtocolTypeRouter\s*\(/m;
    if (channels.test(code)) {
      return { entrypoint: `${path}:application`, framework: 'django', pattern: channels, language: 'python', rank: 2 };
    }
    const django = /^\s*application\s*=\s*get_wsgi_application\s*\(\s*\)/m;
    return django.test(code)
      ? {
          entrypoint: `${path}:application`,
          framework: 'django',
          pattern: django,
          language: 'python'
        }
      : undefined;
  }
  if (path.endsWith('.go')) {
    const pattern = /(?:http\.ListenAndServe|\.ListenAndServe\s*\(|\.Run\s*\(|fiber\.New\s*\(|echo\.New\s*\()/;
    return /\bfunc\s+main\s*\(/.test(code) && pattern.test(code)
      ? { entrypoint: path, pattern, language: 'go' }
      : undefined;
  }
  if (path.endsWith('.java') || path.endsWith('.kt')) {
    const pattern = /@SpringBootApplication|SpringApplication\.run\s*\(/;
    return pattern.test(maskFile(path, raw, 'keep'))
      ? {
          entrypoint: path,
          framework: 'spring-boot',
          pattern,
          language: 'java'
        }
      : undefined;
  }
  return undefined;
};

type ListenPort = { port: number; citation: Citation };
/** The listener fixes a port, with an expression init does not evaluate: `listen(4000 + 1)`. */
type UnreadPort = { unread: Citation };

/** A port literal: two to five digits, with numeric separators (`4_321`). */
const PORT_LITERAL = String.raw`(\d(?:_?\d){1,4})`;

/** A port found at `offset` in `raw`, cited on the line it appears on (a `listen({ ... })` can span lines). */
const portAt = (path: string, raw: string, value: string | undefined, offset: number): ListenPort | undefined => {
  const port = value === undefined ? Number.NaN : Number.parseInt(value.replaceAll('_', ''), 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return undefined;
  const lines = raw.split(/\r?\n/);
  return { port, citation: citeLine(path, lines, raw.slice(0, offset).split(/\r?\n/).length - 1, 'port') };
};

/** The last capture of a match: the port, located inside the match so the citation names its line. */
const matchedPort = (path: string, raw: string, match: RegExpExecArray | null): ListenPort | undefined =>
  match === null ? undefined : portAt(path, raw, match[1], match.index + match[0].lastIndexOf(match[1]!));

/**
 * An expression (strings blanked) that fixes a port init did not read: it has a number in it and does not mention a
 * `PORT` variable, which Stacktape sets. `4000 + 1` does; `process.env.PORT`, `config.port` and `":" + port` do not,
 * and neither does a bare number such as `listen(0)`, which asks the system for any free port.
 */
const fixesUnreadPort = (expression: string): boolean =>
  /(?<![\w$.])\d/.test(expression) && !/^\s*\d[\d_]*\s*$/.test(expression) && !/\bPORT\b/.test(expression);

const unreadAt = (path: string, raw: string, offset: number): UnreadPort => ({
  unread: citeLine(path, raw.split(/\r?\n/), raw.slice(0, offset).split(/\r?\n/).length - 1, 'port')
});

/**
 * The port a JavaScript server listens on when the source says so literally: `listen(4000)`,
 * `listen({ port: 4000 })`, `Bun.serve({ port: 4000 })`, Hono's `serve({ fetch: app.fetch, port: 4000 })`,
 * `listen(process.env.PORT || 4000)`, or a constant that holds one of those. A fallback is reported too: the service
 * then listens there whether or not `PORT` is set. A port the listener computes (`listen(4000 + 1)`) is reported as
 * unread rather than as the first number in it. `code` has comments and strings blanked, at the same offsets.
 */
const javascriptListenPort = (path: string, raw: string, code: string): ListenPort | UnreadPort | undefined => {
  const direct =
    new RegExp(String.raw`\.listen\(\s*${PORT_LITERAL}\s*[,)]`).exec(code) ??
    new RegExp(String.raw`\.listen\(\s*[^,)]*?(?:\|\||\?\?)\s*${PORT_LITERAL}\s*[,)]`).exec(code) ??
    // Only a literal number is a port: `port: 8000 + 1` is not 8000.
    new RegExp(
      String.raw`(?:\.listen|\bBun\.serve|\bDeno\.serve|\bserve)\(\s*\{[^}]*?\bport\s*:\s*(?:[^,}]*?(?:\|\||\?\?)\s*)?${PORT_LITERAL}\s*[,}\n]`
    ).exec(code);
  if (direct !== null) return matchedPort(path, raw, direct);
  // `serve({ fetch: app.fetch, port })` reads a constant named `port`.
  const served = /\b(?:Bun\.serve|Deno\.serve|serve)\(\s*\{[^}]*?\bport\b\s*(?::\s*([A-Za-z_$][\w$]*))?\s*[,}]/.exec(
    code
  );
  const named =
    /\.listen\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(code)?.[1] ?? (served === null ? undefined : (served[1] ?? 'port'));
  if (named !== undefined) {
    const constant = matchedPort(
      path,
      raw,
      new RegExp(
        String.raw`\b(?:const|let|var)\s+${named}\s*=\s*(?:[^;\n]*?(?:\|\||\?\?)\s*)?${PORT_LITERAL}\s*(?:[;,)\n]|$)`
      ).exec(code)
    );
    if (constant !== undefined) return constant;
    const initializer = new RegExp(String.raw`\b(?:const|let|var)\s+${named}\s*=\s*([^;\n]*)`).exec(code);
    return initializer !== null && fixesUnreadPort(initializer[1]!)
      ? unreadAt(path, raw, initializer.index)
      : undefined;
  }
  const expression =
    /\.listen\(\s*([^,)]*)/.exec(code) ??
    /(?:\.listen|\bBun\.serve|\bDeno\.serve|\bserve)\(\s*\{[^}]*?\bport\s*:\s*([^,}\n]*)/.exec(code);
  return expression !== null && fixesUnreadPort(expression[1]!) ? unreadAt(path, raw, expression.index) : undefined;
};

const GO_LISTEN_CALL = String.raw`(?:ListenAndServe(?:TLS)?|\.Run|\.Start|\.Listen)\(\s*`;

/**
 * `http.ListenAndServe(":8080", ...)`, gin's `r.Run(":8080")`, echo's `e.Start(":8080")`, fiber's `app.Listen(":3000")`,
 * or a constant or variable holding such an address (`const addr = ":8080"`).
 */
const goListenPort = (path: string, raw: string): ListenPort | UnreadPort | undefined => {
  const keep = maskFile(path, raw, 'keep');
  const literal = matchedPort(path, raw, new RegExp(String.raw`${GO_LISTEN_CALL}"[\w.-]*:(\d{2,5})"`).exec(keep));
  if (literal !== undefined) return literal;
  const code = maskFile(path, raw, 'blank');
  for (const call of code.matchAll(new RegExp(String.raw`${GO_LISTEN_CALL}([A-Za-z_]\w*)\s*[,)]`, 'g'))) {
    const constant = matchedPort(
      path,
      raw,
      new RegExp(String.raw`\b${call[1]}\s*(?::=|=)\s*"[\w.-]*:(\d{2,5})"\s*(?:;|\n|$)`).exec(keep)
    );
    if (constant !== undefined) return constant;
  }
  // `.Run(`, `.Start(` and `.Listen(` are common method names; only `ListenAndServe` certainly takes the address.
  const call = /ListenAndServe(?:TLS)?\(\s*([^,)]*)/.exec(code);
  if (call === null) return undefined;
  const argument = call[1]!.trim();
  const initializer = /^[A-Za-z_]\w*$/.test(argument)
    ? new RegExp(String.raw`\b${argument}\s*(?::=|=)\s*([^;\n]*)`).exec(code)
    : null;
  if (initializer !== null) {
    return fixesUnreadPort(initializer[1]!) ? unreadAt(path, raw, initializer.index) : undefined;
  }
  return fixesUnreadPort(argument) ? unreadAt(path, raw, call.index) : undefined;
};

const SPRING_BOOT_DEFAULT_PORT = 8080;

/**
 * Spring Boot listens on `server.port`, or 8080. It reads `SERVER_PORT`, never `PORT`, so the port has to be routed
 * explicitly. `${PORT}` without a default means the app follows `PORT`, and nothing is reported.
 */
const springBootPort = async (
  root: string,
  context: ProbeContext,
  entrypoint: ListenPort['citation'] | undefined
): Promise<ListenPort | undefined> => {
  for (const name of ['application.properties', 'application.yml', 'application.yaml']) {
    const path = posix.join(root === '.' ? '' : root, 'src/main/resources', name);
    if (!context.files.includes(path)) continue;
    // oxlint-disable-next-line no-await-in-loop -- at most three small files per Spring module.
    const raw = await readText(context, path);
    if (raw === undefined) continue;
    const declared = name.endsWith('.properties')
      ? /^\s*server\.port\s*[=:]\s*(\S+)/m.exec(raw)
      : /^server:[ \t]*\r?\n(?:[ \t]+.*\r?\n)*?[ \t]+port:[ \t]*(\S+)/m.exec(raw);
    if (declared === null) continue;
    const literal = /^["']?(?:\$\{[A-Za-z_.]+:)?(\d{2,5})\}?["']?$/.exec(declared[1]!);
    if (literal === null) return undefined;
    return portAt(path, raw, literal[1], declared.index + declared[0].lastIndexOf(literal[1]!));
  }
  return entrypoint === undefined
    ? undefined
    : { port: SPRING_BOOT_DEFAULT_PORT, citation: { ...entrypoint, field: 'port' } };
};

/** Browser UI frameworks: a package that depends on one is a frontend unless a file in it starts a server. */
const BROWSER_FRAMEWORKS = ['react', 'react-dom', 'vue', 'nuxt', 'svelte', '@angular/core', 'solid-js', 'preact'];
/** Modules a JavaScript server is built on; a `.listen()` in a file that imports none of them is no server's. */
const SERVER_MODULE =
  /^(?:node:)?(?:http|https|http2|net)$|^(?:express|fastify|koa|hono|@hono\/node-server|@nestjs\/.+|ws|socket\.io|@hapi\/hapi|restify|polka|h3|micro|next|@remix-run\/.+|@react-router\/.+|@koa\/.+)$/;

const dependsOnBrowserFramework = async (root: string, context: ProbeContext): Promise<boolean> => {
  const path = root === '.' ? 'package.json' : posix.join(root, 'package.json');
  if (!context.files.includes(path)) return false;
  try {
    const manifest = JSON.parse((await readText(context, path, { fullFile: true })) ?? '{}') as Record<string, unknown>;
    return ['dependencies', 'devDependencies'].some((field) => {
      const dependencies = manifest[field];
      return (
        typeof dependencies === 'object' &&
        dependencies !== null &&
        BROWSER_FRAMEWORKS.some((name) => Object.hasOwn(dependencies, name))
      );
    });
  } catch {
    return false;
  }
};

/**
 * Whether a JavaScript file builds a server: it imports a server module or calls `createServer`, `Bun.serve` or
 * `Deno.serve`. In a frontend package, `history.listen()`, a Tauri event `listen()` or an API client's
 * `jobs.listen()` is not one.
 */
const startsServer = (path: string, raw: string, code: string): boolean =>
  /\bcreateServer\s*\(|\bBun\.serve\s*\(|\bDeno\.serve\s*\(/.test(code) ||
  [...maskFile(path, raw, 'keep').matchAll(/(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)['"]([^'"\n]+)['"]/g)].some(
    (match) => SERVER_MODULE.test(match[1]!)
  );

/**
 * Go `main` files that are not how their module starts. A Go file beside a `package.json` with no `go.mod` belongs to
 * a JavaScript package (a local file server for an extension, say). And Go's project layout keeps a module's own
 * program in `cmd/<module name>`: when `cmd/fleet/main.go` exists in module `github.com/fleetdm/fleet/v4`, the other
 * `main` packages of the module (`cmd/apple-apns-mock`, `orbit/cmd/desktop`) are mocks, tools and other programs.
 */
const unstartedGoMains = async (detected: readonly Detected[], context: ProbeContext): Promise<ReadonlySet<string>> => {
  const dropped = new Set<string>();
  const goMains = detected.filter(({ detection }) => detection.language === 'go');
  for (const root of new Set(goMains.map((candidate) => candidate.root))) {
    const inRoot = goMains.filter((candidate) => candidate.root === root);
    const goMod = root === '.' ? 'go.mod' : posix.join(root, 'go.mod');
    if (!context.files.includes(goMod)) {
      for (const { path } of inRoot) dropped.add(path);
      continue;
    }
    // oxlint-disable-next-line no-await-in-loop -- one small manifest per Go module.
    const module = /^module\s+(\S+)/m.exec((await readText(context, goMod)) ?? '')?.[1];
    const name = module
      ?.replace(/\/v\d+$/, '')
      .split('/')
      .at(-1);
    const commands = root === '.' ? 'cmd/' : `${root}/cmd/`;
    if (name === undefined || !context.files.includes(`${commands}${name}/main.go`)) continue;
    for (const { path } of inRoot) {
      if (!path.startsWith(`${commands}${name}/`)) dropped.add(path);
    }
  }
  return dropped;
};

/** Words before `(...)` that open a block, not a function body. */
const BLOCK_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);

/** Whether the `{` at `index` of `code` (strings and comments blanked) opens a function body, and the function's name. */
const functionAt = (code: string, index: number): { opens: boolean; name?: string } => {
  const before = code.slice(0, index).trimEnd();
  if (before.endsWith('=>')) return { opens: true, ...arrowName(code, before.length - 2) };
  if (!before.endsWith(')')) return { opens: false };
  let depth = 0;
  let open = before.length - 1;
  for (; open >= 0; open -= 1) {
    if (before[open] === ')') depth += 1;
    else if (before[open] === '(' && --depth === 0) break;
  }
  const word = /([A-Za-z_$][\w$]*)\s*$/.exec(before.slice(0, Math.max(open, 0)))?.[1];
  if (word !== undefined && BLOCK_KEYWORDS.has(word)) return { opens: false };
  // `function start(`, a method `listen(`, `start = function (` or `start: function (`.
  const assigned = /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s+)?function\s*\*?\s*[\w$]*\s*$/.exec(before.slice(0, open));
  return {
    opens: true,
    ...(word !== undefined && word !== 'function' ? { name: word } : assigned ? { name: assigned[1]! } : {})
  };
};

/** The name an arrow function at `index` (its `=>`) is assigned to: `start = () =>`, `exports.start = async (x) =>`. */
const arrowName = (code: string, index: number): { name?: string } => {
  const name = /([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*$/.exec(
    code.slice(0, index)
  )?.[1];
  return name === undefined ? {} : { name };
};

/**
 * Whether the code at `index` runs when its module loads, and otherwise the name of the outermost function it is in.
 * Blocks (`if`, `try`, `for`) run; a function body, or an arrow's expression body, runs only when it is called.
 * `code` has strings and comments blanked, at the same offsets.
 */
const loadPosition = (code: string, index: number): { onLoad: boolean; outer?: string; start: number } => {
  type Frame = {
    function?: { name?: string; start: number };
    parens: number;
    arrows: Array<{ depth: number; name?: string; start: number }>;
  };
  const frames: Frame[] = [{ parens: 0, arrows: [] }];
  for (let at = 0; at < index; at += 1) {
    const char = code[at]!;
    const frame = frames.at(-1)!;
    if (char === '(') frame.parens += 1;
    else if (char === ')') {
      frame.parens -= 1;
      frame.arrows = frame.arrows.filter((arrow) => arrow.depth <= frame.parens);
    } else if (char === '=' && code[at + 1] === '>') {
      // An arrow with an expression body; one with a block body opens a function frame at its `{`.
      if (!/^\s*\{/.test(code.slice(at + 2, at + 40))) {
        frame.arrows.push({ depth: frame.parens, ...arrowName(code, at), start: at });
      }
      at += 1;
    } else if (char === ';' || (char === ',' && frame.parens === 0)) {
      frame.arrows = frame.arrows.filter((arrow) => arrow.depth < frame.parens);
    } else if (char === '\n') {
      // A statement ends at a line break unless the expression continues (`.listen(...)` on the next line).
      const next = /\S/.exec(code.slice(at + 1))?.[0];
      const previous = /(\S)\s*$/.exec(code.slice(0, at))?.[1];
      if (
        next !== undefined &&
        !'.?:)+-*/&|,'.includes(next) &&
        previous !== undefined &&
        !'=>(,+-*/&|?:'.includes(previous)
      ) {
        frame.arrows = frame.arrows.filter((arrow) => arrow.depth < frame.parens);
      }
    } else if (char === '{') {
      const opened = functionAt(code, at);
      frames.push({
        ...(opened.opens
          ? { function: { ...(opened.name === undefined ? {} : { name: opened.name }), start: at } }
          : {}),
        parens: 0,
        arrows: []
      });
    } else if (char === '}' && frames.length > 1) frames.pop();
  }
  for (const frame of frames) {
    const outer = frame.function ?? frame.arrows[0];
    if (outer !== undefined)
      return { onLoad: false, ...(outer.name === undefined ? {} : { outer: outer.name }), start: outer.start };
  }
  return { onLoad: true, start: 0 };
};

/**
 * Whether a listener runs when the started program loads: its `.listen()` is at module level, or it is in a function
 * that a reached file calls (`void bootstrap()`, `require('./server').start()`). A function nobody calls (an exported
 * helper) does not run; `undefined` when the scan cannot tell.
 */
const listenerRuns = (
  path: string,
  code: string,
  pattern: RegExp,
  reached: readonly string[],
  codeOf: (path: string) => string | undefined
): boolean | undefined => {
  const match = new RegExp(pattern.source, pattern.flags.replace('g', '')).exec(code);
  if (match === null) return undefined;
  const position = loadPosition(code, match.index);
  if (position.onLoad) return true;
  if (position.outer === undefined) return undefined;
  const call = new RegExp(`(?<![\\w$])${escapeRegExp(position.outer)}\\s*\\(`, 'g');
  /** A call, not the declaration: `name(...) {` and `name(...) =>` declare. */
  const calls = (text: string, skip?: readonly [number, number]) =>
    [...text.matchAll(call)].some((found) => {
      if (skip !== undefined && found.index >= skip[0] && found.index < skip[1]) return false;
      const after = text.slice(found.index + found[0].length);
      const close = /^[^()]*\)\s*(\{|=>)?/.exec(after);
      return close === null || close[1] === undefined;
    });
  // The function's own body does not start it (`listen() { this.app.listen() }`).
  const own = [position.start, match.index + 1] as const;
  return calls(code, own) || reached.some((file) => file !== path && calls(codeOf(file) ?? ''));
};

/** Lexicographic order of two ranking tuples. */
const earlier = (left: readonly number[], right: readonly number[]): boolean => {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] ?? 0) !== (right[index] ?? 0)) return (left[index] ?? 0) < (right[index] ?? 0);
  }
  return false;
};

type Detected = { path: string; raw: string; code: string; root: string; detection: Detection };

/** A background process the package declares: a Procfile process other than `web`, or a worker script. */
const declaresBackgroundProcess = (entry: StartEntry): boolean =>
  entry.origin === 'worker-script' || (entry.origin === 'procfile' && entry.processName !== undefined);

/**
 * Which JavaScript listener files the package's own start commands run.
 *
 * In a package whose start script, Procfile, Dockerfile or framework convention names a start file, a listener file that
 * no start file imports runs in no process (a React hook's `history.listen()`, a helper, an end-to-end test server) and
 * is dropped, but only when every start command was read and no reached file loads a module by a computed name;
 * otherwise nothing is dropped. A listener whose `.listen()` runs on load, or in a function a reached file calls, wins
 * over one the scan cannot tell runs; among those, the one closest to the strongest start file wins. Listeners that may
 * not run keep the first-file order, as before.
 *
 * A queue worker is its own process when a declared background process (`worker: node dist/worker.js`, a `worker`
 * script) or a start file that starts no web server runs it, and that start file is its entry; one only a web process
 * imports runs inside it. A package with no start file the scan can read keeps its first listener file, as before,
 * unless it is a frontend package and the file builds no server.
 */
const startedListeners = async (
  detected: readonly Detected[],
  context: ProbeContext,
  codeOf: (path: string) => string | undefined
): Promise<{
  dropped: ReadonlySet<string>;
  winners: ReadonlyMap<string, string>;
  workers: ReadonlyMap<string, { entrypoint: string; processType: string }>;
}> => {
  const resolver = createModuleResolver(context);
  const importsCache = new Map<string, Promise<{ targets: string[]; computed: boolean }>>();
  const dropped = new Set<string>();
  const winners = new Map<string, string>();
  const workers = new Map<string, { entrypoint: string; processType: string }>();
  for (const root of new Set(detected.map((candidate) => candidate.root))) {
    const inRoot = detected.filter((candidate) => candidate.root === root);
    // oxlint-disable-next-line no-await-in-loop -- one package at a time keeps the shared import cache warm.
    const { entries, resolved } = await startEntriesOf(root, context, resolver);
    if (entries.length === 0) {
      // Without a start file, a frontend package's `.listen()` that builds no server is a client-side listener.
      // oxlint-disable-next-line no-await-in-loop -- one manifest per package.
      if (await dependsOnBrowserFramework(root, context)) {
        for (const { path, raw, code, detection } of inRoot) {
          if (detection.processType === undefined && !startsServer(path, raw, code)) dropped.add(path);
        }
      }
      continue;
    }
    // oxlint-disable-next-line no-await-in-loop -- see above.
    const graphs = await Promise.all(
      entries.map((entry) => reachableFrom(entry.file, context, resolver, importsCache))
    );
    const reached = graphs.map((graph) => graph.order);
    // A command the scan could not read, or a module loaded by a computed name, may start any file.
    const complete = resolved && graphs.every((graph) => graph.complete);
    const everything = [...new Set(reached.flat())];
    // A start file that reaches a listener starts a web process; a queue worker it reaches runs inside it.
    const startsWebProcess = reached.map((files) =>
      inRoot.some(({ path, detection }) => detection.processType === undefined && files.includes(path))
    );
    const best = new Map<string, { path: string; rank: number; order: readonly number[] }>();
    for (const [position, { path, code, detection }] of inRoot.entries()) {
      const queueWorker = detection.processType !== undefined;
      const reaches = (index: number) => reached[index]!.includes(path);
      let processType = detection.processType;
      let order: readonly number[];
      if (queueWorker) {
        const declared = reached.findIndex(
          (_files, index) => reaches(index) && declaresBackgroundProcess(entries[index]!)
        );
        // A library's `main` or a CLI's `bin` runs no process of its own.
        const ownProcess = reached.findIndex(
          (_files, index) =>
            reaches(index) && !startsWebProcess[index] && !['main', 'bin'].includes(entries[index]!.origin)
        );
        const entryIndex = declared !== -1 ? declared : complete ? ownProcess : -1;
        if (entryIndex !== -1) {
          const entry = entries[entryIndex]!;
          processType = entry.origin === 'procfile' ? entry.processName! : workerProcessType(entry.file);
          workers.set(path, { entrypoint: entry.file, processType });
          order = [0, entryIndex, reached[entryIndex]!.indexOf(path)];
        } else if (complete) {
          dropped.add(path);
          continue;
        } else {
          order = [2, position];
        }
      } else {
        const entryIndex = reached.findIndex((_files, index) => reaches(index));
        if (entryIndex === -1) {
          if (complete) {
            dropped.add(path);
            continue;
          }
          order = [2, position];
        } else {
          order =
            listenerRuns(path, code, detection.pattern, everything, codeOf) === true
              ? [0, entryIndex, reached[entryIndex]!.indexOf(path)]
              : [1, position];
        }
      }
      const key = `${root}::${processType ?? 'main'}`;
      const rank = detection.rank ?? 1;
      const current = best.get(key);
      if (current === undefined || rank > current.rank || (rank === current.rank && earlier(order, current.order))) {
        best.set(key, { path, rank, order });
      }
    }
    for (const [key, { path }] of best) winners.set(key, path);
  }
  return { dropped, winners, workers };
};

export const serverEntrypointProbe: Probe = {
  name: 'server-entrypoint',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const candidates = withoutSampleDirectories(context.files).filter(
      (path) =>
        /\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/.test(path) &&
        !/(?:^|\/)(?:test|tests|__tests__|spec|fixtures|e2e|playwright|cypress)(?:\/|$)/i.test(path) &&
        !/(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?js|tsx?|py|php|go|java|kt)$/i.test(path) &&
        // Test runner setup (`jest.setup.ts`, `setupTests.ts`) starts no deployed process.
        !/(?:^|\/)(?:(?:jest|vitest)\.setup|setupTests|test-setup)\.[cm]?[jt]sx?$/i.test(path)
    );
    const byRoot = new Map<string, ServiceFactInput>();
    const ranks = new Map<string, number>();
    const entered = await directoriesEnteredByRoot(context);
    const sources: Array<{ path: string; raw: string; code: string }> = [];
    for (const path of candidates) {
      // oxlint-disable-next-line no-await-in-loop -- policy-controlled reads, one at a time.
      const raw = await readText(context, path);
      if (raw !== undefined) sources.push({ path, raw, code: maskFile(path, raw, 'blank') });
    }
    const files = new Set(context.files);
    const reexports = new Map(
      sources.flatMap(({ path, raw }) => {
        if (!/\.(?:[cm]?js|tsx?)$/.test(path)) return [];
        const found = reexportsOf(maskFile(path, raw, 'keep'));
        return found.length === 0 ? [] : [[path, found] as const];
      })
    );
    const rootOf = (path: string) => nearestManifestRoot(path, context.files, entered) ?? '.';
    const websocketOf = new Map(
      sources.flatMap((source) => {
        const pattern = websocketIn(source.path, source.raw, source.code, reexports, files);
        return pattern === undefined ? [] : [[source.path, { ...source, pattern }] as const];
      })
    );
    const sourceByPath = new Map(sources.map((source) => [source.path, source]));
    /**
     * A WebSocket server is often set up in its own module (`realtime.js`) that the listening file imports. Only a
     * module the listening file reaches through relative imports counts: a socket server in a dev script or a test
     * belongs to no deployed process.
     */
    const reachableWebsocket = (entry: string) => {
      const seen = new Set([entry]);
      const queue = [entry];
      while (queue.length > 0) {
        const path = queue.shift()!;
        const source = sourceByPath.get(path);
        if (source === undefined || !/\.(?:[cm]?js|tsx?)$/.test(path)) continue;
        const found = websocketOf.get(path);
        if (found !== undefined && path !== entry && !DEVELOPMENT_PATH.test(path)) return found;
        for (const match of maskFile(path, source.raw, 'keep').matchAll(MODULE_SPECIFIER)) {
          const target = resolveRelative(path, match[1]!, files);
          if (target !== undefined && !seen.has(target)) {
            seen.add(target);
            queue.push(target);
          }
        }
      }
      return undefined;
    };
    const detected: Array<(typeof sources)[number] & Detected> = [];
    for (const source of sources) {
      const detection = detectionFor(source.path, source.raw, source.code);
      if (detection !== undefined) detected.push({ ...source, detection, root: rootOf(source.path) });
    }
    const started = await startedListeners(
      detected.filter(({ detection }) => detection.language === 'javascript' || detection.language === 'typescript'),
      context,
      (path) => sourceByPath.get(path)?.code
    );
    const unstartedGo = await unstartedGoMains(detected, context);
    for (const { path, raw, code, detection: found, root } of detected) {
      if (unstartedGo.has(path)) continue;
      if (started.dropped.has(path)) continue;
      const worker = started.workers.get(path);
      const detection = worker === undefined ? found : { ...found, ...worker };
      const key = `${root}::${detection.processType ?? 'main'}`;
      const winner = started.winners.get(key);
      if (winner !== undefined && winner !== path) continue;
      // A NestJS microservice bootstrap gives way to an HTTP server in the same service, and a WSGI module to the
      // Channels router that also serves WebSockets.
      if (byRoot.has(key) && (detection.rank ?? 1) <= ranks.get(key)!) continue;
      ranks.set(key, detection.rank ?? 1);
      let exposesHttp = detection.exposesHttp ?? true;
      if (detection.exposesHttp === undefined && detection.language === 'java') {
        // oxlint-disable-next-line no-await-in-loop -- Java manifest evidence is needed before classifying the candidate.
        exposesHttp = await javaServiceExposesHttp(root, context);
      }
      const citation = citeFirstCodeMatch(
        path,
        raw,
        code,
        detection.pattern,
        detection.claimsEntrypoint === false ? 'exposesHttp' : 'containerEntrypoint'
      );
      const listenPort = !exposesHttp
        ? undefined
        : detection.language === 'go'
          ? goListenPort(path, raw)
          : detection.framework === 'spring-boot'
            ? // oxlint-disable-next-line no-await-in-loop -- one Spring module per service root.
              await springBootPort(root, context, citation)
            : detection.language === 'javascript' || detection.language === 'typescript'
              ? javascriptListenPort(path, raw, code)
              : undefined;
      const port = listenPort !== undefined && 'port' in listenPort ? listenPort : undefined;
      const unreadPort = listenPort !== undefined && 'unread' in listenPort ? listenPort.unread : undefined;
      const websocket = !exposesHttp
        ? undefined
        : (websocketOf.get(path) ?? (detection.processType === undefined ? reachableWebsocket(path) : undefined));
      const websocketCitation =
        websocket === undefined
          ? undefined
          : (citeFirstCodeMatch(
              websocket.path,
              websocket.raw,
              websocket.code,
              websocket.pattern,
              'longLivedConnections'
            ) ??
            citeFirstMatch(
              websocket.path,
              websocket.raw,
              /\bWebSocket|\bwebsocket|SocketIO|socket\.io|ProtocolTypeRouter/,
              'longLivedConnections'
            ));
      const listenerNotes = [
        ...(unreadPort === undefined ? [] : [{ kind: 'unread-port' as const, path }]),
        ...(detection.microservice === undefined ? [] : [{ kind: detection.microservice, path }])
      ];
      byRoot.set(key, {
        name:
          detection.processType ??
          (root === '.'
            ? (context.root.split(/[/\\]/).findLast((segment) => segment !== '') ?? 'app')
            : posix.basename(root)),
        path: root,
        ...(detection.processType === undefined ? {} : { processType: detection.processType }),
        language: detection.language,
        ...(detection.framework === undefined ? {} : { framework: detection.framework }),
        exposesHttp,
        executionModel: 'long-running',
        ...(detection.claimsEntrypoint === false ? {} : { containerEntrypoint: detection.entrypoint }),
        ...(port === undefined ? {} : { port: port.port }),
        ...(listenerNotes.length === 0 ? {} : { listenerNotes }),
        ...(websocket === undefined ? {} : { longLivedConnections: 'websocket' as const }),
        environmentVariables: [],
        evidence: [citation, port?.citation, unreadPort, websocketCitation].filter(
          (entry): entry is Citation => entry !== undefined
        ),
        source: 'probe'
      });
    }

    // A package's web process comes before its background processes: assembly folds a package-level service into the
    // only declared process beside it, and a worker listed first would absorb the web server.
    const roots = [...new Set([...byRoot.values()].map((service) => service.path))];
    const services = [...byRoot.values()].toSorted(
      (left, right) =>
        roots.indexOf(left.path) - roots.indexOf(right.path) ||
        Number(left.processType !== undefined) - Number(right.processType !== undefined)
    );
    return services.length === 0 ? {} : { services };
  }
};
