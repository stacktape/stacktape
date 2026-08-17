import { afterEach, describe, expect, it } from 'bun:test';
import { startWizardServer, type WizardServer, type WizardState } from './wizard-server';

let server: WizardServer | undefined;

const baseState: WizardState = {
  phase: 'analysing',
  projectName: 'orders',
  timeline: [],
  answers: {}
};

/** What the server passed to its hooks, in order. Both reset by each `start()`. */
let started: Array<{ agentId: string; modelId: string }> = [];
let deployed: Array<{
  stage: string;
  region: string;
  expected: { kind: 'check' | 'create' } | { kind: 'update'; stackId: string };
}> = [];

const start = async (overrides: Partial<Parameters<typeof startWizardServer>[0]> = {}) => {
  started = [];
  deployed = [];
  server = await startWizardServer({
    initialState: baseState,
    hooks: {
      onAnswer: (id, value) => ({ ...baseState, answers: { [id]: value } }),
      onMode: () => baseState,
      onPreference: (change) => ({
        ...baseState,
        preferences: {
          capacity: change.key === 'capacity' ? change.value : 'balanced',
          availability: change.key === 'availability' ? change.value : 'single',
          dataProtection: change.key === 'dataProtection' ? change.value : 'protected',
          databaseAccess: change.key === 'databaseAccess' ? change.value : 'private'
        }
      }),
      onStart: (choice) => {
        started.push(choice);
      },
      onWrite: () => {},
      onDeploy: (input) => {
        deployed.push(input);
      },
      onVerify: () => {},
      onVerifyDismiss: () => baseState,
      onPipeline: () => {},
      onRecheck: () => baseState
    },
    ...overrides
  });
  const token = new URL(server.url).hash.replace('#token=', '');
  return { server, token, origin: `http://127.0.0.1:${server.port}` };
};

afterEach(async () => {
  await server?.close();
  server = undefined;
});

const handshake = async (origin: string, token: string) => {
  const response = await fetch(`${origin}/api/handshake?token=${token}`, {
    method: 'POST',
    headers: { Origin: origin }
  });
  const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
  return { response, cookie, body: (await response.json()) as { csrfToken?: string; error?: string } };
};

describe('binding', () => {
  it('listens on loopback only, on a random port', async () => {
    const { server: started } = await start();

    expect(started.port).toBeGreaterThan(0);
    expect(started.url.startsWith('http://127.0.0.1:')).toBe(true);
  });

  it('puts the one-time token in the fragment, which is never sent to a server', async () => {
    const { server: started } = await start();

    expect(started.url).toContain('/#token=');
    expect(new URL(started.url).search).toBe('');
  });
});

describe('handshake', () => {
  it('exchanges the token for a cookie and a CSRF token', async () => {
    const { origin, token } = await start();

    const { response, cookie, body } = await handshake(origin, token);

    expect(response.status).toBe(200);
    expect(cookie).toContain('stacktape_init=');
    expect(body.csrfToken).toBeTruthy();
  });

  it('spends the token, so a link left in shell history is useless', async () => {
    const { origin, token } = await start();
    await handshake(origin, token);

    const second = await handshake(origin, token);

    expect(second.response.status).toBe(401);
  });

  it('rejects a wrong token', async () => {
    const { origin } = await start();

    expect((await handshake(origin, 'not-the-token')).response.status).toBe(401);
  });
});

describe('origin checking', () => {
  it('rejects a request from another origin even with a valid cookie', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    // The DNS-rebinding case: an attacker can point a hostname at loopback but cannot forge Origin.
    const response = await fetch(`${origin}/api/state`, {
      headers: { Origin: 'http://evil.test', Cookie: cookie }
    });

    expect(response.status).toBe(403);
  });
});

