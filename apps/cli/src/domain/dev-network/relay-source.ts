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
 *   lease. A port held by a live tunnel of another `stacktape dev` process is refused with `{"Refused": {...}}`, naming
 *   the holder, so two sessions of one stage never take the port from each other in turn. The same process takes its
 *   port over, because a laptop that lost its SSM session comes back before the old session's sockets close. With
 *   `takeOver`, any holder is replaced; it is told `{"TakenOver": {"label"}}` first and must not ask for the port again.
 * - `{"Presence": {"owner", "label", "session", "stack"}}` keeps the box awake while a dev session runs.
 * - `{"Sessions": {"stack"}}` answers the live sessions of one stack (all stacks when it is empty) and closes.
 * - `{"Ping": null}` answers `{"Pong": {"version"}}` and closes: the readiness probe.
 * - `{"Hello": port}` and `{"Accept": id}` are bore's own messages.
 *
 * The box stops itself: once no tunnel and no presence connection has been open for the idle time, the relay runs the
 * shutdown command, and `InstanceInitiatedShutdownBehavior: stop` turns that into an EC2 stop.
 */
export const DEV_BOX_RELAY_VERSION = 2;

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

pending = {}
tunnels = {}
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
    tunnel['server'].close()
    tunnel['writer'].close()
    await tunnel['server'].wait_closed()


async def run_tunnel(reader, writer, port, key, owner, label, session, take_over):
    holder = tunnels.get(port) if port else None
    if holder:
        same_session = holder['owner'] == owner and holder['session'] == session
        if not same_session and not take_over:
            writer.write(frame({'Refused': {'port': port, 'key': holder['key'], 'label': holder['label'],
                                            'since': holder['since']}}))
            writer.close()
            return
        if same_session:
            log('port %d taken over by a new connection of the same session' % port)
        else:
            log('port %d taken over by %s' % (port, label or '-'))
            holder['writer'].write(frame({'TakenOver': {'label': label}}))
        del tunnels[port]
        await close_tunnel(holder)

    async def on_connection(conn_reader, conn_writer):
        connection_id = str(uuid.uuid4())
        pending[connection_id] = (conn_reader, conn_writer)
        writer.write(frame({'Connection': connection_id}))
        await asyncio.sleep(PENDING_SECONDS)
        stale = pending.pop(connection_id, None)
        if stale:
            stale[1].close()

    try:
        server = await asyncio.start_server(on_connection, TUNNEL_HOST, port, reuse_address=True)
    except OSError as error:
        writer.write(frame({'Error': 'port %d is not available: %s' % (port, error.strerror)}))
        writer.close()
        return
    actual_port = server.sockets[0].getsockname()[1]
    tunnel = {'server': server, 'writer': writer, 'owner': owner, 'key': key, 'label': label,
              'session': session, 'since': int(time.time())}
    tunnels[actual_port] = tunnel
    touch()
    writer.write(frame({'Hello': actual_port}))
    log('tunnel %d open for %s (%s)' % (actual_port, key or '-', label or '-'))
    try:
        await hold(reader, writer)
    finally:
        server.close()
        if tunnels.get(actual_port) is tunnel:
            del tunnels[actual_port]
            log('tunnel %d closed' % actual_port)
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
    entries = [dict(tunnel, stack=tunnel['key'].split('/')[0]) for tunnel in tunnels.values()]
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
        await asyncio.gather(pipe(reader, entry[1]), pipe(entry[0], writer))
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
