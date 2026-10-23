// Security rules tests. Run with:  npm run test:rules
// (starts a local Firestore emulator; nothing touches the real Firebase project)
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';

let env;

const admin = () => env.authenticatedContext('admin', { email: 'admin@school.com' }).firestore();
const teacher = () => env.authenticatedContext('t1', { email: 'teacher@school.com' }).firestore(); // u-t1, class c6
const parent = () => env.authenticatedContext('p1', { email: 'parent@school.com' }).firestore(); // u-p1, child s1 in c6
const otherParent = () => env.authenticatedContext('p2', { email: 'parent2@school.com' }).firestore(); // u-p2, child s2 in c7
const stranger = () => env.authenticatedContext('x', { email: 'nobody@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-schoolhub',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const put = (path, data) => setDoc(doc(db, path), data);
    await put('profiles/admin@school.com', { userId: 'u-admin', role: 'admin', classIds: [] });
    await put('profiles/teacher@school.com', { userId: 'u-t1', role: 'teacher', classIds: ['c6'] });
    await put('profiles/parent@school.com', { userId: 'u-p1', role: 'parent', classIds: ['c6'] });
    await put('profiles/parent2@school.com', { userId: 'u-p2', role: 'parent', classIds: ['c7'] });
    await put('users/u-t1', { name: 'Ayesha', role: 'teacher', email: 'teacher@school.com', classIds: ['c6'] });
    await put('users/u-p1', { name: 'Imran', role: 'parent', email: 'parent@school.com' });
    await put('classes/c6', { name: 'Class 6-A' });
    await put('students/s1', { name: 'Ali', classId: 'c6', parentId: 'u-p1', rollNo: 1 });
    await put('students/s2', { name: 'Hassan', classId: 'c7', parentId: 'u-p2', rollNo: 1 });
    await put('attendance/c6_2026-10-23', { classId: 'c6', date: '2026-10-23', marks: { s1: 'P' }, takenBy: 'u-t1' });
    await put('attendance/c7_2026-10-23', { classId: 'c7', date: '2026-10-23', marks: { s2: 'A' }, takenBy: 'u-t3' });
    await put('results/s1_Mid_Math', { studentId: 's1', classId: 'c6', parentId: 'u-p1', marks: 80, total: 100 });
    await put('results/s2_Mid_Math', { studentId: 's2', classId: 'c7', parentId: 'u-p2', marks: 70, total: 100 });
    await put('fees/s1_2026-10', { studentId: 's1', classId: 'c6', parentId: 'u-p1', amount: 5000, status: 'unpaid' });
    await put('fees/s2_2026-10', { studentId: 's2', classId: 'c7', parentId: 'u-p2', amount: 5000, status: 'unpaid' });
    await put('salaries/u-t1_2026-10', { teacherId: 'u-t1', amount: 55000, status: 'paid' });
    await put('salaries/u-t2_2026-10', { teacherId: 'u-t2', amount: 50000, status: 'unpaid' });
    await put('payroll/u-t1', { teacherId: 'u-t1', amount: 55000 });
    await put('payroll/u-t2', { teacherId: 'u-t2', amount: 50000 });
    await put('messages/m1', { from: 'u-p1', to: 'u-t1', text: 'Hi', read: false });
    await put('messages/m2', { from: 'u-p2', to: 'u-t2', text: 'Private', read: false });
    await put('notifications/n1', { userId: 'u-p1', title: 'Absent', read: false });
    await put('notifications/n2', { userId: 'u-p2', title: 'Absent', read: false });
  });
});

after(async () => env?.cleanup());

describe('signed out', () => {
  test('cannot read anything', async () => {
    await assertFails(getDocs(collection(anon(), 'users')));
    await assertFails(getDoc(doc(anon(), 'students/s1')));
  });
  test('a login without a school profile sees only public lists', async () => {
    await assertSucceeds(getDocs(collection(stranger(), 'classes')));
    await assertFails(getDoc(doc(stranger(), 'students/s1')));
    await assertFails(getDocs(collection(stranger(), 'salaries')));
  });
});

describe('admin', () => {
  test('reads and writes everything', async () => {
    for (const c of ['students', 'fees', 'salaries', 'payroll', 'profiles', 'messages', 'notifications']) {
      await assertSucceeds(getDocs(collection(admin(), c)));
    }
    await assertSucceeds(updateDoc(doc(admin(), 'salaries/u-t2_2026-10'), { status: 'paid' }));
    await assertSucceeds(setDoc(doc(admin(), 'profiles/new@school.com'), { userId: 'u-new', role: 'teacher', classIds: [] }));
  });
});

