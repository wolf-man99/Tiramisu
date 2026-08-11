/**
 * BigQuery standard SQL → SQLite SQL.
 *
 * This is a token-level rewriter, not a full parser. It is deliberately scoped to the
 * dialect surface the curriculum teaches (docs/ARCHITECTURE.md §5). Everything it
 * cannot rewrite, it leaves alone so SQLite can produce its own error, and where an
 * unsupported construct would fail confusingly, it throws a message that explains the
 * emulation boundary instead.
 */

import { ALL_TABLE_DEFS } from '../warehouse/ddl';

export class TranspileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranspileError';
  }
}

const DATASETS = new Set(['marketing_analytics', 'growthsql_academy', 'growthsql-academy', 'northbeam']);
const TABLE_NAMES = new Set(ALL_TABLE_DEFS.map((t) => t.name));
const COLUMNS_BY_TABLE = new Map(ALL_TABLE_DEFS.map((t) => [t.name, t.columns.map((c) => c.name)]));

const DATE_PARTS = new Set([
  'DAY', 'WEEK', 'ISOWEEK', 'MONTH', 'QUARTER', 'YEAR', 'ISOYEAR', 'HOUR', 'MINUTE',
  'SECOND', 'MILLISECOND', 'MICROSECOND', 'DAYOFWEEK', 'DAYOFYEAR', 'DATE',
]);

const CAST_TYPES: Record<string, string> = {
  INT64: 'INTEGER', INTEGER: 'INTEGER', INT: 'INTEGER', SMALLINT: 'INTEGER', BIGINT: 'INTEGER',
  FLOAT64: 'REAL', FLOAT: 'REAL', NUMERIC: 'REAL', BIGNUMERIC: 'REAL', DECIMAL: 'REAL',
  STRING: 'TEXT', BYTES: 'BLOB', BOOL: 'INTEGER', BOOLEAN: 'INTEGER',
  DATE: 'TEXT', DATETIME: 'TEXT', TIMESTAMP: 'TEXT', TIME: 'TEXT',
};

const SAFE_CAST_FN: Record<string, string> = {
  INT64: 'safe_cast_int', INTEGER: 'safe_cast_int', INT: 'safe_cast_int', BIGINT: 'safe_cast_int',
  FLOAT64: 'safe_cast_float', FLOAT: 'safe_cast_float', NUMERIC: 'safe_cast_float', DECIMAL: 'safe_cast_float',
  STRING: 'safe_cast_string', DATE: 'safe_cast_date', DATETIME: 'safe_cast_date',
  TIMESTAMP: 'safe_cast_date', BOOL: 'safe_cast_bool', BOOLEAN: 'safe_cast_bool',
};

/** Direct one-for-one function renames where SQLite's name differs. */
const RENAMES: Record<string, string> = {
  DIV: 'bq_div',
  IF: 'iif',
  GREATEST: 'max',
  LEAST: 'min',
  REVERSE: 'bq_reverse',
  ASCII: 'bq_ascii',
  APPROX_COUNT_DISTINCT: '__APPROX_DISTINCT__', // handled specially
  ARRAY_AGG: 'json_group_array',
  ARRAY_CONCAT: 'json_array',
  ANY_VALUE: 'min',
  STDDEV: 'stddev_samp_bq',
  STDDEV_SAMP: 'stddev_samp_bq',
  STDDEV_POP: 'stddev_pop_bq',
  CORR: 'corr_bq',
  APPROX_QUANTILES: 'approx_quantiles_json',
  CURRENT_DATETIME: 'current_timestamp_bq',
  MEDIAN: 'bq_median',
  SESSION_USER: 'safe_cast_string',
};

// ───────────────────────────────────────────────────────────── tokenizer ──

type TokType = 'ws' | 'comment' | 'string' | 'dquote' | 'backtick' | 'ident' | 'number' | 'punct';

interface Tok {
  t: TokType;
  v: string;
  /** Uppercased value for identifiers, cached because we compare it constantly. */
  u: string;
}

const IDENT_START = /[A-Za-z_]/;
const IDENT_CHAR = /[A-Za-z0-9_$]/;

/**
 * Reads a quoted run starting at `i` and returns the index just past it.
 * Handles single/double/backtick quotes, BigQuery triple-quoted strings, doubled-quote
 * escaping, and raw strings (where `\d` must survive intact for regex patterns).
 */
function readQuoted(
  sql: string,
  i: number,
  q: string,
  isRaw: boolean,
  push: (t: TokType, v: string) => void,
): number {
  const emit = (buf: string) => {
    if (q === '`') push('backtick', buf);
    else if (q === '"') push('dquote', buf);
    else push('string', `'${buf.replace(/'/g, "''")}'`);
  };
  const triple = sql.slice(i, i + 3);
  if ((q === "'" || q === '"') && (triple === "'''" || triple === '"""')) {
    const end = sql.indexOf(triple, i + 3);
    emit(sql.slice(i + 3, end === -1 ? sql.length : end));
    return end === -1 ? sql.length : end + 3;
  }
  let j = i + 1;
  let buf = '';
  while (j < sql.length) {
    if (!isRaw && sql[j] === '\\' && q !== '`' && j + 1 < sql.length) {
      const esc = sql[j + 1];
      buf += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc === 'r' ? '\r' : esc;
      j += 2;
      continue;
    }
    if (sql[j] === q) {
      if (sql[j + 1] === q) { buf += q; j += 2; continue; }
      break;
    }
    buf += sql[j];
    j++;
  }
  emit(buf);
  return j + 1;
}

