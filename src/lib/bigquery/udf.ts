/**
 * BigQuery standard-SQL functions implemented as SQLite user-defined functions.
 *
 * Anything that can be expressed as a scalar or aggregate function lives here.
 * Anything that needs syntax rewriting (INTERVAL, EXTRACT, UNNEST, QUALIFY, CAST type
 * names, array subscripts) lives in `transpile.ts`.
 *
 * SQLite's own build already provides pow/log/ln/exp/log10/sqrt/ceil/floor/trunc/mod/
 * sign/concat/concat_ws/format/string_agg/json_group_array/iif and multi-arg max/min,
 * so those are deliberately absent.
 */

import type { DatabaseSync } from 'node:sqlite';

type Val = string | number | bigint | null | Uint8Array;

const num = (v: Val): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'bigint' ? Number(v) : Number(v);
  return Number.isNaN(n) ? null : n;
};
const str = (v: Val): string | null => (v === null || v === undefined ? null : String(v));

// ─────────────────────────────────────────────────────────────── dates ──

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Bounded memo. Date functions dominate the hot path — a GA4 query calls PARSE_DATE
 * once per row over tens of thousands of rows, across only 366 distinct inputs — and
 * every call otherwise crosses the JS/SQLite boundary and allocates a Date.
 */
function memo<T>(fn: (key: string) => T, limit = 50_000): (key: string) => T {
  const cache = new Map<string, T>();
  return (key: string): T => {
    const hit = cache.get(key);
    if (hit !== undefined || cache.has(key)) return hit as T;
    const val = fn(key);
    if (cache.size < limit) cache.set(key, val);
    return val;
  };
}

/** Accepts DATE ('YYYY-MM-DD'), TIMESTAMP ('YYYY-MM-DD HH:MM:SS'), or epoch-ish numbers. */
function toDate(v: Val): Date | null {
  if (typeof v === 'string') return toDateCached(v);
  return toDateUncached(v);
}

/**
 * Safe to share instances: every consumer here either reads the Date or copies it
 * before mutating (see `dateAdd`), so no caller can corrupt a cached entry.
 */
const toDateCached = memo((s: string) => toDateUncached(s));

function toDateUncached(v: Val): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'bigint') {
    const n = Number(v);
    // Heuristics matching how the warehouse stores time: seconds, millis, micros.
    if (n > 1e14) return new Date(n / 1000);
    if (n > 1e11) return new Date(n);
    if (n > 1e8) return new Date(n * 1000);
    return null;
  }
  const s = String(v).trim();
  if (/^\d{8}$/.test(s)) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`);
  }
  const norm = s.includes('T') ? s : s.replace(' ', 'T');
  const withZone = /[Zz]|[+-]\d{2}:\d{2}$/.test(norm) ? norm : `${norm}Z`;
  const d = new Date(withZone.length === 11 ? `${norm}T00:00:00Z` : withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtTs = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
const DAY = 86_400_000;

/** BigQuery `FORMAT_DATE`/`FORMAT_TIMESTAMP` specifiers we support. */
function formatDate(fmt: string, d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  const startOfYear = Date.UTC(y, 0, 1);
  const doy = Math.floor((d.getTime() - startOfYear) / DAY) + 1;
  const map: Record<string, string> = {
    '%Y': String(y),
    '%y': pad(y % 100),
    '%m': pad(mo + 1),
    '%d': pad(day),
    '%e': String(day).padStart(2, ' '),
    '%H': pad(d.getUTCHours()),
    '%I': pad(((d.getUTCHours() + 11) % 12) + 1),
    '%M': pad(d.getUTCMinutes()),
    '%S': pad(d.getUTCSeconds()),
    '%p': d.getUTCHours() < 12 ? 'AM' : 'PM',
    '%B': MONTHS[mo],
    '%b': MONTHS[mo].slice(0, 3),
    '%h': MONTHS[mo].slice(0, 3),
    '%A': WEEKDAYS[dow],
    '%a': WEEKDAYS[dow].slice(0, 3),
    '%j': pad(doy, 3),
    '%w': String(dow),
    '%u': String(dow === 0 ? 7 : dow),
    '%q': String(Math.floor(mo / 3) + 1),
    '%F': `${y}-${pad(mo + 1)}-${pad(day)}`,
    '%T': `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
    '%W': pad(Math.floor((doy + 6 - ((dow + 6) % 7)) / 7)),
    '%V': pad(isoWeek(d)),
    '%G': String(isoWeekYear(d)),
    '%%': '%',
  };
  return fmt.replace(/%[A-Za-z%]/g, (m) => map[m] ?? m);
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fdNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fdNum + 3);
  return 1 + Math.round((t.getTime() - firstThursday.getTime()) / (7 * DAY));
}
function isoWeekYear(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3);
  return t.getUTCFullYear();
}

