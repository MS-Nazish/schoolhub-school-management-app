/**
 * Firestore sync for the store.
 *
 * Each SchoolData collection is a Firestore collection whose documents use the record's `id`.
 * Screens never talk to Firestore directly: the store applies a change locally, then
 * `commitChanges` writes only the records that differ, and `subscribeSchool` streams back
 * exactly the records the signed-in user is allowed to see (see firestore.rules).
 *
 * A few things exist only in Firestore, to make the security rules possible:
 * - `profiles/{email}`: role, user id and class ids of each login (rules look this up);
 * - `payroll/{teacherId}`: teacher salaries, kept out of `users` so parents can't read them;
 * - `classId` / `parentId` on results and fees, so rules can tell whose record it is.
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  type Query, collection, doc, getDoc, getDocs, limit, onSnapshot, query, where, writeBatch,
} from 'firebase/firestore';

import { createSeedData } from './seed';
import type { Role, SchoolData } from './types';
import { createLogin, getAuthInstance, getDb } from '@/lib/firebase';

/** Logins treated as school admins (must match ADMIN_EMAILS in firestore.rules) */
export const ADMIN_EMAILS = ['admin@school.com'];

export const COLLECTIONS = [
  'users', 'classes', 'students', 'attendance', 'homework', 'results', 'fees', 'salaries', 'timetable',
  'notices', 'messages', 'notifications',
] as const satisfies readonly (keyof SchoolData)[];

type Name = (typeof COLLECTIONS)[number];
type Extra = 'payroll' | 'profiles';
type DocData = Record<string, unknown>;
type Docs = Map<string, DocData>;

export const emptySchool = (): SchoolData =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as SchoolData;

export interface Me { email: string; userId: string; role: Role; classIds: string[] }

const rows = (data: SchoolData, name: Name) => data[name] as unknown as ({ id: string } & DocData)[];

/** The Firestore documents a version of SchoolData corresponds to, per collection */
function toDocs(data: SchoolData, name: Name | Extra): Docs {
  const out: Docs = new Map();
  const studentById = new Map(data.students.map((s) => [s.id, s]));
  if (name === 'profiles') {
    for (const u of data.users) {
      const classIds = u.role === 'teacher' ? u.classIds ?? []
        : u.role === 'parent' ? [...new Set(data.students.filter((s) => s.parentId === u.id).map((s) => s.classId))]
          : [];
      out.set(u.email.toLowerCase(), { userId: u.id, role: u.role, classIds });
    }
    return out;
  }
  if (name === 'payroll') {
    for (const u of data.users) if (u.role === 'teacher') out.set(u.id, { teacherId: u.id, amount: u.salary ?? 0 });
    return out;
  }
  for (const r of rows(data, name)) {
    let d: DocData = { ...r };
    delete d.id;
    if (name === 'users') {
      // Passwords live in Firebase Auth, salaries in payroll
      const { password: _p, salary: _s, ...rest } = d;
      d = rest;
    } else if (name === 'results' || name === 'fees') {
      const s = studentById.get(r.studentId as string);
      d = { ...d, classId: s?.classId ?? null, parentId: s?.parentId ?? null };
    }
    out.set(r.id, d);
  }
  return out;
}

const same = (a: DocData | undefined, b: DocData) => !!a && JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
const sortKeys = (o: DocData) => Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

type Op = { kind: 'set'; col: string; id: string; data: DocData } | { kind: 'delete'; col: string; id: string };

function diff(col: string, before: Docs, after: Docs, deletes = true): Op[] {
  const ops: Op[] = [];
  for (const [id, data] of after) if (!same(before.get(id), data)) ops.push({ kind: 'set', col, id, data });
  if (deletes) for (const id of before.keys()) if (!after.has(id)) ops.push({ kind: 'delete', col, id });
  return ops;
}

async function runOps(ops: Op[]) {
  const db = getDb();
  // Firestore batches hold at most 500 writes
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 400)) {
      const ref = doc(db, op.col, op.id);
      if (op.kind === 'set') batch.set(ref, op.data);
      else batch.delete(ref);
    }
    await batch.commit();
  }
  return ops.length;
}

/** Writes the difference between two versions of the school data */
export function commitChanges(prev: SchoolData, next: SchoolData, role: Role | undefined) {
  const ops: Op[] = [];
  for (const name of COLLECTIONS) {
    if (prev[name] !== next[name]) ops.push(...diff(name, toDocs(prev, name), toDocs(next, name)));
  }
  // Only admins change users/students, which is what profiles and payroll are derived from
  if (role === 'admin' && (prev.users !== next.users || prev.students !== next.students)) {
    ops.push(...diff('profiles', toDocs(prev, 'profiles'), toDocs(next, 'profiles')));
    ops.push(...diff('payroll', toDocs(prev, 'payroll'), toDocs(next, 'payroll')));
  }
  return runOps(ops);
}

/** Who is signed in, from their profile (admins work even before profiles exist) */
export async function loadMe(email: string): Promise<Me | null> {
  const snap = await getDoc(doc(getDb(), 'profiles', email));
  if (snap.exists()) {
    const p = snap.data() as { userId: string; role: Role; classIds?: string[] };
    return { email, userId: p.userId, role: p.role, classIds: p.classIds ?? [] };
  }
  if (ADMIN_EMAILS.includes(email)) return { email, userId: '', role: 'admin', classIds: [] };
  return null;
}

