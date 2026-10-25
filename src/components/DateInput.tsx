// Date box in DD-MM-YYYY (the usual format in Pakistan); dates are stored as YYYY-MM-DD
import { Input } from './ui';

/** YYYY-MM-DD → DD-MM-YYYY ('' stays '') */
export const isoToDmy = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}-${m}-${y}` : '';
};

/** DD-MM-YYYY → YYYY-MM-DD, or null when it isn't a real date */
export const dmyToIso = (dmy: string) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null;
  return `${y}-${mo}-${d}`;
};

/** Adds the dashes while typing: 15032014 → 15-03-2014 */
const autoFormat = (v: string) => {
  const digits = v.replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

export function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (dmy: string) => void }) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={(v) => onChange(autoFormat(v))}
      placeholder="DD-MM-YYYY"
      keyboardType="number-pad"
      maxLength={10}
    />
  );
}