export function tokenize(sql: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const push = (t: TokType, v: string) => out.push({ t, v, u: t === 'ident' ? v.toUpperCase() : v });
  while (i < sql.length) {
    const c = sql[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      push('ws', sql.slice(i, j));
      i = j;
    } else if (c === '-' && sql[i + 1] === '-') {
      const j = sql.indexOf('\n', i);
      push('comment', sql.slice(i, j === -1 ? sql.length : j));
      i = j === -1 ? sql.length : j;
    } else if (c === '#') {
      const j = sql.indexOf('\n', i);
      push('comment', sql.slice(i, j === -1 ? sql.length : j));
      i = j === -1 ? sql.length : j;
    } else if (c === '/' && sql[i + 1] === '*') {
      const j = sql.indexOf('*/', i + 2);
      push('comment', sql.slice(i, j === -1 ? sql.length : j + 2));
      i = j === -1 ? sql.length : j + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      i = readQuoted(sql, i, c, false, push);
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      let j = i;
      while (j < sql.length && /[0-9.eE]/.test(sql[j])) {
        if ((sql[j] === 'e' || sql[j] === 'E') && /[+-]/.test(sql[j + 1] ?? '')) j++;
        j++;
      }
      push('number', sql.slice(i, j));
      i = j;
    } else if (IDENT_START.test(c)) {
      let j = i;
      while (j < sql.length && IDENT_CHAR.test(sql[j])) j++;
      const word = sql.slice(i, j);
      const quote = sql[j];
      // BigQuery string prefixes: r'…' is raw (no backslash escapes), b'…' is bytes.
      if (/^(r|b|rb|br)$/i.test(word) && (quote === "'" || quote === '"')) {
        i = readQuoted(sql, j, quote, /r/i.test(word), push);
        continue;
      }
      push('ident', word);
      i = j;
    } else {
      const two = sql.slice(i, i + 2);
      if (['!=', '<=', '>=', '<>', '||', '->', '=>'].includes(two)) {
        if (two === '->' && sql[i + 2] === '>') { push('punct', '->>'); i += 3; continue; }
        push('punct', two);
        i += 2;
      } else {
        push('punct', c);
        i += 1;
      }
    }
  }
  return out;
}

export function render(toks: Tok[]): string {
  return toks.map((t) => {
    if (t.t === 'backtick') return `"${t.v}"`;
    if (t.t === 'dquote') return `"${t.v}"`;
    return t.v;
  }).join('');
}

const isCode = (t: Tok) => t.t !== 'ws' && t.t !== 'comment';

/** Index of the next code token after `i`, or -1. */
function nextCode(toks: Tok[], i: number): number {
  for (let j = i + 1; j < toks.length; j++) if (isCode(toks[j])) return j;
  return -1;
}
function prevCode(toks: Tok[], i: number): number {
  for (let j = i - 1; j >= 0; j--) if (isCode(toks[j])) return j;
  return -1;
}

/** Given the index of an opening `(`, return the index of its match. */
function matchParen(toks: Tok[], open: number): number {
  let depth = 0;
  for (let j = open; j < toks.length; j++) {
    if (toks[j].t !== 'punct') continue;
    if (toks[j].v === '(') depth++;
    else if (toks[j].v === ')') {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Split the token range (exclusive of the parens) into top-level comma-separated argument ranges. */
function splitArgs(toks: Tok[], open: number, close: number): Array<[number, number]> {
  const args: Array<[number, number]> = [];
  let depth = 0;
  let start = open + 1;
  for (let j = open + 1; j < close; j++) {
    const t = toks[j];
    if (t.t === 'punct') {
      if (t.v === '(') depth++;
      else if (t.v === ')') depth--;
      else if (t.v === ',' && depth === 0) { args.push([start, j]); start = j + 1; }
    }
  }
  if (start < close) args.push([start, close]);
  return args;
}

const slice = (toks: Tok[], a: number, b: number) => render(toks.slice(a, b)).trim();

const tokOf = (v: string, t: TokType = 'punct'): Tok => ({ t, v, u: t === 'ident' ? v.toUpperCase() : v });
const raw = (v: string): Tok[] => tokenize(v);

// ═════════════════════════════════════════════════════════════ passes ══

/** `` `proj.dataset.table` `` and `dataset.table` → bare table name. */
function passQualifiedNames(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'backtick') {
      const parts = t.v.split('.');
      const last = parts[parts.length - 1];
      if (parts.length > 1 && TABLE_NAMES.has(last)) { out.push(tokOf(last, 'ident')); continue; }
      if (TABLE_NAMES.has(t.v)) { out.push(tokOf(t.v, 'ident')); continue; }
      out.push({ t: 'dquote', v: t.v, u: t.v });
      continue;
    }
    if (t.t === 'ident' && DATASETS.has(t.v.toLowerCase())) {
      const dot = nextCode(toks, i);
      if (dot !== -1 && toks[dot].v === '.') {
        const nameIdx = nextCode(toks, dot);
        if (nameIdx !== -1 && toks[nameIdx].t === 'ident') {
          // Drop the dataset qualifier; the next iteration re-checks for a second one.
          i = dot;
          continue;
        }
      }
    }
    out.push(t);
  }
  return out;
}

/** Typed literals: `DATE '2024-01-01'`, `TIMESTAMP '…'`. Drop the type keyword. */
function passTypedLiterals(toks: Tok[]): Tok[] {
  const TYPES = new Set(['DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'NUMERIC', 'BIGNUMERIC', 'JSON']);
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'ident' && TYPES.has(t.u)) {
      const nxt = nextCode(toks, i);
      if (nxt !== -1 && toks[nxt].t === 'string') continue; // drop the keyword, keep the literal
    }
    out.push(t);
  }
  return out;
}

/** `SAFE.FN(...)` → `FN(...)`. */
function passSafePrefix(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'ident' && t.u === 'SAFE') {
      const dot = nextCode(toks, i);
      const fnIdx = dot === -1 ? -1 : nextCode(toks, dot);
      if (dot !== -1 && toks[dot].v === '.' && fnIdx !== -1 && toks[fnIdx].t === 'ident') {
        i = dot;
        continue;
      }
    }
    out.push(t);
  }
  return out;
}

