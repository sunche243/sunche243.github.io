import type {
  FitMode,
  OrderMode,
  PlayerSettings,
  StorageInfo,
  StoredAudioTrack,
  TransitionType,
} from '../types';
import { TRANSITIONS } from '../constants/transitions';
import { formatFileSize } from '../utils/audio';
import { getStorageLevel } from '../utils/storage';

interface SettingsPanelProps {
  settings: PlayerSettings;
  audioTracks: readonly StoredAudioTrack[];
  audioPreviewingTrackId: string | null;
  problemAudioIds: readonly string[];
  storageInfo: StorageInfo;
  appMediaBytes: number;
  backupBusy: boolean;
  onChange: (settings: PlayerSettings) => void;
  onAudioFiles: (files: File[]) => void;
  onToggleAudioPreview: (trackId: string) => void;
  onMoveAudio: (trackId: string, direction: -1 | 1) => void;
  onRemoveAudio: (trackId: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

const ORDER_OPTIONS: Array<{
  value: OrderMode;
  icon: string;
  label: string;
  description: string;
}> = [
  {
    value: 'forward',
    icon: '1→',
    label: '순서대로',
    description: '정리한 첫 장부터 재생',
  },
  {
    value: 'random',
    icon: '⤨',
    label: '랜덤',
    description: '재생할 때마다 새 순서',
  },
  {
    value: 'reverse',
    icon: '←1',
    label: '뒤에서부터',
    description: '마지막 장부터 역순 재생',
  },
];

export function SettingsPanel({
  settings,
  audioTracks,
  audioPreviewingTrackId,
  problemAudioIds,
  storageInfo,
  appMediaBytes,
  backupBusy,
  onChange,
  onAudioFiles,
  onToggleAudioPreview,
  onMoveAudio,
  onRemoveAudio,
  onExportBackup,
  onImportBackup,
}: SettingsPanelProps) {
  const update = <Key extends keyof PlayerSettings>(
    key: Key,
    value: PlayerSettings[Key],
  ) => onChange({ ...settings, [key]: value });
  const storageLevel = getStorageLevel(storageInfo);
  const storagePercent =
    storageInfo.quota && storageInfo.usage !== null
      ? Math.min(100, (storageInfo.usage / storageInfo.quota) * 100)
      : null;

  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PLAYBACK SETTINGS</span>
          <h2 id="settings-title">재생 방식을 정해보세요</h2>
        </div>
        <p>변경한 설정은 이 브라우저에 자동으로 저장됩니다.</p>
      </div>

      <div className="settings-grid">
        <fieldset className="setting-card setting-card--wide">
          <legend>재생 순서</legend>
          <p className="setting-help">슬라이드가 나타나는 순서를 선택합니다.</p>
          <div className="order-options">
            {ORDER_OPTIONS.map((option) => (
              <label
                className={`order-option ${
                  settings.orderMode === option.value ? 'is-selected' : ''
                }`}
                key={option.value}
              >
                <input
                  type="radio"
                  name="order-mode"
                  value={option.value}
                  checked={settings.orderMode === option.value}
                  onChange={() => update('orderMode', option.value)}
                />
                <span className="order-option__icon" aria-hidden="true">
                  {option.icon}
                </span>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="radio-dot" aria-hidden="true" />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="setting-card setting-card--wide audio-setting">
          <legend>
            배경 음악 목록 <span className="loop-badge">순서대로 무한 반복</span>
          </legend>
          <p className="setting-help">
            여러 곡을 등록하면 위에서부터 재생되고, 마지막 곡 뒤에 다시 처음부터 반복됩니다.
          </p>

          {audioTracks.length > 0 ? (
            <div className="audio-playlist">
              {audioTracks.map((track, index) => (
                <div className="audio-track" key={track.id}>
                  <span className="audio-track__number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="audio-track__icon" aria-hidden="true">♫</span>
                  <span className="audio-track__info">
                    <strong>{track.name}</strong>
                    <small className={problemAudioIds.includes(track.id) ? 'media-problem-text' : ''}>
                      {problemAudioIds.includes(track.id)
                        ? '⚠ 재생 확인 필요'
                        : `${formatFileSize(track.size)} · 이 브라우저에 저장됨`}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="audio-preview-button"
                    onClick={() => onToggleAudioPreview(track.id)}
                  >
                    {audioPreviewingTrackId === track.id ? '정지' : '듣기'}
                  </button>
                  <span className="audio-track__move">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveAudio(track.id, -1)}
                      aria-label={`${track.name} 위로 이동`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === audioTracks.length - 1}
                      onClick={() => onMoveAudio(track.id, 1)}
                      aria-label={`${track.name} 아래로 이동`}
                    >
                      ↓
                    </button>
                  </span>
                  <button
                    type="button"
                    className="audio-remove-button"
                    onClick={() => onRemoveAudio(track.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}

              <label className="audio-add-button">
                <input
                  type="file"
                  multiple
                  accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length > 0) onAudioFiles(files);
                    event.target.value = '';
                  }}
                />
                + 음악 더 추가
              </label>
            </div>
          ) : (
            <label className="audio-empty">
              <input
                type="file"
                multiple
                accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) onAudioFiles(files);
                  event.target.value = '';
                }}
              />
              <span className="audio-empty__icon" aria-hidden="true">♫</span>
              <span>
                <strong>배경 음악 선택</strong>
                <small>MP3, M4A, WAV 파일을 사용할 수 있어요</small>
              </span>
              <em>파일 선택</em>
            </label>
          )}

          <div className="audio-controls-grid">
            <div className={`music-volume ${audioTracks.length ? '' : 'is-disabled'}`}>
              <label htmlFor="music-volume">음악 볼륨</label>
              <input
                id="music-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                disabled={audioTracks.length === 0}
                onChange={(event) =>
                  update('musicVolume', Number(event.target.value))
                }
              />
              <output>{Math.round(settings.musicVolume * 100)}%</output>
            </div>
            <div className={`music-volume ${audioTracks.length ? '' : 'is-disabled'}`}>
              <label htmlFor="music-fade-in">시작 페이드</label>
              <input
                id="music-fade-in"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={settings.musicFadeIn}
                disabled={audioTracks.length === 0}
                onChange={(event) => update('musicFadeIn', Number(event.target.value))}
              />
              <output>{settings.musicFadeIn.toFixed(1)}초</output>
            </div>
            <div className={`music-volume ${audioTracks.length ? '' : 'is-disabled'}`}>
              <label htmlFor="music-fade-out">종료 페이드</label>
              <input
                id="music-fade-out"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={settings.musicFadeOut}
                disabled={audioTracks.length === 0}
                onChange={(event) => update('musicFadeOut', Number(event.target.value))}
              />
              <output>{settings.musicFadeOut.toFixed(1)}초</output>
            </div>
          </div>
        </fieldset>

        <fieldset className="setting-card video-setting">
          <legend>영상 소리</legend>
          <p className="setting-help">영상 파일 자체의 음량과 배경 음악이 겹칠 때의 동작입니다.</p>
          <div className="music-volume">
            <label htmlFor="video-volume">영상 음량</label>
            <input
              id="video-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.videoVolume}
              onChange={(event) => update('videoVolume', Number(event.target.value))}
            />
            <output>{Math.round(settings.videoVolume * 100)}%</output>
          </div>
          <label className="toggle-row">
            <span>
              <strong>배경 음악 재생 중 영상 음소거</strong>
              <small>끄면 영상과 배경 음악이 함께 들립니다.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.muteVideoWhenMusic}
              onChange={(event) => update('muteVideoWhenMusic', event.target.checked)}
            />
          </label>
        </fieldset>

        <fieldset className={`setting-card setting-card--wide storage-setting storage-setting--${storageLevel}`}>
          <legend>브라우저 저장공간</legend>
          <p className="setting-help">
            사진·PDF·영상·음악은 서버가 아닌 현재 브라우저의 IndexedDB에 저장됩니다.
          </p>
          <div className="storage-summary">
            <div>
              <span>이 슬라이드쇼 자료</span>
              <strong>{formatFileSize(appMediaBytes)}</strong>
            </div>
            <div>
              <span>현재 사이트 전체 사용량</span>
              <strong>{storageInfo.usage === null ? '확인 불가' : formatFileSize(storageInfo.usage)}</strong>
            </div>
            <div>
              <span>현재 사이트에 허용된 용량</span>
              <strong>{storageInfo.quota === null ? '브라우저별 자동 관리' : formatFileSize(storageInfo.quota)}</strong>
            </div>
          </div>
          {storagePercent !== null && (
            <div className="storage-meter" aria-label={`저장공간 ${storagePercent.toFixed(1)}% 사용`}>
              <span style={{ width: `${storagePercent}%` }} />
            </div>
          )}
          <p className="storage-message">
            {storageLevel === 'critical'
              ? '저장공간이 거의 찼습니다. 새 파일을 추가하기 전에 불필요한 자료를 삭제해주세요.'
              : storageLevel === 'warning'
                ? '저장공간 여유가 줄고 있습니다. 큰 영상이나 음악을 추가할 때 주의해주세요.'
                : '저장공간에 여유가 있습니다. 한도에 가까워지면 파일 추가 전에 알려드립니다.'}
          </p>
        </fieldset>

        <fieldset className="setting-card backup-setting">
          <legend>백업 및 복원</legend>
          <p className="setting-help">
            현재 슬라이드쇼의 미디어와 설정을 한 파일로 보관합니다. 복원하면 기존 자료를 덮어쓰지 않고 새 슬라이드쇼로 추가됩니다.
          </p>
          <div className="backup-actions">
            <button type="button" disabled={backupBusy} onClick={onExportBackup}>
              {backupBusy ? '처리 중…' : '백업 파일 저장'}
            </button>
            <label className={backupBusy ? 'is-disabled' : ''}>
              <input
                type="file"
                accept=".frameflow,application/x-frameflow+json,application/json"
                disabled={backupBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportBackup(file);
                  event.target.value = '';
                }}
              />
              백업 파일 불러오기
            </label>
          </div>
          <small className="backup-note">큰 영상이 포함된 백업은 생성과 복원에 시간이 걸릴 수 있습니다.</small>
        </fieldset>

