import { describe, expect, it } from 'vitest';
import { detectDarkComponents } from './floorPlan';

describe('floor plan detection', () => {
  it('finds separate dark furniture blocks in an image', () => {
    const width = 40; const height = 30;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    const darken = (startX: number, startY: number) => {
      for (let y = startY; y < startY + 5; y += 1) for (let x = startX; x < startX + 5; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 20; data[offset + 1] = 20; data[offset + 2] = 20; data[offset + 3] = 255;
      }
    };
    darken(4, 4); darken(24, 18);
    expect(detectDarkComponents(data, width, height)).toHaveLength(2);
  });
});