/** Inverse of `formatDate` for the specifiers people actually use in PARSE_DATE. */
function parseDate(fmt: string, value: string): string | null {
  const order: string[] = [];
  let re = '';
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] === '%' && i + 1 < fmt.length) {
      const spec = fmt[i + 1];
      i++;
      switch (spec) {
        case 'Y': re += '(\\d{4})'; order.push('Y'); break;
        case 'y': re += '(\\d{2})'; order.push('y'); break;
        case 'm': re += '(\\d{1,2})'; order.push('m'); break;
        case 'd': re += '(\\d{1,2})'; order.push('d'); break;
        case 'H': re += '(\\d{1,2})'; order.push('H'); break;
        case 'M': re += '(\\d{1,2})'; order.push('M'); break;
        case 'S': re += '(\\d{1,2})'; order.push('S'); break;
        case 'b': re += '([A-Za-z]{3})'; order.push('b'); break;
        case 'B': re += '([A-Za-z]+)'; order.push('B'); break;
        case '%': re += '%'; break;
        default: re += '.'; break;
      }
    } else {
      re += fmt[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  const m = new RegExp(`^${re}$`).exec(value.trim());
  if (!m) return null;
  const parts: Record<string, number> = { Y: 1970, m: 1, d: 1, H: 0, M: 0, S: 0 };
  order.forEach((k, i) => {
    const raw = m[i + 1];
    if (k === 'b' || k === 'B') {
      const idx = MONTHS.findIndex((mo) => mo.toLowerCase().startsWith(raw.toLowerCase().slice(0, 3)));
      parts.m = idx + 1;
    } else if (k === 'y') {
      parts.Y = 2000 + Number(raw);
    } else {
      parts[k] = Number(raw);
    }
  });
  const d = new Date(Date.UTC(parts.Y, parts.m - 1, parts.d, parts.H, parts.M, parts.S));
  return Number.isNaN(d.getTime()) ? null : fmtDate(d);
}

type DatePart =
  | 'DAY' | 'WEEK' | 'ISOWEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ISOYEAR'
  | 'HOUR' | 'MINUTE' | 'SECOND' | 'MILLISECOND' | 'MICROSECOND'
  | 'DAYOFWEEK' | 'DAYOFYEAR';

function dateDiff(a: Date, b: Date, part: DatePart): number {
  const ms = a.getTime() - b.getTime();
  switch (part) {
    case 'SECOND': return Math.trunc(ms / 1000);
    case 'MINUTE': return Math.trunc(ms / 60_000);
    case 'HOUR': return Math.trunc(ms / 3_600_000);
    case 'MILLISECOND': return Math.trunc(ms);
    case 'MICROSECOND': return Math.trunc(ms * 1000);
    case 'DAY': return Math.trunc(dayNumber(a) - dayNumber(b));
    // BigQuery counts *boundaries crossed*, not whole periods.
    case 'WEEK': return Math.trunc((dayNumber(a) - weekdayOf(a)) / 7) - Math.trunc((dayNumber(b) - weekdayOf(b)) / 7);
    case 'ISOWEEK': {
      const wa = Math.floor((dayNumber(a) - ((a.getUTCDay() + 6) % 7)) / 7);
      const wb = Math.floor((dayNumber(b) - ((b.getUTCDay() + 6) % 7)) / 7);
      return wa - wb;
    }
    case 'MONTH': return (a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth());
    case 'QUARTER': return (a.getUTCFullYear() - b.getUTCFullYear()) * 4
      + (Math.floor(a.getUTCMonth() / 3) - Math.floor(b.getUTCMonth() / 3));
    case 'YEAR': return a.getUTCFullYear() - b.getUTCFullYear();
    case 'ISOYEAR': return isoWeekYear(a) - isoWeekYear(b);
    default: return Math.trunc(dayNumber(a) - dayNumber(b));
  }
}
const dayNumber = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
const weekdayOf = (d: Date) => d.getUTCDay();

function dateTrunc(d: Date, part: DatePart): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (part) {
    case 'YEAR': case 'ISOYEAR': return new Date(Date.UTC(y, 0, 1));
    case 'QUARTER': return new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
    case 'MONTH': return new Date(Date.UTC(y, m, 1));
    case 'WEEK': return new Date(d.getTime() - weekdayOf(d) * DAY - timeOfDay(d)); // week starts Sunday
    case 'ISOWEEK': return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY - timeOfDay(d));
    case 'DAY': return new Date(d.getTime() - timeOfDay(d));
    case 'HOUR': return new Date(Math.floor(d.getTime() / 3_600_000) * 3_600_000);
    case 'MINUTE': return new Date(Math.floor(d.getTime() / 60_000) * 60_000);
    case 'SECOND': return new Date(Math.floor(d.getTime() / 1000) * 1000);
    default: return new Date(d.getTime() - timeOfDay(d));
  }
}
const timeOfDay = (d: Date) =>
  d.getUTCHours() * 3_600_000 + d.getUTCMinutes() * 60_000 + d.getUTCSeconds() * 1000 + d.getUTCMilliseconds();

