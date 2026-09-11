export interface ContactItem {
  organization: string;
  role: string;
  phone: string;
  email: string;
}

export const contacts: ContactItem[] = [
  {
    organization: '동국대학교 회계학과',
    role: '학과 사무실',
    phone: '02-0000-0000',
    email: 'asdf@dgu.ac.kr',
  },
  {
    organization: '동국대학교 회계학과',
    role: '학과장',
    phone: '010-0000-0000',
    email: 'asdfs@dgu.ac.kr',
  },
];