describe('authorisation', () => {
  it('refuses the API without a session cookie', async () => {
    const { origin } = await start();

    const response = await fetch(`${origin}/api/state`, { headers: { Origin: origin } });

    expect(response.status).toBe(401);
  });

  it('serves state once authorised', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } });

    expect(response.status).toBe(200);
    expect(((await response.json()) as WizardState).projectName).toBe('orders');
  });

  it('sets a deny-by-default content security policy on every response', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } });

    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });
});

describe('resuming after a reload', () => {
  it('continues on the cookie once the token has been spent', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    // The page cleared the token from its address bar, so a reload has only the cookie.
    const resumed = await fetch(`${origin}/api/session`, { headers: { Origin: origin, Cookie: cookie } });

    expect(resumed.status).toBe(200);
    const body = (await resumed.json()) as { csrfToken: string; state: WizardState };
    expect(body.csrfToken).toBeTruthy();
    expect(body.state.projectName).toBe('orders');
  });

  it('refuses to resume without a session cookie', async () => {
    const { origin } = await start();

    expect((await fetch(`${origin}/api/session`, { headers: { Origin: origin } })).status).toBe(401);
  });
});

describe('answering a question', () => {
  it('requires the CSRF token, not just the cookie', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    // A cookie alone would let any other open tab answer questions on the user's behalf.
    const response = await fetch(`${origin}/api/answer`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'stage-intent', value: 'trial' })
    });

    expect(response.status).toBe(403);
  });

  it('records an answer when the CSRF token is present', async () => {
    const { origin, token } = await start();
    const { cookie, body } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/answer`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': body.csrfToken ?? ''
      },
      body: JSON.stringify({ id: 'stage-intent', value: 'trial' })
    });

    expect(response.status).toBe(200);
    expect(((await response.json()) as WizardState).answers['stage-intent']).toBe('trial');
  });

  it('rejects a malformed body', async () => {
    const { origin, token } = await start();
    const { cookie, body } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/answer`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': body.csrfToken ?? ''
      },
      body: JSON.stringify({ id: 42 })
    });

    expect(response.status).toBe(400);
  });
});

describe('changing an infrastructure preference', () => {
  const change = async (payload: unknown, withCsrf = true) => {
    const { origin, token } = await start();
    const { cookie, body } = await handshake(origin, token);
    return fetch(`${origin}/api/preferences`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie,
        'Content-Type': 'application/json',
        ...(withCsrf ? { 'x-csrf-token': body.csrfToken ?? '' } : {})
      },
      body: JSON.stringify(payload)
    });
  };

  it('accepts only a closed preference key and value pair', async () => {
    const response = await change({ key: 'databaseAccess', value: 'public' });

    expect(response.status).toBe(200);
    expect(((await response.json()) as WizardState).preferences?.databaseAccess).toBe('public');
  });

  it('rejects a missing CSRF token and mismatched or unknown values', async () => {
    expect((await change({ key: 'capacity', value: 'performance' }, false)).status).toBe(403);
    expect((await change({ key: 'capacity', value: 'private' })).status).toBe(400);
    expect((await change({ key: 'notifications', value: 'everything' })).status).toBe(400);
  });
});

describe('state versioning', () => {
  it('numbers every state it serves, so the page can drop a stale reply', async () => {
    const { origin, token, server: started } = await start();
    const { cookie, body } = await handshake(origin, token);

    const first = (body as unknown as { state: WizardState }).state.revision;
    started.publish({ ...baseState, phase: 'reviewing' });
    const second = (
      (await (
        await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } })
      ).json()) as WizardState
    ).revision;

    expect(first).toBeGreaterThan(0);
    // Strictly increasing is the whole contract: the page compares these and keeps the larger.
    expect(second).toBeGreaterThan(first!);
  });
});