function dateAdd(d: Date, n: number, part: DatePart): Date {
  const r = new Date(d.getTime());
  switch (part) {
    case 'DAY': r.setUTCDate(r.getUTCDate() + n); break;
    case 'WEEK': case 'ISOWEEK': r.setUTCDate(r.getUTCDate() + n * 7); break;
    case 'MONTH': {
      const targetDay = r.getUTCDate();
      r.setUTCDate(1);
      r.setUTCMonth(r.getUTCMonth() + n);
      const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
      r.setUTCDate(Math.min(targetDay, lastDay)); // BigQuery clamps, e.g. Jan 31 + 1 month = Feb 28
      break;
    }
    case 'QUARTER': return dateAdd(d, n * 3, 'MONTH');
    case 'YEAR': case 'ISOYEAR': return dateAdd(d, n * 12, 'MONTH');
    case 'HOUR': r.setUTCHours(r.getUTCHours() + n); break;
    case 'MINUTE': r.setUTCMinutes(r.getUTCMinutes() + n); break;
    case 'SECOND': r.setUTCSeconds(r.getUTCSeconds() + n); break;
    default: r.setUTCDate(r.getUTCDate() + n); break;
  }
  return r;
}

function extractPart(part: DatePart, d: Date): number {
  switch (part) {
    case 'YEAR': return d.getUTCFullYear();
    case 'ISOYEAR': return isoWeekYear(d);
    case 'QUARTER': return Math.floor(d.getUTCMonth() / 3) + 1;
    case 'MONTH': return d.getUTCMonth() + 1;
    case 'WEEK': return Math.floor((Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY)
      + new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getUTCDay()) / 7);
    case 'ISOWEEK': return isoWeek(d);
    case 'DAY': return d.getUTCDate();
    case 'DAYOFWEEK': return d.getUTCDay() + 1; // BigQuery: Sunday = 1
    case 'DAYOFYEAR': return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
    case 'HOUR': return d.getUTCHours();
    case 'MINUTE': return d.getUTCMinutes();
    case 'SECOND': return d.getUTCSeconds();
    case 'MILLISECOND': return d.getUTCMilliseconds();
    case 'MICROSECOND': return d.getUTCMilliseconds() * 1000;
    default: return d.getUTCDate();
  }
}

/** DATE parts keep DATE shape; time parts keep TIMESTAMP shape. */
const isTimePart = (p: string) =>
  ['HOUR', 'MINUTE', 'SECOND', 'MILLISECOND', 'MICROSECOND'].includes(p);

// ────────────────────────────────────────────────────────────── regexp ──

