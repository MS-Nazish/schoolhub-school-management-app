// Fee challan (payment voucher) PDF: Bank, School and Parent copies on one page per student
import { escapeHtml as esc, sharePdf } from './print';
import { formatDate, formatMonth, money, today } from './utils';
import { SCHOOL_NAME } from '@/data/seed';
import { className, netFee, userName } from '@/data/store';
import type { FeeRecord, SchoolData } from '@/data/types';

/** Paid by the 10th of the month; after that a late fee applies */
const DUE_DAY = 10;
export const LATE_FEE = 200;
const BANK = { name: 'Habib Bank Ltd (demo)', account: '0001-2345678-01', title: `${SCHOOL_NAME} Fee Account` };

const COPIES = ['Bank Copy', 'School Copy', 'Parent Copy'];

function challanPage(data: SchoolData, fee: FeeRecord) {
  const student = data.students.find((s) => s.id === fee.studentId);
  const challanNo = `CH-${fee.month.replace('-', '')}-${fee.studentId.toUpperCase()}`;
  const issued = `${fee.month}-01`;
  const due = `${fee.month}-${String(DUE_DAY).padStart(2, '0')}`;
  const payable = netFee(fee);
  const items = fee.items ?? [{ name: 'Tuition fee', amount: fee.amount }];
  const paid = fee.status === 'paid';

  const copy = (label: string) => `
    <div class="copy">
      <div class="head">
        <div><div class="school">${SCHOOL_NAME}</div><div class="sub">Lahore, Pakistan</div></div>
        <div class="label">${label}</div>
      </div>
      <div class="bank">${esc(BANK.name)} · A/C ${BANK.account} · ${esc(BANK.title)}</div>
      <table class="info">
        <tr><td>Challan No.</td><td><b>${challanNo}</b></td><td>Month</td><td><b>${esc(formatMonth(fee.month))}</b></td></tr>
        <tr><td>Student</td><td><b>${esc(student?.name ?? '—')}</b></td><td>Class / Roll</td><td><b>${esc(student ? `${className(data, student.classId)} · #${student.rollNo}` : '—')}</b></td></tr>
        <tr><td>Father / Guardian</td><td><b>${esc(student ? userName(data, student.parentId) : '—')}</b></td><td>Issue / Due</td><td><b>${esc(formatDate(issued))} / ${esc(formatDate(due))}</b></td></tr>
      </table>
      <table class="fees">
        ${items.map((i) => `<tr><td>${esc(i.name)}</td><td class="r">${money(i.amount)}</td></tr>`).join('')}
        ${fee.discount ? `<tr><td>Discount</td><td class="r green">− ${money(fee.discount)}</td></tr>` : ''}
        ${fee.fine ? `<tr><td>Late fine</td><td class="r red">+ ${money(fee.fine)}</td></tr>` : ''}
        <tr class="total"><td>Payable by ${esc(formatDate(due))}</td><td class="r">${money(payable)}</td></tr>
        <tr class="after"><td>Payable after due date (+ ${money(LATE_FEE)} late fee)</td><td class="r">${money(payable + LATE_FEE)}</td></tr>
      </table>
      <div class="foot">
        <span>${paid ? `<b class="stamp">PAID ${fee.paidOn ? esc(formatDate(fee.paidOn)) : ''}</b>` : 'Depositor signature: ____________'}</span>
        <span>Bank stamp &amp; signature: ____________</span>
      </div>
    </div>`;

  return `<section class="page">${COPIES.map(copy).join('<div class="cut">✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>')}</section>`;
}

function challanHtml(data: SchoolData, fees: FeeRecord[]) {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>Fee Challan</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; font-size: 11px; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .copy { border: 1.5px solid #4F46E5; border-radius: 8px; padding: 8px 10px; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .school { font-size: 16px; font-weight: 800; color: #4F46E5; }
    .sub { color: #6B7280; font-size: 10px; }
    .label { background: #4F46E5; color: #fff; font-weight: 700; padding: 3px 10px; border-radius: 999px; font-size: 10px; letter-spacing: 1px; }
    .bank { margin: 4px 0 6px; color: #374151; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .info td { padding: 2px 4px; }
    .info td:nth-child(odd) { color: #6B7280; width: 16%; }
    .fees { margin-top: 6px; }
    .fees td { padding: 3px 4px; border-bottom: 1px solid #E5E7EB; }
    .r { text-align: right; font-weight: 600; }
    .green { color: #16A34A; } .red { color: #DC2626; }
    .total td { font-weight: 800; font-size: 12px; background: #EEF2FF; border-bottom: 0; }
    .after td { color: #B45309; font-size: 10px; border-bottom: 0; }
    .foot { display: flex; justify-content: space-between; margin-top: 10px; color: #374151; font-size: 10px; }
    .stamp { color: #16A34A; border: 2px solid #16A34A; padding: 2px 8px; border-radius: 4px; letter-spacing: 1px; }
    .cut { text-align: center; color: #9CA3AF; font-size: 10px; margin: 5px 0; white-space: nowrap; overflow: hidden; }
  </style></head><body>
  ${fees.map((f) => challanPage(data, f)).join('')}
  <div style="display:none">Printed ${formatDate(today())}</div>
  </body></html>`;
}

/** One student's challan */
export function shareChallan(data: SchoolData, fee: FeeRecord) {
  const student = data.students.find((s) => s.id === fee.studentId);
  return sharePdf(challanHtml(data, [fee]), `Fee Challan ${student?.name ?? ''} ${formatMonth(fee.month)}`);
}

/** Every challan of a class for a month, one page each */
export function shareClassChallans(data: SchoolData, fees: FeeRecord[], title: string) {
  return sharePdf(challanHtml(data, fees), title);
}
