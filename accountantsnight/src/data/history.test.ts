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

  it('configures the requested major and minor timeline years', () => {
    const timelineItems = historyItems.filter(({ timeline }) => timeline);

    expect(timelineItems.map(({ year }) => year)).toEqual([
      '1976',
      '1979',
      '1981',
      '1984',
      '1996',
      '1997',
      '2000',
      '2005',
      '2013',
      '2017',
    ]);
    expect(
      timelineItems.filter(({ timeline }) => timeline?.prominence === 'major').map(({ year }) => year),
    ).toEqual(['1976', '1979', '1981', '1984']);
  });

  it('groups both 1984 titles without removing the source description', () => {
    const item = historyItems.find(({ year }) => year === '1984');

    expect(item?.timeline?.titles).toEqual(['회계연구소 설립', '대학원 박사과정 개설']);
    expect(item?.description).toContain('대학원 박사과정 개설');
  });
});
