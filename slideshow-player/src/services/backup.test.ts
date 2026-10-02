import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SlideshowProject, type StoredSlide } from '../types';
import { createProjectBackup, makeBackupFileName, parseProjectBackup } from './backup';

const project: SlideshowProject = {
  id: 'project',
  name: '행사/자료',
  createdAt: 1,
  updatedAt: 1,
};

const slide: StoredSlide = {
  id: 'slide',
  projectId: project.id,
  name: 'photo.png',
  blob: new Blob(['image'], { type: 'image/png' }),
  sourceType: 'image',
  duration: 5,
  transition: 'crossfade',
  transitionDuration: 0.8,
  position: 0,
  createdAt: 1,
};

describe('Frameflow backup', () => {
  it('round trips project media and settings', async () => {
    const backup = await createProjectBackup(project, [slide], [], DEFAULT_SETTINGS);
    const restored = await parseProjectBackup(backup);

    expect(restored.name).toBe(project.name);
    expect(restored.slides).toHaveLength(1);
    expect(restored.slides[0].blob.type).toBe('image/png');
    expect(await restored.slides[0].blob.text()).toBe('image');
    expect(restored.settings.videoVolume).toBe(0.8);
  });

  it('creates a safe dated filename', () => {
    expect(makeBackupFileName(project.name)).toMatch(/^행사-자료-\d{4}-\d{2}-\d{2}\.frameflow$/);
  });

  it('rejects unrelated files', async () => {
    await expect(parseProjectBackup(new Blob(['{}']))).rejects.toThrow('지원하지 않거나 손상된');
  });
});
