import { queryGeneric } from 'convex/server';

export const ping = queryGeneric({
  args: {},
  handler: async () => 'pong'
});
