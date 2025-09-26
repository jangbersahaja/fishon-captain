import { describe, it, expect } from 'vitest';
import { computeDraftDelta } from '../server/diff';

describe('computeDraftDelta - basic functionality', () => {
  it('returns empty delta for identical objects', () => {
    const draft = { name: 'Test Charter', duration: 4 };
    const result = computeDraftDelta(draft, draft);
    
    expect(result.changed).toEqual({});
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual([]);
    expect(result.unchanged).toEqual(['name', 'duration']);
  });

  it('detects scalar field changes', () => {
    const previous = { name: 'Old Charter', duration: 4, price: 500 };
    const next = { name: 'New Charter', duration: 4, price: 600 };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({ name: 'New Charter', price: 600 });
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual(['name', 'price']);
    expect(result.unchanged).toEqual(['duration']);
  });

  it('detects new fields', () => {
    const previous = { name: 'Charter' };
    const next = { name: 'Charter', description: 'New description' };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({ description: 'New description' });
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual(['description']);
    expect(result.unchanged).toEqual(['name']);
  });

  it('detects removed fields', () => {
    const previous = { name: 'Charter', description: 'Old description' };
    const next = { name: 'Charter' };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({});
    expect(result.removed).toEqual(['description']);
    expect(result.meta.changedTopLevel).toEqual([]);
    expect(result.unchanged).toEqual(['name']);
  });

  it('handles empty to value transitions', () => {
    const previous = { name: '', duration: null, price: undefined };
    const next = { name: 'Charter', duration: 4, price: 500 };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({ name: 'Charter', duration: 4, price: 500 });
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual(['name', 'duration', 'price']);
    expect(result.unchanged).toEqual([]);
  });

  it('handles value to empty transitions', () => {
    const previous = { name: 'Charter', duration: 4, price: 500 };
    const next = { name: '', duration: null, price: undefined };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({});
    expect(result.removed).toEqual(['name', 'duration', 'price']);
    expect(result.meta.changedTopLevel).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });

  it('normalizes empty string, null, and undefined as equivalent', () => {
    const previous = { a: '', b: null, c: undefined };
    const next = { a: null, b: undefined, c: '' };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({});
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual([]);
    expect(result.unchanged).toEqual(['a', 'b', 'c']);
  });

  it('handles primitive arrays', () => {
    const previous = { tags: ['fishing', 'charter'] };
    const next = { tags: ['fishing', 'charter', 'boat'] };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({ tags: ['fishing', 'charter', 'boat'] });
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual(['tags']);
    expect(result.unchanged).toEqual([]);
  });

  it('detects identical primitive arrays', () => {
    const previous = { tags: ['fishing', 'charter'] };
    const next = { tags: ['fishing', 'charter'] };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({});
    expect(result.removed).toEqual([]);
    expect(result.meta.changedTopLevel).toEqual([]);
    expect(result.unchanged).toEqual(['tags']);
  });

  it('treats empty arrays as empty values', () => {
    const previous = { tags: ['fishing'] };
    const next = { tags: [] };
    
    const result = computeDraftDelta(previous, next);
    
    expect(result.changed).toEqual({});
    expect(result.removed).toEqual(['tags']);
    expect(result.meta.changedTopLevel).toEqual([]);
    expect(result.unchanged).toEqual([]);
  });
});