/** `EXTRACT(part FROM expr)` → `bq_extract('part', expr)`. */
function passExtract(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'ident' || toks[i].u !== 'EXTRACT') continue;
    const open = nextCode(toks, i);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;
    // find top-level FROM
    let depth = 0;
    let fromIdx = -1;
    for (let j = open + 1; j < close; j++) {
      if (toks[j].t === 'punct') {
        if (toks[j].v === '(') depth++;
        else if (toks[j].v === ')') depth--;
      } else if (depth === 0 && toks[j].t === 'ident' && toks[j].u === 'FROM') { fromIdx = j; break; }
    }
    if (fromIdx === -1) continue;
    const partTxt = slice(toks, open + 1, fromIdx).toUpperCase().replace(/\s+/g, ' ');
    const exprTxt = slice(toks, fromIdx + 1, close);
    // EXTRACT(WEEK(MONDAY) FROM d) → treat as ISOWEEK
    const part = partTxt.startsWith('WEEK(') ? 'ISOWEEK' : partTxt;
    const repl = raw(`bq_extract('${part}', ${exprTxt})`);
    toks.splice(i, close - i + 1, ...repl);
    i += repl.length - 1;
  }
  return toks;
}

/** `DATE_ADD(x, INTERVAL n PART)` → `date_add(x, n, 'PART')` (also SUB / TIMESTAMP_ / DATETIME_). */
function passInterval(toks: Tok[]): Tok[] {
  const FNS = new Set(['DATE_ADD', 'DATE_SUB', 'TIMESTAMP_ADD', 'TIMESTAMP_SUB', 'DATETIME_ADD', 'DATETIME_SUB']);
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'ident' || !FNS.has(toks[i].u)) continue;
    const open = nextCode(toks, i);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;
    const args = splitArgs(toks, open, close);
    if (args.length !== 2) continue;
    const second = toks.slice(args[1][0], args[1][1]).filter(isCode);
    if (!second.length || second[0].u !== 'INTERVAL') continue;
    const partTok = second[second.length - 1];
    const nExpr = render(second.slice(1, second.length - 1)).trim();
    const fnName = toks[i].u.toLowerCase();
    const repl = raw(`${fnName}(${slice(toks, args[0][0], args[0][1])}, ${nExpr}, '${partTok.u}')`);
    toks.splice(i, close - i + 1, ...repl);
    i += repl.length - 1;
  }
  return toks;
}

/** Bare date-part keywords in DATE_DIFF / DATE_TRUNC / LAST_DAY → quoted strings. */
function passDatePartArgs(toks: Tok[]): Tok[] {
  const TWO_ARG = new Set(['DATE_TRUNC', 'TIMESTAMP_TRUNC', 'DATETIME_TRUNC', 'LAST_DAY']);
  const THREE_ARG = new Set(['DATE_DIFF', 'TIMESTAMP_DIFF', 'DATETIME_DIFF']);
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'ident') continue;
    const isTwo = TWO_ARG.has(toks[i].u);
    const isThree = THREE_ARG.has(toks[i].u);
    if (!isTwo && !isThree) continue;
    const open = nextCode(toks, i);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;
    const args = splitArgs(toks, open, close);
    const partArgIdx = isTwo ? 1 : 2;
    if (args.length <= partArgIdx) continue;
    const [a, b] = args[partArgIdx];
    const codeToks = toks.slice(a, b).filter(isCode);
    if (codeToks.length === 1 && codeToks[0].t === 'ident' && DATE_PARTS.has(codeToks[0].u)) {
      toks.splice(a, b - a, tokOf(`'${codeToks[0].u}'`, 'string'));
    }
  }
  return toks;
}

/** `CAST(x AS INT64)` → SQLite types; `SAFE_CAST(x AS T)` → the matching safe_cast_* UDF. */
function passCasts(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'ident') continue;
    const isSafe = toks[i].u === 'SAFE_CAST';
    if (!isSafe && toks[i].u !== 'CAST') continue;
    const open = nextCode(toks, i);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;
    let depth = 0;
    let asIdx = -1;
    for (let j = open + 1; j < close; j++) {
      if (toks[j].t === 'punct') {
        if (toks[j].v === '(') depth++;
        else if (toks[j].v === ')') depth--;
      } else if (depth === 0 && toks[j].t === 'ident' && toks[j].u === 'AS') { asIdx = j; }
    }
    if (asIdx === -1) continue;
    const typeToks = toks.slice(asIdx + 1, close).filter(isCode);
    if (!typeToks.length) continue;
    const typeName = typeToks[0].u;
    const expr = slice(toks, open + 1, asIdx);
    if (isSafe) {
      const fnName = SAFE_CAST_FN[typeName] ?? 'safe_cast_string';
      const repl = raw(`${fnName}(${expr})`);
      toks.splice(i, close - i + 1, ...repl);
      i += repl.length - 1;
    } else {
      const mapped = CAST_TYPES[typeName];
      if (!mapped) continue;
      const repl = raw(`CAST(${expr} AS ${mapped})`);
      toks.splice(i, close - i + 1, ...repl);
      i += repl.length - 1;
    }
  }
  return toks;
}

