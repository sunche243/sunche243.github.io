import { useEffect, useMemo, useState } from 'react';
import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { isFirebaseConfigured, uploadPhotos, type UploadProgress } from '../services/firebaseUpload';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

interface PreviewFile {
  file: File;
  previewUrl: string | null;
}

export function PhotoUpload() {
  const configured = isFirebaseConfigured();
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedFiles = useMemo(() => files.map((item) => item.file), [files]);

  useEffect(
    () => () => {
      files.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    },
    [files],
  );

  useEffect(() => {
    if (!sheetOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !uploading) setSheetOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sheetOpen, uploading]);

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    const valid: PreviewFile[] = [];
    const errors: string[] = [];

    for (const file of nextFiles.slice(0, MAX_FILES)) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: 이미지 파일만 업로드할 수 있습니다.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 15MB 이하 파일만 업로드할 수 있습니다.`);
        continue;
      }
      const canPreview = file.type !== 'image/heic' && file.type !== 'image/heif';
      valid.push({
        file,
        previewUrl: canPreview ? URL.createObjectURL(file) : null,
      });
    }

    setFiles(valid);
    setMessage(errors[0] ?? '');
  }

  function closeSheet() {
    if (!uploading) setSheetOpen(false);
  }

  async function submit() {
    if (!selectedFiles.length) {
      setMessage('업로드할 사진을 선택해주세요.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      await uploadPhotos(selectedFiles, setProgress);
      setMessage('사진이 성공적으로 전달되었습니다. 감사합니다.');
      setFiles([]);
      setProgress(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '사진 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <RevealSection className="section--ivory photo-upload" label="사진 업로드">
      <div className="section-inner">
        <SectionHeader eyebrow="SHARE YOUR MOMENT" title="우리의 순간을 남겨주세요" />
        <p className="photo-upload__intro">
          함께한 순간을 사진으로 남겨
          <br />
          우리의 50년을 더욱 빛내주세요.
        </p>
        <button className="button button--outline-dark photo-upload__cta" type="button" onClick={() => setSheetOpen(true)}>
          사진 남기기
        </button>
      </div>
      {sheetOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeSheet}>
          <div
            className="bottom-sheet photo-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="photo-sheet__header">
              <p>SHARE YOUR MOMENT</p>
              <h3 id="photo-sheet-title">사진 남기기</h3>
            </div>
            {!configured ? (
              <div className="empty-state empty-state--compact">
                <p>사진 업로드 기능을 준비하고 있습니다.</p>
              </div>
            ) : (
              <div className="upload-panel">
                <label className="upload-drop">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={onSelect}
                    disabled={uploading}
                  />
                  <strong>사진 선택</strong>
                  <span>최대 10장 · 파일당 15MB</span>
                </label>
                {files.length ? (
                  <div className="preview-grid" aria-label="선택한 사진 미리보기">
                    {files.map((item) => (
                      <figure key={`${item.file.name}-${item.file.lastModified}`}>
                        {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span>미리보기 불가</span>}
                        <figcaption>{item.file.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : null}
                {progress ? (
                  <div className="upload-progress" aria-live="polite">
                    <p>
                      {progress.fileIndex}/{progress.totalFiles} · {progress.fileName}
                    </p>
                    <progress value={progress.totalProgress} max={1} />
                  </div>
                ) : null}
                <button className="button button--dark" type="button" onClick={submit} disabled={uploading}>
                  {uploading ? '업로드 중' : '사진 업로드'}
                </button>
                {message ? <p className="form-message">{message}</p> : null}
              </div>
            )}
            <button className="sheet-close" type="button" onClick={closeSheet} disabled={uploading}>
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </RevealSection>
  );
}
