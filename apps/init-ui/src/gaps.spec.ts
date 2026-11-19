import { describe, expect, it } from 'bun:test';
import { gapsToList, notesHeading, plainNote } from './gaps';

describe('gapsToList', () => {
  const render = [{ tool: 'render' }];

  it('drops only the generic note the platform alert already makes', () => {
    const gaps = [
      { subject: 'render', message: 'This project has Render deployment config. If an app is already running there…' },
      {
        subject: 'render',
        message: 'We could not work out how to start render. Set the start command in the configuration.'
      },
      { subject: 'api.RMQ_URL', message: 'RMQ_URL points at something we are not creating…' }
    ];
    expect(gapsToList(gaps, render).map((gap) => gap.message)).toEqual([gaps[1]!.message, gaps[2]!.message]);
  });

  it('keeps a specific instruction attached to a tool', () => {
    const gaps = [{ subject: 'cloudflare-workers', message: 'This project uses Cloudflare Workers runtime APIs…' }];
    expect(gapsToList(gaps, [{ tool: 'cloudflare-workers' }])).toEqual(gaps);
  });
});

describe('notes said as what they mean for the deploy', () => {
  it.each([
    [
      {
        subject: 'backend.internalHealthCheck',
        message:
          "Your deployment files check backend's health with curl -f http://localhost:8000/health/, but backend is not packaged from the Dockerfile that command was written for, so it has no health check. Before deploying, add an internalHealthCheck its image can run, or package it from its Dockerfile."
      },
      '`backend` runs without a health check on AWS',
      'deployment files'
    ],
    [
      {
        subject: 'compose.yml:networks.traefik-public',
        message:
          'compose.yml: init did not carry `external` of `networks.traefik-public`. Before deploying, set the Stacktape equivalent, or confirm the app works without it.'
      },
      'The `traefik-public` network from compose.yml is not created',
      'compose.yml'
    ],
    [
      {
        subject: 'compose.yml:services',
        message:
          'compose.yml declares `adminer`, which init did not import from it. Before deploying, check that the configuration has what the app needs from it.'
      },
      '`adminer` from compose.yml is not deployed',
      'compose.yml'
    ],
    [
      {
        subject: 'compose.yml:services',
        message:
          'compose.yml declares `adminer` and `mailcatcher`, which init did not import from it. Before deploying, check that the configuration has what the app needs from them.'
      },
      '`adminer` and `mailcatcher` from compose.yml are not deployed',
      'compose.yml'
    ],
    [
      {
        subject: 'serverless.yml:functions.api',
        message:
          'serverless.yml: init did not carry `reservedConcurrency` of `functions.api`: it would run with other limits, ordering or concurrency than declared. Before deploying, set the Stacktape equivalent, or confirm the app works without it.'
      },
      '`reservedConcurrency` of `functions.api` in serverless.yml is not carried over',
      'serverless.yml'
    ]
  ])('%#', (gap, title, file) => {
    const note = plainNote(gap);
    expect(note.title).toBe(title);
    expect(note.file).toBe(file);
    expect(note.body).not.toContain('init did not');
  });

  it('keeps any other note whole, split after its first sentence', () => {
    const message =
      'SQLite on the attached disk needs its default journal mode. If your code turns on WAL, turn it off: during a deploy the new copy starts before the old one stops.';
    expect(plainNote({ subject: 'localDatabase.journal', message })).toEqual({
      key: 'localDatabase.journal',
      title: 'SQLite on the attached disk needs its default journal mode.',
      body: 'If your code turns on WAL, turn it off: during a deploy the new copy starts before the old one stops.'
    });
  });

  it('names the file when every note is about it', () => {
    const notes = [
      { key: 'a', title: '', body: '', file: 'deployment files' },
      { key: 'b', title: '', body: '', file: 'compose.yml' },
      { key: 'c', title: '', body: '', file: 'compose.yml' }
    ];
    expect(notesHeading(notes)).toBe('3 notes about compose.yml');
    expect(notesHeading([...notes, { key: 'd', title: '', body: '' }])).toBe('4 notes worth a look');
    expect(notesHeading([{ key: 'e', title: '', body: '' }])).toBe('1 note worth a look');
  });
});
