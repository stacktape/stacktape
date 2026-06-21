import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

export const record = mutationGeneric({
  args: {
    kind: v.string(),
    payload: v.string()
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('events', args);
  }
});

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('events').collect();
  }
});
