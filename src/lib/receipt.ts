import { escapeHtml as esc, sharePdf } from './print';
import { formatDate, formatMonth, money, today } from './utils';
import { SCHOOL_NAME } from '@/data/seed';
import { className, userName } from '@/data/store';
import type { FeeRecord, SchoolData } from '@/data/types';

export function feeReceiptHtml(data: SchoolData, fee: FeeRecord) {
  const student = data.students.find((s) => s.id === fee.studentId);
  const receiptNo = `FR-${fee.month.replace('-', '')}-${fee.studentId.toUpperCase()}`;
  const row = (label: string, value: string) => `<tr><td class="l">${label}</td><td>${esc(value)}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8" />
  <title>Fee Receipt ${receiptNo}</title>
  <style>
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 32px; }
    .box { max-width: 560px; margin: 0 auto; border: 2px solid #4F46E5; border-radius: 14px; padding: 24px; }
    .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #C7D2FE; padding-bottom: 12px; }
    .school { font-size: 24px; font-weight: 800; color: #4F46E5; }
    .sub { color: #6B7280; font-size: 12px; }
    h2 { text-align: center; letter-spacing: 2px; margin: 18px 0 12px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 8px 4px; border-bottom: 1px solid #E5E7EB; }
    td.l { color: #6B7280; width: 45%; }
    .amount { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; background: #EEF2FF; border-radius: 10px; padding: 14px; }
    .amount b { font-size: 24px; color: #3730A3; }
    .paid { display: inline-block; margin-top: 16px; border: 3px solid #16A34A; color: #16A34A; font-weight: 800; letter-spacing: 3px; padding: 6px 16px; border-radius: 8px; transform: rotate(-6deg); }
    .sign { margin-top: 40px; text-align: right; font-size: 13px; }
    .sign span { border-top: 1px solid #111827; padding-top: 4px; }
    .foot { margin-top: 18px; text-align: center; color: #9CA3AF; font-size: 11px; }
  </style></head><body>
  <div class="box">
    <div class="head">
      <div><div class="school">${SCHOOL_NAME}</div><div class="sub">Smart School Management · Lahore, Pakistan</div></div>
      <div class="sub">Receipt No.<br /><b>${receiptNo}</b></div>
    </div>
    <h2>FEE RECEIPT</h2>
    <table>
      ${row('Student', student?.name ?? '—')}
      ${row('Class / Roll No.', student ? `${className(data, student.classId)} · #${student.rollNo}` : '—')}
      ${row('Father / Guardian', student ? userName(data, student.parentId) : '—')}
      ${row('Fee for', `Tuition fee · ${formatMonth(fee.month)}`)}
      ${row('Paid on', fee.paidOn ? formatDate(fee.paidOn) : '—')}
    </table>
    <div class="amount"><span>Amount received</span><b>${money(fee.amount)}</b></div>
    <div class="paid">PAID</div>
    <div class="sign"><span>Accounts Office</span></div>
    <div class="foot">Computer generated receipt · printed ${formatDate(today())}</div>
  </div>
  </body></html>`;
}

export function shareFeeReceipt(data: SchoolData, fee: FeeRecord) {
  return sharePdf(feeReceiptHtml(data, fee), `Fee Receipt ${formatMonth(fee.month)}`);
}
