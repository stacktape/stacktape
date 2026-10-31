import { expect, test } from 'bun:test';
import {
  collectProcessTree,
  decodeProcNetAddress,
  type PortListener,
  parseLsofListeners,
  parseProcNetListeners,
  parseWindowsInspection,
  resolveLoopbackRoute
} from '../port-owners';

const own = new Set([10, 11]);
const OTHER = 99;

// Which program a loopback request reaches decides whether a dev server is ready. The r2bd2 row is the Windows socket
// table observed when Shop's frontend URL returned another program's JSON.
test.each<[string, PortListener[], ('127.0.0.1' | '::1')[], ReturnType<typeof resolveLoopbackRoute>]>([
  [
    'r2bd2: the server on :: while another program holds 127.0.0.1 and ::1',
    [
      { address: '::', pid: 11 },
      { address: '127.0.0.1', pid: OTHER },
      { address: '::1', pid: OTHER }
    ],
    ['127.0.0.1', '::1'],
    {
      state: 'taken',
      owners: [
        { host: '127.0.0.1', pid: OTHER },
        { host: '::1', pid: OTHER }
      ]
    }
  ],
  [
    'the server on 127.0.0.1 while another program holds ::1',
    [
      { address: '127.0.0.1', pid: 10 },
      { address: '::1', pid: OTHER }
    ],
    ['127.0.0.1', '::1'],
    { state: 'own', host: '127.0.0.1' }
  ],
  [
    'the server on :: (dual-stack) while another program holds ::1',
    [
      { address: '::', pid: 11 },
      { address: '::1', pid: OTHER }
    ],
    ['127.0.0.1', '::1'],
    { state: 'own', host: '127.0.0.1' }
  ],
  [
    'the server on ::1 only while another program holds 127.0.0.1',
    [
      { address: '::1', pid: 11 },
      { address: '127.0.0.1', pid: OTHER }
    ],
    ['127.0.0.1', '::1'],
    { state: 'own', host: '::1' }
  ],
  [
    'only another program on 127.0.0.1 before the server listens',
    [{ address: '127.0.0.1', pid: OTHER }],
    ['127.0.0.1'],
    { state: 'pending' }
  ],
  [
    'another program on 0.0.0.0 and :: whose owner the system does not name',
    [{ address: '0.0.0.0' }, { address: '::' }],
    ['127.0.0.1', '::1'],
    {
      state: 'taken',
      owners: [
        { host: '127.0.0.1', pid: undefined },
        { host: '::1', pid: undefined }
      ]
    }
  ]
])('%s', (_name, listeners, acceptingHosts, expected) => {
  expect(resolveLoopbackRoute({ listeners, ownPids: own, acceptingHosts })).toEqual(expected);
});

test('the process tree follows parents from the root and ignores everything else', () => {
  const tree = collectProcessTree(10, [
    [10, 1],
    [11, 10],
    [12, 11],
    [13, 1],
    [14, 13]
  ]);
  expect([...tree].sort()).toEqual([10, 11, 12]);
});

test('Windows, macOS and Linux listener tables name addresses the same way', () => {
  const windows = parseWindowsInspection(
    ['L ::1 16004', 'L :: 24176', 'L 127.0.0.1 16004', 'P 24176 3188', 'P 3188 1', 'P 16004 1', ''].join('\r\n'),
    3188
  );
  expect(windows.listeners).toEqual([
    { address: '::1', pid: 16004 },
    { address: '::', pid: 24176 },
    { address: '127.0.0.1', pid: 16004 }
  ]);
  expect([...windows.ownPids].sort()).toEqual([24176, 3188]);

  expect(
    parseLsofListeners(
      ['p501', 'tIPv4', 'n127.0.0.1:3000', 'tIPv6', 'n[::1]:3000', 'p502', 'tIPv6', 'n*:3000'].join('\n')
    )
  ).toEqual([
    { address: '127.0.0.1', pid: 501 },
    { address: '::1', pid: 501 },
    { address: '::', pid: 502 }
  ]);

  const header = '  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode';
  const tcp = `${header}\n   0: 0100007F:0BBB 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 111 1\n   1: 00000000:0BB8 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 222 1\n   2: 0100007F:0BBB 0100007F:9C40 01 00000000:00000000 00:00000000 00000000  1000        0 333 1`;
  expect(parseProcNetListeners(tcp, 3003)).toEqual([{ address: '127.0.0.1', inode: '111' }]);
  expect(decodeProcNetAddress('00000000000000000000000001000000')).toBe('::1');
  expect(decodeProcNetAddress('00000000000000000000000000000000')).toBe('::');
  expect(decodeProcNetAddress('0000000000000000FFFF00000100007F')).toBe('127.0.0.1');
});
