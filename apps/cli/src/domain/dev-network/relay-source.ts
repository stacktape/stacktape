/**
 * The dev box relay: a bore-compatible TCP relay (the framing of github.com/ekzhang/bore 0.5: JSON messages ended by a
 * zero byte) with three Stacktape messages. The boot script installs it as a systemd service; it uses only the
 * standard library of Python 3.9, the interpreter Amazon Linux 2023 ships, so nothing is downloaded at boot.
 *
 * The control port listens on the box's loopback, so a laptop reaches it only through an SSM port-forwarding session,
 * which IAM authenticates and encrypts. Tunnel ports listen on the box's private IP, which the box security group opens
 * to the dev Lambda security group only.
 *
 * Messages a client sends first:
 * - `{"Lease": {"port", "key", "owner", "label", "session", "takeOver"}}` opens the tunnel port of one (stack, resource)
 *   lease. The stage belongs to one `stacktape dev` process: while another process holds any tunnel of the same stack,
 *   or this port, the lease is refused with `{"Refused": {...}}`, naming the holder, so two sessions of one stage never
 *   split its databases or take a port from each other in turn. The same process takes its port over, because a laptop
 *   that lost its SSM session comes back before the old session's sockets close. With `takeOver`, every tunnel of the
 *   stack that another process holds is closed at once, with the connections it carries (a warm function's pooled
 *   database connection included); each is told `{"TakenOver": {"label"}}` first, and its session must end.
 * - `{"Presence": {"owner", "label", "session", "stack"}}` keeps the box awake while a dev session runs.
 * - `{"Sessions": {"stack"}}` answers the live sessions of one stack (all stacks when it is empty) and closes.
 * - `{"Ping": null}` answers `{"Pong": {"version"}}` and closes: the readiness probe.
 * - `{"Hello": port}` and `{"Accept": id}` are bore's own messages.
 *
 * A leased port keeps listening for a while after its tunnel ends (a session that restarts, or lost its SSM session,
 * leases the same port again). A connection that arrives then waits for the next tunnel of the same lease key and is
 * handed to it, so a function invoked during a restart reaches the database once the session is back instead of
 * getting `Connection refused`. When no tunnel comes back in time, the connection is closed.
 *
 * The box stops itself: once no tunnel and no presence connection has been open for the idle time, the relay runs the
 * shutdown command, and `InstanceInitiatedShutdownBehavior: stop` turns that into an EC2 stop.
 */
export const DEV_BOX_RELAY_VERSION = 3;

