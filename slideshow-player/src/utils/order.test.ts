import { describe, expect, it } from 'vitest';
import { orderItems } from './order';

describe('orderItems', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('keeps the saved order in forward mode without mutating the input', () => {
    const result = orderItems(items, 'forward');

    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });

  it('reverses the saved order', () => {
    expect(orderItems(items, 'reverse')).toEqual(['d', 'c', 'b', 'a']);
  });

  it('uses Fisher-Yates ordering for random mode', () => {
    const values = [0.1, 0.6, 0.2];
    let valueIndex = 0;

    expect(orderItems(items, 'random', () => values[valueIndex++])).toEqual([
      'c',
      'd',
      'b',
      'a',
    ]);
  });
});