/** Aggregates with no SQLite equivalent, rewritten into equivalent expressions. */
function passAggregates(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'ident') continue;
    const name = toks[i].u;
    if (!['COUNTIF', 'LOGICAL_OR', 'LOGICAL_AND', 'APPROX_COUNT_DISTINCT'].includes(name)) continue;
    const open = nextCode(toks, i);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;
    const inner = slice(toks, open + 1, close);
    let replText: string;
    // COUNT(CASE WHEN …) rather than SUM(): BigQuery's COUNTIF returns 0, not NULL, on empty input.
    if (name === 'COUNTIF') replText = `COUNT(CASE WHEN ${inner} THEN 1 END)`;
    else if (name === 'LOGICAL_OR') replText = `MAX(CASE WHEN ${inner} THEN 1 ELSE 0 END)`;
    else if (name === 'LOGICAL_AND') replText = `MIN(CASE WHEN ${inner} THEN 1 ELSE 0 END)`;
    else replText = `COUNT(DISTINCT ${inner})`;
    const repl = raw(replText);
    toks.splice(i, close - i + 1, ...repl);
    i += repl.length - 1;
  }
  return toks;
}

/** `STRUCT(a AS x, b AS y)` → `json_object('x', a, 'y', b)`; `[a,b]` → `json_array(a,b)`. */
function passStructAndArrayLiterals(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t === 'ident' && toks[i].u === 'STRUCT') {
      const open = nextCode(toks, i);
      if (open === -1 || toks[open].v !== '(') continue;
      const close = matchParen(toks, open);
      if (close === -1) continue;
      const args = splitArgs(toks, open, close);
      const pairs: string[] = [];
      let ok = true;
      args.forEach(([a, b], idx) => {
        const code = toks.slice(a, b).filter(isCode);
        const asPos = code.findIndex((t) => t.t === 'ident' && t.u === 'AS');
        if (asPos === -1) {
          pairs.push(`'f${idx}', ${render(code).trim()}`);
        } else {
          const key = code[asPos + 1];
          if (!key) { ok = false; return; }
          pairs.push(`'${key.v}', ${render(code.slice(0, asPos)).trim()}`);
        }
      });
      if (!ok) continue;
      const repl = raw(`json_object(${pairs.join(', ')})`);
      toks.splice(i, close - i + 1, ...repl);
      i += repl.length - 1;
      continue;
    }
    // ARRAY[...] or bare [...] literal in an expression position
    if (toks[i].t === 'punct' && toks[i].v === '[') {
      const p = prevCode(toks, i);
      const prevIsValue = p !== -1
        && ((toks[p].t === 'ident' && !['ARRAY', 'IN', 'AND', 'OR', 'NOT', 'SELECT', 'WHEN', 'THEN', 'ELSE', 'BY', 'ON'].includes(toks[p].u))
          || toks[p].t === 'number' || toks[p].t === 'string'
          || (toks[p].t === 'punct' && [')', ']'].includes(toks[p].v)));
      if (prevIsValue) continue; // this is a subscript, handled by passArraySubscript
      let depth = 0;
      let close = -1;
      for (let j = i; j < toks.length; j++) {
        if (toks[j].t !== 'punct') continue;
        if (toks[j].v === '[') depth++;
        else if (toks[j].v === ']') { depth--; if (depth === 0) { close = j; break; } }
      }
      if (close === -1) continue;
      const body = slice(toks, i + 1, close);
      const start = p !== -1 && toks[p].t === 'ident' && toks[p].u === 'ARRAY' ? p : i;
      const repl = raw(`json_array(${body})`);
      toks.splice(start, close - start + 1, ...repl);
      i = start + repl.length - 1;
    }
  }
  return toks;
}

/** `arr[OFFSET(i)]` / `[SAFE_OFFSET(i)]` / `[ORDINAL(i)]` → `json_extract(arr, '$[i]')`. */
function passArraySubscript(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'punct' || toks[i].v !== '[') continue;
    let depth = 0;
    let close = -1;
    for (let j = i; j < toks.length; j++) {
      if (toks[j].t !== 'punct') continue;
      if (toks[j].v === '[') depth++;
      else if (toks[j].v === ']') { depth--; if (depth === 0) { close = j; break; } }
    }
    if (close === -1) continue;
    const inner = toks.slice(i + 1, close).filter(isCode);
    if (!inner.length || inner[0].t !== 'ident') continue;
    const kind = inner[0].u;
    if (!['OFFSET', 'SAFE_OFFSET', 'ORDINAL', 'SAFE_ORDINAL'].includes(kind)) continue;
    const openIdx = toks.findIndex((t, idx) => idx > i && t.t === 'punct' && t.v === '(');
    if (openIdx === -1 || openIdx > close) continue;
    const argClose = matchParen(toks, openIdx);
    const idxExpr = slice(toks, openIdx + 1, argClose);
    // Walk back over the array-valued expression: identifier chain or a parenthesised call.
    let start = prevCode(toks, i);
    if (start === -1) continue;
    if (toks[start].t === 'punct' && toks[start].v === ')') {
      let d = 0;
      let k = start;
      for (; k >= 0; k--) {
        if (toks[k].t !== 'punct') continue;
        if (toks[k].v === ')') d++;
        else if (toks[k].v === '(') { d--; if (d === 0) break; }
      }
      const fnIdx = prevCode(toks, k);
      start = fnIdx !== -1 && toks[fnIdx].t === 'ident' ? fnIdx : k;
    } else {
      while (true) {
        const dot = prevCode(toks, start);
        if (dot !== -1 && toks[dot].v === '.') {
          const before = prevCode(toks, dot);
          if (before !== -1 && toks[before].t === 'ident') { start = before; continue; }
        }
        break;
      }
    }
    const arrExpr = slice(toks, start, i);
    const path = /^ORDINAL|^SAFE_ORDINAL/.test(kind)
      ? `'$[' || (${idxExpr} - 1) || ']'`
      : `'$[' || (${idxExpr}) || ']'`;
    const repl = raw(`json_extract(${arrExpr}, ${path})`);
    toks.splice(start, close - start + 1, ...repl);
    i = start + repl.length - 1;
  }
  return toks;
}