describe('teacher (class 6-A)', () => {
  const me = 'u-t1';
  test('loads own classes with the app queries', async () => {
    const db = teacher();
    await assertSucceeds(getDocs(query(collection(db, 'students'), where('classId', 'in', ['c6']))));
    await assertSucceeds(getDocs(query(collection(db, 'attendance'), where('classId', 'in', ['c6']))));
    await assertSucceeds(getDocs(query(collection(db, 'results'), where('classId', 'in', ['c6']))));
    await assertSucceeds(getDocs(query(collection(db, 'salaries'), where('teacherId', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'payroll'), where('teacherId', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'messages'), where('from', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'messages'), where('to', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'notifications'), where('userId', '==', me))));
  });
  test('cannot see other classes, fees, or other salaries', async () => {
    const db = teacher();
    await assertFails(getDoc(doc(db, 'students/s2')));
    await assertFails(getDocs(collection(db, 'students')));
    await assertFails(getDoc(doc(db, 'attendance/c7_2026-10-23')));
    await assertFails(getDocs(collection(db, 'fees')));
    await assertFails(getDoc(doc(db, 'salaries/u-t2_2026-10')));
    await assertFails(getDoc(doc(db, 'payroll/u-t2')));
    await assertFails(getDoc(doc(db, 'messages/m2')));
  });
  test('marks attendance and results only for own class', async () => {
    const db = teacher();
    await assertSucceeds(setDoc(doc(db, 'attendance/c6_2026-10-24'), { classId: 'c6', date: '2026-10-24', marks: { s1: 'A' }, takenBy: me }));
    await assertFails(setDoc(doc(db, 'attendance/c7_2026-10-24'), { classId: 'c7', date: '2026-10-24', marks: {}, takenBy: me }));
    await assertSucceeds(setDoc(doc(db, 'results/s1_Final_Math'), { studentId: 's1', classId: 'c6', parentId: 'u-p1', marks: 90, total: 100 }));
    await assertFails(setDoc(doc(db, 'results/s2_Final_Math'), { studentId: 's2', classId: 'c7', parentId: 'u-p2', marks: 90, total: 100 }));
  });
  test('posts homework for own class only, and can notify parents', async () => {
    const db = teacher();
    await assertSucceeds(setDoc(doc(db, 'homework/h1'), { classId: 'c6', teacherId: me, title: 'Ex 1' }));
    await assertFails(setDoc(doc(db, 'homework/h2'), { classId: 'c7', teacherId: me, title: 'Ex 1' }));
    await assertSucceeds(setDoc(doc(db, 'notifications/n3'), { userId: 'u-p1', title: 'New homework', read: false }));
  });
  test('cannot change salaries, users or profiles', async () => {
    const db = teacher();
    await assertFails(updateDoc(doc(db, 'salaries/u-t1_2026-10'), { amount: 999999 }));
    await assertFails(setDoc(doc(db, 'payroll/u-t1'), { teacherId: me, amount: 999999 }));
    await assertFails(setDoc(doc(db, 'profiles/teacher@school.com'), { userId: me, role: 'admin', classIds: [] }));
    await assertFails(setDoc(doc(db, 'users/u-t1'), { name: 'Hacked', role: 'admin' }));
  });
});

describe('parent (child Ali in 6-A)', () => {
  const me = 'u-p1';
  test('loads own children with the app queries', async () => {
    const db = parent();
    await assertSucceeds(getDocs(query(collection(db, 'students'), where('parentId', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'attendance'), where('classId', 'in', ['c6']))));
    await assertSucceeds(getDocs(query(collection(db, 'results'), where('parentId', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'fees'), where('parentId', '==', me))));
    await assertSucceeds(getDocs(query(collection(db, 'notifications'), where('userId', '==', me))));
    await assertSucceeds(getDocs(collection(db, 'users')));
    await assertSucceeds(getDocs(collection(db, 'homework')));
  });
  test("cannot see other children, salaries or other people's messages", async () => {
    const db = parent();
    await assertFails(getDoc(doc(db, 'students/s2')));
    await assertFails(getDoc(doc(db, 'results/s2_Mid_Math')));
    await assertFails(getDoc(doc(db, 'fees/s2_2026-10')));
    await assertFails(getDocs(collection(db, 'salaries')));
    await assertFails(getDocs(collection(db, 'payroll')));
    await assertFails(getDoc(doc(db, 'messages/m2')));
    await assertFails(getDoc(doc(db, 'notifications/n2')));
    await assertFails(getDoc(doc(otherParent(), 'students/s1')));
  });
  test('can pay own fee but not change the amount or pay for others', async () => {
    const db = parent();
    await assertFails(updateDoc(doc(db, 'fees/s1_2026-10'), { amount: 1 }));
    await assertSucceeds(updateDoc(doc(db, 'fees/s1_2026-10'), { status: 'paid', paidOn: '2026-10-24' }));
    await assertFails(updateDoc(doc(db, 'fees/s2_2026-10'), { status: 'paid', paidOn: '2026-10-24' }));
  });
  test("can change own child's photo but nothing else", async () => {
    const db = parent();
    await assertSucceeds(updateDoc(doc(db, 'students/s1'), { photo: 'data:image/jpeg;base64,AAA' }));
    await assertFails(updateDoc(doc(db, 'students/s1'), { classId: 'c8' }));
    await assertFails(updateDoc(doc(db, 'students/s2'), { photo: 'x' }));
  });
  test('chat: sends as self, marks received messages read, cannot fake sender', async () => {
    const db = parent();
    await assertSucceeds(setDoc(doc(db, 'messages/m3'), { from: me, to: 'u-t1', text: 'Thanks', read: false }));
    await assertFails(setDoc(doc(db, 'messages/m4'), { from: 'u-t1', to: me, text: 'Fake', read: false }));
    await assertSucceeds(updateDoc(doc(teacher(), 'messages/m1'), { read: true }));
    await assertFails(updateDoc(doc(db, 'messages/m1'), { text: 'edited' }));
  });
  test('cannot mark attendance or post homework', async () => {
    const db = parent();
    await assertFails(setDoc(doc(db, 'attendance/c6_2026-10-25'), { classId: 'c6', date: '2026-10-25', marks: {}, takenBy: me }));
    await assertFails(setDoc(doc(db, 'homework/h9'), { classId: 'c6', teacherId: me, title: 'x' }));
  });
});
