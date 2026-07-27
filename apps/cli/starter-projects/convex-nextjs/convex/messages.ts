import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('messages').withIndex('by_createdAt').order('desc').take(50);
  }
});

export const send = mutation({
  args: {
    body: v.string(),
    author: v.string()
  },
  handler: async (ctx, { body, author }) => {
    await ctx.db.insert('messages', { body, author, createdAt: Date.now() });
  }
});
