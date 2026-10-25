// Exam totals, grades and class positions, shared by the results screens and the report card
import { isUrdu } from './i18n';
import { grade } from './utils';
import type { ResultEntry, SchoolData } from '@/data/types';

export interface ExamSummary {
  got: number;
  total: number;
  pct: number;
  grade: string;
  /** Number of subjects with marks */
  count: number;
}

export function examSummary(results: ResultEntry[], studentId: string, exam: string): ExamSummary {
  const rows = results.filter((r) => r.studentId === studentId && r.exam === exam);
  const got = rows.reduce((s, r) => s + r.marks, 0);
  const total = rows.reduce((s, r) => s + r.total, 0);
  const pct = total ? Math.round((got / total) * 1000) / 10 : 0;
  return { got, total, pct, grade: grade(pct), count: rows.length };
}

/** Position of each student in their class for an exam (by percentage; equal scores share a position) */
export function classPositions(data: SchoolData, classId: string, exam: string) {
  const scored = data.students
    .filter((s) => s.classId === classId)
    .map((s) => ({ id: s.id, ...examSummary(data.results, s.id, exam) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.pct - a.pct);
  const positions = new Map<string, number>();
  scored.forEach((s, i) => {
    const prev = scored[i - 1];
    positions.set(s.id, prev && prev.pct === s.pct ? positions.get(prev.id)! : i + 1);
  });
  return { positions, outOf: scored.length };
}

/** 1st, 2nd, 3rd… (just the number in Urdu) */
export function ordinal(n: number) {
  if (isUrdu()) return String(n);
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}
