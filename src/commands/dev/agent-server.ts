import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { applicationManager } from '@application-services/application-manager';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { agentLog, getAgentLogFilePath, getAgentLogs, initAgentLogger, stopAgentLogger } from './agent-logger';
import { rebuildAllWorkloads, rebuildWorkload } from './parallel-runner';

export type WorkloadStatus = {
  name: string;
  type: string;
  status: 'pending' | 'starting' | 'running' | 'error' | 'stopped';
  url?: string;
  port?: number;
  error?: string;
  size?: string;
  sourceDir?: string; // Directory containing source code
  entryFile?: string; // Main entry file if known
};

export type LocalResourceStatus = {
  name: string;
  type: string;
  status: 'pending' | 'starting' | 'running' | 'error' | 'stopped';
  port?: number;
  error?: string;
};

export type AgentPhase = 'starting' | 'ready' | 'rebuilding' | 'stopping' | 'stopped';

export type AgentStatus = {
  phase: AgentPhase;
  workloads: WorkloadStatus[];
  localResources: LocalResourceStatus[];
  logFile: string | null;
};

// State management for agent mode
let agentState: AgentStatus = {
  phase: 'starting',
  workloads: [],
  localResources: [],
  logFile: null
};

let httpServer: Server | null = null;
let agentPort: number | null = null;
let startTime: number | null = null;

/**
 * Update the agent state.
 */
export const updateAgentState = (updates: Partial<AgentStatus>) => {
  agentState = { ...agentState, ...updates };
};

/**
 * Update a workload's status in agent state.
 */
export const updateAgentWorkloadStatus = (name: string, updates: Partial<Omit<WorkloadStatus, 'name'>>) => {
  const workload = agentState.workloads.find((w) => w.name === name);
  if (workload) {
    Object.assign(workload, updates);
  }
};

/**
 * Add a workload to agent state.
 */
export const addAgentWorkload = (workload: WorkloadStatus) => {
  const existing = agentState.workloads.find((w) => w.name === workload.name);
  if (!existing) {
    agentState.workloads.push(workload);
  }
};

/**
 * Update a local resource's status in agent state.
 */
export const updateAgentLocalResourceStatus = (name: string, updates: Partial<Omit<LocalResourceStatus, 'name'>>) => {
  const resource = agentState.localResources.find((r) => r.name === name);
  if (resource) {
    Object.assign(resource, updates);
  }
};

/**
 * Add a local resource to agent state.
 */
export const addAgentLocalResource = (resource: LocalResourceStatus) => {
  const existing = agentState.localResources.find((r) => r.name === resource.name);
  if (!existing) {
    agentState.localResources.push(resource);
  }
};

/**
 * Log a message (both to file and stdout in agent mode).
 */
