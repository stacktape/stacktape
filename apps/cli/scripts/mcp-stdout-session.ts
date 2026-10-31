/**
 * Drives `stacktape mcp` over raw stdio the way a client does: initialize, list tools, then disconnect by closing
 * stdin. Returns every byte the server wrote. MCP stdio clients parse each stdout line as a JSON-RPC message, so a test
 * can assert that nothing else reaches stdout, including what the CLI prints while it shuts down.
 */
export const runRawMcpSession = async ({
  command,
  cwd,
  env,
  timeoutMs = 60_000
}: {
  command: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  timeoutMs?: number;
}) => {
  const child = Bun.spawn(command, { cwd, env, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  const timeout = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  const stderrText = new Response(child.stderr).text();
  const send = (message: Record<string, unknown>) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
  send({
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'stdout-protocol-test', version: '1.0.0' }
    }
  });
  send({ method: 'notifications/initialized' });
  send({ id: 2, method: 'tools/list', params: {} });
  await child.stdin.flush();

  let stdout = '';
  let disconnected = false;
  const decoder = new TextDecoder();
  for await (const chunk of child.stdout) {
    stdout += decoder.decode(chunk, { stream: true });
    // Disconnect once the tool list has arrived, so the session was fully established and the client ends it.
    if (!disconnected && stdout.split('\n').some((line) => /^\{.*"id":2[,}]/.test(line))) {
      disconnected = true;
      await child.stdin.end();
    }
  }
  if (!disconnected) await child.stdin.end();
  const [stderr, exitCode] = await Promise.all([stderrText, child.exited]);
  clearTimeout(timeout);

  const frames: Array<Record<string, unknown>> = [];
  const nonProtocolLines: string[] = [];
  for (const line of stdout.split('\n').filter((entry) => entry.length > 0)) {
    try {
      const frame = JSON.parse(line) as Record<string, unknown>;
      if (frame && typeof frame === 'object' && frame.jsonrpc === '2.0') {
        frames.push(frame);
        continue;
      }
    } catch {}
    nonProtocolLines.push(line);
  }
  return { stdout, stderr, exitCode, frames, nonProtocolLines, disconnected };
};
