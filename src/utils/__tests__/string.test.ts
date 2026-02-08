import { describe, it, expect } from 'vitest';
import { truncate } from '../string';

describe('truncate', () => {
  it('should return an empty string if text is undefined', () => {
    expect(truncate(undefined, 10)).toBe('');
  });

  it('should return an empty string if text is empty', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('should return the full string if length is less than or equal to maxLength', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should truncate and add default suffix if length exceeds maxLength', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('should truncate and add custom suffix if provided', () => {
    expect(truncate('Hello World', 5, ' (cont.)')).toBe('Hello (cont.)');
  });

  it('should handle very small maxLength', () => {
    expect(truncate('Hello', 0)).toBe('...');
    expect(truncate('Hello', 1)).toBe('H...');
  });
});
