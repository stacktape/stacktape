import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  checks: defineTable({
    name: v.string(),
    passed: v.boolean()
  })
});
