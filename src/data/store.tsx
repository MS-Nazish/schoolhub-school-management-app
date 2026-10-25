/**
 * App-wide data store.
 *
 * All school data lives in one SchoolData object. Screens read from `data` and change it
 * through the actions below, which apply the change locally and then save it:
 * - with Firebase configured (.env), to Firestore, streamed live to every signed-in device;
 * - otherwise (offline demo mode), to AsyncStorage on this device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, Platform, useColorScheme } from 'react-native';

import {
  commitChanges, emptySchool, ensureLogin, isDatabaseEmpty, loadMe, reconcile, seedDemoSchool, subscribeSchool,
} from './cloud';
import { DEFAULT_SALARY, MONTHLY_FEE, createSeedData } from './seed';
import { STAFF_ATTENDANCE } from './types';
import type {
  AppNotification, AttendanceStatus, Audience, ClassRoom, FeeItem, FeeRecord, Homework, Lang, Notice, NotificationKind, ResultEntry, SalaryRecord,
  SchoolData, Settings, Student, ThemeMode, User,
} from './types';
import { applyTheme } from '@/components/theme';
import { firebaseEnabled, getAuthInstance } from '@/lib/firebase';
import { setLang, t } from '@/lib/i18n';
import { className as classNameOf, formatMonth, money, notify, thisMonth, today, uid } from '@/lib/utils';

const DATA_KEY = 'schoolhub:data:v2';
const SESSION_KEY = 'schoolhub:session:v1';
const SETTINGS_KEY = 'schoolhub:settings:v1';

const DEFAULT_SETTINGS: Settings = { theme: 'system', lang: 'en', pushEnabled: true };

interface StoreValue {
  loaded: boolean;
  data: SchoolData;
  user: User | null;
  settings: Settings;
  isDark: boolean;
  /** true when data is saved to Firebase, false in offline demo mode */
  cloud: boolean;

  /** Resolves to an error message, or null on success */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  resetDemoData: () => void;
  /** Firebase only: whether the project has no data yet */
  checkEmptyDatabase: () => Promise<boolean>;
  /** Firebase only: uploads the demo school and creates the demo logins */
  setupDemoSchool: (onProgress: (msg: string) => void) => Promise<void>;

  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Lang) => void;
  setPushEnabled: (on: boolean) => void;

  addStudent: (s: {
    name: string; classId: string; parentName: string; parentEmail: string; parentPhone?: string;
    rollNo?: number; gender?: Student['gender']; dob?: string; admissionDate?: string; address?: string;
  }) => void;
  /** Change any user's details (e.g. a parent's name or phone) */
  updateUser: (id: string, patch: Partial<User>) => void;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addTeacher: (t: { name: string; email: string; subject: string; classIds: string[]; phone?: string; salary: number }) => void;
  updateTeacher: (id: string, patch: Partial<User>) => void;
  deleteTeacher: (id: string) => void;
  addClass: (name: string) => void;

  saveAttendance: (classId: string, date: string, marks: Record<string, AttendanceStatus>) => void;
  /** Admin marks teachers present/absent/leave for a day */
  saveStaffAttendance: (date: string, marks: Record<string, AttendanceStatus>) => void;
  addHomework: (h: Omit<Homework, 'id' | 'createdAt' | 'teacherId'>) => void;
  deleteHomework: (id: string) => void;
  saveResults: (exam: string, subject: string, total: number, marks: Record<string, number>) => void;
  /** One student's marks for several subjects of an exam (subjects not in `rows` are left as they are) */
  saveMarksheet: (studentId: string, exam: string, rows: { subject: string; marks: number; total: number }[]) => void;

  /** Creates the month's missing vouchers (for one class, or every class); returns how many */
  generateFees: (month: string, classId?: string) => number;
  markFeePaid: (id: string) => void;
  /** Admin correction: marks a paid fee as unpaid again */
  markFeeUnpaid: (id: string) => void;
  /** Notifies parents with unpaid fees for a month (one class, or all); returns how many were reminded */
  sendFeeReminders: (month: string, classId?: string) => number;
  /** Replace a class's fee heads; optionally re-price that month's unpaid vouchers */
  setClassFeeItems: (classId: string, items: FeeItem[], applyToMonth?: string) => void;
  /** Edit one voucher (discount, fine, note, paid/unpaid, paid date) */
  updateFee: (id: string, patch: Partial<Pick<FeeRecord, 'discount' | 'fine' | 'note' | 'status' | 'paidOn'>>) => void;
  generateSalaries: (month: string) => number;
  markSalaryPaid: (id: string) => void;
  /** Edit a month's salary (amount, bonus, deduction, note, paid/unpaid, paid date) */
  updateSalary: (id: string, patch: Partial<Omit<SalaryRecord, 'id' | 'teacherId' | 'month'>>) => void;
  /** Marks every unpaid salary of the month as paid; returns how many */
  payAllSalaries: (month: string) => number;

  setTimetableSlot: (classId: string, day: number, period: number, subject: string | null, teacherId?: string) => void;

  addNotice: (n: { title: string; body: string; audience: Audience }) => void;
  deleteNotice: (id: string) => void;

  sendMessage: (to: string, text: string) => void;
  markThreadRead: (peerId: string) => void;
  markNotificationsRead: () => void;
  markPushed: (ids: string[]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** A class's monthly fee heads (falls back to a single tuition fee for older data) */
export const classFeeItems = (cls?: ClassRoom): FeeItem[] =>
  cls?.feeItems?.length ? cls.feeItems : [{ name: 'Tuition fee', amount: cls?.monthlyFee ?? MONTHLY_FEE }];

export const feeItemsTotal = (items: FeeItem[]) => items.reduce((n, i) => n + i.amount, 0);

/** What the parent actually pays: fee heads − discount + fine */
export const netFee = (f: Pick<FeeRecord, 'amount' | 'discount' | 'fine'>) =>
  f.amount - (f.discount ?? 0) + (f.fine ?? 0);

/** Salary after bonus and deduction */
export const netSalary = (s: Pick<SalaryRecord, 'amount' | 'bonus' | 'deduction'>) =>
  s.amount + (s.bonus ?? 0) - (s.deduction ?? 0);

/**
 * Applies a change to salary records; teachers are notified when a salary becomes paid.
 * Marking unpaid clears the paid date; marking paid without a date uses today.
 */
function updateSalaryRecords(
  update: (fn: (d: SchoolData) => SchoolData) => void,
  ids: string[],
  patch: Partial<SalaryRecord>,
) {
  update((d) => {
    const notes: AppNotification[] = [];
    const salaries = d.salaries.map((s) => {
      if (!ids.includes(s.id)) return s;
      const next: SalaryRecord = { ...s, ...patch };
      if (next.status === 'unpaid') next.paidOn = undefined;
      else next.paidOn = next.paidOn ?? today();
      if (s.status !== 'paid' && next.status === 'paid') {
        notes.push(...makeNotes([s.teacherId], 'salary', 'Salary paid',
          `${money(netSalary(next))} for ${formatMonth(s.month)} has been paid.`));
      }
      return next;
    });
    return { ...d, salaries, notifications: [...notes, ...d.notifications] };
  });
}

/** Build in-app notifications for several users */
function makeNotes(userIds: string[], kind: NotificationKind, title: string, body: string): AppNotification[] {
  const createdAt = new Date().toISOString();
  return [...new Set(userIds)].map((userId) => ({ id: uid(), userId, kind, title, body, createdAt, read: false }));
}

const authErrors: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password',
  'auth/wrong-password': 'Incorrect email or password',
  'auth/user-not-found': 'Incorrect email or password',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
  'auth/network-request-failed': 'No internet connection',
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const cloud = firebaseEnabled;
  const [data, setDataState] = useState<SchoolData>(() => (cloud ? emptySchool() : createSeedData()));
  // Latest data, so actions can compute the next version and the Firestore diff synchronously
  const dataRef = useRef(data);
  const setData = useCallback((next: SchoolData) => {
    dataRef.current = next;
    setDataState(next);
  }, []);

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  // Offline mode: id of the logged-in user, restored from storage
  const [userId, setUserId] = useState<string | null>(null);
  const [localLoaded, setLocalLoaded] = useState(cloud);
  // Firebase mode: email of the signed-in Firebase user
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!cloud);
  const [cloudReady, setCloudReady] = useState(false);
  const systemScheme = useColorScheme();

  // Apply theme and language before anything below renders
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  applyTheme(isDark);
  setLang(settings.lang);

  // Load device settings (and, offline, the saved data and session) once
  useEffect(() => {
    (async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        if (!cloud) {
          const [raw, session] = await Promise.all([AsyncStorage.getItem(DATA_KEY), AsyncStorage.getItem(SESSION_KEY)]);
          // Merge with seed so data saved by an older version gets any new collections
          if (raw) setData({ ...createSeedData(), ...JSON.parse(raw) });
          if (session) setUserId(session);
        }
      } catch {
        // Corrupt or unavailable storage: keep defaults
      }
      setSettingsLoaded(true);
      setLocalLoaded(true);
    })();
  }, [cloud, setData]);

  // Firebase: follow the signed-in user
  useEffect(() => {
    if (!cloud) return;
    return onAuthStateChanged(getAuthInstance(), (u) => {
      setAuthEmail(u?.email?.toLowerCase() ?? null);
      setAuthReady(true);
    });
  }, [cloud]);

  // Firebase: stream what the signed-in user may see
  useEffect(() => {
    if (!cloud || !authEmail) return;
    let stop = () => {};
    let cancelled = false;
    const fail = (e: Error) => {
      notify(t('Sync error'), e.message);
      setCloudReady(true);
    };
    loadMe(authEmail)
      .then((me) => {
        if (cancelled) return;
        if (!me) return fail(new Error(t('No school profile found for this login. Ask the admin to add you.')));
        const sub = subscribeSchool(me, setData, () => {
          setCloudReady(true);
          if (me.role === 'admin') reconcile(dataRef.current, sub.raw()).catch((e: Error) => notify(t('Could not save'), e.message));
        }, fail);
        stop = sub.unsubscribe;
      })
      .catch(fail);
    return () => {
      cancelled = true;
      stop();
      setCloudReady(false);
      setData(emptySchool());
    };
  }, [cloud, authEmail, setData]);

  const loaded = settingsLoaded && (cloud ? authReady && (!authEmail || cloudReady) : localLoaded);

  // Offline: persist on every change after loading
  useEffect(() => {
    if (!cloud && loaded) AsyncStorage.setItem(DATA_KEY, JSON.stringify(data)).catch(() => {});
  }, [cloud, data, loaded]);

  useEffect(() => {
    if (settingsLoaded) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, settingsLoaded]);

  useEffect(() => {
    if (cloud || !loaded) return;
    if (userId) AsyncStorage.setItem(SESSION_KEY, userId).catch(() => {});
    else AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, [cloud, userId, loaded]);

  const user = useMemo(
    () => (cloud
      ? data.users.find((u) => u.email.toLowerCase() === authEmail) ?? null
      : data.users.find((u) => u.id === userId) ?? null),
    [cloud, data.users, authEmail, userId],
  );

  const roleRef = useRef(user?.role);
  roleRef.current = user?.role;

  /** Apply a change locally, then save it (Firestore writes only what changed) */
  const update = useCallback((fn: (d: SchoolData) => SchoolData) => {
    const prev = dataRef.current;
    const next = fn(prev);
    if (next === prev) return;
    setData(next);
    if (cloud) commitChanges(prev, next, roleRef.current).catch((e: Error) => notify(t('Could not save'), e.message));
  }, [cloud, setData]);

  const value = useMemo<StoreValue>(() => {
    const parentsOfClass = (d: SchoolData, classId: string) =>
      d.students.filter((s) => s.classId === classId).map((s) => s.parentId);
    const me = user?.id ?? '';
    // New teachers/parents get the default demo password (Firebase login created in the background)
    const addLogin = (email: string, password: string) => {
      if (cloud) ensureLogin(email, password).catch((e: Error) => notify(t('Could not create login'), e.message));
    };

    return {
      loaded,
      data,
      user,
      settings,
      isDark,
      cloud,

      login: async (email, password) => {
        if (cloud) {
          try {
            await signInWithEmailAndPassword(getAuthInstance(), email.trim(), password);
            return null;
          } catch (e) {
            return t(authErrors[(e as { code?: string }).code ?? ''] ?? 'Could not sign in');
          }
        }
        const u = data.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
        if (!u) return t('Incorrect email or password');
        setUserId(u.id);
        return null;
      },
      logout: () => {
        if (cloud) signOut(getAuthInstance()).catch(() => {});
        else setUserId(null);
      },
      resetDemoData: () => {
        const seed = createSeedData();
        update(() => seed);
        seed.users.forEach((u) => u.password && addLogin(u.email, u.password));
      },
      checkEmptyDatabase: () => (cloud ? isDatabaseEmpty() : Promise.resolve(false)),
      setupDemoSchool: (onProgress) => seedDemoSchool(onProgress),

      setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
      setLanguage: (lang) => {
        setSettings((s) => ({ ...s, lang }));
        // Right-to-left layout for Urdu takes effect after the app restarts (native only)
        if (Platform.OS !== 'web') {
          I18nManager.allowRTL(lang === 'ur');
          I18nManager.forceRTL(lang === 'ur');
        }
      },
      setPushEnabled: (pushEnabled) => setSettings((s) => ({ ...s, pushEnabled })),

      addStudent: ({ name, classId, parentName, parentEmail, parentPhone, rollNo, ...details }) => {
        addLogin(parentEmail, 'parent123');
        update((d) => {
          let parent = d.users.find((u) => u.role === 'parent' && u.email.toLowerCase() === parentEmail.toLowerCase());
          const users = [...d.users];
          if (!parent) {
            parent = { id: uid(), name: parentName, email: parentEmail, password: 'parent123', role: 'parent', phone: parentPhone || undefined };
            users.push(parent);
          }
          const nextRoll = Math.max(0, ...d.students.filter((s) => s.classId === classId).map((s) => s.rollNo)) + 1;
          const student: Student = {
            id: uid(), name, classId, parentId: parent.id, rollNo: rollNo || nextRoll,
            gender: details.gender, dob: details.dob, address: details.address, admissionDate: details.admissionDate || today(),
          };
          // New students get this month's fee voucher straight away (from their class's fee structure)
          const items = classFeeItems(d.classes.find((c) => c.id === classId));
          const month = thisMonth();
          const voucher: FeeRecord = {
            id: `${student.id}_${month}`, studentId: student.id, month, items, amount: feeItemsTotal(items), status: 'unpaid',
          };
          return {
            ...d,
            users,
            students: [...d.students, student],
            fees: [...d.fees, voucher],
            notifications: [
              ...makeNotes([parent.id], 'fee', `Fee voucher: ${formatMonth(month)}`,
                `${name}: monthly fee of ${money(voucher.amount)} is due.`),
              ...d.notifications,
            ],
          };
        });
      },
      updateUser: (id, patch) =>
        update((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      updateStudent: (id, patch) =>
        update((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
      deleteStudent: (id) =>
        update((d) => ({
          ...d,
          students: d.students.filter((s) => s.id !== id),
          results: d.results.filter((r) => r.studentId !== id),
          fees: d.fees.filter((f) => f.studentId !== id),
        })),

      addTeacher: (t) => {
        addLogin(t.email, 'teacher123');
        update((d) => ({ ...d, users: [...d.users, { ...t, id: uid(), role: 'teacher', password: 'teacher123' }] }));
      },
      updateTeacher: (id, patch) =>
        update((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      deleteTeacher: (id) =>
        update((d) => ({
          ...d,
          users: d.users.filter((u) => u.id !== id),
          salaries: d.salaries.filter((s) => s.teacherId !== id),
          timetable: d.timetable.map((e) => (e.teacherId === id ? { ...e, teacherId: undefined } : e)),
        })),
      addClass: (name) => update((d) => ({ ...d, classes: [...d.classes, { id: uid(), name } as ClassRoom] })),

      saveAttendance: (classId, date, marks) =>
        update((d) => {
          const id = `${classId}_${date}`;
          const record = { id, classId, date, marks, takenBy: me, takenAt: new Date().toISOString() };
          // Alert parents of absent students, but only the first time a student is marked absent that day
          const before = d.attendance.find((a) => a.id === id)?.marks ?? {};
          const newlyAbsent = d.students.filter((s) => marks[s.id] === 'A' && before[s.id] !== 'A');
          const notes = newlyAbsent.flatMap((s) =>
            makeNotes([s.parentId], 'attendance', `${s.name} is absent`, `${s.name} was marked absent on ${date}.`));
          return {
            ...d,
            attendance: [...d.attendance.filter((a) => a.id !== id), record],
            notifications: [...notes, ...d.notifications],
          };
        }),

      saveStaffAttendance: (date, marks) =>
        update((d) => {
          const id = `${STAFF_ATTENDANCE}_${date}`;
          const record = { id, classId: STAFF_ATTENDANCE, date, marks, takenBy: me, takenAt: new Date().toISOString() };
          return { ...d, attendance: [...d.attendance.filter((a) => a.id !== id), record] };
        }),

      addHomework: (h) =>
        update((d) => ({
          ...d,
          homework: [{ ...h, id: uid(), teacherId: me, createdAt: new Date().toISOString() }, ...d.homework],
          notifications: [
            ...makeNotes(parentsOfClass(d, h.classId), 'homework', `New homework: ${h.subject}`,
              `${h.title} (${classNameOf(d, h.classId)})`),
            ...d.notifications,
          ],
        })),
      deleteHomework: (id) => update((d) => ({ ...d, homework: d.homework.filter((h) => h.id !== id) })),

      saveResults: (exam, subject, total, marks) =>
        update((d) => {
          const entries: ResultEntry[] = Object.entries(marks).map(([studentId, m]) => ({
            id: `${studentId}_${exam}_${subject}`, studentId, exam, subject, marks: m, total,
          }));
          const ids = new Set(entries.map((e) => e.id));
          const parents = entries.map((e) => d.students.find((s) => s.id === e.studentId)?.parentId ?? '').filter(Boolean);
          return {
            ...d,
            results: [...d.results.filter((r) => !ids.has(r.id)), ...entries],
            notifications: [...makeNotes(parents, 'result', `${exam} result published`, `${subject} marks are now available.`), ...d.notifications],
          };
        }),

      saveMarksheet: (studentId, exam, rows) =>
        update((d) => {
          const student = d.students.find((s) => s.id === studentId);
          const entries: ResultEntry[] = rows.map((r) => ({
            id: `${studentId}_${exam}_${r.subject}`, studentId, exam, subject: r.subject, marks: r.marks, total: r.total,
          }));
          // Upsert only the filled-in subjects (security rules don't let teachers delete results)
          const ids = new Set(entries.map((e) => e.id));
          const others = d.results.filter((r) => !ids.has(r.id));
          return {
            ...d,
            results: [...others, ...entries],
            notifications: student
              ? [...makeNotes([student.parentId], 'result', `${exam} result published`, `${student.name}'s marksheet is now available.`), ...d.notifications]
              : d.notifications,
          };
        }),

      generateFees: (month, classId) => {
        const missing = data.students.filter((s) => (!classId || s.classId === classId) && !data.fees.some((f) => f.id === `${s.id}_${month}`));
        if (!missing.length) return 0;
        update((d) => {
          // Each class has its own fee structure
          const itemsFor = (classId: string) => classFeeItems(d.classes.find((c) => c.id === classId));
          return {
            ...d,
            fees: [
              ...d.fees,
              ...missing.map((s) => {
                const items = itemsFor(s.classId);
                return {
                  id: `${s.id}_${month}`, studentId: s.id, month, items, amount: feeItemsTotal(items), status: 'unpaid' as const,
                };
              }),
            ],
            notifications: [
              ...missing.flatMap((s) => makeNotes([s.parentId], 'fee', `Fee voucher: ${formatMonth(month)}`,
                `${s.name}: monthly fee of ${money(feeItemsTotal(itemsFor(s.classId)))} is due.`)),
              ...d.notifications,
            ],
          };
        });
        return missing.length;
      },
      markFeePaid: (id) =>
        update((d) => ({
          ...d,
          fees: d.fees.map((f) => (f.id === id ? { ...f, status: 'paid', paidOn: today() } : f)),
        })),
      markFeeUnpaid: (id) =>
        update((d) => ({
          ...d,
          fees: d.fees.map((f) => (f.id === id ? { ...f, status: 'unpaid', paidOn: undefined } : f)),
        })),
      sendFeeReminders: (month, classId) => {
        const due = data.fees
          .filter((f) => f.month === month && f.status === 'unpaid')
          .map((f) => ({ fee: f, student: data.students.find((s) => s.id === f.studentId) }))
          .filter((r) => r.student && (!classId || r.student.classId === classId));
        if (due.length) {
          update((d) => ({
            ...d,
            notifications: [
              ...due.flatMap(({ fee, student }) => makeNotes([student!.parentId], 'fee', `Fee reminder: ${formatMonth(month)}`,
                `${student!.name}'s fee of ${money(netFee(fee))} is still unpaid. Please pay before the 10th.`)),
              ...d.notifications,
            ],
          }));
        }
        return due.length;
      },
      setClassFeeItems: (classId, items, applyToMonth) =>
        update((d) => {
          const studentIds = new Set(d.students.filter((s) => s.classId === classId).map((s) => s.id));
          return {
            ...d,
            classes: d.classes.map((c) => (c.id === classId ? { ...c, feeItems: items, monthlyFee: feeItemsTotal(items) } : c)),
            // Optionally re-price that month's unpaid vouchers for the class (discounts and fines are kept)
            fees: applyToMonth
              ? d.fees.map((f) => (f.month === applyToMonth && f.status === 'unpaid' && studentIds.has(f.studentId)
                ? { ...f, items, amount: feeItemsTotal(items) } : f))
              : d.fees,
          };
        }),
      updateFee: (id, patch) =>
        update((d) => ({
          ...d,
          fees: d.fees.map((f) => {
            if (f.id !== id) return f;
            const next: FeeRecord = { ...f, ...patch };
            if (next.status === 'unpaid') next.paidOn = undefined;
            else next.paidOn = next.paidOn ?? today();
            return next;
          }),
        })),

      generateSalaries: (month) => {
        const teachers = data.users.filter((u) => u.role === 'teacher');
        const missing = teachers.filter((t) => !data.salaries.some((s) => s.id === `${t.id}_${month}`));
        update((d) => ({
          ...d,
          salaries: [
            ...d.salaries,
            ...missing.map((t) => ({
              id: `${t.id}_${month}`, teacherId: t.id, month, amount: t.salary ?? DEFAULT_SALARY, status: 'unpaid' as const,
            })),
          ],
        }));
        return missing.length;
      },
      markSalaryPaid: (id) => updateSalaryRecords(update, [id], { status: 'paid' }),
      updateSalary: (id, patch) => updateSalaryRecords(update, [id], patch),
      payAllSalaries: (month) => {
        const ids = data.salaries.filter((s) => s.month === month && s.status === 'unpaid').map((s) => s.id);
        if (ids.length) updateSalaryRecords(update, ids, { status: 'paid' });
        return ids.length;
      },

      setTimetableSlot: (classId, day, period, subject, teacherId) =>
        update((d) => {
          if (!classId) return d;
          const id = `${classId}_${day}_${period}`;
          const rest = d.timetable.filter((e) => e.id !== id);
          if (!subject) return { ...d, timetable: rest };
          return { ...d, timetable: [...rest, { id, classId, day, period, subject, teacherId }] };
        }),

      addNotice: (n) =>
        update((d) => {
          const targets = d.users.filter((u) =>
            u.id !== me && (n.audience === 'all' ? u.role !== 'admin' : u.role === (n.audience === 'teachers' ? 'teacher' : 'parent')));
          return {
            ...d,
            notices: [{ ...n, id: uid(), createdAt: new Date().toISOString(), by: user?.name ?? 'School' } as Notice, ...d.notices],
            notifications: [...makeNotes(targets.map((u) => u.id), 'notice', n.title, n.body), ...d.notifications],
          };
        }),
      deleteNotice: (id) => update((d) => ({ ...d, notices: d.notices.filter((n) => n.id !== id) })),

      sendMessage: (to, text) =>
        update((d) => ({
          ...d,
          messages: [...d.messages, { id: uid(), from: me, to, text, createdAt: new Date().toISOString(), read: false }],
          notifications: [...makeNotes([to], 'message', `Message from ${user?.name ?? 'someone'}`, text), ...d.notifications],
        })),
      markThreadRead: (peerId) =>
        update((d) => {
          if (!d.messages.some((m) => m.from === peerId && m.to === me && !m.read)) return d;
          return {
            ...d,
            messages: d.messages.map((m) => (m.from === peerId && m.to === me ? { ...m, read: true } : m)),
          };
        }),
      markNotificationsRead: () =>
        update((d) => {
          if (!d.notifications.some((n) => n.userId === me && !n.read)) return d;
          return { ...d, notifications: d.notifications.map((n) => (n.userId === me ? { ...n, read: true } : n)) };
        }),
      markPushed: (ids) =>
        update((d) => ({ ...d, notifications: d.notifications.map((n) => (ids.includes(n.id) ? { ...n, pushed: true } : n)) })),
    };
  }, [loaded, data, user, settings, isDark, cloud, update]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ---------- Derived helpers used by several screens ----------

export function attendanceStats(data: SchoolData, studentId: string) {
  let present = 0, absent = 0, leave = 0;
  for (const a of data.attendance) {
    const m = a.marks[studentId];
    if (m === 'P') present++;
    else if (m === 'A') absent++;
    else if (m === 'L') leave++;
  }
  const total = present + absent + leave;
  return { present, absent, leave, total, pct: total ? Math.round((present / total) * 100) : 0 };
}

export function todayAttendancePct(data: SchoolData) {
  const recs = data.attendance.filter((a) => a.date === today() && a.classId !== STAFF_ATTENDANCE);
  const marks = recs.flatMap((r) => Object.values(r.marks));
  if (!marks.length) return null;
  return Math.round((marks.filter((m) => m === 'P').length / marks.length) * 100);
}

export function feeSummary(data: SchoolData, month = thisMonth()) {
  const fees = data.fees.filter((f) => f.month === month);
  const collected = fees.filter((f) => f.status === 'paid').reduce((s, f) => s + netFee(f), 0);
  const pending = fees.filter((f) => f.status === 'unpaid').reduce((s, f) => s + netFee(f), 0);
  return { collected, pending, paidCount: fees.filter((f) => f.status === 'paid').length, count: fees.length };
}

export function salarySummary(data: SchoolData, month = thisMonth()) {
  const recs = data.salaries.filter((s) => s.month === month);
  const paid = recs.filter((s) => s.status === 'paid').reduce((n, s) => n + netSalary(s), 0);
  const unpaid = recs.filter((s) => s.status === 'unpaid').reduce((n, s) => n + netSalary(s), 0);
  const paidCount = recs.filter((s) => s.status === 'paid').length;
  return { total: paid + unpaid, paid, unpaid, paidCount, unpaidCount: recs.length - paidCount, count: recs.length };
}

export const className = classNameOf;

export function userName(data: SchoolData, id?: string) {
  return data.users.find((u) => u.id === id)?.name ?? '—';
}

export function noticesFor(data: SchoolData, role: User['role']) {
  if (role === 'admin') return data.notices;
  const aud: Audience = role === 'teacher' ? 'teachers' : 'parents';
  return data.notices.filter((n) => n.audience === 'all' || n.audience === aud);
}

/** People this user can chat with: parents ↔ teachers of their children's classes */
export function chatContacts(data: SchoolData, user: User) {
  if (user.role === 'parent') {
    const classIds = new Set(data.students.filter((s) => s.parentId === user.id).map((s) => s.classId));
    return data.users.filter((u) => u.role === 'teacher' && u.classIds?.some((c) => classIds.has(c)));
  }
  if (user.role === 'teacher') {
    const parentIds = new Set(data.students.filter((s) => user.classIds?.includes(s.classId)).map((s) => s.parentId));
    return data.users.filter((u) => parentIds.has(u.id));
  }
  return [];
}

export function unreadMessages(data: SchoolData, userId: string, fromId?: string) {
  return data.messages.filter((m) => m.to === userId && !m.read && (!fromId || m.from === fromId)).length;
}

export function unreadNotifications(data: SchoolData, userId: string) {
  return data.notifications.filter((n) => n.userId === userId && !n.read).length;
}