/** The queries for what this user may read; several queries for one collection are merged */
function queriesFor(me: Me): [Name | Extra, Query][] {
  const db = getDb();
  const all = (c: string) => collection(db, c);
  const q = (c: string, field: string, op: '==' | 'in', value: unknown) => query(all(c), where(field, op, value));
  const shared: [Name | Extra, Query][] = (['users', 'classes', 'timetable', 'notices', 'homework'] as const).map((c) => [c, all(c)]);

  if (me.role === 'admin') {
    return [...COLLECTIONS, 'payroll', 'profiles'].map((c) => [c as Name | Extra, all(c)]);
  }
  const mine: [Name | Extra, Query][] = [
    ['messages', q('messages', 'from', '==', me.userId)],
    ['messages', q('messages', 'to', '==', me.userId)],
    ['notifications', q('notifications', 'userId', '==', me.userId)],
  ];
  // `in` needs at least one value
  const byClass: [Name | Extra, Query][] = me.classIds.length
    ? [['attendance', q('attendance', 'classId', 'in', me.classIds.slice(0, 30))]]
    : [];

  if (me.role === 'teacher') {
    if (me.classIds.length) {
      byClass.push(['students', q('students', 'classId', 'in', me.classIds.slice(0, 30))]);
      byClass.push(['results', q('results', 'classId', 'in', me.classIds.slice(0, 30))]);
    }
    return [
      ...shared, ...mine, ...byClass,
      ['salaries', q('salaries', 'teacherId', '==', me.userId)],
      ['payroll', q('payroll', 'teacherId', '==', me.userId)],
    ];
  }
  return [
    ...shared, ...mine, ...byClass,
    ['students', q('students', 'parentId', '==', me.userId)],
    ['results', q('results', 'parentId', '==', me.userId)],
    ['fees', q('fees', 'parentId', '==', me.userId)],
  ];
}

/** Builds SchoolData from the documents received so far */
function assemble(raw: Record<string, Docs>): SchoolData {
  const out = emptySchool() as unknown as Record<string, unknown[]>;
  for (const name of COLLECTIONS) {
    out[name] = [...(raw[name] ?? new Map()).entries()].map(([id, d]) => ({ ...d, id }));
  }
  // Put salaries back on the teacher records (older data may still have them there)
  const pay = raw.payroll ?? new Map();
  out.users = (out.users as DocData[]).map((u) => (pay.has(u.id as string) ? { ...u, salary: pay.get(u.id as string)!.amount } : u));
  return out as unknown as SchoolData;
}

/**
 * Streams everything `me` may read. `onData` gets the assembled school data;
 * `onReady` fires once every query has answered.
 */
export function subscribeSchool(me: Me, onData: (d: SchoolData) => void, onReady: () => void, onError: (e: Error) => void) {
  const sources = queriesFor(me);
  // Documents per source query, merged per collection on every change
  const perSource: Docs[] = sources.map(() => new Map());
  const answered = new Set<number>();
  let readyFired = false;
  let lastRaw: Record<string, Docs> = {};

  const emit = () => {
    const raw: Record<string, Docs> = {};
    sources.forEach(([name], i) => {
      raw[name] ??= new Map();
      for (const [id, d] of perSource[i]!) raw[name]!.set(id, d);
    });
    lastRaw = raw;
    onData(assemble(raw));
  };

  const unsubs = sources.map(([, qry], i) => onSnapshot(
    qry,
    (snap) => {
      perSource[i] = new Map(snap.docs.map((d) => [d.id, d.data()]));
      answered.add(i);
      emit();
      if (!readyFired && answered.size === sources.length) {
        readyFired = true;
        onReady();
      }
    },
    onError,
  ));

  return {
    unsubscribe: () => unsubs.forEach((u) => u()),
    /** The documents exactly as stored in Firestore */
    raw: () => lastRaw,
  };
}

/**
 * Admin only: brings the Firestore-only extras (profiles, payroll, classId/parentId on
 * results and fees) in line with the data, e.g. for data written by an older version.
 */
export function reconcile(data: SchoolData, raw: Record<string, Docs>) {
  const ops: Op[] = [];
  for (const name of ['users', 'results', 'fees'] as const) ops.push(...diff(name, raw[name] ?? new Map(), toDocs(data, name), false));
  for (const name of ['profiles', 'payroll'] as const) ops.push(...diff(name, raw[name] ?? new Map(), toDocs(data, name)));
  return runOps(ops);
}

export async function isDatabaseEmpty() {
  try {
    const snap = await getDocs(query(collection(getDb(), 'users'), limit(1)));
    return snap.empty;
  } catch {
    // Signed-out reads are refused once the security rules are on, which means it's set up
    return false;
  }
}

/** Fills an empty project with the demo school and creates a login for every demo user */
export async function seedDemoSchool(onProgress: (msg: string) => void) {
  const seed = createSeedData();
  let n = 0;
  for (const u of seed.users) {
    n++;
    onProgress(`Creating logins ${n}/${seed.users.length}…`);
    if (u.password) await createLogin(u.email, u.password);
  }
  // Write as the admin so it also works once the security rules are published
  const admin = seed.users.find((u) => u.role === 'admin')!;
  await signInWithEmailAndPassword(getAuthInstance(), admin.email, admin.password!);
  onProgress('Uploading demo data…');
  await commitChanges(emptySchool(), seed, 'admin');
}

/** Makes sure a Firebase login exists for a user added from the app */
export const ensureLogin = (email: string, password: string) => createLogin(email, password);
