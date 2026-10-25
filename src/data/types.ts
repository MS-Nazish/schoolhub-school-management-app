export type Role = 'admin' | 'teacher' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Offline demo mode only; with Firebase, passwords live in Firebase Auth */
  password?: string;
  role: Role;
  phone?: string;
  /** Teachers only: subject they teach */
  subject?: string;
  /** Teachers only: classes they are assigned to */
  classIds?: string[];
  /** Teachers only: monthly salary */
  salary?: number;
}

export interface ClassRoom {
  id: string;
  name: string;
  /** Monthly tuition fee for new vouchers (defaults to MONTHLY_FEE) */
  monthlyFee?: number;
}

export interface Student {
  id: string;
  name: string;
  rollNo: number;
  classId: string;
  parentId: string;
  /** Image URI (data: URI so it survives app restarts) */
  photo?: string;
  dob?: string;
  gender?: 'Male' | 'Female';
  address?: string;
  admissionDate?: string;
}

export type AttendanceStatus = 'P' | 'A' | 'L';

export interface AttendanceRecord {
  /** `${classId}_${date}` */
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  takenBy: string;
  marks: Record<string, AttendanceStatus>; // studentId -> status
}

export interface Homework {
  id: string;
  classId: string;
  subject: string;
  title: string;
  description: string;
  dueDate: string;
  teacherId: string;
  createdAt: string;
}

export interface ResultEntry {
  /** `${studentId}_${exam}_${subject}` */
  id: string;
  studentId: string;
  exam: string;
  subject: string;
  marks: number;
  total: number;
}

export type PayStatus = 'paid' | 'unpaid';

export interface FeeRecord {
  /** `${studentId}_${month}` */
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  amount: number;
  status: PayStatus;
  paidOn?: string;
}

export interface SalaryRecord {
  /** `${teacherId}_${month}` */
  id: string;
  teacherId: string;
  month: string; // YYYY-MM
  /** Basic salary for the month */
  amount: number;
  bonus?: number;
  deduction?: number;
  note?: string;
  status: PayStatus;
  paidOn?: string;
}

export interface TimetableEntry {
  /** `${classId}_${day}_${period}` */
  id: string;
  classId: string;
  day: number; // 1 = Monday … 6 = Saturday
  period: number; // 1-based, see PERIODS
  subject: string;
  teacherId?: string;
}

export type Audience = 'all' | 'teachers' | 'parents';

export interface Notice {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  createdAt: string;
  by: string;
}

export interface Message {
  id: string;
  from: string; // userId
  to: string; // userId
  text: string;
  createdAt: string;
  read: boolean;
}

export type NotificationKind = 'attendance' | 'homework' | 'notice' | 'fee' | 'salary' | 'message' | 'result';

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Already shown as a phone alert */
  pushed?: boolean;
}

export interface SchoolData {
  users: User[];
  classes: ClassRoom[];
  students: Student[];
  attendance: AttendanceRecord[];
  homework: Homework[];
  results: ResultEntry[];
  fees: FeeRecord[];
  salaries: SalaryRecord[];
  timetable: TimetableEntry[];
  notices: Notice[];
  messages: Message[];
  notifications: AppNotification[];
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type Lang = 'en' | 'ur';

/** Per-device preferences (not shared school data) */
export interface Settings {
  theme: ThemeMode;
  lang: Lang;
  pushEnabled: boolean;
}
