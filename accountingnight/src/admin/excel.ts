import type { Cell, SheetData } from 'write-excel-file/browser';
import type { FormField, Submission } from '../types/registration';
import {
  attendanceLabels,
  findSubmissionAnswerByLabel,
  getPledgeOptionLabel,
  getSubmissionPledgeAmount,
  isAdmissionFieldLabel,
  isAffiliationFieldLabel,
  submissionStatusLabels,
} from '../utils/registration';

interface ExportField {
  id: string;
  label: string;
}

function getExportFields(submissions: Submission[], fields: FormField[]): ExportField[] {
  const result = fields
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter(({ label }) => !isAdmissionFieldLabel(label) && !isAffiliationFieldLabel(label))
    .map(({ id, label }) => ({ id, label }));
  const knownIds = new Set(result.map(({ id }) => id));

  for (const submission of submissions) {
    for (const [id, answer] of Object.entries(submission.answers)) {
      if (!knownIds.has(id) && !isAdmissionFieldLabel(answer.label) && !isAffiliationFieldLabel(answer.label)) {
        result.push({ id, label: answer.label });
        knownIds.add(id);
      }
    }
  }

  return result;
}

function header(value: string): Cell {
  return {
    value,
    type: String,
    fontWeight: 'bold',
    backgroundColor: '#C8AA70',
    textColor: '#17130D',
    alignVertical: 'center',
    wrap: true,
  };
}

function excelValue(value: string | number | boolean | undefined): string | number {
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  return value ?? '';
}

export function buildExcelSheet(submissions: Submission[], fields: FormField[]): SheetData {
  const exportFields = getExportFields(submissions, fields);
  const headings = [
    '접수일시',
    '성명',
    '전화번호',
    '입학년도(학번)',
    '현재 소속 및 직함',
    '약정유형',
    '약정금액',
    '참석여부',
    ...exportFields.map(({ label }) => label),
    '상태',
    '관리메모',
  ];

  return [
    headings.map(header),
    ...submissions.map((submission) => [
      { value: new Date(submission.created_at), type: Date, format: 'yyyy-mm-dd hh:mm' },
      submission.name,
      submission.phone,
      excelValue(findSubmissionAnswerByLabel(submission, isAdmissionFieldLabel)),
      excelValue(findSubmissionAnswerByLabel(submission, isAffiliationFieldLabel)),
      getPledgeOptionLabel(submission.pledge_option),
      getSubmissionPledgeAmount(submission),
      submission.attendance_status ? attendanceLabels[submission.attendance_status] : '미입력',
      ...exportFields.map(({ id }) => excelValue(submission.answers[id]?.value)),
      submissionStatusLabels[submission.status],
      submission.admin_memo,
    ]),
  ];
}

export async function downloadSubmissionsExcel(submissions: Submission[], fields: FormField[]): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const sheet = buildExcelSheet(submissions, fields);
  const columns = sheet[0].map((_, index) => ({ width: index === 0 ? 20 : index === 2 ? 18 : 16 }));

  await writeExcelFile(sheet, {
    sheet: '약정 및 참석',
    columns,
    stickyRowsCount: 1,
  }, {
    fontFamily: '맑은 고딕',
    fontSize: 10,
  }).toFile(`회계인의밤_약정및참석_${date}.xlsx`);
}