/** BigQuery uses RE2. Translate the handful of syntax differences JS cares about. */
function toJsRegex(pattern: string, flags = ''): RegExp {
  const translated = pattern.replace(/\(\?P<([A-Za-z_]\w*)>/g, '(?<$1>');
  return new RegExp(translated, flags);
}

// ══════════════════════════════════════════════════════════════════════
export function registerBigQueryFunctions(db: DatabaseSync): void {
  const fn = (
    name: string,
    impl: (...args: Val[]) => Val,
    opts: { deterministic?: boolean; varargs?: boolean } = {},
  ) => {
    db.function(name, { deterministic: opts.deterministic ?? true, varargs: opts.varargs ?? false },
      impl as (...a: unknown[]) => Val);
  };

  // ── arithmetic ──────────────────────────────────────────────────────
  fn('safe_divide', (a, b) => {
    const x = num(a); const y = num(b);
    if (x === null || y === null || y === 0) return null;
    return x / y;
  });
  fn('ieee_divide', (a, b) => {
    const x = num(a); const y = num(b);
    if (x === null || y === null) return null;
    return y === 0 ? (x === 0 ? NaN : x > 0 ? Infinity : -Infinity) : x / y;
  });
  fn('safe_multiply', (a, b) => {
    const x = num(a); const y = num(b);
    return x === null || y === null ? null : x * y;
  });
  fn('safe_add', (a, b) => {
    const x = num(a); const y = num(b);
    return x === null || y === null ? null : x + y;
  });
  fn('safe_subtract', (a, b) => {
    const x = num(a); const y = num(b);
    return x === null || y === null ? null : x - y;
  });
  fn('safe_negate', (a) => { const x = num(a); return x === null ? null : -x; });
  fn('bq_div', (a, b) => {
    const x = num(a); const y = num(b);
    if (x === null || y === null || y === 0) return null;
    return Math.trunc(x / y);
  });
  fn('is_inf', (a) => (num(a) !== null && !Number.isFinite(num(a)!) ? 1 : 0));
  fn('is_nan', (a) => (Number.isNaN(Number(a)) ? 1 : 0));

  // ── safe casts ──────────────────────────────────────────────────────
  fn('safe_cast_int', (a) => {
    if (a === null) return null;
    const n = Number(String(a).trim());
    return Number.isFinite(n) ? Math.trunc(n) : null;
  });
  fn('safe_cast_float', (a) => {
    if (a === null) return null;
    const n = Number(String(a).trim());
    return Number.isFinite(n) ? n : null;
  });
  fn('safe_cast_date', (a) => {
    const d = toDate(a);
    return d ? fmtDate(d) : null;
  });
  fn('safe_cast_string', (a) => (a === null ? null : String(a)));
  fn('safe_cast_bool', (a) => {
    if (a === null) return null;
    const s = String(a).toLowerCase();
    if (s === 'true' || s === '1') return 1;
    if (s === 'false' || s === '0') return 0;
    return null;
  });

  // ── dates ───────────────────────────────────────────────────────────
  fn('bq_date', (a) => { const d = toDate(a); return d ? fmtDate(d) : null; });
  fn('bq_datetime', (a) => { const d = toDate(a); return d ? fmtTs(d) : null; });
  fn('bq_timestamp', (a) => { const d = toDate(a); return d ? fmtTs(d) : null; });
  fn('current_date_bq', () => fmtDate(new Date()), { deterministic: false });
  fn('current_timestamp_bq', () => fmtTs(new Date()), { deterministic: false });

  fn('date_diff', (a, b, p) => {
    const d1 = toDate(a); const d2 = toDate(b);
    if (!d1 || !d2) return null;
    return dateDiff(d1, d2, (str(p) ?? 'DAY').toUpperCase() as DatePart);
  });
  fn('timestamp_diff', (a, b, p) => {
    const d1 = toDate(a); const d2 = toDate(b);
    if (!d1 || !d2) return null;
    return dateDiff(d1, d2, (str(p) ?? 'SECOND').toUpperCase() as DatePart);
  });
  fn('datetime_diff', (a, b, p) => {
    const d1 = toDate(a); const d2 = toDate(b);
    if (!d1 || !d2) return null;
    return dateDiff(d1, d2, (str(p) ?? 'SECOND').toUpperCase() as DatePart);
  });

  fn('date_trunc', (a, p) => {
    const d = toDate(a);
    if (!d) return null;
    const part = (str(p) ?? 'DAY').toUpperCase() as DatePart;
    return fmtDate(dateTrunc(d, part));
  });
  fn('timestamp_trunc', (a, p) => {
    const d = toDate(a);
    if (!d) return null;
    const part = (str(p) ?? 'DAY').toUpperCase() as DatePart;
    return fmtTs(dateTrunc(d, part));
  });
  fn('datetime_trunc', (a, p) => {
    const d = toDate(a);
    if (!d) return null;
    const part = (str(p) ?? 'DAY').toUpperCase() as DatePart;
    return fmtTs(dateTrunc(d, part));
  });

  fn('date_add', (a, n, p) => {
    const d = toDate(a);
    const k = num(n);
    if (!d || k === null) return null;
    const part = (str(p) ?? 'DAY').toUpperCase() as DatePart;
    const r = dateAdd(d, k, part);
    return isTimePart(part) ? fmtTs(r) : fmtDate(r);
  });
  fn('date_sub', (a, n, p) => {
    const d = toDate(a);
    const k = num(n);
    if (!d || k === null) return null;
    const part = (str(p) ?? 'DAY').toUpperCase() as DatePart;
    const r = dateAdd(d, -k, part);
    return isTimePart(part) ? fmtTs(r) : fmtDate(r);
  });
  fn('timestamp_add', (a, n, p) => {
    const d = toDate(a); const k = num(n);
    if (!d || k === null) return null;
    return fmtTs(dateAdd(d, k, (str(p) ?? 'SECOND').toUpperCase() as DatePart));
  });
  fn('timestamp_sub', (a, n, p) => {
    const d = toDate(a); const k = num(n);
    if (!d || k === null) return null;
    return fmtTs(dateAdd(d, -k, (str(p) ?? 'SECOND').toUpperCase() as DatePart));
  });

  fn('bq_extract', (p, a) => {
    const d = toDate(a);
    if (!d) return null;
    return extractPart((str(p) ?? 'DAY').toUpperCase() as DatePart, d);
  });
  fn('last_day', (a, p) => {
    const d = toDate(a);
    if (!d) return null;
    const part = (str(p) ?? 'MONTH').toUpperCase() as DatePart;
    const start = dateTrunc(d, part);
    const next = dateAdd(start, 1, part === 'ISOWEEK' || part === 'WEEK' ? 'WEEK' : part);
    return fmtDate(new Date(next.getTime() - DAY));
  });
  // Cache-key separator: a control character that cannot occur in a format string.
  const SEP = '\u0001';
  const formatCached = memo((key: string) => {
    const sep = key.indexOf(SEP);
    const d = toDateCached(key.slice(sep + 1));
    return d ? formatDate(key.slice(0, sep), d) : null;
  });
  const doFormat = (f: Val, a: Val) => {
    const fmt = str(f);
    if (fmt === null || a === null) return null;
    if (typeof a === 'string') return formatCached(fmt + SEP + a);
    const d = toDate(a);
    return d ? formatDate(fmt, d) : null;
  };
  fn('format_date', doFormat);
  fn('format_timestamp', doFormat);
  fn('format_datetime', doFormat);

  const parseCached = memo((key: string) => {
    const sep = key.indexOf(SEP);
    return parseDate(key.slice(0, sep), key.slice(sep + 1));
  });
  fn('parse_date', (f, v) => {
    const fmt = str(f); const val = str(v);
    return fmt === null || val === null ? null : parseCached(fmt + SEP + val);
  });
  fn('parse_timestamp', (f, v) => {
    if (str(f) === null || str(v) === null) return null;
    const d = parseDate(str(f)!, str(v)!);
    return d ? `${d} 00:00:00` : null;
  });
  fn('timestamp_micros', (a) => {
    const n = num(a);
    return n === null ? null : fmtTs(new Date(n / 1000));
  });
  fn('timestamp_millis', (a) => {
    const n = num(a);
    return n === null ? null : fmtTs(new Date(n));
  });
  fn('timestamp_seconds', (a) => {
    const n = num(a);
    return n === null ? null : fmtTs(new Date(n * 1000));
  });
  fn('unix_seconds', (a) => { const d = toDate(a); return d ? Math.floor(d.getTime() / 1000) : null; });
  fn('unix_millis', (a) => { const d = toDate(a); return d ? d.getTime() : null; });
  fn('unix_micros', (a) => { const d = toDate(a); return d ? d.getTime() * 1000 : null; });
  fn('unix_date', (a) => { const d = toDate(a); return d ? dayNumber(d) : null; });
  fn('date_from_unix_date', (a) => {
    const n = num(a);
    return n === null ? null : fmtDate(new Date(n * DAY));
  });

  // ── strings ─────────────────────────────────────────────────────────
  fn('starts_with', (a, b) => {
    const s = str(a); const p = str(b);
    return s === null || p === null ? null : s.startsWith(p) ? 1 : 0;
  });
  fn('ends_with', (a, b) => {
    const s = str(a); const p = str(b);
    return s === null || p === null ? null : s.endsWith(p) ? 1 : 0;
  });
  fn('contains_substr', (a, b) => {
    const s = str(a); const p = str(b);
    return s === null || p === null ? null : s.toLowerCase().includes(p.toLowerCase()) ? 1 : 0;
  });
  fn('lpad', (a, n, c) => {
    const s = str(a); const w = num(n);
    if (s === null || w === null) return null;
    const fill = str(c) ?? ' ';
    if (s.length >= w) return s.slice(0, w);
    let out = s;
    while (out.length < w) out = fill.slice(0, Math.min(fill.length, w - out.length)) + out;
    return out;
  }, { varargs: true });
  fn('rpad', (a, n, c) => {
    const s = str(a); const w = num(n);
    if (s === null || w === null) return null;
    const fill = str(c) ?? ' ';
    if (s.length >= w) return s.slice(0, w);
    let out = s;
    while (out.length < w) out += fill.slice(0, Math.min(fill.length, w - out.length));
    return out;
  }, { varargs: true });
  fn('repeat', (a, n) => {
    const s = str(a); const k = num(n);
    return s === null || k === null || k < 0 ? null : s.repeat(Math.min(Math.trunc(k), 10_000));
  });
  fn('bq_reverse', (a) => {
    const s = str(a);
    return s === null ? null : [...s].reverse().join('');
  });
  fn('initcap', (a) => {
    const s = str(a);
    return s === null ? null : s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  });
  fn('to_hex', (a) => {
    const s = str(a);
    return s === null ? null : Buffer.from(s, 'utf8').toString('hex');
  });
  fn('bq_ascii', (a) => {
    const s = str(a);
    return s === null || s.length === 0 ? null : s.charCodeAt(0);
  });
  fn('code_points_to_string', (a) => {
    const s = str(a);
    if (s === null) return null;
    try {
      return (JSON.parse(s) as number[]).map((c) => String.fromCharCode(c)).join('');
    } catch { return null; }
  });

  fn('regexp_contains', (a, p) => {
    const s = str(a); const pat = str(p);
    if (s === null || pat === null) return null;
    try { return toJsRegex(pat).test(s) ? 1 : 0; } catch { return null; }
  });
  fn('regexp_extract', (a, p, pos, occ) => {
    const s = str(a); const pat = str(p);
    if (s === null || pat === null) return null;
    try {
      const from = pos === undefined || pos === null ? 0 : Math.max(0, (num(pos) ?? 1) - 1);
      const wanted = occ === undefined || occ === null ? 1 : (num(occ) ?? 1);
      const re = toJsRegex(pat, 'g');
      const hay = s.slice(from);
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = re.exec(hay)) !== null) {
        count++;
        if (count === wanted) return m[1] !== undefined ? m[1] : m[0];
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      return null;
    } catch { return null; }
  }, { varargs: true });
  fn('regexp_replace', (a, p, r) => {
    const s = str(a); const pat = str(p); const rep = str(r);
    if (s === null || pat === null || rep === null) return null;
    try {
      return s.replace(toJsRegex(pat, 'g'), rep.replace(/\\(\d)/g, '$$$1'));
    } catch { return null; }
  });
  fn('regexp_extract_all', (a, p) => {
    const s = str(a); const pat = str(p);
    if (s === null || pat === null) return null;
    try {
      const re = toJsRegex(pat, 'g');
      const out: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(s)) !== null) {
        out.push(m[1] !== undefined ? m[1] : m[0]);
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      return JSON.stringify(out);
    } catch { return null; }
  });

  /** Returns a JSON array; the transpiler turns `SPLIT(x, d)[OFFSET(i)]` into json_extract. */
  fn('split', (a, d) => {
    const s = str(a);
    if (s === null) return null;
    const delim = d === undefined || d === null ? ',' : str(d)!;
    return JSON.stringify(delim === '' ? [...s] : s.split(delim));
  }, { varargs: true });

  fn('array_length', (a) => {
    const s = str(a);
    if (s === null) return null;
    try { const v = JSON.parse(s); return Array.isArray(v) ? v.length : null; } catch { return null; }
  });
  fn('array_to_string', (a, d) => {
    const s = str(a);
    if (s === null) return null;
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? v.join(str(d) ?? ',') : null;
    } catch { return null; }
  });
  fn('array_reverse', (a) => {
    const s = str(a);
    if (s === null) return null;
    try { const v = JSON.parse(s); return Array.isArray(v) ? JSON.stringify(v.reverse()) : null; } catch { return null; }
  });
  /** Backs `UNNEST(GENERATE_ARRAY(a, b [, step]))`. */
  fn('generate_array_json', (a, b, s) => {
    const from = num(a); const to = num(b);
    const step = num(s ?? 1) || 1;
    if (from === null || to === null) return null;
    const out: number[] = [];
    if (step > 0) for (let i = from; i <= to && out.length < 100_000; i += step) out.push(i);
    else for (let i = from; i >= to && out.length < 100_000; i += step) out.push(i);
    return JSON.stringify(out);
  }, { varargs: true });
  /** Backs `UNNEST(GENERATE_DATE_ARRAY(a, b))`. */
  fn('generate_date_array_json', (a, b, n, p) => {
    const d1 = toDate(a); const d2 = toDate(b);
    if (!d1 || !d2) return null;
    const step = num(n ?? 1) || 1;
    const part = (str(p) ?? 'DAY').toUpperCase() as DatePart;
    const out: string[] = [];
    let cur = d1;
    while (cur.getTime() <= d2.getTime() && out.length < 20_000) {
      out.push(fmtDate(cur));
      cur = dateAdd(cur, step, part);
    }
    return JSON.stringify(out);
  }, { varargs: true });

  fn('to_json_string', (a) => JSON.stringify(a ?? null));
  fn('net_host', (a) => {
    const s = str(a);
    if (s === null) return null;
    try { return new URL(s).host; } catch { return null; }
  });
  fn('net_reg_domain', (a) => {
    const s = str(a);
    if (s === null) return null;
    try {
      const parts = new URL(s).host.split('.');
      return parts.slice(-2).join('.');
    } catch { return null; }
  });

  // ── aggregates ──────────────────────────────────────────────────────
  db.aggregate('bq_median', {
    start: () => [] as number[],
    step: (acc: number[], v: Val) => { const n = num(v); if (n !== null) acc.push(n); return acc; },
    result: (acc: number[]) => {
      if (!acc.length) return null;
      const s = [...acc].sort((a, b) => a - b);
      const mid = s.length / 2;
      return s.length % 2 ? s[Math.floor(mid)] : (s[mid - 1] + s[mid]) / 2;
    },
  });
  db.aggregate('percentile_cont', {
    start: () => ({ xs: [] as number[], p: 0.5 }),
    step: (acc: { xs: number[]; p: number }, v: Val, p: Val) => {
      const n = num(v);
      if (n !== null) acc.xs.push(n);
      const pp = num(p);
      if (pp !== null) acc.p = pp;
      return acc;
    },
    result: (acc: { xs: number[]; p: number }) => {
      if (!acc.xs.length) return null;
      const s = [...acc.xs].sort((a, b) => a - b);
      const idx = acc.p * (s.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
    },
  });
  db.aggregate('percentile_disc', {
    start: () => ({ xs: [] as number[], p: 0.5 }),
    step: (acc: { xs: number[]; p: number }, v: Val, p: Val) => {
      const n = num(v);
      if (n !== null) acc.xs.push(n);
      const pp = num(p);
      if (pp !== null) acc.p = pp;
      return acc;
    },
    result: (acc: { xs: number[]; p: number }) => {
      if (!acc.xs.length) return null;
      const s = [...acc.xs].sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor(acc.p * s.length))];
    },
  });
  db.aggregate('approx_quantiles_json', {
    start: () => ({ xs: [] as number[], n: 4 }),
    step: (acc: { xs: number[]; n: number }, v: Val, n: Val) => {
      const x = num(v);
      if (x !== null) acc.xs.push(x);
      const k = num(n);
      if (k !== null) acc.n = k;
      return acc;
    },
    result: (acc: { xs: number[]; n: number }) => {
      if (!acc.xs.length) return null;
      const s = [...acc.xs].sort((a, b) => a - b);
      const out: number[] = [];
      for (let i = 0; i <= acc.n; i++) out.push(s[Math.min(s.length - 1, Math.round((i / acc.n) * (s.length - 1)))]);
      return JSON.stringify(out);
    },
  });
  db.aggregate('stddev_pop_bq', {
    start: () => [] as number[],
    step: (acc: number[], v: Val) => { const n = num(v); if (n !== null) acc.push(n); return acc; },
    result: (acc: number[]) => {
      if (acc.length === 0) return null;
      const mean = acc.reduce((a, b) => a + b, 0) / acc.length;
      return Math.sqrt(acc.reduce((a, b) => a + (b - mean) ** 2, 0) / acc.length);
    },
  });
  db.aggregate('stddev_samp_bq', {
    start: () => [] as number[],
    step: (acc: number[], v: Val) => { const n = num(v); if (n !== null) acc.push(n); return acc; },
    result: (acc: number[]) => {
      if (acc.length < 2) return null;
      const mean = acc.reduce((a, b) => a + b, 0) / acc.length;
      return Math.sqrt(acc.reduce((a, b) => a + (b - mean) ** 2, 0) / (acc.length - 1));
    },
  });
  db.aggregate('corr_bq', {
    start: () => [] as Array<[number, number]>,
    step: (acc: Array<[number, number]>, a: Val, b: Val) => {
      const x = num(a); const y = num(b);
      if (x !== null && y !== null) acc.push([x, y]);
      return acc;
    },
    result: (acc: Array<[number, number]>) => {
      const n = acc.length;
      if (n < 2) return null;
      const mx = acc.reduce((s, p) => s + p[0], 0) / n;
      const my = acc.reduce((s, p) => s + p[1], 0) / n;
      let num_ = 0; let dx = 0; let dy = 0;
      for (const [x, y] of acc) { num_ += (x - mx) * (y - my); dx += (x - mx) ** 2; dy += (y - my) ** 2; }
      return dx === 0 || dy === 0 ? null : num_ / Math.sqrt(dx * dy);
    },
  });
}

