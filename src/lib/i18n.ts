/**
 * Minimal English / Urdu translation.
 *
 * Strings are written in English in the code and wrapped with t(); in Urdu mode the
 * English text is looked up in `ur` (falling back to English when missing).
 * Placeholders like {name} are filled from `vars`.
 */
import { ur } from './ur';
import type { Lang } from '@/data/types';

let lang: Lang = 'en';

export const setLang = (l: Lang) => { lang = l; };
export const getLang = () => lang;
export const isUrdu = () => lang === 'ur';

export function t(key: string, vars?: Record<string, string | number>) {
  let s = (lang === 'ur' && ur[key]) || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