describe('starting the analysis', () => {
  it('requires the CSRF token, because starting spends the user’s subscription', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/start`, {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'claude-code', modelId: 'default' })
    });

    expect(response.status).toBe(403);
  });

  it('passes the chosen agent and model through', async () => {
    const { origin, token } = await start();
    const { cookie, body } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/start`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': body.csrfToken ?? ''
      },
      body: JSON.stringify({ agentId: 'claude-code', modelId: 'opus' })
    });

    expect(response.status).toBe(200);
    expect(started).toEqual([{ agentId: 'claude-code', modelId: 'opus' }]);
  });

  it('rejects a body that is not two strings', async () => {
    const { origin, token } = await start();
    const { cookie, body } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/start`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': body.csrfToken ?? ''
      },
      body: JSON.stringify({ agentId: { toString: 'claude-code' } })
    });

    expect(response.status).toBe(400);
  });
});

describe('deploying', () => {
  /** One server, one handshake, many requests — so what reached the hook can be asserted at the end. */
  const opened = async () => {
    const { origin, token } = await start();
    const { cookie, body } = await handshake(origin, token);
    const csrfToken = body.csrfToken ?? '';
    return {
      post: (payload: unknown, withCsrf = true) =>
        fetch(`${origin}/api/deploy`, {
          method: 'POST',
          headers: {
            Origin: origin,
            Cookie: cookie,
            'Content-Type': 'application/json',
            ...(withCsrf ? { 'x-csrf-token': csrfToken } : {})
          },
          body: JSON.stringify(payload)
        })
    };
  };

  it('requires the CSRF token, because this one spends money', async () => {
    const { post } = await opened();
    expect((await post({ stage: 'dev', region: 'eu-west-1' }, false)).status).toBe(403);
    expect(deployed).toEqual([]);
  });

  it('passes a valid stage and region through', async () => {
    const { post } = await opened();
    expect((await post({ stage: 'dev', region: 'eu-west-1', expected: { kind: 'check' } })).status).toBe(200);
    expect(deployed).toEqual([{ stage: 'dev', region: 'eu-west-1', expected: { kind: 'check' } }]);
  });

  it('refuses anything that is not a stage and a region', async () => {
    const { post } = await opened();
    // Both of these end up on a command line. A stage is short and lowercase; a region looks like a
    // region. Neither is free text, and neither is left for the CLI downstream to notice.
    const rejected = [
      { stage: 'dev; rm -rf /', region: 'eu-west-1' },
      { stage: 'dev', region: '../../etc' },
      { stage: 'a-very-long-stage-name', region: 'eu-west-1' },
      { stage: 'Dev', region: 'eu-west-1' },
      { stage: 'dev' },
      { region: 'eu-west-1' }
    ];
    const statuses = await Promise.all(rejected.map(async (payload) => (await post(payload)).status));

    expect(statuses).toEqual(rejected.map(() => 400));
    expect(deployed).toEqual([]);
  });

  it('requires a closed target-confirmation shape', async () => {
    const { post } = await opened();
    const rejected = [
      { stage: 'dev', region: 'eu-west-1' },
      { stage: 'dev', region: 'eu-west-1', expected: { kind: 'anything' } },
      { stage: 'dev', region: 'eu-west-1', expected: { kind: 'update' } },
      { stage: 'dev', region: 'eu-west-1', expected: { kind: 'update', stackId: '' } },
      { stage: 'dev', region: 'eu-west-1', expected: { kind: 'update', stackId: 'x'.repeat(2_049) } }
    ];

    expect(await Promise.all(rejected.map(async (payload) => (await post(payload)).status))).toEqual(
      rejected.map(() => 400)
    );
    expect(deployed).toEqual([]);
  });
});

describe('live reload', () => {
  it('sends a named reload event, distinct from a state update', async () => {
    const { origin, token, server: started } = await start();
    const { cookie } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/events`, { headers: { Origin: origin, Cookie: cookie } });
    const reader = response.body!.getReader();
    await reader.read();

    started.publishReload();
    const frame = new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();

    // Named, so the page can tell "reload yourself" from "here is new state" without parsing the
    // payload to find out which it got.
    expect(frame).toContain('event: reload');
  });

  it('does not watch anything unless asked to', async () => {
    // A released CLI serves a bundle that cannot change underneath it; watching would hold a file
    // handle open waiting for something that never happens.
    const { server: started } = await start();

    expect(typeof started.publishReload).toBe('function');
  });
});

