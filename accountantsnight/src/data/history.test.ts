import { describe, expect, it } from 'vitest';
import { historyItems } from './history';

describe('historyItems', () => {
  it('keeps all eleven milestones in chronological order', () => {
    expect(historyItems.map(({ year }) => year)).toEqual([
      '1976',
      '1979',
      '1981',
      '1984',
      '1986',
      '1996',
      '1997',
      '2000',
      '2005',
      '2013',
      '2017',
    ]);
  });

  it('marks only the four major milestones as featured', () => {
    expect(historyItems.filter(({ featured }) => featured).map(({ year }) => year)).toEqual([
      '1976',
      '1981',
      '1984',
      '2017',
    ]);
  });
});
