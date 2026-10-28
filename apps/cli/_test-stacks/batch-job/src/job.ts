import { statfsSync } from 'node:fs';

// The canary reads both lines: the queue message, then the root file system's size in KB.
const root = statfsSync('/');
console.log(`batch-canary-ok ${process.env.STP_TRIGGER_EVENT_DATA ?? ''}`);
console.log(`rootfs ${Math.floor((root.blocks * root.bsize) / 1024)}`);