export const logAgentMessage = (source: string, message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  agentLog(source, message, level);
  // Also print to stdout for agent visibility
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timestamp}] [${source}] [${level}] ${message}`);
};

// Initialize tRPC
const t = initTRPC.create();

const router = t.router;
const publicProcedure = t.procedure;

/**
 * Check if all workloads are ready (running or error).
 */
const areAllWorkloadsReady = (): boolean => {
  if (agentState.workloads.length === 0) return false;
  return agentState.workloads.every((w) => w.status === 'running' || w.status === 'error');
};

/**
 * Find similar workload names for suggestions.
 */
const findSimilarWorkloads = (name: string): string[] => {
  const lower = name.toLowerCase();
  return agentState.workloads
    .filter((w) => w.name.toLowerCase().includes(lower) || lower.includes(w.name.toLowerCase()))
    .map((w) => w.name)
    .slice(0, 3);
};

// Define the tRPC router
const agentRouter = router({
  /**
   * Get current status. Returns compact format by default.
   * Use ?input={"verbose":true} for full details.
   */
  status: publicProcedure.input(z.object({ verbose: z.boolean().optional() }).optional()).query(({ input }) => {
    const verbose = input?.verbose ?? false;
    const ready = areAllWorkloadsReady();

    // Auto-update phase to ready when all workloads are running
    if (agentState.phase === 'starting' && ready) {
      agentState.phase = 'ready';
    }

    if (verbose) {
      // Full verbose output
      return {
        phase: agentState.phase,
        ready,
        uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
        workloads: agentState.workloads,
        localResources: agentState.localResources,
        logFile: getAgentLogFilePath(),
        availableWorkloads: agentState.workloads.map((w) => w.name)
      };
    }

    // Compact output - optimized for token efficiency
    // Format: { phase, ready, workloads: { name: "status|url" } }
    const workloadMap: Record<string, string> = {};
    for (const w of agentState.workloads) {
      if (w.status === 'running' && w.url) {
        workloadMap[w.name] = w.url;
      } else if (w.status === 'error' && w.error) {
        workloadMap[w.name] = `error: ${w.error}`;
      } else {
        workloadMap[w.name] = w.status;
      }
    }

    return {
      phase: agentState.phase,
      ready,
      workloads: workloadMap
    };
  }),

  /**
   * Get logs. Supports filtering by cursor (timestamp) and workload.
   * Returns logs as single string (newline-separated) for token efficiency.
   */
  logs: publicProcedure
    .input(
      z
        .object({
          cursor: z.number().optional(), // Unix timestamp ms - use nextCursor from previous response
          limit: z.number().min(1).max(500).optional(),
          workload: z.string().optional()
        })
        .optional()
    )
    .query(({ input }) => {
      const result = getAgentLogs({
        since: input?.cursor,
        limit: input?.limit ?? 50,
        workload: input?.workload
      });

      // Return logs as single string for token efficiency
      return {
        logs: result.logs.join('\n'),
        count: result.logs.length,
        nextCursor: result.nextCursor
      };
    }),

  /**
   * Rebuild a specific workload by name.
   */
  rebuild: publicProcedure
    .input(
      z.object({
        workload: z.string().min(1)
      })
    )
    .mutation(async ({ input }) => {
      const workloadName = input.workload.trim();

      // Check if workload exists
      const workload = agentState.workloads.find((w) => w.name === workloadName);
      if (!workload) {
        const similar = findSimilarWorkloads(workloadName);
        const available = agentState.workloads.map((w) => w.name);
        return {
          ok: false,
          error: `Workload "${workloadName}" not found`,
          available,
          similar: similar.length > 0 ? similar : undefined
        };
      }

      // Check if already rebuilding
      if (workload.status === 'starting') {
        return {
          ok: false,
          error: `Workload "${workloadName}" is already rebuilding`
        };
      }

      const found = await rebuildWorkload(workloadName);
      return { ok: found };
    }),

  /**
   * Rebuild all workloads.
   */
  rebuildAll: publicProcedure.mutation(async () => {
    // Check if any workload is already rebuilding
    const rebuilding = agentState.workloads.filter((w) => w.status === 'starting');
    if (rebuilding.length > 0) {
      return {
        ok: false,
        error: `Some workloads are already rebuilding: ${rebuilding.map((w) => w.name).join(', ')}`
      };
    }

    await rebuildAllWorkloads();
    return { ok: true };
  }),

  /**
   * Stop dev mode gracefully.
   */
  stop: publicProcedure.mutation(() => {
    if (agentState.phase === 'stopping' || agentState.phase === 'stopped') {
      return { ok: true, message: 'Already stopping' };
    }

    agentState.phase = 'stopping';

    // Signal shutdown after delay to allow response
    setTimeout(() => {
      process.kill(process.pid, 'SIGINT');
    }, 100);

    return { ok: true };
  }),

  /**
   * Health check - minimal response for polling.
   */
  health: publicProcedure.query(() => {
    return { ok: true, phase: agentState.phase };
  })
});

export type AgentRouter = typeof agentRouter;

/**
 * Parse JSON safely, returning undefined on failure.
 */
const safeJsonParse = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};

/**
 * HTTP handler for tRPC requests.
 * Handles GET (queries) and POST (mutations) with robust error handling.
 */
const handleTrpcRequest = async (req: any, res: any) => {
  const url = new URL(req.url || '', `http://localhost:${agentPort}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Root path - return API info
  if (pathname === '/' || pathname === '/trpc' || pathname === '/trpc/') {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        name: 'stacktape-dev-agent',
        endpoints: {
          'GET /trpc/health': 'Health check',
          'GET /trpc/status': 'Get workload status (add ?input={"verbose":true} for details)',
          'GET /trpc/logs': 'Get logs (params: cursor, limit, workload)',
          'POST /trpc/rebuild': 'Rebuild workload (body: {"workload":"name"})',
          'POST /trpc/rebuildAll': 'Rebuild all workloads',
          'POST /trpc/stop': 'Stop dev mode'
        }
      })
    );
    return;
  }

  // Extract procedure name from path: /trpc/procedureName
  const procedureMatch = pathname.match(/^\/trpc\/(\w+)$/);
  if (!procedureMatch) {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'Not found. Try GET / for API info.' }));
    return;
  }

  const procedureName = procedureMatch[1] as keyof typeof agentRouter._def.procedures;
  const procedure = agentRouter._def.procedures[procedureName];

  if (!procedure) {
    res.statusCode = 404;
    res.end(
      JSON.stringify({
        ok: false,
        error: `Unknown endpoint "${procedureName}"`,
        available: ['health', 'status', 'logs', 'rebuild', 'rebuildAll', 'stop']
      })
    );
    return;
  }

  // Check HTTP method
  const isQuery = ['status', 'logs', 'health'].includes(procedureName);
  const isMutation = ['rebuild', 'rebuildAll', 'stop'].includes(procedureName);

  if (isQuery && req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: `Use GET for ${procedureName}` }));
    return;
  }

  if (isMutation && req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: `Use POST for ${procedureName}` }));
    return;
  }

  try {
    let input: any;

    // Parse input from query string (GET) or body (POST)
    if (req.method === 'GET') {
      const inputParam = url.searchParams.get('input');
      if (inputParam) {
        input = safeJsonParse(inputParam);
        if (inputParam && input === undefined) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON in input parameter' }));
          return;
        }
      }
    } else if (req.method === 'POST') {
      const body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => {
          data += chunk;
        });
        req.on('end', () => resolve(data));
      });

      if (body && body.trim()) {
        input = safeJsonParse(body);
        if (input === undefined) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON in request body' }));
          return;
        }
      }
    }

    // Call the procedure
    const ctx = {};
    const caller = t.createCallerFactory(agentRouter)(ctx);
    const result = await (caller as any)[procedureName](input);

    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (error: any) {
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      res.statusCode = 400;
      const issues = error.issues?.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ');
      res.end(JSON.stringify({ ok: false, error: `Validation error: ${issues || error.message}` }));
      return;
    }

    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: error.message || 'Internal error' }));
  }
};

