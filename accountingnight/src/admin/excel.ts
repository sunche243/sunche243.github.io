import type { Cell, SheetData } from 'write-excel-file/browser';
import type { AttendanceResponse } from '../types/attendance';
import type { FormField, Submission } from '../types/registration';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import {
  getStudentSelectionPriority,
  studentCouncilFeeStatusLabels,
  studentParticipationFeeStatusLabels,
  studentSelectionStatusLabels,
} from './studentAttendanceAdminUtils';
import { attendanceResponseLabels } from '../utils/attendance';
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

const EXCEL_PHONE_FORMAT = '00000000000';
const EXCEL_ADMISSION_YEAR_FORMAT = '00';
const EXCEL_WON_FORMAT = '₩#,##0';

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

function numericCell(
  value: string | number | boolean | undefined,
  format?: string,
): Cell {
  if (value === undefined || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value === 'boolean') return excelValue(value);

  const normalized = typeof value === 'string' ? value.trim() : value;
  const numericValue = typeof normalized === 'number'
    ? normalized
    : /^\d+$/.test(normalized)
      ? Number(normalized)
      : Number.NaN;

  if (!Number.isFinite(numericValue) || !Number.isSafeInteger(numericValue)) {
    return typeof normalized === 'string' ? normalized : null;
  }

  return {
    value: numericValue,
    type: Number,
    ...(format ? { format } : {}),
  };
}

function phoneCell(value: string): Cell {
  const trimmed = value.trim();
  const normalized = /^(?:010\d{8}|010-\d{4}-\d{4})$/.test(trimmed)
    ? trimmed.replaceAll('-', '')
    : trimmed;
  return numericCell(normalized, EXCEL_PHONE_FORMAT);
}

function admissionYearCell(value: string | number | boolean | undefined): Cell {
  const normalized = typeof value === 'string'
    ? value.trim().match(/^(\d+)\s*학번$/)?.[1] ?? value
    : value;
  return numericCell(normalized, EXCEL_ADMISSION_YEAR_FORMAT);
}

function pledgeAmountCell(submission: Submission): Cell {
  if (!Number.isFinite(submission.pledge_amount) && !Number.isFinite(submission.sponsorship_units)) {
    return null;
  }

  return numericCell(getSubmissionPledgeAmount(submission), EXCEL_WON_FORMAT);
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
      phoneCell(submission.phone),
      admissionYearCell(findSubmissionAnswerByLabel(submission, isAdmissionFieldLabel)),
      excelValue(findSubmissionAnswerByLabel(submission, isAffiliationFieldLabel)),
      getPledgeOptionLabel(submission.pledge_option),
      pledgeAmountCell(submission),
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

export function buildAttendanceExcelSheet(responses: AttendanceResponse[]): SheetData {
  return [
    ['최종 회신일시', '성명', '전화번호', '입학년도', '현재 소속 및 직함', '참석 여부'].map(header),
    ...responses.map((response) => [
      { value: new Date(response.updated_at ?? response.created_at), type: Date, format: 'yyyy-mm-dd hh:mm' },
      response.name,
      phoneCell(response.phone),
      admissionYearCell(response.admission_year ?? undefined),
      response.affiliation ?? '',
      attendanceResponseLabels[response.attendance_status],
    ]),
  ];
}

export async function downloadAttendanceExcel(responses: AttendanceResponse[]): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).replaceAll('-', '');
  const sheet = buildAttendanceExcelSheet(responses);

  await writeExcelFile(sheet, {
    sheet: '참석 여부',
    columns: [
      { width: 20 },
      { width: 14 },
      { width: 18 },
      { width: 12 },
      { width: 30 },
      { width: 12 },
    ],
    stickyRowsCount: 1,
  }, {
    fontFamily: '맑은 고딕',
    fontSize: 10,
  }).toFile(`회계인의밤_참석여부_${date}.xlsx`);
}

export function buildStudentAttendanceExcelSheet(responses: StudentAttendanceResponse[]): SheetData {
  return [
    ['최종 회신일시', '성명', '전화번호', '입학년도', '우선순위', '학생회 활동 여부', '활동 연도 및 직책', '학생회비', '참석 신청 여부', '선정 상태', '대기 순번', '행사 참가비', '개별 연락', '관리 메모'].map(header),
    ...responses.map((response) => [
      { value: new Date(response.updated_at ?? response.created_at), type: Date, format: 'yyyy-mm-dd hh:mm' },
      response.name,
      phoneCell(response.phone),
      admissionYearCell(response.admission_year ?? undefined),
      getStudentSelectionPriority(response) ? `${getStudentSelectionPriority(response)}순위` : '',
      response.student_council_experience === null ? '' : response.student_council_experience ? '경험 있음' : '경험 없음',
      response.student_council_details ?? '',
      studentCouncilFeeStatusLabels[response.student_council_fee_status],
      attendanceResponseLabels[response.attendance_status],
      studentSelectionStatusLabels[response.selection_status],
      response.waitlist_order ?? '',
      studentParticipationFeeStatusLabels[response.participation_fee_status],
      response.contacted_at ? '완료' : '미완료',
      response.admin_memo,
    ]),
  ];
}

export async function downloadStudentAttendanceExcel(
  responses: StudentAttendanceResponse[],
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).replaceAll('-', '');
  const sheet = buildStudentAttendanceExcelSheet(responses);

  await writeExcelFile(sheet, {
    sheet: '학생 참석',
    columns: [
      { width: 20 },
      { width: 14 },
      { width: 18 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
      { width: 36 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 30 },
    ],
    stickyRowsCount: 1,
  }, {
    fontFamily: '맑은 고딕',
    fontSize: 10,
  }).toFile(`회계인의밤_학생참석_${date}.xlsx`);
}
