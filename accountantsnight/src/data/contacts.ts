export interface ContactItem {
  role: string;
  name: string;
  phone: string;
  email: string;
}

export const contacts: ContactItem[] = [
  {
    role: '담당 1',
    name: '동국대학교 회계학과 학과 사무실',
    phone: '02-0000-0000',
    email: 'asdf@dgu.ac.kr',
  },
  {
    role: '담당 2',
    name: '동국대학교 회계학과 학과장',
    phone: '010-0000-0000',
    email: 'asdfs@dgu.ac.kr',
  },
];
