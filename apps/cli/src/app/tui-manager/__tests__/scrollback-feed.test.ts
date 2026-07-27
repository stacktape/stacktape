import { describe, test, expect, beforeEach } from 'bun:test';
import { scrollbackFeed, type ScrollbackItem } from '../scrollback-feed';

const messageItem = (text: string): ScrollbackItem => ({ kind: 'message', type: 'info', text });

beforeEach(() => {
  scrollbackFeed.reset();
});

describe('ScrollbackFeed', () => {
  test('drops items while disabled', () => {
    scrollbackFeed.push(messageItem('dropped'));
    expect(scrollbackFeed.drainPending()).toEqual([]);
  });

  test('queues items pushed before a consumer attaches, drains them on attach', () => {
    scrollbackFeed.enable();
    scrollbackFeed.push(messageItem('one'));
    scrollbackFeed.push(messageItem('two'));

    const received: ScrollbackItem[] = [];
    scrollbackFeed.setConsumer((item) => received.push(item));

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual(messageItem('one'));
    expect(scrollbackFeed.drainPending()).toEqual([]);
  });

  test('delivers items directly to an attached consumer', () => {
    scrollbackFeed.enable();
    const received: ScrollbackItem[] = [];
    scrollbackFeed.setConsumer((item) => received.push(item));

    scrollbackFeed.push(messageItem('live'));

    expect(received).toEqual([messageItem('live')]);
  });

  test('queues again after the consumer detaches', () => {
    scrollbackFeed.enable();
    const detach = scrollbackFeed.setConsumer(() => {});
    detach();

    scrollbackFeed.push(messageItem('late'));

    expect(scrollbackFeed.hasConsumer).toBe(false);
    expect(scrollbackFeed.drainPending()).toEqual([messageItem('late')]);
  });

  test('emits each phase header only once', () => {
    scrollbackFeed.enable();
    scrollbackFeed.pushPhaseHeaderIfNeeded('INITIALIZE', 'Initialize');
    scrollbackFeed.pushPhaseHeaderIfNeeded('INITIALIZE', 'Initialize');
    scrollbackFeed.pushPhaseHeaderIfNeeded('BUILD_AND_PACKAGE', 'Build & Package');

    const pending = scrollbackFeed.drainPending();
    expect(pending).toEqual([
      { kind: 'phase-header', name: 'Initialize' },
      { kind: 'phase-header', name: 'Build & Package' }
    ]);
  });
});
