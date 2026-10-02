import type { OrderMode } from '../types';

export type RandomSource = () => number;

export function orderItems<T>(
  items: readonly T[],
  mode: OrderMode,
  random: RandomSource = Math.random,
): T[] {
  const ordered = [...items];

  if (mode === 'reverse') {
    return ordered.reverse();
  }

  if (mode === 'random') {
    for (let index = ordered.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [ordered[index], ordered[swapIndex]] = [
        ordered[swapIndex],
        ordered[index],
      ];
    }
  }

  return ordered;
}
