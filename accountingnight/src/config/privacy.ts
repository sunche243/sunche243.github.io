// IMPORTANT: 실제 운영 정책 확정 후 반드시 검토
export const privacyPolicy = {
  purpose: '행사 참석 및 발전기금 약정 확인, 관련 절차 안내',
  collectedItems: '성명, 휴대전화 번호, 학번, 현재 소속 및 직함 정보, 참석 여부, 발전기금 약정 유형·금액, 기타 사용자가 입력한 추가 정보',
  retentionPeriod: '행사 종료 후 5년간 보관 후 폐기',
};

export const attendancePrivacyPolicy = {
  purpose: '회계인의 밤 참석 인원 확인, 행사 운영 및 필요한 경우 참석 관련 안내',
  collectedItems: '성명, 휴대전화 번호, 입학년도(선택), 현재 소속 및 직함(선택), 참석 여부',
  retentionPeriod: privacyPolicy.retentionPeriod,
};

export const studentAttendancePrivacyPolicy = {
  purpose: '재학생 참석 인원 확인, 행사 운영 및 필요한 경우 참석 관련 안내',
  collectedItems: '성명, 휴대전화 번호, 입학년도(선택), 학생회 활동 여부 및 활동 내용(해당 시), 참석 여부',
  retentionPeriod: privacyPolicy.retentionPeriod,
};
