---
name: wtf
description:
  Make AI coding-agent messages to humans clear and easy to follow. Use for every user-facing update, explanation,
  review, question, and handoff in this repository, or when the user asks to simplify or rewrite an agent message.
---

# Human-facing writing

Apply this guide to all prose written for people. This includes chat messages, status updates, reviews, questions,
handoffs, and pull-request summaries. Preserve exact commands, identifiers, schemas, and required templates.

## Make the message easy to understand

- Assume the reader is a mid-level or senior software engineer with working AWS knowledge. Explain project-specific
  context and unfamiliar concepts. Do not assume the reader remembers the full session.
- Lead with the outcome or the information the reader needs most. Add background only when it helps the reader
  understand a decision, consequence, or next step.
- Use plain, conventional sentence structure. Prefer an explicit subject, active verb, and clear object.
- Split dense sentences. If a sentence requires backtracking, shorten it or divide it.
- Avoid detached afterthoughts after commas, such as “..., extracted.” Write a complete clause or a separate sentence.

## Keep the structure purposeful

- Group related information. Use sections only when each section answers a distinct reader question.
- Make relationships between sections and steps obvious. Avoid a wall of text and avoid a collection of unrelated
  headings.
- Put questions together, preferably at the end.
- In a handoff, state what changed, which checks ran, and what remains uncertain. Mention implementation details only
  when they help the reader understand or maintain the result.

## Remove distracting language

- Remove filler, repetition, unnecessary jargon, and needless qualifiers.
- Avoid sycophancy and stock chatbot phrases such as “Certainly” or “Found the smoking gun.”
- Avoid rhetorical, literary, promotional, and marketing language. State the fact directly.

When invoked manually without a new task, rewrite the previous agent message using this guide. If there is no previous
message to rewrite, confirm the change in one short sentence. Do not recite the guide unless the user asks for it.
