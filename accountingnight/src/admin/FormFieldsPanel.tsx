import { useState, type FormEvent } from 'react';
import { FORM_FIELD_TYPES, type FormField, type FormFieldType } from '../types/registration';
import { saveFormField, setFormFieldActive, swapFormFieldOrder } from './adminService';
import { AdminDialog } from './AdminDialog';

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: 'TEXT',
  number: 'NUMBER',
  tel: 'TEL',
  email: 'EMAIL',
  select: 'SELECT',
  radio: 'RADIO',
  checkbox: 'CHECKBOX',
  textarea: 'TEXTAREA',
};

interface FormFieldsPanelProps {
  fields: FormField[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}

function FieldEditor({
  field,
  nextSortOrder,
  onClose,
  onRefresh,
  onError,
}: {
  field: FormField | null;
  nextSortOrder: number;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [label, setLabel] = useState(field?.label ?? '');
  const [type, setType] = useState<FormFieldType>(field?.type ?? 'text');
  const [required, setRequired] = useState(field?.required ?? false);
  const [options, setOptions] = useState<string[]>(field?.options.length ? field.options : ['']);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const needsOptions = type === 'select' || type === 'radio';

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? value : option));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (!label.trim()) {
      setError('질문 이름을 입력해주세요.');
      return;
    }
    if (needsOptions && !cleanOptions.length) {
      setError('선택지를 하나 이상 입력해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveFormField({
        id: field?.id,
        label,
        type,
        required,
        options: needsOptions ? cleanOptions : [],
        sort_order: field?.sort_order ?? nextSortOrder,
      });
      await onRefresh();
      onClose();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '항목을 저장하지 못했습니다.';
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog titleId="field-editor-title" onClose={onClose}>
      <div className="admin-dialog__header">
        <div>
          <p>FORM FIELD</p>
          <h2 id="field-editor-title">{field ? '항목 수정' : '항목 추가'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="항목 편집 닫기">×</button>
      </div>
      <form className="field-editor" onSubmit={submit}>
        <label>
          질문 이름
          <input data-autofocus value={label} onChange={(event) => setLabel(event.target.value)} maxLength={120} />
        </label>
        <label>
          입력 형식
          <select value={type} onChange={(event) => setType(event.target.value as FormFieldType)}>
            {FORM_FIELD_TYPES.map((value) => <option key={value} value={value}>{fieldTypeLabels[value]}</option>)}
          </select>
        </label>
        <label className="admin-checkbox-row">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
          필수 항목
        </label>
        {needsOptions ? (
          <fieldset className="field-options">
            <legend>선택지</legend>
            {options.map((option, index) => (
              <div key={index}>
                <input value={option} onChange={(event) => updateOption(index, event.target.value)} aria-label={`선택지 ${index + 1}`} />
                <button type="button" onClick={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))} disabled={options.length === 1} aria-label={`선택지 ${index + 1} 삭제`}>×</button>
              </div>
            ))}
            <button className="admin-inline-button" type="button" onClick={() => setOptions((current) => [...current, ''])}>+ 선택지 추가</button>
          </fieldset>
        ) : null}
        {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
        <div className="admin-dialog__actions admin-dialog__actions--end">
          <button className="admin-button admin-button--secondary" type="button" onClick={onClose}>취소</button>
          <button className="admin-button" type="submit" disabled={saving}>{saving ? '저장 중' : '저장'}</button>
        </div>
      </form>
    </AdminDialog>
  );
}

function FieldTable({
  fields,
  active,
  onEdit,
  onMove,
  onToggle,
}: {
  fields: FormField[];
  active: boolean;
  onEdit: (field: FormField) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onToggle: (field: FormField) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-fields-table">
        <thead><tr><th>이름</th><th>유형</th><th>필수</th><th>상태</th><th>순서</th><th>관리</th></tr></thead>
        <tbody>
          {fields.map((field, index) => (
            <tr key={field.id}>
              <td><strong>{field.label}</strong></td>
              <td>{fieldTypeLabels[field.type]}</td>
              <td>{field.required ? '필수' : '선택'}</td>
              <td>{field.active ? '활성' : '비활성'}</td>
              <td>
                {active ? (
                  <span className="admin-order-actions">
                    <button type="button" title="위로 이동" aria-label={`${field.label} 위로 이동`} onClick={() => onMove(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" title="아래로 이동" aria-label={`${field.label} 아래로 이동`} onClick={() => onMove(index, 1)} disabled={index === fields.length - 1}>↓</button>
                  </span>
                ) : '−'}
              </td>
              <td>
                <span className="admin-row-actions">
                  {active ? <button type="button" onClick={() => onEdit(field)}>수정</button> : null}
                  <button type="button" onClick={() => onToggle(field)}>{active ? '비활성화' : '다시 활성화'}</button>
                </span>
              </td>
            </tr>
          ))}
          {!fields.length ? <tr><td className="admin-empty" colSpan={6}>{active ? '추가한 항목이 없습니다.' : '비활성 항목이 없습니다.'}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export function FormFieldsPanel({ fields, onRefresh, onError }: FormFieldsPanelProps) {
  const [editing, setEditing] = useState<FormField | 'new' | null>(null);
  const activeFields = fields.filter((field) => field.active);
  const inactiveFields = fields.filter((field) => !field.active);
  const nextSortOrder = Math.max(0, ...fields.map((field) => field.sort_order)) + 10;

  async function move(index: number, direction: -1 | 1) {
    const other = activeFields[index + direction];
    if (!other) return;
    try {
      await swapFormFieldOrder(activeFields[index], other);
      await onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : '순서를 변경하지 못했습니다.');
    }
  }

  async function toggle(field: FormField) {
    if (field.active && !window.confirm('이 항목을 비활성화하시겠습니까? 기존 답변은 보존됩니다.')) return;
    try {
      await setFormFieldActive(field.id, !field.active);
      await onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : '항목 상태를 변경하지 못했습니다.');
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="fields-title">
      <div className="admin-panel__heading">
        <div><p>FORM BUILDER</p><h2 id="fields-title">폼 항목 관리</h2></div>
        <button className="admin-button" type="button" onClick={() => setEditing('new')}>+ 항목 추가</button>
      </div>
      <p className="admin-panel__description">비활성화된 항목은 새 신청 폼에서 숨겨지며, 기존 답변과 Excel 열은 유지됩니다.</p>

      <div className="admin-field-section">
        <h3>기본 항목</h3>
        <div className="admin-table-wrap">
          <table className="admin-table admin-fields-table">
            <thead><tr><th>이름</th><th>유형</th><th>필수</th><th>상태</th><th>순서</th><th>관리</th></tr></thead>
            <tbody>
              <tr><td><strong>이름</strong></td><td>기본</td><td>필수</td><td>활성</td><td>고정</td><td>고정</td></tr>
              <tr><td><strong>전화번호</strong></td><td>기본</td><td>필수</td><td>활성</td><td>고정</td><td>고정</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-field-section">
        <h3>활성 항목</h3>
        <FieldTable fields={activeFields} active onEdit={setEditing} onMove={move} onToggle={toggle} />
      </div>

      <div className="admin-field-section">
        <h3>비활성 항목</h3>
        <FieldTable fields={inactiveFields} active={false} onEdit={setEditing} onMove={move} onToggle={toggle} />
      </div>

      {editing ? (
        <FieldEditor
          field={editing === 'new' ? null : editing}
          nextSortOrder={nextSortOrder}
          onClose={() => setEditing(null)}
          onRefresh={onRefresh}
          onError={onError}
        />
      ) : null}
    </section>
  );
}
