/** The dev box relay daemon (Python 3.9 on AL2023), installed by the NAT instance boot script of a dev stack. */
export const DEV_BOX_RELAY_SOURCE = String.raw`#!/usr/bin/env python3
"""Stacktape dev box relay: a bore-compatible TCP relay server (protocol of github.com/ekzhang/bore 0.5).

The control port listens on loopback only, so a laptop reaches it only through an SSM port-forwarding session
(IAM-authenticated). Tunnel ports listen on the dev box's static private IP, where the security group admits only
the VPC. The state file tells the heartbeat whether any laptop is connected (idle scale-to-zero reads it).
"""
import asyncio
import json
import os
import socket
import sys
import time
import uuid

CONTROL = ('127.0.0.1', 7835)
TUNNEL_HOST = open('/etc/stacktape-devbox/tunnel-host').read().strip() if len(sys.argv) < 2 else sys.argv[1]
STATE_FILE = os.environ.get('STACKTAPE_DEVBOX_STATE_FILE', '/run/stacktape-devbox/state.json')
PENDING_TIMEOUT = 10

pending = {}
clients = set()
tunnels = {}
last_active = time.time()


def write_state():
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE + '.tmp', 'w') as f:
        json.dump({'clients': len(clients), 'lastActiveAt': int(last_active)}, f)
    os.replace(STATE_FILE + '.tmp', STATE_FILE)


async def recv(reader, timeout):
    data = await asyncio.wait_for(reader.readuntil(b'\0'), timeout)
    return json.loads(data[:-1].decode())


def frame(message):
    return json.dumps(message).encode() + b'\0'


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


async def run_tunnel(port, reader, writer):
    global last_active

    async def on_connection(conn_reader, conn_writer):
        connection_id = str(uuid.uuid4())
        pending[connection_id] = (conn_reader, conn_writer)
        writer.write(frame({'Connection': connection_id}))
        await asyncio.sleep(PENDING_TIMEOUT)
        stale = pending.pop(connection_id, None)
        if stale:
            stale[1].close()

    # A laptop that lost its SSM session reconnects before the old session's agent-side sockets close. The control
    # port is reachable only through SSM, so a new Hello for a held port replaces the stale tunnel.
    stale_tunnel = tunnels.get(port) if port else None
    if stale_tunnel:
        stale_tunnel['server'].close()
        stale_tunnel['writer'].close()
        await stale_tunnel['server'].wait_closed()
    try:
        server = await asyncio.start_server(on_connection, TUNNEL_HOST, port, reuse_address=True)
    except OSError as error:
        writer.write(frame({'Error': 'port %d is not available: %s' % (port, error.strerror)}))
        writer.close()
        return
    actual_port = server.sockets[0].getsockname()[1]
    tunnels[actual_port] = {'server': server, 'writer': writer}
    writer.write(frame({'Hello': actual_port}))
    clients.add(writer)
    last_active = time.time()
    write_state()
    closed = asyncio.ensure_future(reader.read())
    try:
        while not closed.done():
            writer.write(frame('Heartbeat'))
            await writer.drain()
            last_active = time.time()
            await asyncio.wait([closed], timeout=0.5)
    except Exception:
        pass
    finally:
        closed.cancel()
        server.close()
        if tunnels.get(actual_port, {}).get('writer') is writer:
            del tunnels[actual_port]
        clients.discard(writer)
        last_active = time.time()
        write_state()
        writer.close()


async def handle(reader, writer):
    try:
        message = await recv(reader, 10)
    except Exception:
        writer.close()
        return
    if isinstance(message, dict) and 'Hello' in message:
        await run_tunnel(int(message['Hello']), reader, writer)
    elif isinstance(message, dict) and 'Accept' in message:
        entry = pending.pop(message['Accept'], None)
        if not entry:
            writer.close()
            return
        await asyncio.gather(pipe(reader, entry[1]), pipe(entry[0], writer))
    else:
        writer.close()


async def refresh_state():
    while True:
        write_state()
        await asyncio.sleep(10)


def wait_for_tunnel_host():
    # The static interface arrives after boot; tunnels can only listen once its address is configured.
    while True:
        probe = socket.socket()
        try:
            probe.bind((TUNNEL_HOST, 0))
            return
        except OSError:
            time.sleep(0.5)
        finally:
            probe.close()


async def main():
    wait_for_tunnel_host()
    write_state()
    server = await asyncio.start_server(handle, CONTROL[0], CONTROL[1], reuse_address=True)
    asyncio.ensure_future(refresh_state())
    print('stacktape-devbox: relay ready, tunnels on %s' % TUNNEL_HOST, flush=True)
    async with server:
        await server.serve_forever()


asyncio.run(main())
`;
