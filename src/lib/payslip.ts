import { escapeHtml as esc, sharePdf } from './print';
import { formatDate, formatMonth, money, today } from './utils';
import { SCHOOL_NAME } from '@/data/seed';
import { className, netSalary } from '@/data/store';
import type { SalaryRecord, SchoolData } from '@/data/types';

export function payslipHtml(data: SchoolData, rec: SalaryRecord) {
  const teacher = data.users.find((u) => u.id === rec.teacherId);
  const slipNo = `PS-${rec.month.replace('-', '')}-${rec.teacherId.toUpperCase()}`;
  const line = (label: string, value: string, cls = '') => `<tr class="${cls}"><td>${label}</td><td class="r">${esc(value)}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8" />
  <title>Payslip ${slipNo}</title>
  <style>
    body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 32px; }
    .box { max-width: 580px; margin: 0 auto; border: 2px solid #4F46E5; border-radius: 14px; padding: 24px; }
    .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #C7D2FE; padding-bottom: 12px; }
    .school { font-size: 24px; font-weight: 800; color: #4F46E5; }
    .sub { color: #6B7280; font-size: 12px; }
    h2 { text-align: center; letter-spacing: 2px; margin: 18px 0 12px; font-size: 18px; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; font-size: 14px; margin-bottom: 14px; }
    .info span { color: #6B7280; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 9px 4px; border-bottom: 1px solid #E5E7EB; }
    td.r { text-align: right; font-weight: 600; }
    tr.minus td.r { color: #DC2626; }
    tr.plus td.r { color: #16A34A; }
    tr.net td { font-size: 18px; font-weight: 800; background: #EEF2FF; border-bottom: 0; }
    .note { margin-top: 12px; font-size: 13px; color: #374151; }
    .status { display: inline-block; margin-top: 16px; border: 3px solid ${rec.status === 'paid' ? '#16A34A' : '#D97706'}; color: ${rec.status === 'paid' ? '#16A34A' : '#D97706'}; font-weight: 800; letter-spacing: 3px; padding: 6px 16px; border-radius: 8px; transform: rotate(-6deg); }
    .sign { display: flex; justify-content: space-between; margin-top: 44px; font-size: 13px; }
    .sign span { border-top: 1px solid #111827; padding-top: 4px; width: 40%; text-align: center; }
    .foot { margin-top: 18px; text-align: center; color: #9CA3AF; font-size: 11px; }
  </style></head><body>
  <div class="box">
    <div class="head">
      <div><div class="school">${SCHOOL_NAME}</div><div class="sub">Smart School Management · Lahore, Pakistan</div></div>
      <div class="sub">Payslip No.<br /><b>${slipNo}</b></div>
    </div>
    <h2>SALARY SLIP · ${esc(formatMonth(rec.month).toUpperCase())}</h2>
    <div class="info">
      <div><span>Teacher:</span> <b>${esc(teacher?.name ?? '—')}</b></div>
      <div><span>Subject:</span> <b>${esc(teacher?.subject ?? '—')}</b></div>
      <div><span>Classes:</span> <b>${esc((teacher?.classIds ?? []).map((c) => className(data, c)).join(', ') || '—')}</b></div>
      <div><span>Paid on:</span> <b>${rec.paidOn ? esc(formatDate(rec.paidOn)) : '—'}</b></div>
    </div>
    <table>
      ${line('Basic salary', money(rec.amount))}
      ${rec.bonus ? line('Bonus / allowance', `+ ${money(rec.bonus)}`, 'plus') : ''}
      ${rec.deduction ? line('Deduction', `− ${money(rec.deduction)}`, 'minus') : ''}
      ${line('Net salary', money(netSalary(rec)), 'net')}
    </table>
    ${rec.note ? `<div class="note"><b>Note:</b> ${esc(rec.note)}</div>` : ''}
    <div class="status">${rec.status === 'paid' ? 'PAID' : 'UNPAID'}</div>
    <div class="sign"><span>Principal</span><span>Teacher</span></div>
    <div class="foot">Computer generated payslip · printed ${formatDate(today())}</div>
  </div>
  </body></html>`;
}

export function sharePayslip(data: SchoolData, rec: SalaryRecord) {
  return sharePdf(payslipHtml(data, rec), `Payslip ${formatMonth(rec.month)}`);
}
