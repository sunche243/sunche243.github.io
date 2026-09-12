export interface ContactItem {
  organization: string;
  role: string;
  phone: string;
  email: string;
}

export const contacts: ContactItem[] = [
  {
    organization: '동국대학교 회계학과',
    role: '학과사무실',
    phone: '02-2260-3518',
    email: 'leehaneaul@dongguk.edu',
  }
];
