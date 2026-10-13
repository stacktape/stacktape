import { describe, expect, it } from 'bun:test';
import { gapsToList } from './gaps';

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