/**
 * Start the agent HTTP server.
 */
export const startAgentServer = async (port: number, logDir: string): Promise<void> => {
  agentPort = port;
  startTime = Date.now();

  // Initialize logger
  const logFile = `${logDir}/${port}-logs.txt`;
  initAgentLogger(logFile);
  agentState.logFile = logFile;

  return new Promise((resolve, reject) => {
    httpServer = createServer(handleTrpcRequest);

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Choose a different --agentPort.`));
      } else {
        reject(err);
      }
    });

    httpServer.listen(port, () => {
      console.log(`\nAgent server: http://localhost:${port}`);
      console.log(`Log file: ${logFile}\n`);
      console.log('Endpoints:');
      console.log(`  GET  /trpc/health      - Health check`);
      console.log(`  GET  /trpc/status      - Workload status`);
      console.log(`  GET  /trpc/logs        - Get logs`);
      console.log(`  POST /trpc/rebuild     - Rebuild workload`);
      console.log(`  POST /trpc/rebuildAll  - Rebuild all`);
      console.log(`  POST /trpc/stop        - Stop dev mode\n`);
      resolve();
    });
  });
};

/**
 * Stop the agent server.
 */
export const stopAgentServer = () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  agentPort = null;
  startTime = null;
  stopAgentLogger();
  agentState = {
    phase: 'stopped',
    workloads: [],
    localResources: [],
    logFile: null
  };
};

/**
 * Check if agent mode is active.
 */
export const isAgentMode = (): boolean => {
  return httpServer !== null;
};

/**
 * Get the agent server port.
 */
export const getAgentPort = (): number | null => {
  return agentPort;
};

// Track if cleanup hook has been registered
let agentCleanupHookRegistered = false;

/**
 * Register cleanup hook for agent server.
 */
export const registerAgentCleanupHook = () => {
  if (agentCleanupHookRegistered) return;
  agentCleanupHookRegistered = true;
  applicationManager.registerCleanUpHook(async () => {
    stopAgentServer();
  });
};