describe('event stream', () => {
  it('sends the current state immediately, so a late page is never blank', async () => {
    const { origin, token } = await start();
    const { cookie } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/events`, { headers: { Origin: origin, Cookie: cookie } });
    const reader = response.body!.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();

    expect(first.startsWith('data: ')).toBe(true);
    expect(first).toContain('"projectName":"orders"');
  });

  it('pushes later updates to a connected page', async () => {
    const { origin, token, server: started } = await start();
    const { cookie } = await handshake(origin, token);

    const response = await fetch(`${origin}/api/events`, { headers: { Origin: origin, Cookie: cookie } });
    const reader = response.body!.getReader();
    await reader.read();

    started.publish({ ...baseState, phase: 'reviewing' });
    const update = new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();

    expect(update).toContain('"phase":"reviewing"');
  });
});

describe('idle shutdown', () => {
  const quietState: WizardState = { ...baseState, phase: 'reviewing' };

  it('closes itself when nothing is connected and nothing is running', async () => {
    const { server: started } = await start({ initialState: quietState, idleTimeoutMs: 50 });

    expect(await started.whenClosed).toBe('idle');
  });

  it('resolves whenClosed with explicit when closed on purpose', async () => {
    const { server: started } = await start({ initialState: quietState, idleTimeoutMs: 60_000 });

    await started.close();

    expect(await started.whenClosed).toBe('explicit');
  });

  it('stays up while a page is connected, and idles out once it leaves', async () => {
    const { origin, token, server: started } = await start({ initialState: quietState, idleTimeoutMs: 50 });
    const { cookie } = await handshake(origin, token);

    // Aborted rather than politely cancelled below, because only an abort reliably closes the
    // socket — a cancelled reader can leave the connection pooled, which a real page never does.
    const leave = new AbortController();
    const events = await fetch(`${origin}/api/events`, {
      headers: { Origin: origin, Cookie: cookie },
      signal: leave.signal
    });
    await events.body!.getReader().read();

    // Three idle periods with the stream open: the timer must keep deciding not to close.
    await new Promise((resolveWait) => setTimeout(resolveWait, 160));
    const alive = await fetch(`${origin}/api/state`, { headers: { Origin: origin, Cookie: cookie } });
    expect(alive.status).toBe(200);

    leave.abort();
    expect(await started.whenClosed).toBe('idle');
  });

  it('stays up while a deploy is running, with no page connected at all', async () => {
    const { origin, server: started } = await start({ initialState: quietState, idleTimeoutMs: 50 });
    const running = {
      status: 'running' as const,
      stage: 'test',
      region: 'eu-west-1',
      commandLine: 'stacktape deploy',
      events: [],
      lines: []
    };
    started.publish({ ...quietState, deployment: running });

    await new Promise((resolveWait) => setTimeout(resolveWait, 160));
    const alive = await fetch(`${origin}/api/state`, { headers: { Origin: origin } });
    expect(alive.status).toBe(401);

    started.publish({ ...quietState, deployment: { ...running, status: 'succeeded' as const } });
    expect(await started.whenClosed).toBe('idle');
  });

  it('stays up while the consented local try-out is running without a page', async () => {
    const { origin, server: started } = await start({ initialState: quietState, idleTimeoutMs: 50 });
    started.publish({ ...quietState, verification: { status: 'running' } });

    await new Promise((resolveWait) => setTimeout(resolveWait, 160));
    const alive = await fetch(`${origin}/api/state`, { headers: { Origin: origin } });
    expect(alive.status).toBe(401);

    started.publish({ ...quietState, verification: { status: 'unavailable' } });
    expect(await started.whenClosed).toBe('idle');
  });
});
