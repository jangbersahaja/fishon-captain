import { describe, it, expect, beforeEach } from 'vitest';
import { setCharterFormAnalyticsListener, registerLazyGroup, trackLazyComponentLoad, type AnalyticsEvent } from '../analytics';

describe('lazy group tracking', () => {
  const events: AnalyticsEvent[] = [];
  beforeEach(() => {
    events.length = 0;
    setCharterFormAnalyticsListener((e) => events.push(e));
  });

  it('emits lazy_component_loaded for each component and preview_ready when all done', () => {
    registerLazyGroup('g1', ['A', 'B']);
    trackLazyComponentLoad('g1', 'A', 12);
    trackLazyComponentLoad('g1', 'B', 8);

    const lazy = events.filter(e => e.type === 'lazy_component_loaded');
    expect(lazy.map(e => e.name).sort()).toEqual(['A','B']);
    const ready = events.find(e => e.type === 'preview_ready');
    expect(ready).toBeTruthy();
  if (!ready) throw new Error('preview_ready not emitted');
  expect(ready.group).toBe('g1');
  expect(ready.names.sort()).toEqual(['A','B']);
  });

  it('is idempotent when registering same group twice', () => {
    registerLazyGroup('g2', ['X']);
    registerLazyGroup('g2', ['X']);
    trackLazyComponentLoad('g2', 'X', 5);
    const ready = events.find(e => e.type === 'preview_ready');
    expect(ready).toBeTruthy();
  });

  it('ignores unknown group for loaded component', () => {
    trackLazyComponentLoad('missing', 'Z', 3);
    const ready = events.find(e => e.type === 'preview_ready');
    expect(ready).toBeFalsy();
  });
});
