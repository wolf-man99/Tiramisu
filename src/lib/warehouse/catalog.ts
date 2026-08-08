import { TABLES, VIEWS, type TableDef, type ColumnDef } from './ddl';

/**
 * The schema catalog the playground's left panel renders: tables and views grouped by
 * subject area, each with its columns, types and one-line descriptions. Derived
 * entirely from the DDL so it can never drift from what actually runs.
 */

export interface CatalogColumn {
  name: string;
  type: string;
  description: string;
  nullable: boolean;
  pk: boolean;
  fk: string | null;
}

export interface CatalogTable {
  name: string;
  kind: 'table' | 'view';
  group: string;
  grain: string;
  description: string;
  partitionBy?: string;
  clusterBy?: string[];
  columns: CatalogColumn[];
}

export interface CatalogGroup {
  group: string;
  tables: CatalogTable[];
}

function toColumn(c: ColumnDef): CatalogColumn {
  return {
    name: c.name,
    type: c.typeText ?? c.type,
    description: c.description,
    nullable: Boolean(c.nullable),
    pk: Boolean(c.pk),
    fk: c.fk ?? null,
  };
}

function toTable(t: TableDef, kind: 'table' | 'view'): CatalogTable {
  return {
    name: t.name,
    kind,
    group: t.group,
    grain: t.grain,
    description: t.description,
    partitionBy: t.partitionBy,
    clusterBy: t.clusterBy,
    columns: t.columns.map(toColumn),
  };
}

/** Every table and view as flat catalog entries. */
export function catalogTables(): CatalogTable[] {
  return [
    ...TABLES.map((t) => toTable(t, 'table')),
    ...VIEWS.map((v) => toTable(v, 'view')),
  ];
}

/** Catalog grouped by subject area, in a sensible teaching order. */
const GROUP_ORDER = [
  'Paid media',
  'Web & product',
  'CRM',
  'Revenue',
  'Lifecycle',
  'Reference',
];

export function catalogByGroup(): CatalogGroup[] {
  const all = catalogTables();
  const groups = new Map<string, CatalogTable[]>();
  for (const t of all) {
    if (!groups.has(t.group)) groups.set(t.group, []);
    groups.get(t.group)!.push(t);
  }
  const ordered: CatalogGroup[] = [];
  for (const g of GROUP_ORDER) {
    if (groups.has(g)) {
      ordered.push({ group: g, tables: groups.get(g)! });
      groups.delete(g);
    }
  }
  // Any group not in the explicit order, alphabetically after.
  for (const [group, tables] of [...groups.entries()].sort()) {
    ordered.push({ group, tables });
  }
  return ordered;
}

export function catalogTable(name: string): CatalogTable | undefined {
  const bare = name.split('.').pop()?.replace(/`/g, '');
  return catalogTables().find((t) => t.name === bare);
}

/** Autocomplete payload: table names and, per table, its column names. */
export function autocompleteSchema(): { tables: string[]; columns: Record<string, string[]> } {
  const tables = catalogTables();
  return {
    tables: tables.map((t) => t.name),
    columns: Object.fromEntries(tables.map((t) => [t.name, t.columns.map((c) => c.name)])),
  };
}