        <fieldset className="setting-card">
          <legend>한 장당 표시 시간</legend>
          <p className="setting-help">개별 설정이 없는 슬라이드에 적용됩니다.</p>
          <div className="range-row">
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={settings.defaultDuration}
              onChange={(event) =>
                update('defaultDuration', Number(event.target.value))
              }
              aria-label="기본 표시 시간"
            />
            <output>{settings.defaultDuration}초</output>
          </div>
        </fieldset>

        <fieldset className="setting-card">
          <legend>전환 효과</legend>
          <p className="setting-help">
            다음 장으로 넘어갈 때 사용할 움직임입니다. 랜덤 믹스는 같은 효과가 연속되지 않게 섞습니다.
          </p>
          <label className="select-field">
            <span className="sr-only">전환 효과 선택</span>
            <select
              value={settings.transition}
              onChange={(event) =>
                update('transition', event.target.value as TransitionType)
              }
            >
              {TRANSITIONS.map((transition) => (
                <option value={transition.value} key={transition.value}>
                  {transition.label}
                </option>
              ))}
            </select>
          </label>
          <div className={`transition-swatch transition-swatch--${settings.transition}`}>
            <span />
            <span />
          </div>
        </fieldset>

        <fieldset className="setting-card">
          <legend>전환 시간</legend>
          <p className="setting-help">짧을수록 빠르고, 길수록 부드럽습니다.</p>
          <div className="range-row">
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={settings.transitionDuration}
              onChange={(event) =>
                update('transitionDuration', Number(event.target.value))
              }
              aria-label="전환 시간"
            />
            <output>{settings.transitionDuration.toFixed(1)}초</output>
          </div>
        </fieldset>