interface UnnestAlias {
  alias: string;
  offsetAlias: string | null;
  /** True when the array holds scalars, so a bare reference means `.value`. */
  scalar: boolean;
}

/**
 * `UNNEST(expr) [AS] a [WITH OFFSET [AS] i]` → `json_each(expr) AS a`, then rewrite
 * every `a.field.path` reference into `json_extract(a.value, '$.field.path')`, bare
 * `a` into `a.value`, and `i` into `a.key`.
 */
function passUnnest(toks: Tok[]): Tok[] {
  const aliases: UnnestAlias[] = [];
  const protectedIdx = new Set<number>();
  let auto = 0;

  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'ident' || toks[i].u !== 'UNNEST') continue;
    const open = nextCode(toks, i);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;

    let argText = slice(toks, open + 1, close);
    // GENERATE_ARRAY / GENERATE_DATE_ARRAY produce the JSON the json_each walks.
    argText = argText
      .replace(/\bGENERATE_DATE_ARRAY\s*\(/gi, 'generate_date_array_json(')
      .replace(/\bGENERATE_ARRAY\s*\(/gi, 'generate_array_json(');

    // Read the alias that follows the closing paren.
    let cursor = nextCode(toks, close);
    let alias: string | null = null;
    let consumedTo = close;
    if (cursor !== -1 && toks[cursor].t === 'ident' && toks[cursor].u === 'AS') {
      const a = nextCode(toks, cursor);
      if (a !== -1 && toks[a].t === 'ident') { alias = toks[a].v; consumedTo = a; cursor = nextCode(toks, a); }
    } else if (cursor !== -1 && toks[cursor].t === 'ident'
      && !['WITH', 'ON', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'CROSS', 'INNER', 'LEFT', 'RIGHT',
        'FULL', 'JOIN', 'UNION', 'HAVING', 'QUALIFY', 'WINDOW'].includes(toks[cursor].u)) {
      alias = toks[cursor].v;
      consumedTo = cursor;
      cursor = nextCode(toks, cursor);
    }

    // WITH OFFSET [AS] i
    let offsetAlias: string | null = null;
    if (cursor !== -1 && toks[cursor].t === 'ident' && toks[cursor].u === 'WITH') {
      const off = nextCode(toks, cursor);
      if (off !== -1 && toks[off].t === 'ident' && toks[off].u === 'OFFSET') {
        consumedTo = off;
        let after = nextCode(toks, off);
        if (after !== -1 && toks[after].t === 'ident' && toks[after].u === 'AS') {
          const nameIdx = nextCode(toks, after);
          if (nameIdx !== -1 && toks[nameIdx].t === 'ident') {
            offsetAlias = toks[nameIdx].v;
            consumedTo = nameIdx;
            after = nameIdx;
          }
        } else if (after !== -1 && toks[after].t === 'ident'
          && !['WHERE', 'GROUP', 'ORDER', 'LIMIT', 'ON', 'JOIN', 'CROSS', 'LEFT', 'INNER',
            'UNION', 'HAVING', 'QUALIFY'].includes(toks[after].u)) {
          offsetAlias = toks[after].v;
          consumedTo = after;
        }
        if (!offsetAlias) offsetAlias = 'offset';
      }
    }

    if (!alias) alias = `_u${auto++}`;
    // A scalar array (SPLIT, GENERATE_ARRAY, a bare STRING/INT column) is referenced
    // bare; a struct array is referenced through its fields.
    const scalar = /^(split|generate_array_json|generate_date_array_json|json_array)\s*\(/i.test(argText)
      || /^regexp_extract_all\s*\(/i.test(argText);
    aliases.push({ alias, offsetAlias, scalar });

    const repl = raw(`json_each(${argText}) AS ${alias}`);
    toks.splice(i, consumedTo - i + 1, ...repl);
    // Protect the alias token we just emitted from the reference-rewriting pass below.
    for (let k = i; k < i + repl.length; k++) {
      if (toks[k].t === 'ident' && toks[k].v === alias) protectedIdx.add(k);
    }
    i += repl.length - 1;
  }

  if (!aliases.length) return toks;

  const byAlias = new Map(aliases.map((a) => [a.alias, a]));
  const offsetToAlias = new Map(
    aliases.filter((a) => a.offsetAlias).map((a) => [a.offsetAlias!, a.alias]),
  );
  // An unaliased UNNEST(event_params) lets you reference `key` and `value` directly.
  const implicitAlias = aliases.find((a) => /^_u\d+$/.test(a.alias) && !a.scalar)?.alias ?? null;

  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t !== 'ident') { out.push(t); continue; }
    if (protectedIdx.has(i)) { out.push(t); continue; }

    const info = byAlias.get(t.v);
    if (info) {
      const dot = nextCode(toks, i);
      if (dot !== -1 && toks[dot].v === '.') {
        const path: string[] = [];
        let j = dot;
        while (j !== -1 && toks[j].v === '.') {
          const nameIdx = nextCode(toks, j);
          if (nameIdx === -1 || toks[nameIdx].t !== 'ident') break;
          path.push(toks[nameIdx].v);
          j = nextCode(toks, nameIdx);
          i = nameIdx;
        }
        out.push(...raw(`json_extract(${info.alias}.value, '$.${path.join('.')}')`));
      } else {
        out.push(...raw(`${info.alias}.value`));
      }
      continue;
    }
    const owner = offsetToAlias.get(t.v);
    if (owner) { out.push(...raw(`${owner}.key`)); continue; }

    if (implicitAlias && (t.u === 'KEY' || t.u === 'VALUE')) {
      const p = prevCode(toks, i);
      if (p !== -1 && toks[p].v === '.') { out.push(t); continue; } // already qualified
      const path: string[] = [t.v];
      let j = nextCode(toks, i);
      while (j !== -1 && toks[j].v === '.') {
        const nameIdx = nextCode(toks, j);
        if (nameIdx === -1 || toks[nameIdx].t !== 'ident') break;
        path.push(toks[nameIdx].v);
        j = nextCode(toks, nameIdx);
        i = nameIdx;
      }
      out.push(...raw(`json_extract(${implicitAlias}.value, '$.${path.join('.')}')`));
      continue;
    }
    out.push(t);
  }
  return out;
}

