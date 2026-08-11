/**
 * Ambient types for Node's built-in `node:sqlite` (stable in Node 22+).
 *
 * `@types/node@20` predates this module, so we declare the surface the warehouse
 * engine actually uses. When we move to `@types/node@22`, delete this file, the
 * upstream types supersede it.
 */
declare module 'node:sqlite' {
  interface DatabaseSyncOptions {
    readOnly?: boolean;
    open?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  }

  interface FunctionOptions {
    deterministic?: boolean;
    varargs?: boolean;
    directOnly?: boolean;
    useBigIntArguments?: boolean;
  }

  interface AggregateOptions<T> {
    start: T | (() => T);
    // Step/inverse receive raw SQLite values; callers narrow them, so keep the
    // argument type open at this runtime boundary.
    step: (accumulator: T, ...args: never[]) => T;
    result?: (accumulator: T) => SQLOutputValue;
    inverse?: (accumulator: T, ...args: never[]) => T;
    deterministic?: boolean;
    varargs?: boolean;
  }

  type SQLInputValue = null | number | bigint | string | Uint8Array | boolean;
  type SQLOutputValue = null | number | bigint | string | Uint8Array;

  interface ColumnMetadata {
    name: string | null;
    column: string | null;
    table: string | null;
    database: string | null;
    type: string | null;
  }

  class StatementSync {
    run(...params: SQLInputValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    get(...params: SQLInputValue[]): unknown;
    all(...params: SQLInputValue[]): unknown[];
    iterate(...params: SQLInputValue[]): IterableIterator<unknown>;
    columns(): ColumnMetadata[];
    setReturnArrays(returnArrays: boolean): void;
    setReadBigInts(readBigInts: boolean): void;
    setAllowBareNamedParameters(allow: boolean): void;
    readonly expandedSQL: string;
    readonly sourceSQL: string;
  }

  class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    open(): void;
    close(): void;
    function(name: string, options: FunctionOptions, fn: (...args: never[]) => SQLOutputValue): void;
    function(name: string, fn: (...args: never[]) => SQLOutputValue): void;
    aggregate<T>(name: string, options: AggregateOptions<T>): void;
    readonly isOpen: boolean;
  }
}