export const DEV_BOX_RELAY_SOURCE = String.raw`#!/usr/bin/env python3
import asyncio
import json
import os
import subprocess
import sys
import time
import uuid

VERSION = ${DEV_BOX_RELAY_VERSION}
CONTROL_HOST = os.environ.get('STACKTAPE_RELAY_CONTROL_HOST', '127.0.0.1')
CONTROL_PORT = int(os.environ.get('STACKTAPE_RELAY_CONTROL_PORT', '7835'))
TUNNEL_HOST = sys.argv[1]
IDLE_SECONDS = int(os.environ.get('STACKTAPE_RELAY_IDLE_SECONDS', '1800'))
SHUTDOWN_COMMAND = os.environ.get('STACKTAPE_RELAY_SHUTDOWN_COMMAND', 'shutdown -h now')
HEARTBEAT_SECONDS = float(os.environ.get('STACKTAPE_RELAY_HEARTBEAT_SECONDS', '1'))
PENDING_SECONDS = 10
# How long a leased port keeps listening after its tunnel ended, and how long a connection to it waits for a tunnel.
PARK_SECONDS = float(os.environ.get('STACKTAPE_RELAY_PARK_SECONDS', '120'))
WAIT_SECONDS = float(os.environ.get('STACKTAPE_RELAY_WAIT_SECONDS', '30'))

pending = {}
tunnels = {}
# The listening socket of each leased port, kept apart from its tunnel so a restarted session finds the port open.
listeners = {}
presences = {}
idle_since = time.monotonic()


def log(message):
    print('stacktape-relay: ' + message, flush=True)


def frame(message):
    return json.dumps(message).encode() + b'\0'


def client_count():
    return len(tunnels) + len(presences)


def touch():
    global idle_since
    idle_since = time.monotonic()


async def read_message(reader, timeout):
    data = await asyncio.wait_for(reader.readuntil(b'\0'), timeout)
    return json.loads(data[:-1].decode())


async def pipe(reader, writer):
    try:
        while True:
            data = await reader.read(65536)
            if not data:
                break
            writer.write(data)
            await writer.drain()
    except Exception:
        pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def hold(reader, writer):
    """Sends heartbeats until the client closes the connection or a write fails."""
    closed = asyncio.ensure_future(reader.read())
    try:
        while not closed.done():
            writer.write(frame('Heartbeat'))
            await writer.drain()
            await asyncio.wait([closed], timeout=HEARTBEAT_SECONDS)
    except Exception:
        pass
    finally:
        closed.cancel()


async def close_tunnel(tunnel):
    """Closes the tunnel's control connection and every connection it carries: a pooled database connection of a warm
    function must not keep reaching the replaced session. A leased port stays open for the next tunnel."""
    tunnel['writer'].close()
    for conn_writer in list(tunnel['connections']):
        conn_writer.close()
    tunnel['connections'].clear()
    if tunnel['server'] and not tunnel['key']:
        tunnel['server'].close()
        await tunnel['server'].wait_closed()


async def close_listener(port, listener):
    if listeners.get(port) is listener:
        del listeners[port]
    if listener['closer']:
        listener['closer'].cancel()
    listener['server'].close()
    await listener['server'].wait_closed()


async def close_when_unused(port, listener):
    await asyncio.sleep(PARK_SECONDS)
    if listeners.get(port) is listener and port not in tunnels:
        listener['closer'] = None
        log('port %d closed: no session leased it again within %d s' % (port, PARK_SECONDS))
        await close_listener(port, listener)


def reuse_listener(port, key):
    listener = listeners.get(port)
    if not listener or listener['key'] != key:
        return None
    if listener['closer']:
        listener['closer'].cancel()
        listener['closer'] = None
    return listener['server']


async def open_listener(port, key, on_connection):
    """The listening socket of a tunnel: a leased port's own, kept between its tunnels, or a new one."""
    if not (port and key):
        return await asyncio.start_server(on_connection, TUNNEL_HOST, port, reuse_address=True)
    server = reuse_listener(port, key)
    if server:
        return server
    if port in listeners:
        # The port was leased under another key before: its waiting connections must not reach this lease.
        await close_listener(port, listeners[port])
    try:
        server = await asyncio.start_server(on_connection, TUNNEL_HOST, port, reuse_address=True)
    except OSError:
        # Another tunnel of this lease opened the port meanwhile.
        server = reuse_listener(port, key)
        if server:
            return server
        raise
    if port in listeners:
        server.close()
        return reuse_listener(port, key) or listeners[port]['server']
    listeners[port] = {'server': server, 'key': key, 'closer': None}
    return server


async def tunnel_for(port, key):
    """The tunnel of this lease, waiting for it when its session is restarting."""
    deadline = time.monotonic() + WAIT_SECONDS
    while True:
        tunnel = tunnels.get(port)
        if tunnel and tunnel['key'] == key:
            return tunnel
        if time.monotonic() >= deadline or port not in listeners:
            return None
        await asyncio.sleep(0.1)


def stack_of(key):
    return key.split('/')[0] if key else ''


async def run_tunnel(reader, writer, port, key, owner, label, session, take_over):
    stack = stack_of(key)
    others = sorted(
        [(held_port, held) for held_port, held in tunnels.items()
         if (held_port == port or (stack and stack_of(held['key']) == stack))
         and not (held['owner'] == owner and held['session'] == session)],
        key=lambda entry: entry[1]['since'])
    if others and not take_over:
        holder = others[0][1]
        writer.write(frame({'Refused': {'port': port, 'key': holder['key'], 'label': holder['label'],
                                        'since': holder['since']}}))
        writer.close()
        return
    same_session = tunnels.get(port) if port else None
    # Everything up to the reservation below runs without an await, so a concurrent lease of another session sees
    # either the old holders or this tunnel, never a gap in which both could take part of the stage.
    tunnel = {'server': None, 'writer': writer, 'owner': owner, 'key': key, 'label': label,
              'session': session, 'since': int(time.time()), 'connections': set()}
    replaced = []
    for held_port, held in others:
        log('port %d taken over by %s' % (held_port, label or '-'))
        held['writer'].write(frame({'TakenOver': {'label': label}}))
        del tunnels[held_port]
        replaced.append(held)
    if same_session and same_session not in replaced:
        log('port %d taken over by a new connection of the same session' % port)
        del tunnels[port]
        replaced.append(same_session)
    if port:
        tunnels[port] = tunnel
    for held in replaced:
        await close_tunnel(held)

    async def on_connection(conn_reader, conn_writer):
        # A leased port serves whichever tunnel holds its lease now; one without a lease serves only this tunnel.
        current = await tunnel_for(actual_port, key) if key else tunnel
        if current is None or current['writer'].is_closing():
            log('connection to port %d closed: no dev session holds it' % actual_port)
            conn_writer.close()
            return
        connection_id = str(uuid.uuid4())
        pending[connection_id] = (conn_reader, conn_writer, current)
        current['connections'].add(conn_writer)
        current['writer'].write(frame({'Connection': connection_id}))
        await asyncio.sleep(PENDING_SECONDS)
        stale = pending.pop(connection_id, None)
        if stale:
            current['connections'].discard(conn_writer)
            stale[1].close()

    try:
        server = await open_listener(port, key, on_connection)
    except OSError as error:
        if tunnels.get(port) is tunnel:
            del tunnels[port]
        writer.write(frame({'Error': 'port %d is not available: %s' % (port, error.strerror)}))
        writer.close()
        return
    actual_port = server.sockets[0].getsockname()[1]
    tunnel['server'] = server
    if port and tunnels.get(port) is not tunnel:
        # Another session took this port over while it was opening.
        await close_tunnel(tunnel)
        return
    tunnels[actual_port] = tunnel
    touch()
    writer.write(frame({'Hello': actual_port}))
    log('tunnel %d open for %s (%s)' % (actual_port, key or '-', label or '-'))
    try:
        await hold(reader, writer)
    finally:
        if tunnels.get(actual_port) is tunnel:
            del tunnels[actual_port]
            log('tunnel %d closed' % actual_port)
        listener = listeners.get(actual_port)
        if listener is None:
            server.close()
        elif actual_port not in tunnels and not listener['closer']:
            listener['closer'] = asyncio.ensure_future(close_when_unused(actual_port, listener))
        touch()
        writer.close()


async def run_presence(reader, writer, owner, label, session, stack):
    presences[id(writer)] = {'owner': owner, 'label': label, 'session': session, 'stack': stack,
                             'since': int(time.time())}
    touch()
    writer.write(frame({'Pong': {'version': VERSION}}))
    try:
        await hold(reader, writer)
    finally:
        presences.pop(id(writer), None)
        touch()
        writer.close()


def live_sessions(stack):
    """One entry per (stack, session) that holds a tunnel or a presence connection, the earliest first."""
    found = {}
    entries = [dict(tunnel, stack=stack_of(tunnel['key'])) for tunnel in tunnels.values()]
    for entry in entries + list(presences.values()):
        if not entry['stack'] or (stack and entry['stack'] != stack):
            continue
        name = (entry['stack'], entry['session'], entry['owner'])
        if name not in found or entry['since'] < found[name]['since']:
            found[name] = {'stack': entry['stack'], 'session': entry['session'], 'owner': entry['owner'],
                           'label': entry['label'], 'since': entry['since']}
    return sorted(found.values(), key=lambda entry: entry['since'])


async def handle(reader, writer):
    try:
        message = await read_message(reader, 10)
    except Exception:
        writer.close()
        return
    if not isinstance(message, dict) or len(message) != 1:
        writer.close()
        return
    # Every control message restarts the idle time, a Ping too: a session that is starting must not find the box
    # stopping before its tunnels and presence connection open.
    touch()
    kind, value = next(iter(message.items()))
    if kind == 'Lease' and isinstance(value, dict):
        await run_tunnel(reader, writer, int(value.get('port') or 0), str(value.get('key') or ''),
                         str(value.get('owner') or ''), str(value.get('label') or ''),
                         str(value.get('session') or ''), value.get('takeOver') is True)
    elif kind == 'Hello':
        await run_tunnel(reader, writer, int(value or 0), '', '', '', '', False)
    elif kind == 'Presence' and isinstance(value, dict):
        await run_presence(reader, writer, str(value.get('owner') or ''), str(value.get('label') or ''),
                           str(value.get('session') or ''), str(value.get('stack') or ''))
    elif kind == 'Sessions':
        stack = str(value.get('stack') or '') if isinstance(value, dict) else ''
        writer.write(frame({'Sessions': live_sessions(stack)}))
        await writer.drain()
        writer.close()
    elif kind == 'Ping':
        writer.write(frame({'Pong': {'version': VERSION}}))
        await writer.drain()
        writer.close()
    elif kind == 'Accept':
        entry = pending.pop(value, None)
        if not entry:
            writer.close()
            return
        conn_reader, conn_writer, tunnel = entry
        if conn_writer not in tunnel['connections']:
            conn_writer.close()
            writer.close()
            return
        tunnel['connections'].add(writer)
        try:
            await asyncio.gather(pipe(reader, conn_writer), pipe(conn_reader, writer))
        finally:
            tunnel['connections'].discard(conn_writer)
            tunnel['connections'].discard(writer)
    else:
        writer.close()


async def stop_when_idle():
    while True:
        await asyncio.sleep(min(30, max(1, IDLE_SECONDS / 4)))
        if client_count() == 0 and time.monotonic() - idle_since >= IDLE_SECONDS:
            log('no dev session for %d s, stopping the box' % IDLE_SECONDS)
            subprocess.call(SHUTDOWN_COMMAND, shell=True)
            touch()


async def main():
    server = await asyncio.start_server(handle, CONTROL_HOST, CONTROL_PORT, reuse_address=True)
    asyncio.ensure_future(stop_when_idle())
    log('ready (version %d), tunnels on %s, idle stop after %d s' % (VERSION, TUNNEL_HOST, IDLE_SECONDS))
    async with server:
        await server.serve_forever()


asyncio.run(main())
`;