/** `SELECT * EXCEPT(a, b)` → the explicit column list, resolved from the catalog. */
function passSelectExcept(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'punct' || toks[i].v !== '*') continue;
    const ex = nextCode(toks, i);
    if (ex === -1 || toks[ex].t !== 'ident' || toks[ex].u !== 'EXCEPT') continue;
    const open = nextCode(toks, ex);
    if (open === -1 || toks[open].v !== '(') continue;
    const close = matchParen(toks, open);
    if (close === -1) continue;
    const excluded = new Set(
      splitArgs(toks, open, close).map(([a, b]) => slice(toks, a, b).replace(/["`]/g, '')),
    );
    // Qualifier, if any: `t.* EXCEPT(...)`
    let qualifier: string | null = null;
    const dot = prevCode(toks, i);
    if (dot !== -1 && toks[dot].v === '.') {
      const q = prevCode(toks, dot);
      if (q !== -1 && toks[q].t === 'ident') qualifier = toks[q].v;
    }
    const table = resolveTableForStar(toks, i, qualifier);
    if (!table) {
      throw new TranspileError(
        'SELECT * EXCEPT(...) needs to resolve the source table, and this query\'s FROM ' +
        'clause is too complex for the local engine to work it out. List the columns ' +
        'explicitly, or apply EXCEPT to a plain table reference.',
      );
    }
    const cols = (COLUMNS_BY_TABLE.get(table) ?? []).filter((c) => !excluded.has(c));
    if (!cols.length) throw new TranspileError(`SELECT * EXCEPT(...) removed every column of ${table}.`);
    const prefix = qualifier ? `${qualifier}.` : '';
    const repl = raw(cols.map((c) => `${prefix}"${c}"`).join(', '));
    const start = qualifier ? prevCode(toks, dot) : i;
    toks.splice(start, close - start + 1, ...repl);
    i = start + repl.length - 1;
  }
  return toks;
}

/** Best-effort: find which base table a `*` refers to. */
function resolveTableForStar(toks: Tok[], starIdx: number, qualifier: string | null): string | null {
  for (let j = starIdx; j < toks.length; j++) {
    if (toks[j].t === 'ident' && toks[j].u === 'FROM') {
      const t1 = nextCode(toks, j);
      if (t1 === -1 || toks[t1].t !== 'ident') return null;
      const name = toks[t1].v;
      if (!qualifier) return TABLE_NAMES.has(name) ? name : null;
      // Walk the FROM list looking for `<table> [AS] <qualifier>`
      for (let k = t1; k < toks.length; k++) {
        if (toks[k].t === 'ident' && TABLE_NAMES.has(toks[k].v)) {
          let a = nextCode(toks, k);
          if (a !== -1 && toks[a].t === 'ident' && toks[a].u === 'AS') a = nextCode(toks, a);
          if (a !== -1 && toks[a].t === 'ident' && toks[a].v === qualifier) return toks[k].v;
        }
        if (toks[k].t === 'ident' && ['WHERE', 'GROUP', 'ORDER', 'LIMIT', 'HAVING'].includes(toks[k].u)) break;
      }
      return null;
    }
  }
  return null;
}

/**
 * `SELECT … QUALIFY cond` → `SELECT <names> FROM (SELECT …, (cond) AS __q FROM …) WHERE __q`.
 * SQLite has no QUALIFY and forbids window functions in WHERE, so the predicate has to
 * be materialised as a column first.
 */
function passQualify(toks: Tok[]): Tok[] {
  let guard = 0;
  while (guard++ < 8) {
    let qIdx = -1;
    let depth = 0;
    let qDepth = 0;
    for (let i = 0; i < toks.length; i++) {
      if (toks[i].t === 'punct') {
        if (toks[i].v === '(') depth++;
        else if (toks[i].v === ')') depth--;
      } else if (toks[i].t === 'ident' && toks[i].u === 'QUALIFY') {
        // Innermost first, so nested QUALIFY resolves bottom-up.
        if (qIdx === -1 || depth >= qDepth) { qIdx = i; qDepth = depth; }
      }
    }
    if (qIdx === -1) break;

    // Block bounds: back to the SELECT at the same depth, forward to the block's end.
    let d = 0;
    let selIdx = -1;
    for (let i = qIdx; i >= 0; i--) {
      if (toks[i].t === 'punct') {
        if (toks[i].v === ')') d++;
        else if (toks[i].v === '(') { if (d === 0) break; d--; }
      } else if (toks[i].t === 'ident' && toks[i].u === 'SELECT' && d === 0) { selIdx = i; break; }
    }
    if (selIdx === -1) throw new TranspileError('QUALIFY without an enclosing SELECT.');

    d = 0;
    let endIdx = toks.length;
    for (let i = qIdx; i < toks.length; i++) {
      if (toks[i].t === 'punct') {
        if (toks[i].v === '(') d++;
        else if (toks[i].v === ')') { if (d === 0) { endIdx = i; break; } d--; }
      }
    }

    // QUALIFY sits before ORDER BY / LIMIT, which must stay on the outer query.
    let tailIdx = endIdx;
    d = 0;
    for (let i = qIdx + 1; i < endIdx; i++) {
      if (toks[i].t === 'punct') {
        if (toks[i].v === '(') d++;
        else if (toks[i].v === ')') d--;
      } else if (d === 0 && toks[i].t === 'ident' && ['ORDER', 'LIMIT'].includes(toks[i].u)) {
        tailIdx = i;
        break;
      }
    }

    const cond = slice(toks, qIdx + 1, tailIdx);
    const tail = slice(toks, tailIdx, endIdx);
    const bodyStart = nextCode(toks, selIdx);
    const fromIdx = topLevelFrom(toks, bodyStart, qIdx);
    if (fromIdx === -1) {
      throw new TranspileError('QUALIFY needs a FROM clause to filter against.');
    }
    const selectList = slice(toks, bodyStart, fromIdx);
    const rest = slice(toks, fromIdx, qIdx);

    // A QUALIFY whose predicate contains a window function has to materialise it as a
    // column first, because SQLite forbids window functions in WHERE. A QUALIFY that
    // merely references a select alias can filter the subquery directly, and that form
    // needs no column-name bookkeeping, so prefer it whenever it applies.
    const hasWindow = /\bOVER\s*[(A-Za-z_]/i.test(cond);
    const rebuilt = hasWindow
      ? raw(
        `SELECT ${selectOutputNames(toks, bodyStart, qIdx).join(', ')} FROM (` +
        `SELECT ${selectList}, (${cond}) AS __qualify ${rest}) ` +
        `WHERE __qualify${tail ? ` ${tail}` : ''}`,
      )
      : raw(
        `SELECT * FROM (SELECT ${selectList} ${rest}) ` +
        `WHERE (${cond})${tail ? ` ${tail}` : ''}`,
      );
    toks.splice(selIdx, endIdx - selIdx, ...rebuilt);
  }
  return toks;
}

/** Index of the FROM belonging to this SELECT (depth 0), or -1. */
function topLevelFrom(toks: Tok[], start: number, stop: number): number {
  let d = 0;
  for (let i = start; i < stop; i++) {
    if (toks[i].t === 'punct') {
      if (toks[i].v === '(') d++;
      else if (toks[i].v === ')') d--;
    } else if (d === 0 && toks[i].t === 'ident' && toks[i].u === 'FROM') return i;
  }
  return -1;
}

/** Output column names of a select list, used to rebuild a query around QUALIFY. */
function selectOutputNames(toks: Tok[], start: number, stop: number): string[] {
  const found = topLevelFrom(toks, start, stop);
  const fromIdx = found === -1 ? stop : found;
  let listStart = start;
  const firstTok = toks[start];
  if (firstTok && firstTok.t === 'ident' && ['DISTINCT', 'ALL'].includes(firstTok.u)) {
    listStart = nextCode(toks, start);
  }
  const parts: Array<[number, number]> = [];
  let d = 0;
  let s = listStart;
  for (let i = listStart; i < fromIdx; i++) {
    if (toks[i].t === 'punct') {
      if (toks[i].v === '(') d++;
      else if (toks[i].v === ')') d--;
      else if (toks[i].v === ',' && d === 0) { parts.push([s, i]); s = i + 1; }
    }
  }
  parts.push([s, fromIdx]);

  return parts.map(([a, b]) => {
    const code = toks.slice(a, b).filter(isCode);
    if (!code.length) throw new TranspileError('Could not read the SELECT list around QUALIFY.');
    if (code.some((t) => t.t === 'punct' && t.v === '*')) {
      throw new TranspileError(
        'QUALIFY with SELECT * is not supported by the local engine, list the columns ' +
        'you want, or move the window filter into a subquery.',
      );
    }
    const asPos = code.map((t) => t.u).lastIndexOf('AS');
    if (asPos !== -1 && code[asPos + 1]) return quoteName(code[asPos + 1].v);
    const last = code[code.length - 1];
    const beforeLast = code[code.length - 2];
    // `col alias`, an implicit alias
    if (code.length >= 2 && last.t === 'ident' && beforeLast && beforeLast.t === 'ident'
      && beforeLast.v !== '.' && !isKeyword(beforeLast.u)) {
      return quoteName(last.v);
    }
    if (last.t === 'ident') return quoteName(last.v);
    throw new TranspileError(
      'QUALIFY needs every selected expression to have a name. Add an alias with AS.',
    );
  });
}

const KEYWORDS = new Set(['AND', 'OR', 'NOT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IS', 'NULL',
  'IN', 'LIKE', 'BETWEEN', 'DISTINCT', 'OVER', 'PARTITION', 'BY', 'ORDER', 'ROWS', 'RANGE']);
const isKeyword = (u: string) => KEYWORDS.has(u);
const quoteName = (n: string) => (/^[A-Za-z_]\w*$/.test(n) ? `"${n}"` : n);

/** Plain function renames plus a couple of keyword fixes. */
function passRenames(toks: Tok[]): Tok[] {
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t !== 'ident') continue;
    const nxt = nextCode(toks, i);
    const isCall = nxt !== -1 && toks[nxt].t === 'punct' && toks[nxt].v === '(';
    if (isCall && RENAMES[t.u] && RENAMES[t.u] !== '__APPROX_DISTINCT__') {
      const prev = prevCode(toks, i);
      if (prev !== -1 && toks[prev].v === '.') continue; // qualified column, not a call
      toks[i] = tokOf(RENAMES[t.u], 'ident');
      continue;
    }
    // CURRENT_DATE / CURRENT_DATE() both exist in BigQuery; SQLite only knows the keyword.
    if (t.u === 'CURRENT_DATE' && isCall) {
      const close = matchParen(toks, nxt);
      if (close !== -1 && nextCode(toks, nxt) === close) {
        toks.splice(i, close - i + 1, tokOf('CURRENT_DATE', 'ident'));
      }
    }
  }
  return toks;
}

