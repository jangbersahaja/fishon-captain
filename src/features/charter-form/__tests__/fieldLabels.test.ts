import { describe, it, expect } from 'vitest';
import { friendlyFieldLabel, FIELD_LABELS } from '../fieldLabels';

describe('friendlyFieldLabel', () => {
  it('returns mapped label when exact key present', () => {
    expect(friendlyFieldLabel('charterName')).toBe(FIELD_LABELS.charterName);
  });
  it('humanizes camelCase fallback', () => {
    expect(friendlyFieldLabel('someCamelField')).toBe('Some Camel Field');
  });
  it('handles dotted path by using last segment', () => {
    expect(friendlyFieldLabel('boat.lengthFeet.extra')).toBe('Extra');
  });
  it('replaces dashes/underscores', () => {
    expect(friendlyFieldLabel('some-field_name')).toBe('Some field name');
  });
});
