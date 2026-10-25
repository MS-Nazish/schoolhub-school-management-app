import { EXAMS, SCHOOL_NAME } from '@/data/seed';
import { attendanceStats, className, userName } from '@/data/store';
import type { SchoolData, Student } from '@/data/types';
import { escapeHtml as esc, sharePdf } from './print';
import { formatDate, grade, today } from './utils';

const remark = (pct: number) =>
  pct >= 90 ? 'Outstanding performance. Keep it up!'
    : pct >= 75 ? 'Very good work. Keep striving for excellence.'
      : pct >= 60 ? 'Good effort. Can improve with more practice.'
        : pct >= 50 ? 'Satisfactory. Needs to work harder.'
          : 'Needs serious improvement. Please meet the class teacher.';

export function reportCardHtml(data: SchoolData, student: Student) {
  const att = attendanceStats(data, student.id);
  const parent = userName(data, student.parentId);
  const mine = data.results.filter((r) => r.studentId === student.id);
  const exams = EXAMS.filter((e) => mine.some((r) => r.exam === e));

  const examTables = exams.map((exam) => {
    const rows = mine.filter((r) => r.exam === exam).sort((a, b) => a.subject.localeCompare(b.subject));
    const got = rows.reduce((s, r) => s + r.marks, 0);
    const total = rows.reduce((s, r) => s + r.total, 0);
    const pct = Math.round((got / total) * 100);
    return `
      <h3>${esc(exam)}</h3>
      <table>
        <thead><tr><th>Subject</th><th>Marks</th><th>Total</th><th>%</th><th>Grade</th></tr></thead>
        <tbody>
          ${rows.map((r) => {
            const p = Math.round((r.marks / r.total) * 100);
            return `<tr><td>${esc(r.subject)}</td><td>${r.marks}</td><td>${r.total}</td><td>${p}%</td><td class="g">${grade(p)}</td></tr>`;
          }).join('')}
        </tbody>
        <tfoot><tr><td>Total</td><td>${got}</td><td>${total}</td><td>${pct}%</td><td class="g">${grade(pct)}</td></tr></tfoot>
      </table>
      <p class="remark"><b>Remarks:</b> ${remark(pct)}</p>`;
  }).join('');

  const photo = student.photo
    ? `<img class="photo" src="${student.photo}" />`
    : `<div class="photo ph">${esc(student.name.split(' ').map((p) => p[0]).join('').slice(0, 2))}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8" />
  <title>Report Card - ${esc(student.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 32px; }
    .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #4F46E5; padding-bottom: 14px; }
    .school { font-size: 28px; font-weight: 800; color: #4F46E5; }
    .sub { color: #6B7280; font-size: 13px; }
    .title { text-align: center; margin: 18px 0; font-size: 20px; font-weight: 800; letter-spacing: 2px; }
    .info { display: flex; gap: 20px; align-items: center; background: #F5F7FB; border-radius: 12px; padding: 16px; }
    .photo { width: 86px; height: 86px; border-radius: 12px; object-fit: cover; }
    .ph { background: #4F46E5; color: #fff; font-size: 30px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; flex: 1; font-size: 14px; }
    .grid span { color: #6B7280; }
    h3 { margin: 22px 0 8px; color: #3730A3; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #4F46E5; color: #fff; text-align: left; padding: 8px 10px; }
    td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
    tfoot td { font-weight: 800; background: #EEF2FF; }
    .g { font-weight: 800; }
    .remark { font-size: 13px; color: #374151; }
    .att { margin-top: 22px; display: flex; gap: 12px; }
    .box { flex: 1; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px; text-align: center; }
    .box b { display: block; font-size: 22px; color: #4F46E5; }
    .sign { display: flex; justify-content: space-between; margin-top: 60px; }
    .sign div { width: 30%; border-top: 1px solid #111827; text-align: center; padding-top: 6px; font-size: 13px; }
    .foot { margin-top: 24px; text-align: center; color: #9CA3AF; font-size: 11px; }
  </style></head><body>
    <div class="head">
      <div><div class="school">${SCHOOL_NAME}</div><div class="sub">Smart School Management · Lahore, Pakistan</div></div>
      <div class="sub">Session ${new Date().getFullYear()}–${new Date().getFullYear() + 1}</div>
    </div>
    <div class="title">STUDENT REPORT CARD</div>
    <div class="info">
      ${photo}
      <div class="grid">
        <div><span>Name:</span> <b>${esc(student.name)}</b></div>
        <div><span>Class:</span> <b>${esc(className(data, student.classId))}</b></div>
        <div><span>Roll No:</span> <b>${student.rollNo}</b></div>
        <div><span>Father / Guardian:</span> <b>${esc(parent)}</b></div>
        <div><span>Date of birth:</span> <b>${student.dob ?? '—'}</b></div>
        <div><span>Issued on:</span> <b>${formatDate(today())}</b></div>
      </div>
    </div>
    ${examTables || '<p>No results published yet.</p>'}
    <div class="att">
      <div class="box"><b>${att.pct}%</b>Attendance</div>
      <div class="box"><b>${att.present}</b>Days present</div>
      <div class="box"><b>${att.absent}</b>Days absent</div>
      <div class="box"><b>${att.leave}</b>Leaves</div>
    </div>
    <div class="sign"><div>Class Teacher</div><div>Principal</div><div>Parent</div></div>
    <div class="foot">This is a computer generated report card from ${SCHOOL_NAME}.</div>
  </body></html>`;
}

/** Create the PDF and open the share sheet (phone) or print dialog (web) */
export function shareReportCard(data: SchoolData, student: Student) {
  return sharePdf(reportCardHtml(data, student), `${student.name} - Report Card`);
}