/**
 * `a.b.c` where `a` is a table/alias and `b` is a JSON STRUCT column →
 * `json_extract(a.b, '$.c')`. This is what makes `device.category` and
 * `e.traffic_source.medium` read exactly like BigQuery.
 */
function passStructFieldAccess(toks: Tok[]): Tok[] {
  const structCols = new Set<string>();
  for (const t of ALL_TABLE_DEFS) {
    for (const c of t.columns) if (c.type === 'STRUCT') structCols.add(c.name);
  }
  if (!structCols.size) return toks;

  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t !== 'ident' || !structCols.has(t.v)) { out.push(t); continue; }
    const dot = nextCode(toks, i);
    if (dot === -1 || toks[dot].v !== '.') { out.push(t); continue; }
    const fieldIdx = nextCode(toks, dot);
    if (fieldIdx === -1 || toks[fieldIdx].t !== 'ident') { out.push(t); continue; }

    // Include a leading table qualifier if present: `e.device.category`
    let base = t.v;
    if (out.length >= 2) {
      const lastCode = [...out].reverse().find(isCode);
      if (lastCode && lastCode.t === 'punct' && lastCode.v === '.') {
        const idxOfDot = out.lastIndexOf(lastCode);
        const qual = [...out.slice(0, idxOfDot)].reverse().find(isCode);
        if (qual && qual.t === 'ident') {
          out.splice(out.lastIndexOf(qual));
          base = `${qual.v}.${t.v}`;
        }
      }
    }
    const path: string[] = [];
    let j = dot;
    let last = i;
    while (j !== -1 && toks[j].v === '.') {
      const nameIdx = nextCode(toks, j);
      if (nameIdx === -1 || toks[nameIdx].t !== 'ident') break;
      path.push(toks[nameIdx].v);
      last = nameIdx;
      j = nextCode(toks, nameIdx);
    }
    // A function call like `geo.country(...)` is not a struct path.
    if (j !== -1 && toks[j].t === 'punct' && toks[j].v === '(') { out.push(t); continue; }
    out.push(...raw(`json_extract(${base}, '$.${path.join('.')}')`));
    i = last;
  }
  return out;
}

