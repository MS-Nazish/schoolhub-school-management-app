import { addDays, isWeekend, monthStr, today } from '@/lib/utils';
import type {
  AppNotification, AttendanceRecord, AttendanceStatus, FeeRecord, Message, ResultEntry, SalaryRecord, SchoolData,
  Student, TimetableEntry, User,
} from './types';

/** Demo accounts shown on the login screen */
export const DEMO_ACCOUNTS = [
  { role: 'admin', email: 'admin@school.com', password: 'admin123' },
  { role: 'teacher', email: 'teacher@school.com', password: 'teacher123' },
  { role: 'parent', email: 'parent@school.com', password: 'parent123' },
] as const;

export const SCHOOL_NAME = 'SchoolHub';
export const SUBJECTS = ['Mathematics', 'English', 'Science', 'Urdu', 'Computer'];
export const EXAMS = ['Monthly Test', 'Mid Term', 'Final Term'];
export const MONTHLY_FEE = 5000;
export const DEFAULT_SALARY = 45000;

export const PERIODS = [
  { start: '08:00', end: '08:40' },
  { start: '08:40', end: '09:20' },
  { start: '09:20', end: '10:00' },
  { start: '10:20', end: '11:00' }, // after break
  { start: '11:00', end: '11:40' },
  { start: '11:40', end: '12:20' },
];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Monthly fee heads for a demo class */
const feeStructure = (tuition: number, computer: number, sports: number, exam: number) => [
  { name: 'Tuition fee', amount: tuition },
  { name: 'Computer lab', amount: computer },
  { name: 'Sports', amount: sports },
  { name: 'Exam fee', amount: exam },
];

// Small deterministic random generator so the demo data looks the same every reset
const rng = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

