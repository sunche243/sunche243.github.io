export type TransitionType =
  | 'random-mix'
  | 'crossfade'
  | 'fade-black'
  | 'fade-white'
  | 'slide-left'
  | 'zoom'
  | 'none';

export type OrderMode = 'forward' | 'random' | 'reverse';
export type FitMode = 'contain' | 'cover';

export interface SlideshowProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredSlide {
  id: string;
  projectId: string;
  name: string;
  blob: Blob;
  sourceType: 'image' | 'pdf-page' | 'video';
  pageNumber?: number;
  pageCount?: number;
  mediaDuration?: number;
  duration: number | null;
  transition: TransitionType | null;
  transitionDuration: number | null;
  position: number;
  createdAt: number;
}

export interface StoredAudioTrack {
  id: string;
  projectId: string;
  name: string;
  blob: Blob;
  mimeType: string;
  size: number;
  position: number;
  updatedAt: number;
}

export interface StorageInfo {
  usage: number | null;
  quota: number | null;
  persistent: boolean | null;
}

export interface SlideView extends StoredSlide {
  url: string;
}

export interface PlayerSettings {
  defaultDuration: number;
  transition: TransitionType;
  transitionDuration: number;
  orderMode: OrderMode;
  fitMode: FitMode;
  loop: boolean;
  background: string;
  musicVolume: number;
  musicFadeIn: number;
  musicFadeOut: number;
  videoVolume: number;
  muteVideoWhenMusic: boolean;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  defaultDuration: 6,
  transition: 'crossfade',
  transitionDuration: 0.8,
  orderMode: 'forward',
  fitMode: 'contain',
  loop: true,
  background: '#050505',
  musicVolume: 0.65,
  musicFadeIn: 2,
  musicFadeOut: 2,
  videoVolume: 0.8,
  muteVideoWhenMusic: true,
};