// ════════════════════════════════════════════════════════════════ API ══

export interface TranspileResult {
  sql: string;
  /** Notes surfaced in the UI when emulation differs from real BigQuery. */
  notes: string[];
}

export function transpile(input: string): TranspileResult {
  const notes: string[] = [];
  let toks = tokenize(input);

  toks = passQualifiedNames(toks);
  toks = passTypedLiterals(toks);
  toks = passSafePrefix(toks);
  toks = passSelectExcept(toks);
  toks = passExtract(toks);
  toks = passInterval(toks);
  toks = passDatePartArgs(toks);
  toks = passCasts(toks);
  toks = passAggregates(toks);
  toks = passStructAndArrayLiterals(toks);
  toks = passArraySubscript(toks);
  toks = passUnnest(toks);
  toks = passStructFieldAccess(toks);
  toks = passRenames(toks);
  toks = passQualify(toks);

  const sql = render(toks);

  if (/\bPERCENTILE_CONT\b[\s\S]{0,40}\bOVER\b/i.test(input)) {
    notes.push(
      'PERCENTILE_CONT is emulated as a plain aggregate here, so the OVER () form ' +
      'BigQuery requires is not supported. Use it with GROUP BY instead.',
    );
  }
  if (/\bUNNEST\b/i.test(input)) {
    notes.push(
      'Repeated fields are stored as JSON locally, so UNNEST runs as json_each. ' +
      'The SQL you wrote is valid BigQuery. See docs/ARCHITECTURE.md §5.',
    );
  }
  return { sql, notes };
}

export function transpileSql(input: string): string {
  return transpile(input).sql;
}