export function createSeedData(): SchoolData {
  const rand = rng(42);
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60000).toISOString();

  const classes = [
    { id: 'c6', name: 'Class 6-A', feeItems: feeStructure(4000, 500, 300, 200) },
    { id: 'c7', name: 'Class 7-A', feeItems: feeStructure(4400, 500, 300, 300) },
    { id: 'c8', name: 'Class 8-A', feeItems: feeStructure(4800, 600, 300, 300) },
  ];

  const users: User[] = [
    { id: 'u-admin', name: 'Principal Ahmed', email: 'admin@school.com', password: 'admin123', role: 'admin' },
    {
      id: 'u-t1', name: 'Ayesha Khan', email: 'teacher@school.com', password: 'teacher123', role: 'teacher',
      subject: 'Mathematics', classIds: ['c6', 'c7', 'c8'], phone: '0300-1234567', salary: 55000,
    },
    {
      id: 'u-t2', name: 'Usman Ali', email: 'usman@school.com', password: 'teacher123', role: 'teacher',
      subject: 'English', classIds: ['c6', 'c7', 'c8'], phone: '0301-7654321', salary: 50000,
    },
    {
      id: 'u-t3', name: 'Sara Malik', email: 'sara@school.com', password: 'teacher123', role: 'teacher',
      subject: 'Science', classIds: ['c6', 'c7', 'c8'], phone: '0302-1112233', salary: 52000,
    },
    {
      id: 'u-t4', name: 'Kamran Siddiqui', email: 'kamran@school.com', password: 'teacher123', role: 'teacher',
      subject: 'Urdu', classIds: ['c6', 'c7', 'c8'], phone: '0304-5556677', salary: 42000,
    },
    {
      id: 'u-t5', name: 'Nadia Shah', email: 'nadia@school.com', password: 'teacher123', role: 'teacher',
      subject: 'Computer', classIds: ['c6', 'c7', 'c8'], phone: '0305-8889900', salary: 48000,
    },
    { id: 'u-p1', name: 'Imran Hussain', email: 'parent@school.com', password: 'parent123', role: 'parent', phone: '0333-9876543' },
  ];
  const teachers = users.filter((u) => u.role === 'teacher');

  const names: [string, string, 'Male' | 'Female'][] = [
    ['Ali Hussain', 'c6', 'Male'], ['Fatima Hussain', 'c8', 'Female'], // children of demo parent
    ['Hamza Raza', 'c6', 'Male'], ['Zainab Noor', 'c6', 'Female'], ['Bilal Ahmed', 'c6', 'Male'], ['Maryam Iqbal', 'c6', 'Female'],
    ['Hassan Shah', 'c7', 'Male'], ['Ayesha Tariq', 'c7', 'Female'], ['Omar Farooq', 'c7', 'Male'], ['Hira Javed', 'c7', 'Female'],
    ['Saad Qureshi', 'c7', 'Male'], ['Areeba Khan', 'c8', 'Female'], ['Taha Mirza', 'c8', 'Male'], ['Laiba Aslam', 'c8', 'Female'],
    ['Danish Butt', 'c8', 'Male'],
  ];
  const birthYear: Record<string, number> = { c6: 2014, c7: 2013, c8: 2012 };

  const rollCounter: Record<string, number> = {};
  const students: Student[] = names.map(([name, classId, gender], i) => {
    rollCounter[classId] = (rollCounter[classId] ?? 0) + 1;
    let parentId = 'u-p1';
    if (i >= 2) {
      parentId = `u-p${i}`;
      const last = name.split(' ')[1];
      users.push({
        id: parentId, name: `Mr. ${last}`, email: `parent${i}@school.com`, password: 'parent123', role: 'parent',
        phone: `0300-${String(1000000 + i * 7919).slice(0, 7)}`,
      });
    }
    const month = String(1 + Math.floor(rand() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, '0');
    return {
      id: `s${i + 1}`, name, rollNo: rollCounter[classId], classId, parentId, gender,
      dob: `${birthYear[classId]}-${month}-${day}`,
      address: `House ${10 + i * 3}, Street ${1 + (i % 9)}, Lahore`,
      admissionDate: `${2020 + (i % 4)}-04-01`,
    };
  });

  // Attendance for the last 15 school days (not including today, so teachers can mark it in the demo)
  const attendance: AttendanceRecord[] = [];
  let date = addDays(today(), -1);
  let days = 0;
  while (days < 15) {
    if (!isWeekend(date)) {
      for (const c of classes) {
        const marks: Record<string, AttendanceStatus> = {};
        students.filter((s) => s.classId === c.id).forEach((s) => {
          const r = rand();
          marks[s.id] = r < 0.08 ? 'A' : r < 0.13 ? 'L' : 'P';
        });
        attendance.push({ id: `${c.id}_${date}`, classId: c.id, date, takenBy: 'u-t1', marks });
      }
      days++;
    }
    date = addDays(date, -1);
  }

  // Results for all students in a few subjects
  const results: ResultEntry[] = [];
  for (const s of students) {
    for (const subject of ['Mathematics', 'English', 'Science', 'Urdu']) {
      for (const exam of ['Monthly Test', 'Mid Term']) {
        const marks = Math.round(45 + rand() * 55);
        results.push({ id: `${s.id}_${exam}_${subject}`, studentId: s.id, exam, subject, marks, total: 100 });
      }
    }
  }

  // Fees and salaries: last month mostly paid, this month partly paid
  const d = new Date();
  const cur = monthStr(d);
  d.setMonth(d.getMonth() - 1);
  const prev = monthStr(d);
  const fees: FeeRecord[] = [];
  for (const s of students) {
    const items = classes.find((c) => c.id === s.classId)!.feeItems;
    const fee = items.reduce((n, i) => n + i.amount, 0);
    const prevPaid = rand() > 0.15;
    fees.push({
      id: `${s.id}_${prev}`, studentId: s.id, month: prev, items, amount: fee,
      status: prevPaid ? 'paid' : 'unpaid', paidOn: prevPaid ? `${prev}-05` : undefined,
    });
    const curPaid = rand() > 0.6;
    fees.push({
      id: `${s.id}_${cur}`, studentId: s.id, month: cur, items, amount: fee,
      status: curPaid ? 'paid' : 'unpaid', paidOn: curPaid ? `${cur}-03` : undefined,
    });
  }

  const salaries: SalaryRecord[] = [];
  teachers.forEach((t, i) => {
    salaries.push({ id: `${t.id}_${prev}`, teacherId: t.id, month: prev, amount: t.salary!, status: 'paid', paidOn: `${prev}-01` });
    const paid = i % 2 === 0;
    salaries.push({
      id: `${t.id}_${cur}`, teacherId: t.id, month: cur, amount: t.salary!,
      status: paid ? 'paid' : 'unpaid', paidOn: paid ? `${cur}-01` : undefined,
    });
  });

  // Weekly timetable: Mon–Fri full day, Saturday half day
  const timetable: TimetableEntry[] = [];
  const order = ['Mathematics', 'English', 'Science', 'Urdu', 'Computer', 'Mathematics'];
  classes.forEach((c, ci) => {
    for (let day = 1; day <= 6; day++) {
      const periods = day === 6 ? 3 : PERIODS.length;
      for (let period = 1; period <= periods; period++) {
        const subject = order[(period - 1 + day + ci) % order.length];
        const teacher = teachers.find((t) => t.subject === subject && t.classIds?.includes(c.id));
        timetable.push({ id: `${c.id}_${day}_${period}`, classId: c.id, day, period, subject, teacherId: teacher?.id });
      }
    }
  });

  const messages: Message[] = [
    { id: 'm1', from: 'u-p1', to: 'u-t1', text: 'Assalam-o-Alaikum. How is Ali doing in Mathematics?', createdAt: iso(300), read: true },
    { id: 'm2', from: 'u-t1', to: 'u-p1', text: 'Walaikum Assalam! Ali is doing well, but he needs more practice in fractions.', createdAt: iso(280), read: true },
    { id: 'm3', from: 'u-t1', to: 'u-p1', text: 'Please make sure he completes Exercise 3.2 at home.', createdAt: iso(279), read: false },
    { id: 'm4', from: 'u-p6', to: 'u-t1', text: 'Maryam was sick yesterday, sorry for the absence.', createdAt: iso(90), read: false },
  ];

  const notifications: AppNotification[] = [
    { id: 'nt1', userId: 'u-p1', kind: 'homework', title: 'New homework: Mathematics', body: 'Fractions Exercise 3.2 (Class 6-A)', createdAt: iso(400), read: false, pushed: true },
    { id: 'nt2', userId: 'u-p1', kind: 'notice', title: 'Parent-Teacher Meeting', body: 'PTM will be held this Saturday.', createdAt: iso(600), read: true, pushed: true },
    { id: 'nt3', userId: 'u-t1', kind: 'salary', title: 'Salary paid', body: 'Your salary for this month has been paid.', createdAt: iso(800), read: false, pushed: true },
    { id: 'nt4', userId: 'u-t1', kind: 'notice', title: 'Staff Meeting', body: 'Friday at 1:30 PM in the staff room.', createdAt: iso(900), read: true, pushed: true },
  ];

  return {
    users,
    classes,
    students,
    attendance,
    results,
    fees,
    salaries,
    timetable,
    messages,
    notifications,
    homework: [
      {
        id: 'h1', classId: 'c6', subject: 'Mathematics', title: 'Fractions Exercise 3.2',
        description: 'Solve questions 1 to 10 from the textbook. Show all working.',
        dueDate: addDays(today(), 2), teacherId: 'u-t1', createdAt: iso(400),
      },
      {
        id: 'h2', classId: 'c6', subject: 'English', title: 'Essay: My Favourite Book',
        description: 'Write a 200-word essay about your favourite book and why you like it.',
        dueDate: addDays(today(), 4), teacherId: 'u-t2', createdAt: iso(500),
      },
      {
        id: 'h3', classId: 'c8', subject: 'Science', title: 'Solar System Model',
        description: 'Prepare a chart or model of the solar system for presentation.',
        dueDate: addDays(today(), 6), teacherId: 'u-t3', createdAt: iso(700),
      },
      {
        id: 'h4', classId: 'c7', subject: 'Mathematics', title: 'Algebra Worksheet',
        description: 'Complete the worksheet shared in class.',
        dueDate: addDays(today(), 3), teacherId: 'u-t1', createdAt: iso(800),
      },
    ],
    notices: [
      {
        id: 'n1', title: 'Parent-Teacher Meeting', audience: 'parents', by: 'Principal Ahmed', createdAt: iso(600),
        body: 'PTM will be held this Saturday from 9:00 AM to 12:00 PM. All parents are requested to attend.',
      },
      {
        id: 'n2', title: 'Mid Term Exams Schedule', audience: 'all', by: 'Principal Ahmed', createdAt: iso(1200),
        body: 'Mid term exams start from next Monday. Date sheet is available at the school office.',
      },
      {
        id: 'n3', title: 'Staff Meeting', audience: 'teachers', by: 'Principal Ahmed', createdAt: iso(900),
        body: 'All teachers please gather in the staff room on Friday at 1:30 PM.',
      },
    ],
  };
}
