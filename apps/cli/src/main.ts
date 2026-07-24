#!/usr/bin/env node

import { v4MachineEventSchema } from '@stacktape/command-contracts';

const event = v4MachineEventSchema.parse({
  sequence: 1,
  timestamp: new Date().toISOString(),
  type: 'workspace.ready',
  version: 1,
  payload: {}
});

process.stdout.write(`${JSON.stringify(event)}\n`);