export const UDF_NAMES = [
  'SAFE_DIVIDE', 'SAFE_MULTIPLY', 'SAFE_ADD', 'SAFE_SUBTRACT', 'SAFE_NEGATE', 'IEEE_DIVIDE', 'DIV',
  'SAFE_CAST', 'DATE_DIFF', 'DATE_TRUNC', 'DATE_ADD', 'DATE_SUB', 'LAST_DAY', 'FORMAT_DATE',
  'PARSE_DATE', 'EXTRACT', 'TIMESTAMP_MICROS', 'TIMESTAMP_MILLIS', 'TIMESTAMP_SECONDS',
  'TIMESTAMP_DIFF', 'TIMESTAMP_TRUNC', 'UNIX_SECONDS', 'UNIX_DATE', 'CURRENT_DATE',
  'STARTS_WITH', 'ENDS_WITH', 'CONTAINS_SUBSTR', 'LPAD', 'RPAD', 'REPEAT', 'REVERSE', 'INITCAP',
  'REGEXP_CONTAINS', 'REGEXP_EXTRACT', 'REGEXP_REPLACE', 'REGEXP_EXTRACT_ALL', 'SPLIT',
  'ARRAY_LENGTH', 'ARRAY_TO_STRING', 'ARRAY_AGG', 'GENERATE_ARRAY', 'GENERATE_DATE_ARRAY',
  'COUNTIF', 'ANY_VALUE', 'STRING_AGG', 'APPROX_COUNT_DISTINCT', 'APPROX_QUANTILES',
  'PERCENTILE_CONT', 'LOGICAL_OR', 'LOGICAL_AND', 'CORR', 'STDDEV', 'TO_JSON_STRING',
] as const;