        <fieldset className="setting-card">
          <legend>화면 맞춤</legend>
          <p className="setting-help">원본 비율을 유지해 화면에 표시합니다.</p>
          <div className="segmented-control">
            {(
              [
                ['contain', '전체 보이기'],
                ['cover', '화면 채우기'],
              ] as Array<[FitMode, string]>
            ).map(([value, label]) => (
              <label key={value} className={settings.fitMode === value ? 'is-active' : ''}>
                <input
                  type="radio"
                  name="fit-mode"
                  value={value}
                  checked={settings.fitMode === value}
                  onChange={() => update('fitMode', value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="setting-card setting-card--compact">
          <legend>기타</legend>
          <label className="toggle-row">
            <span>
              <strong>반복 재생</strong>
              <small>마지막 장 뒤에 다시 시작</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.loop}
              onChange={(event) => update('loop', event.target.checked)}
            />
          </label>
          <label className="color-row">
            <span>
              <strong>화면 여백 색상</strong>
              <small>전체 보이기 모드의 배경</small>
            </span>
            <span className="color-picker">
              <input
                type="color"
                value={settings.background}
                onChange={(event) => update('background', event.target.value)}
                aria-label="화면 여백 색상"
              />
              {settings.background.toUpperCase()}
            </span>
          </label>
        </fieldset>
      </div>
    </section>
  );
}
